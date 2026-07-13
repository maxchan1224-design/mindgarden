import { useState } from 'react';
import { db } from '../db';
import { BODY_FEELINGS, todayKey, uid, type Profile } from '../domain';
import Conversation from './Conversation';

// 身體部位:名稱 + 喺人形圖嘅大約座標(百分比)
const BODY_PARTS = [
  { key: '頭',   cx: 50, cy: 18 },
  { key: '頸',   cx: 50, cy: 36 },
  { key: '左肩', cx: 34, cy: 48 },
  { key: '右肩', cx: 66, cy: 48 },
  { key: '胸口', cx: 50, cy: 58 },
  { key: '背',   cx: 50, cy: 68 },
  { key: '胃',   cx: 50, cy: 78 },
  { key: '腰',   cx: 50, cy: 90 },
  { key: '左手', cx: 27, cy: 100 },
  { key: '右手', cx: 73, cy: 100 },
  { key: '左腿', cx: 42, cy: 130 },
  { key: '右腿', cx: 58, cy: 130 },
  { key: '左腳', cx: 43, cy: 172 },
  { key: '右腳', cx: 57, cy: 172 },
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
    <svg viewBox="0 0 100 200" style={{ width: '100%', maxWidth: 175, display: 'block', margin: '0 auto' }}
      role="img" aria-label="人形圖,可以撳身體各部位">
      {/* 自然人形輪廓 — 單線描邊 */}
      <path
        d="M50 6
           C57 6 62 12 62 20
           C62 25 60 30 57 33
           C56 35 56 37 57 38
           C63 40 70 44 73 50
           C76 57 77 67 78 78
           C79 88 79 96 78 104
           C77 110 74 112 72 111
           C70 110 70 106 70 100
           C70 92 69 82 67 74
           C67 84 67 92 66 100
           C65 110 64 118 64 126
           C64 138 63 152 61 166
           C60 174 59 180 58 186
           C57 190 54 191 52 190
           C50 189 50 186 50 182
           C50 172 51 160 51 148
           C51 138 51 130 50 124
           C49 130 49 138 49 148
           C49 160 50 172 50 182
           C50 186 50 189 48 190
           C46 191 43 190 42 186
           C41 180 40 174 39 166
           C37 152 36 138 36 126
           C36 118 35 110 34 100
           C33 92 33 84 33 74
           C31 82 30 92 30 100
           C30 106 30 110 28 111
           C26 112 23 110 22 104
           C21 96 21 88 22 78
           C23 67 24 57 27 50
           C30 44 37 40 43 38
           C44 37 44 35 43 33
           C40 30 38 25 38 20
           C38 12 43 6 50 6 Z"
        fill="var(--sage-bg)"
        stroke="var(--sage)"
        strokeWidth="0.9"
        strokeLinejoin="round"
      />

      {/* tap 熱點 */}
      {BODY_PARTS.map(p => {
        const isActive = activePart === p.key;
        const isMarked = markedKeys.has(p.key);
        return (
          <g key={p.key} onClick={() => onTap(p.key)} style={{ cursor: 'pointer' }}>
            <circle
              cx={p.cx} cy={p.cy} r="9"
              fill={isActive ? '#8D87AD' : isMarked ? '#B7B2CC' : 'transparent'}
              fillOpacity={isActive ? 0.55 : isMarked ? 0.4 : 0}
            />
            {isMarked && (
              <circle cx={p.cx} cy={p.cy} r="3" fill="#8D87AD" />
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
