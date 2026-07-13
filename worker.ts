import { PERSONA_META, type PersonaId } from '../domain';

let cachedVoice: SpeechSynthesisVoice | null = null;

// iOS 內置粵語聲有兩種質素:預設 "Compact"(機械)同 "Enhanced/Premium"(自然好多)。
// Safari 會將已下載嘅 Enhanced 聲放喺 voice list,揀名入面有 Enhanced/Premium 嘅優先。
function pickCantoneseVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const zhHK = voices.filter(v => v.lang === 'zh-HK' || v.lang.startsWith('zh-HK'));
  cachedVoice =
    zhHK.find(v => /enhanced|premium/i.test(v.name)) ||
    zhHK.find(v => v.localService) ||
    zhHK[0] ||
    voices.find(v => v.lang.startsWith('zh')) ||
    null;
  return cachedVoice;
}

export function hasEnhancedVoice(): boolean {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  return voices.some(v => v.lang.startsWith('zh-HK') && /enhanced|premium/i.test(v.name));
}

// iOS 需要 user gesture 之後先出聲 — 所以永遠由撳掣觸發
export function speak(text: string, personaId: PersonaId, onEnd?: () => void): boolean {
  if (!('speechSynthesis' in window)) return false;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = pickCantoneseVoice();
  if (v) u.voice = v;
  u.lang = 'zh-HK';
  u.rate = PERSONA_META[personaId].rate;
  u.pitch = PERSONA_META[personaId].pitch;
  if (onEnd) u.onend = onEnd;
  window.speechSynthesis.speak(u);
  return true;
}

export function stopSpeaking() {
  window.speechSynthesis?.cancel();
}

if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => { cachedVoice = null; pickCantoneseVoice(); };
}
