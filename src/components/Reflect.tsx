import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import {
  NEEDS, SEASONS, isSilenceDay, todayKey, uid,
  type Need, type Profile, type SeasonId,
} from '../domain';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return '夜深了';
  if (h < 12) return '早晨';
  if (h < 18) return '午安';
  return '歡迎返嚟';
}

// 首頁唔再問「今日心情如何」。
// 只問一條問題:今晚你需要啲咩?
export default function Reflect({
  profile, onNeed, onSettings,
}: {
  profile: Profile;
  onNeed: (n: Need) => void;
  onSettings: () => void;
}) {
  const [skipSilence, setSkipSilence] = useState(false);
  const silence = isSilenceDay() && !skipSilence;

  const todayEntries = useLiveQuery(
    () => db.entries.where('[profileId+dateKey]').equals([profile.id, todayKey()]).toArray(),
    [profile.id],
  );
  const todaySeason = todayEntries?.find(e => e.season)?.season ?? null;

  async function pickSeason(s: SeasonId) {
    // 就算只揀咗季節,都算完成咗今晚嘅 check-in — 呢個係降低門檻嘅關鍵
    const existing = todayEntries?.find(e => e.season);
    if (existing) { await db.entries.update(existing.id, { season: s }); return; }
    await db.entries.add({
      id: uid(), profileId: profile.id, type: 'checkin', createdAt: Date.now(),
      dateKey: todayKey(), emotions: [], text: '', dialogue: [], season: s,
    });
  }

  const dateStr = new Date().toLocaleDateString('zh-HK', { month: 'long', day: 'numeric', weekday: 'long' });

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p className="muted">{dateStr}</p>
          <h1 className="serif" style={{ fontSize: 24, marginTop: 6 }}>{greeting()},{profile.name}</h1>
        </div>
        <button aria-label="設定" onClick={onSettings} style={{ color: 'var(--faint)', padding: 6, marginTop: 2 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 00-2-1.2L14 3h-4l-.5 2.7a7 7 0 00-2 1.2l-2.4-1-2 3.4 2 1.5a7 7 0 000 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 002 1.2L10 21h4l.5-2.7a7 7 0 002-1.2l2.4 1 2-3.4-2-1.5c.06-.4.1-.8.1-1.2z" />
          </svg>
        </button>
      </div>

      {silence ? (
        <SilenceCard onWrite={() => setSkipSilence(true)} />
      ) : (
        <>
          <p style={{ marginTop: 26, fontSize: 15, color: 'var(--mist)' }}>開始之前⋯⋯</p>
          <h2 className="serif" style={{ fontSize: 20, marginTop: 6 }}>今晚你需要啲咩?</h2>

          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {NEEDS.map(n => (
              <button key={n.id} className="card"
                style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14, padding: '18px' }}
                onClick={() => onNeed(n)}>
                <span style={{ fontSize: 26, flexShrink: 0 }}>{n.emoji}</span>
                <span>
                  <span style={{ display: 'block', fontSize: 16, fontWeight: 500 }}>{n.title}</span>
                  <span className="muted" style={{ display: 'block', marginTop: 3, fontSize: 12 }}>{n.sub}</span>
                </span>
              </button>
            ))}
          </div>

          <p className="muted" style={{ marginTop: 26, marginBottom: 8 }}>
            或者,只係話我知 — 你而家喺邊個季節?
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            {(Object.keys(SEASONS) as SeasonId[]).map(s => (
              <button key={s} className={`chip ${todaySeason === s ? 'on' : ''}`}
                style={{ flex: 1, textAlign: 'center', padding: '10px 0' }}
                onClick={() => pickSeason(s)}>
                {SEASONS[s].emoji} {SEASONS[s].name}
              </button>
            ))}
          </div>
          {todaySeason && (
            <p className="muted" style={{ marginTop: 10, textAlign: 'center', fontSize: 12 }}>
              {SEASONS[todaySeason].desc}。{todaySeason === 'winter' ? '冬天都係成長嘅一部分。' : ''}今晚已經算完成 ✓
            </p>
          )}
        </>
      )}
    </div>
  );
}

// Silence:每星期一日,乜都唔使寫。只係陪你坐一分鐘。
function SilenceCard({ onWrite }: { onWrite: () => void }) {
  const [seconds, setSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (seconds === null || seconds <= 0) return;
    const t = setTimeout(() => setSeconds(s => (s ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  return (
    <div style={{ marginTop: 40, textAlign: 'center' }}>
      <p style={{ fontSize: 34 }}>🌙</p>
      <h2 className="serif" style={{ fontSize: 20, marginTop: 14 }}>今日唔使寫。</h2>
      <p className="muted" style={{ marginTop: 10, lineHeight: 1.9 }}>
        每個星期日係安靜日。<br />冇任何輸入,冇任何任務。<br />我淨係陪你坐一分鐘。
      </p>

      {seconds === null && (
        <button className="btn primary" style={{ marginTop: 28 }} onClick={() => setSeconds(60)}>
          坐低
        </button>
      )}
      {seconds !== null && seconds > 0 && (
        <div style={{ marginTop: 28 }}>
          <p className="serif" style={{ fontSize: 40, color: 'var(--sage-deep)' }}>{seconds}</p>
          <p className="muted" style={{ marginTop: 8 }}>唔使做任何嘢,呼吸就得</p>
        </div>
      )}
      {seconds === 0 && (
        <p className="serif" style={{ marginTop: 28, fontSize: 16, color: 'var(--sage-deep)' }}>
          好喇。今日到此為止,聽晚見。
        </p>
      )}

      <button className="btn ghost" style={{ marginTop: 34 }} onClick={onWrite}>
        我今晚真係想寫嘢
      </button>
    </div>
  );
}
