import { PERSONA_META, type PersonaId } from '../domain';

// 應要求:唔再係全螢幕 overlay,改做 app 內一張浮動卡,唔會遮住成個介面
export default function CallScreen({
  personaId, onAccept, onDecline,
}: { personaId: PersonaId; onAccept: () => void; onDecline: () => void }) {
  const p = PERSONA_META[personaId];
  return (
    <div className="call-card" role="dialog" aria-label={`${p.name}想同你講幾句`}>
      <div className="call-avatar">
        <svg width="30" height="30" viewBox="0 0 56 56" aria-hidden="true">
          <circle cx="28" cy="21" r="11" fill="#8D87AD" />
          <path d="M8 50 C10 37 19 32 28 32 C37 32 46 37 48 50 Z" fill="#B7B2CC" />
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <p className="serif" style={{ fontSize: 15, margin: 0 }}>{p.name}</p>
        <p className="muted" style={{ fontSize: 12, margin: '2px 0 0' }}>想同你講幾句 · 語音</p>
      </div>
      <button className="call-round decline" onClick={onDecline} aria-label="睇文字">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 6h16M4 10h16M4 14h10" /></svg>
      </button>
      <button className="call-round accept" onClick={onAccept} aria-label="接聽語音">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.6 10.8a15 15 0 006.6 6.6l2.2-2.2a1 1 0 011-.24 11 11 0 003.5.56 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11 11 0 00.56 3.5 1 1 0 01-.25 1z" /></svg>
      </button>
    </div>
  );
}
