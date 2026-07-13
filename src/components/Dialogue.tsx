import { useState } from 'react';
import { db } from '../db';
import { todayKey, uid, type Profile } from '../domain';
import Conversation from './Conversation';

export default function Dialogue({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const [text, setText] = useState('');
  const [entryId, setEntryId] = useState('');
  const [submitted, setSubmitted] = useState<string | null>(null);

  async function submit() {
    if (!text.trim()) return;
    const id = uid();
    await db.entries.add({
      id, profileId: profile.id, type: 'dialogue', createdAt: Date.now(), dateKey: todayKey(),
      emotions: [], text: text.trim(), dialogue: [],
    });
    setEntryId(id);
    setSubmitted(text.trim());
  }

  return (
    <div className="page">
      <p className="muted">自我對話</p>
      {!submitted ? (
        <>
          <h2 className="serif" style={{ fontSize: 20, margin: '10px 0 6px' }}>而家諗緊咩?</h2>
          <p className="muted" style={{ marginBottom: 16 }}>隨便寫,唔需要格式,唔需要目的</p>
          <textarea className="entry" style={{ minHeight: 200 }}
            placeholder="可以係一件事、一個困惑、一段情緒、甚至一句說話…"
            value={text} onChange={e => setText(e.target.value)} />
          <button className="btn primary" style={{ marginTop: 16 }} onClick={submit}>寫好喇</button>
        </>
      ) : (
        <>
          <div className="card" style={{ marginTop: 12 }}>
            <p style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{submitted}</p>
          </div>
          <Conversation profile={profile} entryId={entryId} initialText={submitted} onDone={onDone} />
        </>
      )}
    </div>
  );
}
