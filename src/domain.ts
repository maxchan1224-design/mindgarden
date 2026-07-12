export type EntryType = 'checkin' | 'gratitude' | 'thought';
export type PersonaId = 'aqing' | 'hiulaam' | 'siuching';
export type ResponseMode = 'ask' | 'voice' | 'text';

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
}

export interface Profile {
  id: string;
  name: string;
  personaId: PersonaId;
  responseMode: ResponseMode;
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
