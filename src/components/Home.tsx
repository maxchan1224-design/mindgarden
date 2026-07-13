import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { plantStage, todayKey, type Profile } from '../domain';
import Plant from './Plant';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 12) return '早晨';
  if (h < 18) return '午安';
  return '晚上好';
}

export type Practice = 'checkin' | 'dialogue' | 'body' | 'gratitude';

const CARDS: { id: Practice; title: string; sub: string; bg: string; fg: string; icon: JSX.Element }[] = [
  { id: 'checkin', title: '情緒簽到', sub: '而家有咩感覺?', bg: 'var(--blush-bg)', fg: 'var(--blush-deep)',
    icon: <path d="M12 21C7 17 3 13.5 3 9.5A4.5 4.5 0 0112 6a4.5 4.5 0 019 3.5c0 4-4 7.5-9 11.5z" /> },
  { id: 'dialogue', title: '自我對話', sub: '今日想諗清楚一件事', bg: 'var(--sage-bg)', fg: 'var(--sage-deep)',
    icon: <path d="M21 12a8 8 0 01-8 8H4l2-3a8 8 0 1115-5z" /> },
  { id: 'body', title: '身體覺察', sub: '身體今日話你知啲咩?', bg: 'var(--dusk-bg)', fg: 'var(--dusk-deep)',
    icon: <path d="M12 3c-3 4-6 7-6 11a6 6 0 0012 0c0-4-3-7-6-11z" /> },
  { id: 'gratitude', title: '小確幸', sub: '記低今日一件小事', bg: 'var(--blush-bg)', fg: 'var(--blush-deep)',
    icon: <path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" /> },
];

export default function Home({ profile, onOpen }: { profile: Profile; onOpen: (p: Practice) => void }) {
  const stats = useLiveQuery(async () => {
    const all = await db.entries.where('profileId').equals(profile.id).toArray();
    const days = new Set(all.map(e => e.dateKey));
    return { activeDays: days.size, wateredToday: days.has(todayKey()) };
  }, [profile.id]);

  const activeDays = stats?.activeDays ?? 0;
  const stage = plantStage(activeDays);
  const dateStr = new Date().toLocaleDateString('zh-HK', { month: 'long', day: 'numeric', weekday: 'long' });

  return (
    <div className="page">
      <p className="muted">{dateStr}</p>
      <h1 className="serif" style={{ fontSize: 24, marginTop: 6 }}>{greeting()},{profile.name}</h1>

      <div style={{ textAlign: 'center', marginTop: 4 }}>
        <Plant stage={stage.key} watered={!!stats?.wateredToday} />
        <p style={{ fontSize: 14, color: 'var(--sage-deep)', fontWeight: 500 }}>{stage.label}</p>
        <p className="muted" style={{ marginTop: 4 }}>
          {activeDays === 0 ? '寫低第一句,種子就會醒' : `你已經陪咗自己 ${activeDays} 日`}
        </p>
      </div>

      <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {CARDS.map(c => (
          <button key={c.id} className="card"
            style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14 }}
            onClick={() => onOpen(c.id)}>
            <span style={{ width: 38, height: 38, borderRadius: 12, background: c.bg, color: c.fg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{c.icon}</svg>
            </span>
            <span>
              <span style={{ display: 'block', fontSize: 15, fontWeight: 500 }}>{c.title}</span>
              <span className="muted" style={{ display: 'block', marginTop: 2, fontSize: 12 }}>{c.sub}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
