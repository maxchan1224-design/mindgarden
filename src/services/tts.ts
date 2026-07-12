import { PERSONA_META, type PersonaId } from '../domain';

let cachedVoice: SpeechSynthesisVoice | null = null;

function pickCantoneseVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis?.getVoices() ?? [];
  cachedVoice =
    voices.find(v => v.lang === 'zh-HK') ||
    voices.find(v => v.lang.startsWith('zh-HK')) ||
    voices.find(v => v.lang.startsWith('zh')) ||
    null;
  return cachedVoice;
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

// voice list 喺 iOS 係 lazy load,預熱一次
if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => { cachedVoice = null; pickCantoneseVoice(); };
}
