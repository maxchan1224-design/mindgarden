import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { GARDEN, STYLES, type Entry, type Profile } from '../domain';

const TYPE_LABEL: Record<string, string> = {
  checkin: '簽到', dialogue: '對話', body: '身體覺察',
  gratitude: '小確幸', thought: '隨手記', capsule: '時間囊',
};

// Library:所有人生片段。時間囊未到期會鎖住。
export default function Library({ profile }: { profile: Profile }) {
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

  const styleName = STYLES[profile.styleId ?? 'quiet'].name;

  return (
    <div className="page">
      <h1 className="serif" style={{ fontSize: 22 }}>收藏庫</h1>
      {entries.length === 0 && (
        <p className="muted" style={{ marginTop: 20 }}>你嘅人生片段會喺呢度慢慢累積。</p>
      )}
      {[...byDay.entries()].map(([day, list]) => (
        <div key={day} style={{ marginTop: 22 }}>
          <p className="muted" style={{ marginBottom: 8 }}>
            {new Date(day).toLocaleDateString('zh-HK', { month: 'long', day: 'numeric', weekday: 'short' })}
          </p>
          {list.map(e => {
            const locked = e.type === 'capsule' && e.openAt && e.openAt > Date.now();
            if (locked) {
              return (
                <div key={e.id} className="card" style={{ marginBottom: 10, opacity: 0.75 }}>
                  <p style={{ fontSize: 14 }}>⏳ 一個封住嘅時間囊</p>
                  <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                    {new Date(e.openAt!).toLocaleDateString('zh-HK', { year: 'numeric', month: 'long', day: 'numeric' })} 先開得
                  </p>
                </div>
              );
            }
            return (
              <div key={e.id} className="card" style={{ marginBottom: 10 }}>
                <p className="muted" style={{ fontSize: 11, marginBottom: 6 }}>
                  {TYPE_LABEL[e.type] ?? e.type}
                  {e.garden && ` · ${GARDEN[e.garden].emoji}${GARDEN[e.garden].name}`}
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
                {(e.text || e.type !== 'checkin') && (
                  <p style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{e.text || '(只揀咗季節)'}</p>
                )}
                {e.dialogue.filter(t => t.role === 'ai').slice(-1).map((t, i) => (
                  <div key={i} style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
                    <p className="muted" style={{ fontSize: 11, marginBottom: 4 }}>{styleName}</p>
                    <p className="serif" style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--mist)' }}>{t.text}</p>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
