import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import {
  GARDEN, classifyGarden, plantStage, seedStage, todayKey,
  type Entry, type GardenId, type Profile,
} from '../domain';
import { askNotice } from '../services/ai';
import Plant from './Plant';
import Mood from './Mood';

// Garden:你嘅成長變成一個花園。唔係 dashboard,唔係統計。
export default function Garden({ profile }: { profile: Profile }) {
  const [openCat, setOpenCat] = useState<GardenId | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [noticing, setNoticing] = useState(false);
  const [showMood, setShowMood] = useState(false);

  const entries = useLiveQuery(
    () => db.entries.where('profileId').equals(profile.id).toArray(),
    [profile.id],
  );
  const seeds = useLiveQuery(
    () => db.seeds.where('profileId').equals(profile.id).reverse().sortBy('createdAt'),
    [profile.id],
  );

  if (!entries) return <div className="page"><p className="muted">載入緊…</p></div>;

  const days = new Set(entries.map(e => e.dateKey));
  const stage = plantStage(days.size);

  // 分類:優先用已存嘅 garden,冇就即場用關鍵詞分
  const byCat = new Map<GardenId, Entry[]>();
  for (const e of entries) {
    const g = e.garden ?? classifyGarden(e.text, e.type);
    if (!g) continue;
    if (!byCat.has(g)) byCat.set(g, []);
    byCat.get(g)!.push(e);
  }

  async function runNotice() {
    setNoticing(true);
    const res = await askNotice(profile);
    setNotice(res);
    setNoticing(false);
  }

  if (showMood) {
    return (
      <div>
        <div style={{ padding: '16px 18px 0' }}>
          <button className="chip" onClick={() => setShowMood(false)}>← 返去花園</button>
        </div>
        <Mood profile={profile} />
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="serif" style={{ fontSize: 22 }}>花園</h1>

      <div style={{ textAlign: 'center', marginTop: 4 }}>
        <Plant stage={stage.key} watered={days.has(todayKey())} />
        <p style={{ fontSize: 14, color: 'var(--sage-deep)', fontWeight: 500 }}>{stage.label}</p>
        <p className="muted" style={{ marginTop: 4 }}>
          {days.size === 0 ? '寫低第一句,種子就會醒' : `你已經陪咗自己 ${days.size} 日`}
        </p>
      </div>

      {/* ── Notice:AI 唔係喺度陪你傾偈,係幫你留意 ── */}
      <div className="card" style={{ marginTop: 20 }}>
        <p style={{ fontSize: 14, fontWeight: 500 }}>👁 覺察</p>
        {!notice && (
          <>
            <p className="muted" style={{ marginTop: 6, fontSize: 13, lineHeight: 1.8 }}>
              叫我睇一次你最近兩星期嘅記錄,講返我留意到嘅 pattern 俾你聽 — 唔分析、唔建議,純粹留意。
            </p>
            <button className="btn ghost" style={{ marginTop: 12 }} onClick={runNotice} disabled={noticing}>
              {noticing ? '睇緊…' : '幫我留意下最近嘅我'}
            </button>
          </>
        )}
        {notice && (
          <>
            <p className="serif" style={{ marginTop: 10, fontSize: 14, lineHeight: 2, whiteSpace: 'pre-wrap' }}>{notice}</p>
            <button className="chip" style={{ marginTop: 12 }} onClick={() => setNotice(null)}>收埋</button>
          </>
        )}
      </div>

      {/* ── Seeds ── */}
      <p className="muted" style={{ margin: '24px 0 8px' }}>🌱 種子 — 你講過、值得記住嘅說話</p>
      {(!seeds || seeds.length === 0) && (
        <p className="muted" style={{ fontSize: 12 }}>
          喺「隨手記」寫低一句重要嘅說話,揀「呢句係一粒種子」。佢會喺呢度慢慢生長。
        </p>
      )}
      {seeds?.map(s => {
        const st = seedStage(s.createdAt);
        return (
          <div key={s.id} className="card" style={{ marginBottom: 10, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>{st.emoji}</span>
            <span>
              <p className="serif" style={{ fontSize: 14, lineHeight: 1.8 }}>{s.text}</p>
              <p className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                {new Date(s.createdAt).toLocaleDateString('zh-HK', { month: 'long', day: 'numeric' })} 種低 · {st.label}
              </p>
            </span>
          </div>
        );
      })}

      {/* ── 花園分類 ── */}
      <p className="muted" style={{ margin: '24px 0 8px' }}>你嘅人生,而家開緊嘅花</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {(Object.keys(GARDEN) as GardenId[]).map(g => {
          const n = byCat.get(g)?.length ?? 0;
          return (
            <button key={g} className="card" style={{ textAlign: 'left', opacity: n === 0 ? 0.45 : 1 }}
              onClick={() => n > 0 && setOpenCat(openCat === g ? null : g)}>
              <span style={{ fontSize: 22 }}>{GARDEN[g].emoji}</span>
              <p style={{ fontSize: 14, fontWeight: 500, marginTop: 6 }}>{GARDEN[g].name}</p>
              <p className="muted" style={{ fontSize: 11, marginTop: 2 }}>{n === 0 ? '未有' : `${n} 段記錄`}</p>
            </button>
          );
        })}
      </div>

      {openCat && (
        <div style={{ marginTop: 14 }}>
          <p className="muted" style={{ marginBottom: 8 }}>{GARDEN[openCat].emoji} {GARDEN[openCat].name}</p>
          {byCat.get(openCat)!.slice().sort((a, b) => b.createdAt - a.createdAt).slice(0, 20).map(e => (
            <div key={e.id} className="card" style={{ marginBottom: 8 }}>
              <p className="muted" style={{ fontSize: 11, marginBottom: 4 }}>{e.dateKey}</p>
              <p style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{e.text.slice(0, 160)}{e.text.length > 160 ? '…' : ''}</p>
            </div>
          ))}
        </div>
      )}

      <button className="chip" style={{ marginTop: 24 }} onClick={() => setShowMood(true)}>
        📈 睇下呢排嘅起伏
      </button>
    </div>
  );
}
