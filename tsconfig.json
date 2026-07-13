export type EntryType = 'checkin' | 'gratitude' | 'thought' | 'dialogue' | 'body' | 'capsule';
export type PersonaId = 'aqing' | 'hiulaam' | 'siuching';
export type ResponseMode = 'ask' | 'voice' | 'text';
export type ChatMode = 'companion' | 'open';
export type VoiceLang = 'yue' | 'cmn' | 'en';

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
  season?: SeasonId;         // v0.2 今晚嘅季節
  garden?: GardenId;         // v0.2 花園分類(本地分類結果)
  openAt?: number;           // v0.2 時間囊:呢個時間之前唔開得
}

export interface Profile {
  id: string;
  name: string;
  personaId: PersonaId;
  responseMode: ResponseMode;
  chatMode: ChatMode;      // companion = 溫柔陪伴 / open = 自由對話
  styleId?: StyleId;       // v0.2 預設對話風格(取代以 persona 做重心)
  voiceLang: VoiceLang;    // yue = 粵語 / cmn = 普通話 / en = 英文
  createdAt: number;
}

export const PERSONA_META: Record<PersonaId, { name: string; tagline: string; bio: string; rate: number; pitch: number }> = {
  aqing: {
    name: '阿晴', tagline: '溫柔嘅大姊姊',
    bio: '三十幾歲,做過社工。自己捱過一段長時間嘅低潮,所以佢明白唔係所有嘢「諗開啲」就解決到。佢唔會急住幫你搞掂件事 — 佢會先陪你坐一陣。',
    rate: 0.88, pitch: 1.05,
  },
  hiulaam: {
    name: '曉嵐', tagline: '沉穩嘅導師',
    bio: '四十幾歲,喺大機構做過管理層,後來轉做人生教練。見過好多人喺人生交叉點掙扎。佢唔會氹你,但佢永遠企喺你嗰邊 — 佢會幫你睇清楚件事嘅真實形狀。',
    rate: 0.95, pitch: 0.95,
  },
  siuching: {
    name: '小澄', tagline: '同行嘅朋友',
    bio: '二十幾歲,同你差唔多年紀,一樣喺度撞板同摸索。佢唔會扮專家 — 佢會同你一齊鬧、一齊笑、一齊諗。係嗰個你可以半夜三點 send message 嘅朋友。',
    rate: 1.0, pitch: 1.1,
  },
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


// =====================================================================
// v0.2 — Awareness Companion 重新設計
// =====================================================================

// ---- 今晚你需要啲咩(取代「今天心情如何」) ----
export type NeedId = 'slow' | 'clear' | 'listen' | 'clarity';
export interface Need {
  id: NeedId; emoji: string; title: string; sub: string;
  practice: 'body' | 'dialogue' | 'checkin';
  style: StyleId;
}
export const NEEDS: Need[] = [
  { id: 'slow',    emoji: '🌿', title: '我想慢落嚟',       sub: '今日太攰',       practice: 'body',     style: 'quiet' },
  { id: 'clear',   emoji: '💭', title: '我想清一清個腦',   sub: '今日好多諗法',   practice: 'dialogue', style: 'reflect' },
  { id: 'listen',  emoji: '❤️', title: '我想有人聽下',     sub: '今日淨係想講',   practice: 'checkin',  style: 'quiet' },
  { id: 'clarity', emoji: '🧭', title: '我想諗清楚一件事', sub: '今日有嘢想諗通', practice: 'dialogue', style: 'strategic' },
];

// ---- 對話風格(取代 persona 人物) ----
export type StyleId = 'quiet' | 'reflect' | 'strategic' | 'deep' | 'brainstorm' | 'encourage';
export const STYLES: Record<StyleId, { emoji: string; name: string; desc: string }> = {
  quiet:      { emoji: '🌿', name: '安靜陪伴', desc: '多聽少問,溫柔,唔急' },
  reflect:    { emoji: '🪞', name: '反思',     desc: '用問題幫你理解自己' },
  strategic:  { emoji: '🧠', name: '理性思考', desc: '工作、財務、決定、解難' },
  deep:       { emoji: '🌊', name: '深度對話', desc: '人生、意義、價值' },
  brainstorm: { emoji: '⚡', name: '腦震盪',   desc: '天馬行空,一齊諗計' },
  encourage:  { emoji: '☀️', name: '鼓勵',     desc: '溫柔支持,慶祝進步' },
};

// ---- 季節(取代 開心/唔開心 嘅框架) ----
export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';
export const SEASONS: Record<SeasonId, { emoji: string; name: string; desc: string }> = {
  spring: { emoji: '🌱', name: '春', desc: '有啲嘢喺度開始' },
  summer: { emoji: '☀️', name: '夏', desc: '有能量,喺度行緊' },
  autumn: { emoji: '🍂', name: '秋', desc: '喺度沉澱、放低' },
  winter: { emoji: '❄️', name: '冬', desc: '靜落嚟,養住自己' },
};
// 冬天唔係壞事 — 呢個係成個設計嘅重點,唔好將季節 map 落好/壞。

// ---- 花園分類(唔係 folder,係一個花園) ----
export type GardenId = 'gratitude' | 'learning' | 'career' | 'relationships' | 'memories' | 'lettingGo' | 'dreams';
export const GARDEN: Record<GardenId, { emoji: string; name: string }> = {
  gratitude:     { emoji: '🌸', name: '感恩' },
  learning:      { emoji: '🌿', name: '學習' },
  career:        { emoji: '🌻', name: '工作' },
  relationships: { emoji: '🌳', name: '關係' },
  memories:      { emoji: '🌹', name: '回憶' },
  lettingGo:     { emoji: '🍃', name: '放低' },
  dreams:        { emoji: '🌼', name: '夢想' },
};

// 本地關鍵詞分類(即時、離線;AI notice 係另一層)
const GARDEN_KEYWORDS: [GardenId, RegExp][] = [
  ['career',        /返工|同事|老細|上司|公司|工作|辭職|轉工|開會|OT|加班|人工/],
  ['relationships', /朋友|屋企|媽|爸|阿哥|家姐|細佬|妹|男朋友|女朋友|伴侶|老公|老婆|拍拖|關係|同學/],
  ['learning',      /學識|學咗|上堂|課程|讀書|睇書|練習|進步|學緊/],
  ['lettingGo',     /放低|放手|算啦|釋懷|唔再|放得低|原諒|接受咗/],
  ['dreams',        /夢想|想做|將來|未來|目標|希望有日|如果可以/],
  ['memories',      /記得|回憶|嗰時|細個|以前|舊時|懷念/],
];
export function classifyGarden(text: string, type: EntryType): GardenId | null {
  if (type === 'gratitude') return 'gratitude';
  for (const [id, re] of GARDEN_KEYWORDS) if (re.test(text)) return id;
  return null;
}

// ---- Seeds:一句重要嘅說話,慢慢生長 ----
export interface Seed {
  id: string;
  profileId: string;
  text: string;
  createdAt: number;
  dateKey: string;
}
export function seedStage(createdAt: number): { emoji: string; label: string } {
  const days = (Date.now() - createdAt) / 86400_000;
  if (days < 7) return { emoji: '🌱', label: '啱啱種低' };
  if (days < 30) return { emoji: '🌿', label: '生緊根' };
  return { emoji: '🌳', label: '已經係你一部分' };
}

// ---- Silence:每星期一日,唔使寫 ----
export function isSilenceDay(d = new Date()): boolean {
  return d.getDay() === 0; // 星期日
}
