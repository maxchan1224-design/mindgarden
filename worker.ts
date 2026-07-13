// Worker entry point — 新式 Cloudflare Workers (assets + script) 模式
// 取代 functions/ 嘅 file-based routing,因為呢個 project 係 Workers project,唔係 classic Pages

import {
  composeSystemPrompt, checkinTask, dialogueTask, summaryTask,
  type PromptContext, type PersonaId,
} from './functions/lib/prompts';

export interface Env {
  GEMINI_API_KEY: string;
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

interface Body {
  task: 'checkin' | 'dialogue' | 'summary';
  ctx: { name: string; personaId: PersonaId; isFirstResponseToday: boolean; voiceMode: boolean; chatMode: 'companion' | 'open' };
  memory: string;
  topic?: string;
  payload: {
    emotions?: { name: string; intensity: number }[];
    text?: string;
    history?: { role: 'user' | 'ai'; text: string }[];
  };
}

const MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

async function handleRespond(request: Request, env: Env): Promise<Response> {
  try {
    const body = (await request.json()) as Body;
    const ctx: PromptContext = { ...body.ctx, lang: 'yue' };

    let task: string;
    const history = body.payload.history ?? [];
    if (body.task === 'checkin') {
      task = checkinTask({ emotions: body.payload.emotions, text: body.payload.text ?? '' });
    } else if (body.task === 'summary') {
      task = summaryTask();
    } else {
      const turnCount = Math.floor(history.length / 2);
      task = dialogueTask(turnCount, body.topic);
    }

    if (body.memory) {
      task += `\n\n【背景記憶 — 對方最近七日嘅記錄,幫你記住上文下理,唔好逐條覆述】\n${body.memory}`;
    }

    const system = composeSystemPrompt(ctx, task);

    const contents = history.length
      ? history.map(t => ({ role: t.role === 'ai' ? 'model' : 'user', parts: [{ text: t.text }] }))
      : [{ role: 'user', parts: [{ text: body.payload.text || '(冇文字,只有情緒標記)' }] }];

    const r = await fetch(`${GEMINI_URL}?key=${env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { responseMimeType: 'application/json', temperature: 0.9, maxOutputTokens: 2000 },
      }),
    });

    if (!r.ok) return json({ error: 'upstream', status: r.status }, 502);
    const data = (await r.json()) as any;
    const raw: string = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const clean = raw.replace(/```json|```/g, '').trim();

    let parsed: any;
    try { parsed = JSON.parse(clean); } catch { parsed = { text: clean, safety: false }; }
    if (typeof parsed.text !== 'string') parsed = { text: clean, safety: false };

    return json({
      text: parsed.text,
      longText: typeof parsed.longText === 'string' ? parsed.longText : undefined,
      safety: !!parsed.safety,
      offerSummary: !!parsed.offerSummary,
    });
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
}

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/respond' && request.method === 'POST') {
      return handleRespond(request, env);
    }
    // 其餘全部交俾靜態資源(index.html, JS, CSS, manifest, service worker)
    return env.ASSETS.fetch(request);
  },
};
