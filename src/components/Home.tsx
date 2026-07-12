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

export default function Home({ profile, onCheckIn }: { profile: Profile; onCheckIn: () => void }) {
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
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <Plant stage={stage.key} watered={!!stats?.wateredToday} />
        <p style={{ fontSize: 14, color: 'var(--sage-deep)', fontWeight: 500 }}>{stage.label}</p>
        <p className="muted" style={{ marginTop: 4 }}>
          {activeDays === 0 ? '寫低第一句,種子就會醒' : `你已經陪咗自己 ${activeDays} 日`}
        </p>
      </div>
      <button className="card" style={{ width: '100%', textAlign: 'left', marginTop: 22, display: 'flex', alignItems: 'center', gap: 14 }} onClick={onCheckIn}>
        <span style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--sage-bg)', color: 'var(--sage-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M12 3c-3 4-6 7-6 11a6 6 0 0012 0c0-4-3-7-6-11z" />
          </svg>
        </span>
        <span>
          <span style={{ display: 'block', fontSize: 15, fontWeight: 500 }}>
            {stats?.wateredToday ? '今日想再傾多陣?' : '今日想同自己傾啲咩?'}
          </span>
          <span className="muted" style={{ display: 'block', marginTop: 2, fontSize: 12 }}>
            {stats?.wateredToday ? '已經灌溉咗,隨時歡迎返嚟' : '寫低少少,植物就會飲到水'}
          </span>
        </span>
      </button>
    </div>
  );
}
