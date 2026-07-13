import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { moodOfDay, todayKey, type Entry, type Profile } from '../domain';

export default function Mood({ profile }: { profile: Profile }) {
  const [range, setRange] = useState<7 | 30>(30);

  const data = useLiveQuery(async () => {
    const since = Date.now() - range * 86400_000;
    const entries = await db.entries
      .where('[profileId+createdAt]').between([profile.id, since], [profile.id, Infinity]).toArray();
    const byDay = new Map<string, Entry[]>();
    for (const e of entries) {
      if (!byDay.has(e.dateKey)) byDay.set(e.dateKey, []);
      byDay.get(e.dateKey)!.push(e);
    }
    const days: { key: string; mood: number | null }[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000);
      const key = todayKey(d);
      days.push({ key, mood: byDay.has(key) ? moodOfDay(byDay.get(key)!) : null });
    }
    const counts = new Map<string, number>();
    for (const e of entries) for (const em of e.emotions) counts.set(em.name, (counts.get(em.name) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { days, top, total: entries.length };
  }, [profile.id, range]);

  const days = data?.days ?? [];
  const W = 300, H = 110, pad = 10;
  const step = days.length > 1 ? (W - pad * 2) / (days.length - 1) : 0;
  const y = (v: number) => H / 2 - v * (H / 2 - pad);

  // 冇記錄嘅日子留 gap,唔會跌落零
  const segments: string[] = [];
  let seg: string[] = [];
  days.forEach((d, i) => {
    if (d.mood === null) { if (seg.length > 1) segments.push(seg.join(' ')); seg = []; return; }
    seg.push(`${seg.length === 0 ? 'M' : 'L'}${(pad + i * step).toFixed(1)} ${y(d.mood).toFixed(1)}`);
  });
  if (seg.length > 1) segments.push(seg.join(' '));
  const dots = days.map((d, i) => d.mood === null ? null : { x: pad + i * step, y: y(d.mood) }).filter(Boolean) as { x: number; y: number }[];

  return (
    <div className="page">
      <h1 className="serif" style={{ fontSize: 22 }}>心情起伏</h1>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        {[30, 7].map(r => (
          <button key={r} className={`chip ${range === r ? 'on' : ''}`} onClick={() => setRange(r as 7 | 30)}>{r}日</button>
        ))}
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        {data?.total ? (
          <svg width="100%" viewBox={`0 0 ${W} ${H + 20}`} aria-label={`${range}日心情曲線`}>
            <line x1={pad} y1={H / 2} x2={W - pad} y2={H / 2} stroke="var(--line)" strokeWidth="1" />
            {segments.map((d, i) => (
              <path key={i} d={d} fill="none" stroke="var(--sage)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            ))}
            {dots.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="var(--dusk)" />)}
            <text x={pad} y={H + 16} fontSize="10" fill="var(--faint)">{days[0]?.key.slice(5)}</text>
            <text x={W - pad} y={H + 16} fontSize="10" fill="var(--faint)" textAnchor="end">今日</text>
          </svg>
        ) : (
          <p className="muted" style={{ textAlign: 'center', padding: '24px 0' }}>寫低第一次簽到,呢度就會開始有你嘅曲線</p>
        )}
      </div>
      {!!data?.top.length && (
        <>
          <p className="muted" style={{ margin: '18px 0 8px' }}>呢排最常出現</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {data.top.map(([name, n]) => <span key={name} className="chip">{name} ×{n}</span>)}
          </div>
        </>
      )}
    </div>
  );
}
