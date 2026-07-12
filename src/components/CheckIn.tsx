import { useState } from 'react';
import { db, isFirstResponseToday, markGreeted } from '../db';
import { EMOTIONS, PERSONA_META, todayKey, uid, type Emotion, type Profile, type DialogueTurn } from '../domain';
import { askAi, buildMemory } from '../services/ai';
import { speak, stopSpeaking } from '../services/tts';
import CallScreen from './CallScreen';

type Phase = 'write' | 'thinking' | 'ringing' | 'reply';

export default function CheckIn({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const [picked, setPicked] = useState<Emotion[]>([]);
  const [intensity, setIntensity] = useState(5);
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<Phase>('write');
  const [entryId, setEntryId] = useState('');
  const [dialogue, setDialogue] = useState<DialogueTurn[]>([]);
  const [reply, setReply] = useState('');
  const [showText, setShowText] = useState(true);
  const [followUp, setFollowUp] = useState('');
  const [safety, setSafety] = useState(false);

  const toggle = (name: string) =>
    setPicked(p => p.some(e => e.name === name) ? p.filter(e => e.name !== name) : [...p, { name, intensity }]);

  async function callAi(history: DialogueTurn[], task: 'checkin' | 'dialogue' | 'summary') {
    const first = isFirstResponseToday(profile.id, todayKey());
    const memory = await buildMemory(profile.id);
    const voiceMode = profile.responseMode !== 'text';
    const res = await askAi({
      task,
      ctx: { name: profile.name, personaId: profile.personaId, isFirstResponseToday: first, voiceMode },
      memory,
      payload: task === 'checkin'
        ? { emotions: picked.map(e => ({ ...e, intensity })), text }
        : { history },
    });
    markGreeted(profile.id, todayKey());
    return res;
  }

  async function submit() {
    if (!text.trim() && picked.length === 0) return;
    setPhase('thinking');
    const id = uid();
    setEntryId(id);
    await db.entries.add({
      id, profileId: profile.id, type: 'checkin', createdAt: Date.now(), dateKey: todayKey(),
      emotions: picked.map(e => ({ ...e, intensity })), text: text.trim(), dialogue: [],
    });
    const userTurn: DialogueTurn = { role: 'user', text: text.trim() };
    const res = await callAi([userTurn], 'checkin');
    const aiTurn: DialogueTurn = { role: 'ai', text: res.text };
    const dlg = [userTurn, aiTurn];
    setDialogue(dlg);
    setReply(res.text);
    setSafety(res.safety);
    await db.entries.update(id, { dialogue: dlg });
    if (res.safety || profile.responseMode === 'text') {
      setShowText(true);
      setPhase('reply');
    } else if (profile.responseMode === 'voice') {
      setShowText(false);
      setPhase('reply');
      speak(res.text, profile.personaId);
    } else {
      setPhase('ringing');
    }
  }

  async function sendFollowUp() {
    if (!followUp.trim()) return;
    const userTurn: DialogueTurn = { role: 'user', text: followUp.trim() };
    const next = [...dialogue, userTurn];
    setDialogue(next);
    setFollowUp('');
    setReply('');
    setPhase('thinking');
    const res = await callAi(next, 'dialogue');
    const dlg = [...next, { role: 'ai' as const, text: res.text }];
    setDialogue(dlg);
    setReply(res.text);
    setSafety(res.safety);
    await db.entries.update(entryId, { dialogue: dlg });
    setPhase('reply');
    if (showText === false) speak(res.text, profile.personaId);
  }

  function finish() {
    stopSpeaking();
    onDone();
  }

  if (phase === 'ringing') {
    return (
      <CallScreen
        personaId={profile.personaId}
        onAccept={() => { setShowText(false); setPhase('reply'); speak(reply, profile.personaId, () => setShowText(true)); }}
        onDecline={() => { setShowText(true); setPhase('reply'); }}
      />
    );
  }

  return (
    <div className="page">
      <p className="muted">情緒簽到</p>
      {phase === 'write' && (
        <>
          <h2 className="serif" style={{ fontSize: 20, margin: '10px 0 16px' }}>而家有咩感覺?</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {EMOTIONS.map(e => (
              <button key={e.name} className={`chip ${picked.some(p => p.name === e.name) ? 'on' : ''}`} onClick={() => toggle(e.name)}>
                {e.name}
              </button>
            ))}
          </div>
          {picked.length > 0 && (
            <div className="card" style={{ marginTop: 16 }}>
              <p className="muted" style={{ marginBottom: 10 }}>有幾強烈? {intensity}/10</p>
              <input type="range" min={1} max={10} step={1} value={intensity}
                onChange={e => setIntensity(Number(e.target.value))} style={{ width: '100%' }} />
            </div>
          )}
          <textarea className="entry" style={{ marginTop: 16 }} placeholder="發生咗咩事?想講幾多都得…"
            value={text} onChange={e => setText(e.target.value)} />
          <button className="btn primary" style={{ marginTop: 16 }} onClick={submit}>記低</button>
        </>
      )}

      {phase === 'thinking' && (
        <div style={{ textAlign: 'center', paddingTop: 80 }}>
          <div className="dot-breathe" />
          <p className="muted">{PERSONA_META[profile.personaId].name}聽緊…</p>
        </div>
      )}

      {phase === 'reply' && (
        <>
          <div className="card" style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: text ? 10 : 0 }}>
              {picked.map(e => <span key={e.name} className="chip" style={{ fontSize: 12, padding: '4px 10px' }}>{e.name} {intensity}/10</span>)}
            </div>
            {text && <p style={{ fontSize: 14, lineHeight: 1.7 }}>{text}</p>}
          </div>
          <div className="ai-card" style={{ marginTop: 14 }}>
            <p className="who">{PERSONA_META[profile.personaId].name}{!showText && ' · 語音'}</p>
            {showText
              ? <p className="say">{reply}</p>
              : <button className="btn ghost" onClick={() => speak(reply, profile.personaId)}>再聽一次</button>}
            {!showText && <button style={{ marginTop: 10, fontSize: 13, color: 'var(--mist)' }} onClick={() => setShowText(true)}>顯示文字</button>}
          </div>
          {safety && (
            <div className="card" style={{ marginTop: 14, borderLeft: '3px solid var(--blush)' }}>
              <p style={{ fontSize: 13, lineHeight: 1.8 }}>
                如果你而家好辛苦,可以隨時搵人傾:<br />
                香港撒瑪利亞防止自殺會 2389 2222(24小時)<br />
                生命熱線 2382 0000(24小時)<br />
                明愛向晴軒 18288(24小時)
              </p>
            </div>
          )}
          <textarea className="entry" style={{ marginTop: 16, minHeight: 70 }} placeholder="想傾多啲就寫喺度…"
            value={followUp} onChange={e => setFollowUp(e.target.value)} />
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button className="btn primary" style={{ flex: 1 }} onClick={sendFollowUp}>想傾多啲</button>
            <button className="btn ghost" style={{ flex: 1 }} onClick={finish}>今日到此為止</button>
          </div>
        </>
      )}
    </div>
  );
}
