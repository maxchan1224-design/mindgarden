import { db } from '../db';
import type { Entry, PersonaId, DialogueTurn, ChatMode, StyleId, Profile } from '../domain';

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


// v0.2 Notice:攞最近 14 日記錄,叫 AI 幫用戶「留意」— 唔係傾偈
export async function askNotice(profile: Profile): Promise<string> {
  const since = Date.now() - 14 * 86400_000;
  const recent = await db.entries
    .where('[profileId+createdAt]').between([profile.id, since], [profile.id, Infinity])
    .toArray();
  if (recent.length < 3) return '暫時記錄唔夠,再寫多幾日,我先睇到啲嘢。';
  const lines = recent.map((e: Entry) => {
    const ems = e.emotions.map(x => `${x.name}${x.intensity}`).join('/');
    return `${e.dateKey} ${e.type}${ems ? ` [${ems}]` : ''}${e.season ? ` <${e.season}>` : ''} ${e.text.slice(0, 80)}`;
  });
  const res = await askAi({
    task: 'notice',
    ctx: {
      name: profile.name, personaId: profile.personaId, styleId: profile.styleId ?? 'quiet',
      isFirstResponseToday: false, voiceMode: false, chatMode: profile.chatMode ?? 'companion',
    },
    memory: lines.join('\n'),
    payload: {},
  });
  return res.text;
}
