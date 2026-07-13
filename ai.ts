import { useState } from 'react';
import { db } from '../db';
import { DIALOGUE_TOPICS, todayKey, uid, type Profile, type Topic } from '../domain';
import Conversation from './Conversation';

export default function Dialogue({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [question, setQuestion] = useState('');
  const [text, setText] = useState('');
  const [entryId, setEntryId] = useState('');
  const [submitted, setSubmitted] = useState<string | null>(null);

  async function submit() {
    if (!text.trim() || !topic) return;
    const id = uid();
    await db.entries.add({
      id, profileId: profile.id, type: 'dialogue', createdAt: Date.now(), dateKey: todayKey(),
      emotions: [], text: text.trim(), dialogue: [], topic: topic.label,
    });
    setEntryId(id);
    setSubmitted(text.trim());
  }

  // Step 1: 揀主題
  if (!topic) {
    return (
      <div className="page">
        <p className="muted">自我對話</p>
        <h2 className="serif" style={{ fontSize: 20, margin: '10px 0 6px' }}>今日想諗清楚邊方面?</h2>
        <p className="muted" style={{ marginBottom: 16 }}>揀一個主題,我會問你一啲問題</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {DIALOGUE_TOPICS.map(t => (
            <button key={t.key} className="chip" style={{ fontSize: 14, padding: '9px 16px' }}
              onClick={() => { setTopic(t); setQuestion(t.questions[Math.floor(Math.random() * t.questions.length)]); }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Step 2/3: 答問題 → AI 對話
  return (
    <div className="page">
      <p className="muted">自我對話 · {topic.label}</p>
      {!submitted ? (
        <>
          <div className="ai-card" style={{ marginTop: 14 }}>
            <p className="who">問題</p>
            <p className="say">{question}</p>
          </div>
          <button
            style={{ marginTop: 10, fontSize: 13, color: 'var(--mist)' }}
            onClick={() => {
              const others = topic.questions.filter(q => q !== question);
              setQuestion(others[Math.floor(Math.random() * others.length)] ?? question);
            }}>
            換一條問題
          </button>
          <textarea className="entry" style={{ marginTop: 14, minHeight: 140 }}
            placeholder="慢慢諗,想到咩就寫咩…"
            value={text} onChange={e => setText(e.target.value)} />
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button className="btn primary" style={{ flex: 1 }} onClick={submit}>寫好喇</button>
            <button className="btn ghost" style={{ flex: 1 }} onClick={() => setTopic(null)}>換主題</button>
          </div>
        </>
      ) : (
        <>
          <div className="card" style={{ marginTop: 12 }}>
            <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>{question}</p>
            <p style={{ fontSize: 14, lineHeight: 1.7 }}>{submitted}</p>
          </div>
          <Conversation
            profile={profile}
            entryId={entryId}
            initialText={`(主題:${topic.label} · 問題:${question})\n${submitted}`}
            topic={topic.label}
            onDone={onDone}
          />
        </>
      )}
    </div>
  );
}
