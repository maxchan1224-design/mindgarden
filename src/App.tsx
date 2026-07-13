import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getActiveProfileId, setActiveProfileId } from './db';
import { uid, type Need, type Profile, type StyleId } from './domain';
import Reflect from './components/Reflect';
import Capture from './components/Capture';
import Library from './components/Library';
import Garden from './components/Garden';
import CheckIn from './components/CheckIn';
import Dialogue from './components/Dialogue';
import Body from './components/Body';
import Gratitude from './components/Gratitude';
import Settings from './components/Settings';

// v0.2 導航:Capture / Reflect / Library / Garden — 冇 Insights,冇 Statistics。
// 設定收埋喺 Reflect 頁右上角。
type Tab = 'reflect' | 'capture' | 'library' | 'garden';
export type Practice = 'checkin' | 'dialogue' | 'body' | 'gratitude';

function Onboarding({ onDone }: { onDone: (p: Profile) => void }) {
  const [name, setName] = useState('');
  async function start() {
    const n = name.trim();
    if (!n) return;
    const p: Profile = {
      id: uid(), name: n, personaId: 'aqing', responseMode: 'ask',
      chatMode: 'companion', styleId: 'quiet', voiceLang: 'yue' as const, createdAt: Date.now(),
    };
    await db.profiles.add(p);
    setActiveProfileId(p.id);
    onDone(p);
  }
  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '80dvh' }}>
      <h1 className="serif" style={{ fontSize: 28 }}>MindGarden</h1>
      <p className="muted" style={{ marginTop: 10, lineHeight: 1.8 }}>
        一個每晚返嚟嘅安靜地方。<br />唔係日記,唔係打卡 — 係陪你留意自己。<br />你嘅記錄只會留喺呢部裝置。
      </p>
      <p style={{ marginTop: 36, fontSize: 15 }}>想我哋點稱呼你?</p>
      <div className="card" style={{ marginTop: 12 }}>
        <input autoFocus style={{ border: 'none', background: 'none', width: '100%', outline: 'none' }}
          placeholder="你嘅名…" value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && start()} />
      </div>
      <button className="btn primary" style={{ marginTop: 20 }} onClick={start}>開始</button>
    </div>
  );
}

const TABS: { id: Tab; label: string; icon: JSX.Element }[] = [
  { id: 'reflect', label: '今晚', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M20 13A8 8 0 1111 4a6.5 6.5 0 009 9z"/></svg> },
  { id: 'capture', label: '隨手記', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg> },
  { id: 'library', label: '收藏庫', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2H6a2 2 0 01-2-2zM13 3v5h5"/></svg> },
  { id: 'garden', label: '花園', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 21V11m0 0C12 7 9 5 5 5c0 4 3 6 7 6zm0-2c0-3 2.5-5 6-5 0 3-2.5 5-6 5z"/></svg> },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('reflect');
  const [practice, setPractice] = useState<Practice | null>(null);
  const [sessionStyle, setSessionStyle] = useState<StyleId | undefined>(undefined);
  const [showSettings, setShowSettings] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(getActiveProfileId());
  const [ready, setReady] = useState(false);

  const profile = useLiveQuery(
    async () => (profileId ? await db.profiles.get(profileId) : undefined),
    [profileId],
  );

  useEffect(() => {
    (async () => {
      const id = getActiveProfileId();
      if (id && (await db.profiles.get(id))) setProfileId(id);
      else {
        const first = await db.profiles.orderBy('createdAt').first();
        if (first) { setActiveProfileId(first.id); setProfileId(first.id); }
        else setProfileId(null);
      }
      setReady(true);
    })();
  }, []);

  if (!ready) return null;
  if (!profileId || !profile) return <Onboarding onDone={p => setProfileId(p.id)} />;

  const done = () => { setPractice(null); setSessionStyle(undefined); setTab('reflect'); };

  // 由「今晚你需要啲咩」入嚟:need 決定練習 + 對話風格
  const openNeed = (n: Need) => { setSessionStyle(n.style); setPractice(n.practice); };

  return (
    <>
      {practice === 'checkin' && <CheckIn key="c" profile={profile} initialStyle={sessionStyle} onDone={done} />}
      {practice === 'dialogue' && <Dialogue key="d" profile={profile} initialStyle={sessionStyle} onDone={done} />}
      {practice === 'body' && <Body key="b" profile={profile} onDone={done} />}
      {practice === 'gratitude' && <Gratitude key="g" profile={profile} onDone={done} />}

      {!practice && showSettings && (
        <Settings profile={profile}
          onSwitch={() => { setProfileId(getActiveProfileId()); setShowSettings(false); setTab('reflect'); }} />
      )}
      {!practice && !showSettings && tab === 'reflect' && (
        <Reflect profile={profile} onNeed={openNeed} onSettings={() => setShowSettings(true)} />
      )}
      {!practice && !showSettings && tab === 'capture' && <Capture profile={profile} />}
      {!practice && !showSettings && tab === 'library' && <Library profile={profile} />}
      {!practice && !showSettings && tab === 'garden' && <Garden profile={profile} />}

      <nav className="tabbar" aria-label="主導航">
        {TABS.map(t => (
          <button key={t.id} className={!practice && !showSettings && tab === t.id ? 'on' : ''}
            onClick={() => { setPractice(null); setShowSettings(false); setTab(t.id); }} aria-label={t.label}>
            {t.icon}<span>{t.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
