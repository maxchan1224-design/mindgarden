import { useState } from 'react';
import { db } from '../db';
import { todayKey, uid, type Profile } from '../domain';
import Conversation from './Conversation';

const IDEAS = ['一杯好飲嘅嘢', '有人記得你', '天氣好', '食咗餐好嘢', '做完一件事', '見到靚天空', '有人講多謝你', '有一刻好靜'];

export default function Gratitude({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const [text, setText] = useState('');
  const [entryId, setEntryId] = useState('');
  const [submitted, setSubmitted] = useState<string | null>(null);

  async function submit() {
    if (!text.trim()) return;
    const id = uid();
    await db.entries.add({
      id, profileId: profile.id, type: 'gratitude', createdAt: Date.now(), dateKey: todayKey(),
      emotions: [{ name: '感恩', intensity: 6 }], text: text.trim(), dialogue: [],
    });
    setEntryId(id);
    setSubmitted(text.trim());
  }

  return (
    <div className="page">
      <p className="muted">小確幸</p>
      {!submitted ? (
        <>
          <h2 className="serif" style={{ fontSize: 20, margin: '10px 0 6px' }}>今日有咩細細粒嘅開心?</h2>
          <p className="muted" style={{ marginBottom: 14 }}>幾細都算數</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {IDEAS.map(i => (
              <button key={i} className="chip" style={{ fontSize: 12 }}
                onClick={() => setText(t => t ? `${t}\n${i}` : i)}>
                {i}
              </button>
            ))}
          </div>
          <textarea className="entry" style={{ minHeight: 110 }}
            placeholder="寫低今日一件小事…"
            value={text} onChange={e => setText(e.target.value)} />
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
            initialText={`今日嘅小確幸:${submitted}`}
            topic="小確幸"
            onDone={onDone}
          />
        </>
      )}
    </div>
  );
}
