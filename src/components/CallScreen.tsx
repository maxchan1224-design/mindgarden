import { PERSONA_META, type PersonaId } from '../domain';

export default function CallScreen({
  personaId, onAccept, onDecline,
}: { personaId: PersonaId; onAccept: () => void; onDecline: () => void }) {
  const p = PERSONA_META[personaId];
  return (
    <div className="call" role="dialog" aria-label={`${p.name}想同你講幾句`}>
      <div style={{ textAlign: 'center' }}>
        <div className="avatar" style={{ margin: '0 auto' }}>
          <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
            <circle cx="28" cy="21" r="11" fill="#8D87AD" />
            <path d="M8 50 C10 37 19 32 28 32 C37 32 46 37 48 50 Z" fill="#B7B2CC" />
          </svg>
        </div>
        <p className="serif" style={{ fontSize: 26, marginTop: 20 }}>{p.name}</p>
        <p style={{ fontSize: 14, opacity: 0.75, marginTop: 8 }}>心庭語音 · 想同你講幾句</p>
      </div>
      <div className="actions">
        <div>
          <button className="round decline" onClick={onDecline} aria-label="唔聽,改為文字">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 6h16M4 10h16M4 14h10" />
            </svg>
          </button>
          <span>睇文字</span>
        </div>
        <div>
          <button className="round accept" onClick={onAccept} aria-label="接聽語音">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M6.6 10.8a15 15 0 006.6 6.6l2.2-2.2a1 1 0 011-.24 11 11 0 003.5.56 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1 11 11 0 00.56 3.5 1 1 0 01-.25 1z" />
            </svg>
          </button>
          <span>接聽</span>
        </div>
      </div>
    </div>
  );
}
