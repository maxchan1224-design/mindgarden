import { db } from '../db';
import { EMOTIONS, GARDEN, SEASONS, classifyGarden, type Entry, type PersonaId, type DialogueTurn, type ChatMode, type StyleId, type Profile, type GardenId } from '../domain';

export interface AiReply { text: string; longText?: string; safety: boolean; offerSummary?: boolean; }

// 跨日記憶:最近 7 日記錄撮要,注入每次請求
export async function buildMemory(profileId: string): Promise<string> {
  const since = Date.now() - 7 * 86400_000;
  const recent = await db.entries
    .where('[profileId+createdAt]').between([profileId, since], [profileId, Infinity])
    .reverse().limit(20).toArray();
  if (!recent.length) return '';
  const lines = recent.map((e: Entry) => {
    const ems = e.emotions.map(x => `${x.name}${x.intensity}`).join('/');
    return `${e.dateKey} ${ems ? `[${ems}] ` : ''}${e.text.slice(0, 60)}`;
  });
  return lines.join('\n');
}

interface RequestBody {
  task: 'checkin' | 'dialogue' | 'summary' | 'notice';
  ctx: { name: string; personaId: PersonaId; styleId?: StyleId; isFirstResponseToday: boolean; voiceMode: boolean; chatMode: ChatMode };
  memory: string;
  topic?: string;
  payload: {
    emotions?: { name: string; intensity: number }[];
    text?: string;
    history?: DialogueTurn[];
  };
}

// 出錯時唔再扮成一句溫柔說話 —— 誠實講明係技術問題,唔好呃用戶以為 AI 有回應過
function errorReply(detail: string): AiReply {
  return { text: `(連唔到 AI:${detail})`, safety: false };
}

