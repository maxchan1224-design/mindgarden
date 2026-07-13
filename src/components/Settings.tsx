import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, setActiveProfileId } from '../db';
import { PERSONA_META, uid, type ChatMode, type PersonaId, type Profile, type ResponseMode, type VoiceLang } from '../domain';
import { hasEnhancedVoice, speakSample, VOICE_LANG_LABELS } from '../services/tts';

const CHAT_MODES: { id: ChatMode; label: string; desc: string }[] = [
  { id: 'companion', label: '溫柔陪伴', desc: '先聽你講,慢慢嚟。需要分析嗰陣一樣會分析' },
  { id: 'open', label: '自由對話', desc: '似同朋友傾偈,你問咩佢答咩,可長可短' },
];

const MODES: { id: ResponseMode; label: string; desc: string }[] = [
  { id: 'ask', label: '每次問我', desc: '以來電形式問你想聽定想睇' },
  { id: 'voice', label: '直接語音', desc: '寫完直接播聲' },
  { id: 'text', label: '純文字', desc: '安靜模式,只顯示文字' },
];

export default function Settings({ profile, onSwitch }: { profile: Profile; onSwitch: () => void }) {
  const profiles = useLiveQuery(() => db.profiles.orderBy('createdAt').toArray(), []) ?? [];
  const [newName, setNewName] = useState('');

  const update = (patch: Partial<Profile>) => db.profiles.update(profile.id, patch);

  async function addProfile() {
    const name = newName.trim();
    if (!name) return;
    const p: Profile = { id: uid(), name, personaId: 'aqing', responseMode: 'ask', chatMode: 'companion', voiceLang: 'yue', createdAt: Date.now() };
    await db.profiles.add(p);
    setNewName('');
  }

  async function exportJson() {
    const entries = await db.entries.where('profileId').equals(profile.id).toArray();
    const blob = new Blob([JSON.stringify({ profile, entries }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mind-garden-${profile.name}.json`;
    a.click();
  }

  return (
    <div className="page">
      <h1 className="serif" style={{ fontSize: 22 }}>設定</h1>

      <p className="muted" style={{ margin: '18px 0 8px' }}>你嘅名</p>
      <div className="card">
        <input style={{ border: 'none', background: 'none', width: '100%', outline: 'none' }}
          value={profile.name} onChange={e => update({ name: e.target.value })} />
      </div>

      <p className="muted" style={{ margin: '18px 0 8px' }}>陪你嘅人</p>
      {(Object.keys(PERSONA_META) as PersonaId[]).map(pid => (
        <button key={pid} className="card" onClick={() => update({ personaId: pid })}
          style={{ width: '100%', textAlign: 'left', marginBottom: 10, border: profile.personaId === pid ? '1.5px solid var(--sage)' : '1.5px solid transparent' }}>
          <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              <span className="serif" style={{ fontSize: 16 }}>{PERSONA_META[pid].name}</span>
              <span className="muted" style={{ marginLeft: 10, fontSize: 13 }}>{PERSONA_META[pid].tagline}</span>
            </span>
            {profile.personaId === pid && <span style={{ color: 'var(--sage)' }}>✓</span>}
          </span>
          <span className="muted" style={{ display: 'block', marginTop: 8, fontSize: 12.5, lineHeight: 1.75 }}>
            {PERSONA_META[pid].bio}
          </span>
        </button>
      ))}

      <p className="muted" style={{ margin: '18px 0 8px' }}>對話模式</p>
      {CHAT_MODES.map(m => (
        <button key={m.id} className="card" onClick={() => update({ chatMode: m.id })}
          style={{ width: '100%', textAlign: 'left', marginBottom: 8, border: (profile.chatMode ?? 'companion') === m.id ? '1.5px solid var(--sage)' : '1.5px solid transparent' }}>
          <span style={{ fontSize: 15, fontWeight: 500 }}>{m.label}</span>
          <span className="muted" style={{ display: 'block', marginTop: 2, fontSize: 12 }}>{m.desc}</span>
        </button>
      ))}

      <p className="muted" style={{ margin: '18px 0 8px' }}>回應方式</p>
      {MODES.map(m => (
        <button key={m.id} className="card" onClick={() => update({ responseMode: m.id })}
          style={{ width: '100%', textAlign: 'left', marginBottom: 8, border: profile.responseMode === m.id ? '1.5px solid var(--sage)' : '1.5px solid transparent' }}>
          <span style={{ fontSize: 15, fontWeight: 500 }}>{m.label}</span>
          <span className="muted" style={{ display: 'block', marginTop: 2, fontSize: 12 }}>{m.desc}</span>
        </button>
      ))}

      <p className="muted" style={{ margin: '18px 0 8px' }}>語音語言</p>
      {(['yue','cmn','en'] as VoiceLang[]).map(lang => (
        <button key={lang} className="card"
          onClick={() => update({ voiceLang: lang })}
          style={{ width:'100%', textAlign:'left', marginBottom:8, display:'flex', justifyContent:'space-between', alignItems:'center', border: (profile.voiceLang ?? 'yue') === lang ? '1.5px solid var(--sage)' : '1.5px solid transparent' }}>
          <span>
            <span style={{ fontSize:15, fontWeight:500 }}>{VOICE_LANG_LABELS[lang]}</span>
            <span className="muted" style={{ marginLeft:10, fontSize:12 }}>
              { lang === 'yue' ? '廣東話' : lang === 'cmn' ? 'Mandarin Chinese' : 'English' }
            </span>
          </span>
          <button
            style={{ fontSize:12, color:'var(--dusk-deep)', background:'var(--dusk-bg)', border:'none', borderRadius:999, padding:'5px 12px' }}
            onClick={e => { e.stopPropagation(); speakSample(lang, profile.personaId); }}>
            試聽
          </button>
        </button>
      ))}

      {!hasEnhancedVoice() && (
        <div className="card" style={{ marginTop: 4, background: 'var(--dusk-bg)' }}>
          <p style={{ fontSize: 12, lineHeight: 1.8, color: 'var(--dusk-deep)' }}>
            覺得把聲太機械?iPhone 內置咗更自然嘅粵語聲,但要手動下載一次:<br />
            <b>設定 → 輔助使用 → 朗讀內容 → 語音 → 中文(香港) → 揀「Sinji(增強)」下載</b><br />
            下載完返嚟呢度,MindGarden 會自動用返把好聲。
          </p>
        </div>
      )}

      <p className="muted" style={{ margin: '18px 0 8px' }}>空間 · 每個人有自己嘅私人記錄</p>
      {profiles.map(p => (
        <button key={p.id} className="card" onClick={() => { setActiveProfileId(p.id); onSwitch(); }}
          style={{ width: '100%', textAlign: 'left', marginBottom: 8, border: p.id === profile.id ? '1.5px solid var(--sage)' : '1.5px solid transparent' }}>
          {p.name}{p.id === profile.id && <span className="muted" style={{ marginLeft: 8 }}>而家喺度</span>}
        </button>
      ))}
      <div className="card" style={{ display: 'flex', gap: 10 }}>
        <input style={{ border: 'none', background: 'none', flex: 1, outline: 'none' }}
          placeholder="新空間嘅名…" value={newName} onChange={e => setNewName(e.target.value)} />
        <button style={{ color: 'var(--sage-deep)', fontSize: 14 }} onClick={addProfile}>新增</button>
      </div>

      <button className="btn ghost" style={{ marginTop: 22 }} onClick={exportJson}>匯出我嘅記錄(JSON)</button>
      <p className="muted" style={{ marginTop: 14, fontSize: 12, lineHeight: 1.7 }}>
        所有記錄只儲存喺呢部裝置入面。MindGarden 唔係專業心理支援 — 如果你持續好辛苦,請搵信任嘅人或者專業人士傾。
      </p>
    </div>
  );
}
