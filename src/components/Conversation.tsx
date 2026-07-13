import { useState } from 'react';
import { db, isFirstResponseToday, markGreeted } from '../db';
import { PERSONA_META, todayKey, type DialogueTurn, type Profile, type VoiceLang } from '../domain';
import { askAi, buildMemory } from '../services/ai';
import { speak, stopSpeaking } from '../services/tts';
import CallScreen from './CallScreen';

type Phase = 'thinking' | 'ringing' | 'reply';

// 所有功能共用嘅對話引擎。
// 只有第一則 AI 回應先有可能出現來電卡(ask 模式)或者自動語音(voice 模式)。
// 之後嘅 follow-up 一律淨係文字,唔會再彈電話 / 再自動讀聲 —— 想聽先撳「播放」。
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
  const [longText, setLongText] = useState<string | undefined>();
  const [followUp, setFollowUp] = useState('');
  const [safety, setSafety] = useState(false);
  const [started, setStarted] = useState(false);
  const [isFirstReply, setIsFirstReply] = useState(true);
  const [speaking, setSpeaking] = useState(false);

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

  function playVoice(text: string) {
    setSpeaking(true);
    speak(text, profile.personaId, profile.voiceLang ?? 'yue', () => setSpeaking(false));
  }

  // 第一次 AI 回應
  if (!started) {
    setStarted(true);
    (async () => {
      const userTurn: DialogueTurn = { role: 'user', text: initialText };
      const res = await call([userTurn], 'checkin');
      const dlg = [userTurn, { role: 'ai' as const, text: res.text }];
      setDialogue(dlg);
      setLongText(res.longText);
      setSafety(res.safety);
      await db.entries.update(entryId, { dialogue: dlg });

      if (res.safety || profile.responseMode === 'text') {
        setPhase('reply');
      } else if (profile.responseMode === 'voice') {
        setPhase('reply');
        playVoice(res.text); // 文字即刻顯示,聲音同步播
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
    setIsFirstReply(false);
    setPhase('thinking');
    const res = await call(next, 'dialogue');
    const dlg = [...next, { role: 'ai' as const, text: res.text }];
    setDialogue(dlg);
    setLongText(res.longText);
    setSafety(res.safety);
    await db.entries.update(entryId, { dialogue: dlg });
    setPhase('reply'); // follow-up 一律淨文字,唔自動讀聲
  }

  const persona = PERSONA_META[profile.personaId];
  const latestAi = dialogue.filter(t => t.role === 'ai').slice(-1)[0];

  return (
    <>
      {phase === 'ringing' && (
        <CallScreen
          personaId={profile.personaId}
          onAccept={() => { setPhase('reply'); playVoice(latestAi?.text ?? ''); }}
          onDecline={() => setPhase('reply')}
        />
      )}

      {/* 對話歷史。
          slice(1, -1):跳過第一個 user turn(parent component 已經顯示咗,
          再 render 一次就會重複),同埋跳過最新一則 AI 回應(下面單獨 render)。 */}
      {dialogue.slice(1, -1).map((t, i) => (
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
        <div className="typing-row">
          <span className="typing-dots"><i /><i /><i /></span>
          <p className="muted">{persona.name}打緊字</p>
        </div>
      )}

      {phase === 'reply' && latestAi && (
        <>
          <div className="ai-card" style={{ marginTop: 14 }}>
            <p className="who">{persona.name}</p>
            <p className="say" style={{ whiteSpace: 'pre-wrap' }}>{longText || latestAi.text}</p>
            {profile.responseMode !== 'text' && (
              <button
                style={{ marginTop: 10, fontSize: 12, color: 'var(--dusk-deep)', display: 'flex', alignItems: 'center', gap: 5 }}
                onClick={() => speaking ? (stopSpeaking(), setSpeaking(false)) : playVoice(latestAi.text)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M4 9v6h4l5 5V4L8 9H4z" /></svg>
                {speaking ? '停止' : '播放語音'}
              </button>
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
