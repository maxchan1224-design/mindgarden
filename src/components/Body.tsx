import { useState } from 'react';
import { db } from '../db';
import { BODY_FEELINGS, todayKey, uid, type Profile } from '../domain';
import Conversation from './Conversation';

// 身體部位:名稱 + 喺人形圖嘅大約座標(百分比)
const BODY_PARTS = [
  { key: '頭',   cx: 50, cy: 9  },
  { key: '頸',   cx: 50, cy: 17 },
  { key: '左肩', cx: 31, cy: 24 },
  { key: '右肩', cx: 69, cy: 24 },
  { key: '胸口', cx: 50, cy: 31 },
  { key: '胃',   cx: 50, cy: 41 },
  { key: '背',   cx: 50, cy: 36 },
  { key: '左手', cx: 20, cy: 48 },
  { key: '右手', cx: 80, cy: 48 },
  { key: '腰',   cx: 50, cy: 51 },
  { key: '左腿', cx: 38, cy: 66 },
  { key: '右腿', cx: 62, cy: 66 },
  { key: '左腳', cx: 38, cy: 85 },
  { key: '右腳', cx: 62, cy: 85 },
];

// 人形 SVG 路徑
function BodyFigure({
  marks, activePart, onTap,
}: {
  marks: { part: string; feeling: string }[];
  activePart: string | null;
  onTap: (part: string) => void;
}) {
  const markedKeys = new Set(marks.map(m => m.part));
  return (
    <svg viewBox="0 0 100 100" style={{ width: '100%', maxWidth: 200, display: 'block', margin: '0 auto' }}
      role="img" aria-label="人形圖,可以撳身體各部位">
      {/* 人形輪廓 */}
      {/* 頭 */}
      <ellipse cx="50" cy="9" rx="7" ry="7.5" fill="var(--sage-bg)" stroke="var(--sage)" strokeWidth="0.8" />
      {/* 頸 */}
      <rect x="47" y="16" width="6" height="4" rx="1" fill="var(--sage-bg)" stroke="var(--sage)" strokeWidth="0.8" />
      {/* 身體 */}
      <rect x="36" y="20" width="28" height="34" rx="5" fill="var(--sage-bg)" stroke="var(--sage)" strokeWidth="0.8" />
      {/* 左手臂 */}
      <rect x="24" y="21" width="11" height="32" rx="4" fill="var(--sage-bg)" stroke="var(--sage)" strokeWidth="0.8" />
      {/* 右手臂 */}
      <rect x="65" y="21" width="11" height="32" rx="4" fill="var(--sage-bg)" stroke="var(--sage)" strokeWidth="0.8" />
      {/* 左腿 */}
      <rect x="36" y="55" width="12" height="34" rx="4" fill="var(--sage-bg)" stroke="var(--sage)" strokeWidth="0.8" />
      {/* 右腿 */}
      <rect x="52" y="55" width="12" height="34" rx="4" fill="var(--sage-bg)" stroke="var(--sage)" strokeWidth="0.8" />

      {/* tap 熱點:每個部位一個透明圓,揀咗就有顏色 */}
      {BODY_PARTS.map(p => {
        const isActive = activePart === p.key;
        const isMarked = markedKeys.has(p.key);
        return (
          <g key={p.key} onClick={() => onTap(p.key)} style={{ cursor: 'pointer' }}>
            <circle
              cx={p.cx} cy={p.cy} r="7"
              fill={isActive ? '#8D87AD' : isMarked ? '#B7B2CC' : 'transparent'}
              fillOpacity={isActive ? 0.7 : isMarked ? 0.5 : 0}
              stroke={isActive || isMarked ? '#8D87AD' : 'transparent'}
              strokeWidth="0.8"
            />
            {isMarked && !isActive && (
              <circle cx={p.cx} cy={p.cy} r="2.5" fill="#8D87AD" />
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function Body({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const [marks, setMarks] = useState<{ part: string; feeling: string }[]>([]);
  const [activePart, setActivePart] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [entryId, setEntryId] = useState('');
  const [submitted, setSubmitted] = useState<string | null>(null);

  function tapPart(part: string) {
    setActivePart(prev => prev === part ? null : part);
  }

  function setFeeling(feeling: string) {
    if (!activePart) return;
    setMarks(m => [...m.filter(x => x.part !== activePart), { part: activePart, feeling }]);
    setActivePart(null);
  }

  function removeMark(part: string) {
    setMarks(m => m.filter(x => x.part !== part));
  }

  async function submit() {
    // 可以完全唔揀部位,純靠文字都得
    const partsDesc = marks.length > 0
      ? marks.map(m => `${m.part}:${m.feeling}`).join('、')
      : '';
    const full = [partsDesc, note.trim()].filter(Boolean).join('\n');
    if (!full) return;
    const id = uid();
    await db.entries.add({
      id, profileId: profile.id, type: 'body', createdAt: Date.now(), dateKey: todayKey(),
      emotions: [], text: full, dialogue: [], bodyParts: marks,
    });
    setEntryId(id);
    setSubmitted(full);
  }

  const canSubmit = marks.length > 0 || note.trim().length > 0;

  return (
    <div className="page">
      <p className="muted">身體覺察</p>
      {!submitted ? (
        <>
          <h2 className="serif" style={{ fontSize: 20, margin: '10px 0 4px' }}>身體今日話你知啲咩?</h2>
          <p className="muted" style={{ marginBottom: 14, fontSize: 13 }}>
            撳圖揀部位,或者直接寫落面,唔一定要兩樣都做
          </p>

          {/* 人形圖 + 感覺選擇 */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ flex: '0 0 44%' }}>
              <BodyFigure marks={marks} activePart={activePart} onTap={tapPart} />
            </div>
            <div style={{ flex: 1 }}>
              {activePart ? (
                <>
                  <p style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>{activePart} 係點?</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {BODY_FEELINGS.map(f => (
                      <button key={f} className="chip" style={{ fontSize: 12, padding: '5px 10px' }}
                        onClick={() => setFeeling(f)}>{f}</button>
                    ))}
                  </div>
                  <button style={{ marginTop: 10, fontSize: 12, color: 'var(--mist)' }}
                    onClick={() => setActivePart(null)}>取消</button>
                </>
              ) : marks.length > 0 ? (
                <>
                  <p style={{ fontSize: 12, color: 'var(--mist)', marginBottom: 8 }}>已標記</p>
                  {marks.map(m => (
                    <div key={m.part} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span className="chip" style={{ fontSize: 12, padding: '4px 10px', background: 'var(--dusk-bg)', color: 'var(--dusk-deep)' }}>
                        {m.part} · {m.feeling}
                      </span>
                      <button style={{ fontSize: 11, color: 'var(--mist)' }}
                        onClick={() => removeMark(m.part)}>✕</button>
                    </div>
                  ))}
                  <p style={{ fontSize: 12, color: 'var(--mist)', marginTop: 8 }}>撳圖可以繼續加</p>
                </>
              ) : (
                <p style={{ fontSize: 13, color: 'var(--mist)', lineHeight: 1.7 }}>
                  撳左邊人形圖嘅任何位置,就可以標記感覺
                </p>
              )}
            </div>
          </div>

          <textarea className="entry" style={{ marginTop: 16, minHeight: 90 }}
            placeholder="想補充嘅都可以寫喺度 — 睡眠、精神、呼吸、或者任何嘢…"
            value={note} onChange={e => setNote(e.target.value)} />

          <button className="btn primary" style={{ marginTop: 14, opacity: canSubmit ? 1 : 0.45 }}
            onClick={submit} disabled={!canSubmit}>
            記低
          </button>
        </>
      ) : (
        <>
          <div className="card" style={{ marginTop: 12 }}>
            <p style={{ fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{submitted}</p>
          </div>
          <Conversation
            profile={profile} entryId={entryId}
            initialText={`我而家身體嘅感覺:${submitted}`}
            topic="身體覺察" onDone={onDone}
          />
        </>
      )}
    </div>
  );
}
