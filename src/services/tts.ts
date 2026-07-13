import { PERSONA_META, type PersonaId, type VoiceLang } from '../domain';

let voiceCache: Record<string, SpeechSynthesisVoice | null> = {};

// 每種語言嘅搜尋策略:揀 Enhanced/Premium 先,其次 localService,最後任何匹配
function pickVoice(lang: VoiceLang): SpeechSynthesisVoice | null {
  if (voiceCache[lang] !== undefined) return voiceCache[lang];

  const all = window.speechSynthesis?.getVoices() ?? [];

  const FALLBACK_MAP: Record<VoiceLang, string[]> = {
    yue: ['zh-HK', 'zh_HK'],
    cmn: ['zh-CN', 'zh_CN', 'zh-TW', 'zh'],
    en:  ['en-GB', 'en-AU', 'en-US', 'en'],
  };
  const tags = FALLBACK_MAP[lang];
  const pool = all.filter(v => tags.some((tag: string) => v.lang.startsWith(tag)));

  const picked =
    pool.find(v => /enhanced|premium/i.test(v.name)) ||
    pool.find(v => v.localService) ||
    pool[0] ||
    null;

  voiceCache[lang] = picked;
  return picked;
}

// 三語對應嘅 BCP-47 tag(傳俾 SpeechSynthesisUtterance.lang)
const LANG_BCP47: Record<VoiceLang, string> = {
  yue: 'zh-HK',
  cmn: 'zh-CN',
  en:  'en-GB',
};

// 讀出有話俾 user 知係邊把聲嘅簡單描述(喺設定頁試聽用)
export const VOICE_LANG_LABELS: Record<VoiceLang, string> = {
  yue: '粵語',
  cmn: '普通話',
  en:  'English',
};

// iOS voice list 係 lazy load,預熱一次
if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    voiceCache = {};
  };
}

export function speak(
  text: string,
  personaId: PersonaId,
  voiceLang: VoiceLang = 'yue',
  onEnd?: () => void,
): boolean {
  if (!('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();

  const u = new SpeechSynthesisUtterance(text);
  const v = pickVoice(voiceLang);
  if (v) u.voice = v;
  u.lang = LANG_BCP47[voiceLang];
  u.rate = PERSONA_META[personaId].rate;
  u.pitch = PERSONA_META[personaId].pitch;
  if (onEnd) u.onend = onEnd;

  window.speechSynthesis.speak(u);
  return true;
}

export function stopSpeaking() {
  window.speechSynthesis?.cancel();
}

// 試聽:喺設定頁俾用戶撳掣聽吓把聲
export function speakSample(voiceLang: VoiceLang, personaId: PersonaId) {
  const samples: Record<VoiceLang, string> = {
    yue: '你好,我係你嘅陪伴。',
    cmn: '你好，我是你的陪伴。',
    en:  'Hello, I\'m here with you.',
  };
  speak(samples[voiceLang], personaId, voiceLang);
}

export function hasEnhancedVoice(lang: VoiceLang = 'yue'): boolean {
  const all = window.speechSynthesis?.getVoices() ?? [];
  const tags = { yue: 'zh-HK', cmn: 'zh-CN', en: 'en' }[lang];
  return all.some(v => v.lang.startsWith(tags) && /enhanced|premium/i.test(v.name));
}
