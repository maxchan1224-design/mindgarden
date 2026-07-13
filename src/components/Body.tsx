import { useState } from 'react';
import { db } from '../db';
import { BODY_FEELINGS, BODY_PARTS, todayKey, uid, type Profile } from '../domain';
import Conversation from './Conversation';

export default function Body({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const [marks, setMarks] = useState<{ part: string; feeling: string }[]>([]);
  const [activePart, setActivePart] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [entryId, setEntryId] = useState('');
  const [submitted, setSubmitted] = useState<string | null>(null);

  function setFeeling(feeling: string) {
    if (!activePart) return;
    setMarks(m => [...m.filter(x => x.part !== activePart), { part: activePart, feeling }]);
    setActivePart(null);
  }

  async function submit() {
    if (marks.length === 0) return;
    const desc = marks.map(m => `${m.part}:${m.feeling}`).join('、');
    const full = note.trim() ? `${desc}\n${note.trim()}` : desc;
    const id = uid();
    await db.entries.add({
      id, profileId: profile.id, type: 'body', createdAt: Date.now(), dateKey: todayKey(),
      emotions: [], text: full, dialogue: [], bodyParts: marks,
    });
    setEntryId(id);
    setSubmitted(full);
  }

  return (
    <div className="page">
      <p className="muted">身體覺察</p>
      {!submitted ? (
        <>
          <h2 className="serif" style={{ fontSize: 20, margin: '10px 0 6px' }}>身體今日話你知啲咩?</h2>
          <p className="muted" style={{ marginBottom: 16 }}>撳一個部位,再揀感覺</p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {BODY_PARTS.map(part => {
              const mark = marks.find(m => m.part === part);
              return (
                <button key={part}
                  className={`chip ${activePart === part || mark ? 'on' : ''}`}
                  style={{ fontSize: 14, padding: '9px 16px' }}
                  onClick={() => setActivePart(activePart === part ? null : part)}>
                  {part}{mark && ` · ${mark.feeling}`}
                </button>
              );
            })}
          </div>

          {activePart && (
            <div className="card" style={{ marginTop: 16 }}>
              <p className="muted" style={{ marginBottom: 10 }}>{activePart}而家點?</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {BODY_FEELINGS.map(f => (
                  <button key={f} className="chip" style={{ fontSize: 13 }} onClick={() => setFeeling(f)}>{f}</button>
                ))}
              </div>
            </div>
          )}

          <textarea className="entry" style={{ marginTop: 16, minHeight: 80 }}
            placeholder="仲有咩想補充?(睡眠、精神、呼吸…)"
            value={note} onChange={e => setNote(e.target.value)} />
          <button className="btn primary" style={{ marginTop: 14 }} onClick={submit}>記低</button>
        </>
      ) : (
        <>
          <div className="card" style={{ marginTop: 12 }}>
            <p style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{submitted}</p>
          </div>
          <Conversation
            profile={profile}
            entryId={entryId}
            initialText={`我而家身體嘅感覺:${submitted}`}
            topic="身體覺察"
            onDone={onDone}
          />
        </>
      )}
    </div>
  );
}
