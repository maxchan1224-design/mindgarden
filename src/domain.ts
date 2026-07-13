export type EntryType = 'checkin' | 'gratitude' | 'thought' | 'dialogue' | 'body';
export type PersonaId = 'aqing' | 'hiulaam' | 'siuching';
export type ResponseMode = 'ask' | 'voice' | 'text';
export type ChatMode = 'companion' | 'open';

export interface Emotion { name: string; intensity: number; }

export interface DialogueTurn { role: 'user' | 'ai'; text: string; }

export interface Entry {
  id: string;
  profileId: string;
  type: EntryType;
  createdAt: number;
  dateKey: string;           // 'YYYY-MM-DD'
  emotions: Emotion[];
  text: string;
  dialogue: DialogueTurn[];  // AI 回應同後續對話存喺 entry 入面
  topic?: string;            // 自我對話:主題
  bodyParts?: { part: string; feeling: string }[];
}

export interface Profile {
  id: string;
  name: string;
  personaId: PersonaId;
  responseMode: ResponseMode;
  chatMode: ChatMode;      // companion = 溫柔陪伴 / open = 自由對話
  createdAt: number;
}

export const PERSONA_META: Record<PersonaId, { name: string; tagline: string; rate: number; pitch: number }> = {
  aqing: { name: '阿晴', tagline: '溫柔嘅大姊姊', rate: 0.88, pitch: 1.05 },
  hiulaam: { name: '曉嵐', tagline: '沉穩嘅導師', rate: 0.95, pitch: 0.95 },
  siuching: { name: '小澄', tagline: '同行嘅朋友', rate: 1.0, pitch: 1.1 },
};

// 情緒輪:valence(-1..1)俾心情曲線用
export const EMOTIONS: { name: string; valence: number }[] = [
  { name: '開心', valence: 0.8 },
  { name: '感恩', valence: 0.8 },
  { name: '平靜', valence: 0.6 },
  { name: '有希望', valence: 0.6 },
  { name: '興奮', valence: 0.7 },
  { name: '好奇', valence: 0.4 },
  { name: '受啟發', valence: 0.6 },
  { name: '攰', valence: -0.3 },
  { name: '悶', valence: -0.2 },
  { name: '迷惘', valence: -0.4 },
  { name: '孤單', valence: -0.6 },
  { name: '失望', valence: -0.5 },
  { name: '唔開心', valence: -0.6 },
  { name: '焦慮', valence: -0.6 },
  { name: '嬲', valence: -0.7 },
  { name: '受唔住', valence: -0.8 },
];

export function todayKey(d = new Date()): string {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 植物階段:用累積活躍日數,唔係 streak — 永遠只會向前
export interface PlantStage { key: string; label: string; min: number; }
export const PLANT_STAGES: PlantStage[] = [
  { key: 'seed', label: '種子', min: 0 },
  { key: 'sprout', label: '發芽', min: 3 },
  { key: 'seedling', label: '幼苗期', min: 7 },
  { key: 'young', label: '小樹', min: 21 },
  { key: 'bloom', label: '開花', min: 45 },
  { key: 'fruit', label: '結果', min: 90 },
];
export function plantStage(activeDays: number): PlantStage {
  let s = PLANT_STAGES[0];
  for (const st of PLANT_STAGES) if (activeDays >= st.min) s = st;
  return s;
}

// 心情曲線:每日 valence 加權平均(intensity 做權重)
export function moodOfDay(entries: Entry[]): number | null {
  let sum = 0, w = 0;
  for (const e of entries) for (const em of e.emotions) {
    const v = EMOTIONS.find(x => x.name === em.name)?.valence ?? 0;
    sum += v * em.intensity; w += em.intensity;
  }
  return w > 0 ? sum / w : null;
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ---- 自我對話:主題 + 深度問題庫(本地靜態,唔使 AI 都可以用) ----
export interface Topic { key: string; label: string; questions: string[]; }
export const DIALOGUE_TOPICS: Topic[] = [
  { key: 'career', label: '工作', questions: [
    '今日邊件事最令你有壓力?',
    '呢件事入面,有邊部分係你控制到嘅?',
    '你而家最想逃避緊咩?',
    '今日有冇一刻,你係為自己感到驕傲?',
    '如果聽日嘅你會回望今日,你想佢記得咩?',
  ]},
  { key: 'relationships', label: '關係', questions: [
    '呢排邊段關係佔據你最多心思?',
    '你喺呢段關係入面,想要嘅係咩?',
    '有冇一句說話,你想講但一直未講?',
  ]},
  { key: 'money', label: '金錢', questions: [
    '諗起錢嗰陣,你嘅第一反應係咩?',
    '你而家嘅財務決定,係出於恐懼定係出於計劃?',
  ]},
  { key: 'confidence', label: '自信', questions: [
    '今日有邊一刻,你懷疑緊自己?',
    '如果你最好嘅朋友做緊你而家做嘅事,你會點睇佢?',
  ]},
  { key: 'purpose', label: '方向', questions: [
    '呢排你係咪為緊自己真正想要嘅嘢努力?',
    '如果冇人會知,你其實想做嘅係咩?',
  ]},
  { key: 'stress', label: '壓力', questions: [
    '呢排壓力嘅來源,係一件事定係好多細事疊埋?',
    '你身體最先感覺到壓力嘅位係邊度?',
  ]},
  { key: 'family', label: '家庭', questions: [
    '今日同屋企人相處,有冇一件事令你唔舒服?',
    '你想同邊個屋企人講多啲心底話?',
  ]},
  { key: 'habits', label: '習慣', questions: [
    '呢排邊個習慣你想改變,但一直未改到?',
    '係咩令你一直維持住呢個習慣?',
  ]},
];

// ---- 身體覺察 ----
export const BODY_PARTS = ['頭', '頸', '肩膀', '胸口', '胃', '背', '手', '腳'];
export const BODY_FEELINGS = ['繃緊', '沉重', '放鬆', '痛', '暖', '凍', '麻', '有活力', '攰', '輕盈'];

