import { useState } from 'react';
import { db } from '../db';
import { EMOTIONS, todayKey, uid, type Emotion, type Profile } from '../domain';
import Conversation from './Conversation';

export default function CheckIn({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const [picked, setPicked] = useState<Emotion[]>([]);
  const [intensity, setIntensity] = useState(5);
  const [text, setText] = useState('');
  const [entryId, setEntryId] = useState('');
  const [submitted, setSubmitted] = useState<{ text: string; emotions: Emotion[] } | null>(null);

  const toggle = (name: string) =>
    setPicked(p => p.some(e => e.name === name) ? p.filter(e => e.name !== name) : [...p, { name, intensity }]);

  async function submit() {
    if (!text.trim() && picked.length === 0) return;
    const id = uid();
    const emotions = picked.map(e => ({ ...e, intensity }));
    await db.entries.add({
      id, profileId: profile.id, type: 'checkin', createdAt: Date.now(), dateKey: todayKey(),
      emotions, text: text.trim(), dialogue: [],
    });
    setEntryId(id);
    setSubmitted({ text: text.trim(), emotions });
  }

  return (
    <div className="page">
      <p className="muted">情緒簽到</p>
      {!submitted ? (
        <>
          <h2 className="serif" style={{ fontSize: 20, margin: '10px 0 16px' }}>而家有咩感覺?</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {EMOTIONS.map(e => (
              <button key={e.name} className={`chip ${picked.some(p => p.name === e.name) ? 'on' : ''}`} onClick={() => toggle(e.name)}>
                {e.name}
              </button>
            ))}
          </div>
          {picked.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <p className="muted" style={{ marginBottom: 10 }}>有幾強烈? {intensity}/10</p>
              <input type="range" min={1} max={10} step={1} value={intensity}
                onChange={e => setIntensity(Number(e.target.value))} style={{ width: '100%' }} />
            </div>
          )}
          <textarea className="entry" style={{ marginTop: 16 }} placeholder="發生咗咩事?想講幾多都得…"
            value={text} onChange={e => setText(e.target.value)} />
          <button className="btn primary" style={{ marginTop: 16 }} onClick={submit}>記低</button>
        </>
      ) : (
        <>
          <div className="card" style={{ marginTop: 12 }}>
            {submitted.emotions.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: submitted.text ? 10 : 0 }}>
                {submitted.emotions.map(e => (
                  <span key={e.name} className="chip" style={{ fontSize: 12, padding: '4px 10px' }}>{e.name} {e.intensity}/10</span>
                ))}
              </div>
            )}
            {submitted.text && <p style={{ fontSize: 14, lineHeight: 1.7 }}>{submitted.text}</p>}
          </div>
          <Conversation
            profile={profile}
            entryId={entryId}
            initialText={submitted.text || `我而家覺得${submitted.emotions.map(e => e.name).join('、')}`}
            emotions={submitted.emotions}
            onDone={onDone}
          />
        </>
      )}
    </div>
  );
}
