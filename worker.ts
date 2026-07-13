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

// GLM-4.7-Flash(智譜 AI / Z.ai)— 中國公司出品,中文係佢嘅原生能力,唔似歐美 model 要「翻譯」出中文。
// 正確 model ID 命名空間係 @cf/zai-org/(唔係 @cf/zhipuai/— 呢個係之前試錯嘅位)。
const MODEL = '@cf/zai-org/glm-4.7-flash';

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

    if (!env.AI || typeof env.AI.run !== 'function') {
      return json({ text: '(AI binding 未生效,請喺 Cloudflare dashboard 檢查 Workers AI binding)', safety: false });
    }

    let raw: any = '';
    try {
      const t0 = Date.now();
      const result: any = await env.AI.run(MODEL, {
        messages,
        // 回應係傾偈用,唔係寫文,900 token 夠好長一段。上次爆 token 嘅原因係
        // reasoning 冇關到,而唔係上限太細 —— 而家 reasoning 關咗,上限唔使開到咁大,
        // 上限細返仲可以縮短生成時間。
        max_tokens: 900,
        temperature: 0.85,
        // GLM 系列都係 reasoning model,預設會先「諗」先答,思考內容食晒 token 令 content 變 null。
        // 我哋淨係要佢傾偈,唔需要推理過程,所以關咗 reasoning。
        reasoning: { enabled: false },
      });
      console.log(`AI.run took ${Date.now() - t0}ms`);
      raw =
        (typeof result === 'string' ? result : '') ||
        result?.choices?.[0]?.message?.content ||
        result?.response ||
        result?.result?.response ||
        '';

      // 最後保險:如果關咗 reasoning 都仲爆 token,自動用更大上限重試一次
      if (!raw && result?.choices?.[0]?.finish_reason === 'length') {
        const retry: any = await env.AI.run(MODEL, {
          messages,
          max_tokens: 1500,
          temperature: 0.85,
          reasoning: { enabled: false },
        });
        raw = retry?.choices?.[0]?.message?.content || retry?.response || '';
        if (!raw) {
          return json({ text: '(AI 而家有啲繁忙,請再試一次。)', safety: false });
        }
      }

      // content 有時唔係純文字(可能係 array of parts 或者 object),強制轉做 string
      if (raw && typeof raw !== 'string') {
        if (Array.isArray(raw)) {
          raw = raw.map((p: any) => (typeof p === 'string' ? p : p?.text ?? '')).join('');
        } else {
          raw = (raw as any)?.text ?? JSON.stringify(raw);
        }
      }
      raw = String(raw ?? '');
      if (!raw) {
        console.error('Unexpected AI result shape', JSON.stringify(result).slice(0, 400));
        return json({ text: `(AI 回應格式唔識讀:${JSON.stringify(result).slice(0, 150)})`, safety: false });
      }
    } catch (aiErr: any) {
      console.error('Workers AI error', aiErr?.message ?? aiErr);
      return json({ text: `(AI 出錯:${aiErr?.message ?? 'unknown'})`, safety: false });
    }

    const clean = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').replace(/```json|```/g, '').trim();
    let parsed: any;
    try { parsed = JSON.parse(clean); } catch { parsed = { text: clean, safety: false }; }
    if (typeof parsed.text !== 'string' || !parsed.text.trim()) parsed = { text: clean || '聽到喇,你想講多啲咩?', safety: false };

    // 後處理:model 唔聽話嗰陣,喺 code 層強制剪走重複嘅開場白。
    // Prompt 講一百次都好,細 model 一樣會照犯 — 所以呢層一定要有。
    let finalText: string = parsed.text;
    const isFirstTurn = history.length <= 1;
    if (!isFirstTurn) {
      // 唔係第一句就唔准有呢啲開場白
      finalText = finalText.replace(
        /^\s*(聽到喇|聽到你講[，,]?|我聽到你[^，,。]{0,6}[，,]?|明白[，,]?|我明白你[^，,。]{0,6}[，,]?)\s*[，,。]?\s*/,
        '',
      );
    }
    finalText = finalText.trim();
    if (!finalText) finalText = parsed.text; // 剪到空就用返原文

    return json({
      text: finalText,
      longText: typeof parsed.longText === 'string' ? parsed.longText : undefined,
      safety: !!parsed.safety,
      offerSummary: !!parsed.offerSummary,
    });
  } catch (e: any) {
    console.error('handleRespond error', e?.stack ?? e?.message ?? e);
    // 永遠返 200,將真正錯誤訊息當成 AI 回應顯示出嚟,方便喺手機直接睇到病因
    return json({ text: `(出錯咗:${e?.message ?? String(e)})`, safety: false });
  }
}

function json(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });
}

// 診斷端點:直接喺瀏覽器開 /api/debug 就知 AI 通唔通
async function handleDebug(env: Env): Promise<Response> {
  if (!env.AI || typeof env.AI.run !== 'function') {
    return json({ ok: false, stage: 'binding', error: 'env.AI 唔存在' });
  }
  try {
    const t0 = Date.now();
    const result: any = await env.AI.run(MODEL, {
      messages: [{ role: 'user', content: '用一句廣東話講聲你好。' }],
      max_tokens: 500,
      reasoning: { enabled: false },
    });
    const ms = Date.now() - t0;
    return json({ ok: true, model: MODEL, ms, raw: result });
  } catch (e: any) {
    return json({ ok: false, stage: 'ai.run', model: MODEL, error: e?.message ?? String(e) });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/debug') {
      return handleDebug(env);
    }
    if (url.pathname === '/api/respond' && request.method === 'POST') {
      return handleRespond(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
