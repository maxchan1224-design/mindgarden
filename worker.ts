// Worker entry point — 靜態資源 + AI API
//
// AI 用返 Cloudflare 自己嘅 Workers AI(env.AI binding),唔係外部 Gemini/Claude API。
// 原因:Gemini API 同 Anthropic API 都未開放俾香港(官方地區政策),
// 直接由 Worker call 出去會撞 400/403。Workers AI 係 Cloudflare 自己平台入面行,
// 唔使跨境連第三方,完全冇呢個地區限制,亦唔使另外攞/管理 API key。

import {
  composeSystemPrompt, checkinTask, dialogueTask, summaryTask,
  type PromptContext, type PersonaId,
} from './functions/lib/prompts';

// 精簡版 Ai binding 型別(唔依賴 @cloudflare/workers-types,keep build 自足)
interface Ai {
  run(model: string, input: Record<string, unknown>): Promise<unknown>;
}

export interface Env {
  AI: Ai; // Cloudflare Workers AI binding
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

// Qwen1.5 對中文/廣東話書面語支援穩定,喺 Cloudflare 平台內行,唔受地區封鎖影響
const MODEL = '@cf/qwen/qwen1.5-14b-chat-awq';

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
    task += `\n\n請只輸出一個 JSON object,唔好加 markdown code fence,唔好加任何解釋文字。格式:{"text": "你嘅回應"}`;

    const system = composeSystemPrompt(ctx, task);

    const messages = [
      { role: 'system', content: system },
      ...(history.length
        ? history.map(t => ({ role: t.role === 'ai' ? 'assistant' as const : 'user' as const, content: t.text }))
        : [{ role: 'user' as const, content: body.payload.text || '(冇文字,只有情緒標記)' }]),
    ];

    let raw = '';
    try {
      const result: any = await env.AI.run(MODEL, { messages, max_tokens: 1200, temperature: 0.9 });
      raw = result?.response ?? '';
    } catch (aiErr: any) {
      console.error('Workers AI error', aiErr?.message ?? aiErr);
      return json({ text: `(AI 暫時連唔到:${aiErr?.message ?? 'unknown'})`, safety: false });
    }

    const clean = raw.replace(/```json|```/g, '').trim();
    let parsed: any;
    try { parsed = JSON.parse(clean); } catch { parsed = { text: clean, safety: false }; }
    if (typeof parsed.text !== 'string' || !parsed.text.trim()) parsed = { text: clean || '聽到喇,你想講多啲咩?', safety: false };

    return json({
      text: parsed.text,
      longText: typeof parsed.longText === 'string' ? parsed.longText : undefined,
      safety: !!parsed.safety,
      offerSummary: !!parsed.offerSummary,
    });
  } catch (e: any) {
    console.error('handleRespond error', e?.message ?? e);
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
    return env.ASSETS.fetch(request);
  },
};
