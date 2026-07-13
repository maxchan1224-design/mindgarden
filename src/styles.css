:root {
  --paper: #F7F4EE;
  --card: #FFFFFF;
  --ink: #2E332F;
  --mist: #8B948C;
  --faint: #B4B2A9;
  --sage: #7C9082;
  --sage-deep: #5F6E63;
  --sage-bg: #E8EDE7;
  --blush: #D9A38F;
  --blush-deep: #A3604A;
  --blush-bg: #F5E4DC;
  --dusk: #8D87AD;
  --dusk-deep: #6C6690;
  --dusk-bg: #E9E7F0;
  --line: #E7E3D9;
  --r-card: 20px;
  --sans: 'Noto Sans TC', -apple-system, sans-serif;
  --serif: 'Noto Serif TC', serif;
}

@media (prefers-color-scheme: dark) {
  :root {
    --paper: #1E211F;
    --card: #2A2E2B;
    --ink: #E9E7DF;
    --mist: #9AA39B;
    --faint: #6F756F;
    --sage-bg: #35413A;
    --blush-bg: #46362F;
    --dusk-bg: #3A3748;
    --line: #3A3E3A;
  }
}

* { box-sizing: border-box; margin: 0; }

html, body {
  background: var(--paper);
  color: var(--ink);
  font-family: var(--sans);
  -webkit-font-smoothing: antialiased;
  overscroll-behavior-y: none;
}

#root {
  max-width: 480px;
  margin: 0 auto;
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
  padding: env(safe-area-inset-top) 0 0;
}

button { font-family: inherit; cursor: pointer; border: none; background: none; color: inherit; }
input, textarea { font-family: inherit; font-size: 16px; color: var(--ink); }

.page { flex: 1; padding: 20px 18px 96px; animation: rise 0.4s ease-out; }
@keyframes rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .page { animation: none; } }

.serif { font-family: var(--serif); }
.muted { color: var(--mist); font-size: 13px; }

.card {
  background: var(--card);
  border-radius: var(--r-card);
  padding: 16px 18px;
}

.chip {
  display: inline-block;
  font-size: 13px;
  padding: 7px 14px;
  border-radius: 999px;
  background: var(--sage-bg);
  color: var(--sage-deep);
  border: 1.5px solid transparent;
}
.chip.on { border-color: var(--sage); background: var(--sage); color: #fff; }

.btn {
  display: block;
  width: 100%;
  padding: 13px 0;
  border-radius: 999px;
  font-size: 15px;
  text-align: center;
}
.btn.primary { background: var(--sage); color: #fff; }
.btn.ghost { border: 1px solid var(--line); color: var(--sage-deep); }

.tabbar {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  max-width: 480px;
  margin: 0 auto;
  display: flex;
  background: var(--card);
  border-top: 0.5px solid var(--line);
  padding: 8px 0 calc(8px + env(safe-area-inset-bottom));
}
.tabbar button {
  flex: 1;
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  font-size: 11px; color: var(--faint);
}
.tabbar button.on { color: var(--sage-deep); }
.tabbar svg { width: 22px; height: 22px; }

textarea.entry {
  width: 100%;
  min-height: 110px;
  border: none;
  background: var(--card);
  border-radius: var(--r-card);
  padding: 16px 18px;
  resize: vertical;
  line-height: 1.7;
  outline: none;
}

.ai-card {
  background: var(--card);
  border-left: 3px solid var(--dusk);
  border-radius: 0 var(--r-card) var(--r-card) 0;
  padding: 16px 18px;
  animation: rise 0.6s ease-out;
}
.ai-card .who { font-size: 11px; color: var(--dusk); letter-spacing: 1.5px; margin-bottom: 8px; }
.ai-card .say { font-family: var(--serif); line-height: 1.9; font-size: 15px; }

/* 來電卡:app 內浮動,唔再全螢幕 */
.call-card {
  position: sticky;
  top: 8px;
  z-index: 20;
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--card);
  border: 1px solid var(--dusk);
  border-radius: 18px;
  padding: 12px 14px;
  box-shadow: 0 6px 24px rgba(60, 56, 80, 0.14);
  animation: slidein 0.45s cubic-bezier(0.2, 0.9, 0.3, 1);
}
@keyframes slidein { from { opacity: 0; transform: translateY(-14px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .call-card { animation: none; } }

.call-avatar {
  width: 42px; height: 42px; border-radius: 50%;
  background: var(--dusk-bg);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  animation: softpulse 2.4s ease-in-out infinite;
}
@keyframes softpulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(141, 135, 173, 0.4); }
  50% { box-shadow: 0 0 0 10px rgba(141, 135, 173, 0); }
}
@media (prefers-reduced-motion: reduce) { .call-avatar { animation: none; } }

.call-round {
  width: 40px; height: 40px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.call-round svg { width: 19px; height: 19px; }
.call-round.accept { background: #5FA57A; color: #fff; }
.call-round.decline { background: var(--sage-bg); color: var(--sage-deep); }

.typing-row {
  display: flex; align-items: center; gap: 8px;
  padding-top: 14px;
}
.typing-dots { display: inline-flex; gap: 4px; }
.typing-dots i {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--dusk);
  display: inline-block;
  animation: typing-bounce 1.2s infinite ease-in-out;
}
.typing-dots i:nth-child(2) { animation-delay: 0.15s; }
.typing-dots i:nth-child(3) { animation-delay: 0.3s; }
@keyframes typing-bounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
  30% { transform: translateY(-4px); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) { .typing-dots i { animation: none; } }
