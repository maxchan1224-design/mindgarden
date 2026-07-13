import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { PERSONA_META, type Entry, type Profile } from '../domain';

const TYPE_LABEL: Record<string, string> = {
  checkin: '情緒簽到', dialogue: '自我對話', body: '身體覺察',
  gratitude: '小確幸', thought: '隨手記',
};

export default function Journal({ profile }: { profile: Profile }) {
  const entries = useLiveQuery(
    () => db.entries.where('profileId').equals(profile.id).reverse().sortBy('createdAt'),
    [profile.id],
  );

  if (!entries) return <div className="page"><p className="muted">載入緊…</p></div>;

  const byDay = new Map<string, Entry[]>();
  for (const e of entries) {
    if (!byDay.has(e.dateKey)) byDay.set(e.dateKey, []);
    byDay.get(e.dateKey)!.push(e);
  }

  return (
    <div className="page">
      <h1 className="serif" style={{ fontSize: 22 }}>日記</h1>
      {entries.length === 0 && (
        <p className="muted" style={{ marginTop: 20 }}>你嘅記錄會喺呢度慢慢累積。</p>
      )}
      {[...byDay.entries()].map(([day, list]) => (
        <div key={day} style={{ marginTop: 22 }}>
          <p className="muted" style={{ marginBottom: 8 }}>
            {new Date(day).toLocaleDateString('zh-HK', { month: 'long', day: 'numeric', weekday: 'short' })}
          </p>
          {list.map(e => (
            <div key={e.id} className="card" style={{ marginBottom: 10 }}>
              <p className="muted" style={{ fontSize: 11, marginBottom: 6 }}>
                {TYPE_LABEL[e.type] ?? e.type}
                {e.topic && ` · ${e.topic}`}
                {' · '}
                {new Date(e.createdAt).toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' })}
              </p>
              {e.emotions.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                  {e.emotions.map(em => (
                    <span key={em.name} className="chip" style={{ fontSize: 11, padding: '3px 9px' }}>{em.name}</span>
                  ))}
                </div>
              )}
              <p style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{e.text}</p>
              {e.dialogue.filter(t => t.role === 'ai').slice(-1).map((t, i) => (
                <div key={i} style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
                  <p className="muted" style={{ fontSize: 11, marginBottom: 4 }}>{PERSONA_META[profile.personaId].name}</p>
                  <p className="serif" style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--mist)' }}>{t.text}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
