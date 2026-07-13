import { useState } from 'react';
import { db, isFirstResponseToday, markGreeted } from '../db';
import { PERSONA_META, todayKey, type DialogueTurn, type Profile } from '../domain';
import { askAi, buildMemory } from '../services/ai';
import { speak, stopSpeaking } from '../services/tts';
import CallScreen from './CallScreen';

type Phase = 'thinking' | 'ringing' | 'reply';

// 所有功能共用嘅對話引擎:AI 回應 + 來電卡 + 多輪對話 + safety card
export default function Conversation({
  profile, entryId, initialText, emotions, topic, onDone,
}: {
  profile: Profile;
  entryId: string;
  initialText: string;
  emotions?: { name: string; intensity: number }[];
  topic?: string;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('thinking');
  const [dialogue, setDialogue] = useState<DialogueTurn[]>([]);
  const [reply, setReply] = useState('');
  const [longText, setLongText] = useState<string | undefined>();
  const [showText, setShowText] = useState(true);
  const [followUp, setFollowUp] = useState('');
  const [safety, setSafety] = useState(false);
  const [started, setStarted] = useState(false);

  async function call(history: DialogueTurn[], task: 'checkin' | 'dialogue') {
    const first = isFirstResponseToday(profile.id, todayKey());
    const memory = await buildMemory(profile.id);
    const voiceMode = profile.responseMode !== 'text';
    const res = await askAi({
      task,
      ctx: {
        name: profile.name,
        personaId: profile.personaId,
        isFirstResponseToday: first,
        voiceMode,
        chatMode: profile.chatMode ?? 'companion',
      },
      memory,
      topic,
      payload: task === 'checkin' ? { emotions, text: initialText } : { history },
    });
    markGreeted(profile.id, todayKey());
    return res;
  }

  // 第一次 AI 回應
  if (!started) {
    setStarted(true);
    (async () => {
      const userTurn: DialogueTurn = { role: 'user', text: initialText };
      const res = await call([userTurn], 'checkin');
      const dlg = [userTurn, { role: 'ai' as const, text: res.text }];
      setDialogue(dlg);
      setReply(res.text);
      setLongText(res.longText);
      setSafety(res.safety);
      await db.entries.update(entryId, { dialogue: dlg });
      if (res.safety || profile.responseMode === 'text') {
        setShowText(true);
        setPhase('reply');
      } else if (profile.responseMode === 'voice') {
        setShowText(false);
        setPhase('reply');
        speak(res.text, profile.personaId, () => setShowText(true));
      } else {
        setPhase('ringing');
      }
    })();
  }

  async function sendFollowUp() {
    if (!followUp.trim()) return;
    const userTurn: DialogueTurn = { role: 'user', text: followUp.trim() };
    const next = [...dialogue, userTurn];
    setDialogue(next);
    setFollowUp('');
    setPhase('thinking');
    const res = await call(next, 'dialogue');
    const dlg = [...next, { role: 'ai' as const, text: res.text }];
    setDialogue(dlg);
    setReply(res.text);
    setLongText(res.longText);
    setSafety(res.safety);
    await db.entries.update(entryId, { dialogue: dlg });
    setPhase('reply');
    if (!showText) speak(res.text, profile.personaId);
  }

  const persona = PERSONA_META[profile.personaId];

  return (
    <>
      {phase === 'ringing' && (
        <CallScreen
          personaId={profile.personaId}
          onAccept={() => { setShowText(false); setPhase('reply'); speak(reply, profile.personaId, () => setShowText(true)); }}
          onDecline={() => { setShowText(true); setPhase('reply'); }}
        />
      )}

      {/* 對話歷史(除咗最新一則 AI 回應) */}
      {dialogue.slice(0, -1).map((t, i) => (
        t.role === 'user' ? (
          <div key={i} className="card" style={{ marginTop: 12 }}>
            <p style={{ fontSize: 14, lineHeight: 1.7 }}>{t.text}</p>
          </div>
        ) : (
          <div key={i} className="ai-card" style={{ marginTop: 12, opacity: 0.6 }}>
            <p className="who">{persona.name}</p>
            <p className="say" style={{ fontSize: 14 }}>{t.text}</p>
          </div>
        )
      ))}

      {phase === 'thinking' && (
        <div style={{ textAlign: 'center', paddingTop: 40 }}>
          <div className="dot-breathe" />
          <p className="muted">{persona.name}聽緊…</p>
        </div>
      )}

      {phase === 'reply' && (
        <>
          <div className="ai-card" style={{ marginTop: 14 }}>
            <p className="who">{persona.name}{!showText && ' · 語音'}</p>
            {showText ? (
              <p className="say" style={{ whiteSpace: 'pre-wrap' }}>{longText || reply}</p>
            ) : (
              <>
                <button className="btn ghost" onClick={() => speak(reply, profile.personaId)}>再聽一次</button>
                <button style={{ marginTop: 10, fontSize: 13, color: 'var(--mist)' }} onClick={() => { stopSpeaking(); setShowText(true); }}>
                  顯示文字
                </button>
              </>
            )}
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

          <textarea className="entry" style={{ marginTop: 16, minHeight: 70 }}
            placeholder="想講咩就講…"
            value={followUp} onChange={e => setFollowUp(e.target.value)} />
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button className="btn primary" style={{ flex: 1 }} onClick={sendFollowUp}>傾落去</button>
            <button className="btn ghost" style={{ flex: 1 }} onClick={() => { stopSpeaking(); onDone(); }}>今日到此為止</button>
          </div>
        </>
      )}
    </>
  );
}