export async function askAi(body: RequestBody): Promise<AiReply> {
  try {
    const r = await fetch('/api/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const bodyText = await r.text();
    if (!r.ok) return errorReply(`HTTP ${r.status} ${bodyText.slice(0, 120)}`);

    let data: any;
    try { data = JSON.parse(bodyText); }
    catch { return errorReply(`回應唔係 JSON: ${bodyText.slice(0, 120)}`); }

    if (typeof data?.text !== 'string' || !data.text.trim()) {
      return errorReply(`回應冇 text 欄位: ${bodyText.slice(0, 120)}`);
    }
    return { text: data.text, longText: data.longText, safety: !!data.safety, offerSummary: !!data.offerSummary };
  } catch (e: any) {
    return errorReply(e?.message ?? String(e));
  }
}


// v0.2 Notice:數字喺 code 層數好(誠實準確),AI 只負責用溫柔粵語講返。
function valenceOf(name: string): number {
  return EMOTIONS.find(e => e.name === name)?.valence ?? 0;
}

// 由記錄計出一組可靠嘅事實 line(全部有真實數字支持)
export function computeNoticeFacts(rows: Entry[]): string[] {
  const now = Date.now();
  const mid = now - 7 * 86400_000; // 近七日 vs 前七日嘅分界
  interface Agg { total: number; recent: number; prior: number; valSum: number; valN: number; }
  const themes = new Map<GardenId, Agg>();

  // 全期情緒基線(用嚟同個別主題比較 —— 呢個先係真正嘅洞察:
  // 唔係「你講工作帶負面」,而係「你講工作嗰陣,情緒比你平時仲要低」)
  let baseSum = 0, baseN = 0;
  for (const e of rows) for (const em of e.emotions) { baseSum += valenceOf(em.name) * em.intensity; baseN += em.intensity; }
  const baseline = baseN > 0 ? baseSum / baseN : 0;

  for (const e of rows) {
    const g = e.garden ?? classifyGarden(e.text, e.type);
    if (!g) continue;
    const a = themes.get(g) ?? { total: 0, recent: 0, prior: 0, valSum: 0, valN: 0 };
    a.total++;
    if (e.createdAt >= mid) a.recent++; else a.prior++;
    for (const em of e.emotions) { a.valSum += valenceOf(em.name) * em.intensity; a.valN += em.intensity; }
    themes.set(g, a);
  }

  // 每個 fact 帶一個 priority:數字愈細愈值得講(排前面)。
  // 意外嘅嘢(消失/激增/情緒關聯)比「淨係數次數」更值得留意。
  const scored: { p: number; text: string }[] = [];

  // p0 — 突然唔再提(最高洞察:對方通常自己冇為意)
  for (const [g, a] of themes) {
    if (a.prior >= 2 && a.recent === 0) {
      scored.push({ p: 0, text: `${GARDEN[g].name}:前一個星期提過 ${a.prior} 次,近呢個星期一次都冇再提` });
    }
  }
  // p1 — 明顯多咗提
  for (const [g, a] of themes) {
    if (a.recent >= 3 && a.recent >= a.prior * 2) {
      scored.push({ p: 1, text: `${GARDEN[g].name}:近呢個星期明顯多咗諗(前七日 ${a.prior} 次 → 近七日 ${a.recent} 次)` });
    }
  }
  // p2 — 情緒關聯:某主題出現時,情緒明顯偏離你平時
  for (const [g, a] of themes) {
    if (a.total >= 3 && a.valN > 0) {
      const v = a.valSum / a.valN;
      const diff = v - baseline;
      if (diff <= -0.22) scored.push({ p: 2, text: `${GARDEN[g].name}:每次提起,你嘅情緒通常都比你呢排平時仲要沉一啲` });
      else if (diff >= 0.22) scored.push({ p: 2, text: `${GARDEN[g].name}:每次提起,你嘅情緒通常都會鬆返、好返一啲` });
    }
  }
  // p3 — 最常放喺心度嘅主題(top 1)
  const sorted = [...themes.entries()].filter(([, a]) => a.total >= 3).sort((a, b) => b[1].total - a[1].total);
  if (sorted.length) {
    const [g, a] = sorted[0];
    scored.push({ p: 3, text: `${GARDEN[g].name}:呢兩星期你最多提嘅係呢樣,總共 ${a.total} 次` });
  }
  // p4 — 小確幸節奏
  const joy = rows.filter(e => e.type === 'gratitude').length;
  if (joy >= 3) scored.push({ p: 4, text: `小確幸:呢兩星期你記低咗 ${joy} 件細細粒嘅開心` });
  else if (joy === 0 && rows.length >= 6) scored.push({ p: 4, text: `小確幸:呢兩星期你一件細開心都未記低過` });
  // p5 — 季節傾向(做背景)
  const seasonRows = rows.map(e => e.season).filter(Boolean) as (keyof typeof SEASONS)[];
  if (seasonRows.length >= 3) {
    const counts = seasonRows.reduce<Record<string, number>>((m, s) => (m[s] = (m[s] ?? 0) + 1, m), {});
    const [dom] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    scored.push({ p: 5, text: `季節:呢排你多數揀「${SEASONS[dom as keyof typeof SEASONS].name}」` });
  }

  // 按洞察價值排序,最值得講嘅放前面,最多俾六行俾 model 揀
  return scored.sort((a, b) => a.p - b.p).slice(0, 6).map(s => s.text);
}

export async function askNotice(profile: Profile): Promise<string> {
  const since = Date.now() - 14 * 86400_000;
  const rows = await db.entries
    .where('[profileId+createdAt]').between([profile.id, since], [profile.id, Infinity])
    .toArray();
  if (rows.length < 4) return '暫時記錄唔夠,再寫多幾日,我先睇到啲嘢。';

  const facts = computeNoticeFacts(rows);
  if (facts.length === 0) return '呢排嘅記錄仲未見到明顯規律,再儲多幾日,我先講得準。';

  const res = await askAi({
    task: 'notice',
    ctx: {
      name: profile.name, personaId: profile.personaId, styleId: profile.styleId ?? 'quiet',
      isFirstResponseToday: false, voiceMode: false, chatMode: profile.chatMode ?? 'companion',
    },
    memory: facts.join('\n'),  // 傳「已數好嘅事實」,唔係原始記錄
    payload: {},
  });
  return res.text;
}
