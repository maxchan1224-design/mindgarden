import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getActiveProfileId, setActiveProfileId } from './db';
import { uid, type Profile } from './domain';
import Home, { type Practice } from './components/Home';
import CheckIn from './components/CheckIn';
import Dialogue from './components/Dialogue';
import Body from './components/Body';
import Gratitude from './components/Gratitude';
import Journal from './components/Journal';
import Mood from './components/Mood';
import Settings from './components/Settings';
import { PERSONA_META, type PersonaId } from './domain';

type Tab = 'home' | 'journal' | 'mood' | 'settings';

function Onboarding({ onDone }: { onDone: (p: Profile) => void }) {
  const [step, setStep] = useState<'name' | 'persona'>('name');
  const [name, setName] = useState('');
  const [personaId, setPersonaId] = useState<PersonaId>('aqing');

  async function finish() {
    const n = name.trim();
    if (!n) return;
    const p: Profile = {
      id: uid(), name: n, personaId, responseMode: 'ask',
      chatMode: 'companion', voiceLang: 'yue' as const, createdAt: Date.now(),
    };
    await db.profiles.add(p);
    setActiveProfileId(p.id);
    onDone(p);
  }

  if (step === 'name') {
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '80dvh' }}>
        <h1 className="serif" style={{ fontSize: 28 }}>MindGarden</h1>
        <p className="muted" style={{ marginTop: 10, lineHeight: 1.8 }}>呢度係一個安靜嘅地方。<br />你講,有人聽。你嘅記錄只留喺呢部裝置。</p>
        <p style={{ marginTop: 36, fontSize: 15 }}>我可以點稱呼你?</p>
        <div className="card" style={{ marginTop: 12 }}>
          <input autoFocus style={{ border: 'none', background: 'none', width: '100%', outline: 'none' }}
            placeholder="你嘅名…" value={name} onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && name.trim() && setStep('persona')} />
        </div>
        <button className="btn primary" style={{ marginTop: 20, opacity: name.trim() ? 1 : 0.45 }}
          disabled={!name.trim()} onClick={() => setStep('persona')}>繼續</button>
      </div>
    );
  }

  return (
    <div className="page" style={{ minHeight: '80dvh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <h2 className="serif" style={{ fontSize: 22 }}>{name},想邊個陪你?</h2>
      <p className="muted" style={{ marginTop: 8, marginBottom: 20 }}>揀一個而家啱你嘅。日後想換,設定改就得。</p>
      {(Object.keys(PERSONA_META) as PersonaId[]).map(pid => (
        <button key={pid} className="card" onClick={() => setPersonaId(pid)}
          style={{ width: '100%', textAlign: 'left', marginBottom: 10, border: personaId === pid ? '1.5px solid var(--sage)' : '1.5px solid transparent' }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              <span className="serif" style={{ fontSize: 17 }}>{PERSONA_META[pid].name}</span>
              <span className="muted" style={{ marginLeft: 10, fontSize: 13 }}>{PERSONA_META[pid].tagline}</span>
            </span>
            {personaId === pid && <span style={{ color: 'var(--sage)' }}>✓</span>}
          </span>
          <span className="muted" style={{ display: 'block', marginTop: 8, fontSize: 12.5, lineHeight: 1.75 }}>
            {PERSONA_META[pid].bio}
          </span>
        </button>
      ))}
      <button className="btn primary" style={{ marginTop: 10 }} onClick={finish}>開始</button>
    </div>
  );
}

const TABS: { id: Tab; label: string; icon: JSX.Element }[] = [
  { id: 'home', label: '主頁', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 21V11m0 0C12 7 9 5 5 5c0 4 3 6 7 6zm0-2c0-3 2.5-5 6-5 0 3-2.5 5-6 5z"/></svg> },
  { id: 'journal', label: '日記', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 4h13a1 1 0 011 1v15H6a1 1 0 01-1-1zM8 8h8M8 12h8M8 16h5"/></svg> },
  { id: 'mood', label: '起伏', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 15c3-6 5 2 8-4s5 2 10-4"/></svg> },
  { id: 'settings', label: '設定', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 00-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 00-2-1.2L14 3h-4l-.5 2.7a7 7 0 00-2 1.2l-2.4-1-2 3.4 2 1.5a7 7 0 000 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 002 1.2L10 21h4l.5-2.7a7 7 0 002-1.2l2.4 1 2-3.4-2-1.5c.06-.4.1-.8.1-1.2z"/></svg> },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('home');
  const [practice, setPractice] = useState<Practice | null>(null);
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

  const done = () => { setPractice(null); setTab('home'); };

  return (
    <>
      {practice === 'checkin' && <CheckIn key="c" profile={profile} onDone={done} />}
      {practice === 'dialogue' && <Dialogue key="d" profile={profile} onDone={done} />}
      {practice === 'body' && <Body key="b" profile={profile} onDone={done} />}
      {practice === 'gratitude' && <Gratitude key="g" profile={profile} onDone={done} />}

      {!practice && tab === 'home' && <Home profile={profile} onOpen={setPractice} />}
      {!practice && tab === 'journal' && <Journal profile={profile} />}
      {!practice && tab === 'mood' && <Mood profile={profile} />}
      {!practice && tab === 'settings' && (
        <Settings profile={profile} onSwitch={() => { setProfileId(getActiveProfileId()); setTab('home'); }} />
      )}

      <nav className="tabbar" aria-label="主導航">
        {TABS.map(t => (
          <button key={t.id} className={!practice && tab === t.id ? 'on' : ''}
            onClick={() => { setPractice(null); setTab(t.id); }} aria-label={t.label}>
            {t.icon}<span>{t.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}
