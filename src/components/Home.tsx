import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { plantStage, todayKey, PERSONA_META, type Profile } from '../domain';
import Plant from './Plant';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 12) return '早晨';
  if (h < 18) return '午安';
  return '晚上好';
}

export type Practice = 'checkin' | 'dialogue' | 'body' | 'gratitude';

// 次要 practice — 想特別做某件事先揀,唔係主路
const SECONDARY: { id: Practice; title: string; sub: string; icon: JSX.Element }[] = [
  { id: 'checkin', title: '情緒簽到', sub: '而家有咩感覺',
    icon: <path d="M12 21C7 17 3 13.5 3 9.5A4.5 4.5 0 0112 6a4.5 4.5 0 019 3.5c0 4-4 7.5-9 11.5z" /> },
  { id: 'body', title: '身體覺察', sub: '身體話你知咩',
    icon: <path d="M12 3c-3 4-6 7-6 11a6 6 0 0012 0c0-4-3-7-6-11z" /> },
  { id: 'gratitude', title: '小確幸', sub: '今日一件小事',
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
  const persona = PERSONA_META[profile.personaId];
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

      {/* 主入口:直接同 persona 傾偈,零選擇 */}
      <button className="card" onClick={() => onOpen('dialogue')}
        style={{ width: '100%', textAlign: 'left', marginTop: 22, padding: '18px 20px',
          display: 'flex', alignItems: 'center', gap: 14, border: '1.5px solid var(--sage)' }}>
        <span style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--dusk-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="22" height="22" viewBox="0 0 56 56" aria-hidden="true">
            <circle cx="28" cy="21" r="11" fill="#8D87AD" />
            <path d="M8 50 C10 37 19 32 28 32 C37 32 46 37 48 50 Z" fill="#B7B2CC" />
          </svg>
        </span>
        <span style={{ flex: 1 }}>
          <span className="serif" style={{ display: 'block', fontSize: 17 }}>同{persona.name}傾偈</span>
          <span className="muted" style={{ display: 'block', marginTop: 3, fontSize: 12.5 }}>想講咩就講,唔使諗點開始</span>
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--faint)" strokeWidth="1.8" strokeLinecap="round"><path d="M9 6l6 6-6 6"/></svg>
      </button>

      {/* 次要 practice:想特別做先揀 */}
      <p className="muted" style={{ margin: '22px 0 10px', fontSize: 12.5 }}>或者,今日想做啲特別嘅</p>
      <div style={{ display: 'flex', gap: 8 }}>
        {SECONDARY.map(c => (
          <button key={c.id} className="card" onClick={() => onOpen(c.id)}
            style={{ flex: 1, textAlign: 'center', padding: '14px 8px' }}>
            <span style={{ display: 'inline-flex', width: 34, height: 34, borderRadius: 10,
              background: 'var(--sage-bg)', color: 'var(--sage-deep)',
              alignItems: 'center', justifyContent: 'center' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{c.icon}</svg>
            </span>
            <span style={{ display: 'block', fontSize: 13, fontWeight: 500, marginTop: 8 }}>{c.title}</span>
            <span className="muted" style={{ display: 'block', fontSize: 11, marginTop: 2 }}>{c.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
