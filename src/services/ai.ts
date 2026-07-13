import { db } from '../db';
import type { Entry, PersonaId, DialogueTurn, ChatMode } from '../domain';

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
  task: 'checkin' | 'dialogue' | 'summary';
  ctx: { name: string; personaId: PersonaId; isFirstResponseToday: boolean; voiceMode: boolean; chatMode: ChatMode };
  memory: string;
  topic?: string;
  payload: {
    emotions?: { name: string; intensity: number }[];
    text?: string;
    history?: DialogueTurn[];
  };
}

const FALLBACK: AiReply = {
  text: '聽到喇,已經幫你記低。今日肯停低寫幾句,已經係照顧咗自己。',
  safety: false,
};

export async function askAi(body: RequestBody): Promise<AiReply> {
  try {
    const r = await fetch('/api/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) return FALLBACK;
    const data = await r.json();
    if (typeof data?.text !== 'string' || !data.text.trim()) return FALLBACK;
    return { text: data.text, longText: data.longText, safety: !!data.safety, offerSummary: !!data.offerSummary };
  } catch {
    return FALLBACK;
  }
}
