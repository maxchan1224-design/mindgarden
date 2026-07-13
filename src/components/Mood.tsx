import { useState } from 'react';
import { db } from '../db';
import { classifyGarden, todayKey, uid, type Profile } from '../domain';

// Capture:想到就記。冇 AI、冇問題、冇任何多餘步驟。
// 兩個可選開關:🌱 種子(一句重要嘅說話)/ ⏳ 時間囊(留返將來先開)
export default function Capture({ profile }: { profile: Profile }) {
  const [text, setText] = useState('');
  const [asSeed, setAsSeed] = useState(false);
  const [asCapsule, setAsCapsule] = useState(false);
  const [openIn, setOpenIn] = useState<'1y' | '3y' | '5y'>('1y');
  const [saved, setSaved] = useState<string | null>(null);

  async function save() {
    const t = text.trim();
    if (!t) return;
    const now = Date.now();
    const years = openIn === '1y' ? 1 : openIn === '3y' ? 3 : 5;

    await db.entries.add({
      id: uid(), profileId: profile.id,
      type: asCapsule ? 'capsule' : 'thought',
      createdAt: now, dateKey: todayKey(),
      emotions: [], text: t, dialogue: [],
      garden: classifyGarden(t, 'thought') ?? undefined,
      openAt: asCapsule ? now + years * 365 * 86400_000 : undefined,
    });
    if (asSeed) {
      await db.seeds.add({ id: uid(), profileId: profile.id, text: t, createdAt: now, dateKey: todayKey() });
    }
    setSaved(asCapsule ? `封好喇。${years} 年後先開。` : asSeed ? '種低咗 🌱' : '記低咗');
    setText(''); setAsSeed(false); setAsCapsule(false);
    setTimeout(() => setSaved(null), 2200);
  }

  return (
    <div className="page">
      <h1 className="serif" style={{ fontSize: 22 }}>隨手記</h1>
      <p className="muted" style={{ marginTop: 6 }}>突然彈出嘅諗法,唔使整齊,唔使成句。</p>

      <textarea className="entry" style={{ marginTop: 16, minHeight: 150 }} autoFocus
        placeholder="寫低就走得,唔會有人問你問題…"
        value={text} onChange={e => setText(e.target.value)} />

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button className={`chip ${asSeed ? 'on' : ''}`} onClick={() => setAsSeed(v => !v)}>
          🌱 呢句係一粒種子
        </button>
        <button className={`chip ${asCapsule ? 'on' : ''}`} onClick={() => setAsCapsule(v => !v)}>
          ⏳ 時間囊
        </button>
      </div>
      {asSeed && (
        <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>
          種子係一句對你重要嘅說話。佢會喺花園慢慢生長:🌱 → 🌿 → 🌳
        </p>
      )}
      {asCapsule && (
        <div style={{ marginTop: 10 }}>
          <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>寫俾將來嘅自己。封好之後,時間未到打唔開。</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['1y', '3y', '5y'] as const).map(k => (
              <button key={k} className={`chip ${openIn === k ? 'on' : ''}`} onClick={() => setOpenIn(k)}>
                {k === '1y' ? '一年後開' : k === '3y' ? '三年後開' : '五年後開'}
              </button>
            ))}
          </div>
        </div>
      )}

      <button className="btn primary" style={{ marginTop: 16 }} onClick={save}>
        {asCapsule ? '封起佢' : '記低'}
      </button>
      {saved && <p style={{ marginTop: 14, textAlign: 'center', color: 'var(--sage-deep)', fontSize: 14 }}>{saved}</p>}
    </div>
  );
}
