import Dexie, { type Table } from 'dexie';
import type { Entry, Profile, Seed } from './domain';

class MindGardenDB extends Dexie {
  entries!: Table<Entry, string>;
  profiles!: Table<Profile, string>;
  seeds!: Table<Seed, string>;
  constructor() {
    super('mind-garden');
    this.version(1).stores({
      entries: 'id, profileId, createdAt, dateKey, [profileId+dateKey], [profileId+createdAt]',
      profiles: 'id, createdAt',
    });
    // v2: 加 chatMode(舊 profile 預設溫柔陪伴)
    this.version(2).stores({
      entries: 'id, profileId, type, createdAt, dateKey, [profileId+dateKey], [profileId+createdAt]',
      profiles: 'id, createdAt',
    }).upgrade(tx =>
      tx.table('profiles').toCollection().modify(p => {
        if (!p.chatMode) p.chatMode = 'companion';
      }),
    );
    // v3: Awareness Companion 重新設計 — seeds table + 預設對話風格
    this.version(3).stores({
      entries: 'id, profileId, type, createdAt, dateKey, [profileId+dateKey], [profileId+createdAt]',
      profiles: 'id, createdAt',
      seeds: 'id, profileId, createdAt',
    }).upgrade(tx =>
      tx.table('profiles').toCollection().modify(p => {
        if (!p.styleId) p.styleId = 'quiet';
      }),
    );
  }
}

export const db = new MindGardenDB();

const ACTIVE_KEY = 'mg.activeProfile';

export function getActiveProfileId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}
export function setActiveProfileId(id: string) {
  localStorage.setItem(ACTIVE_KEY, id);
}

// 每日第一次回應先叫名
export function isFirstResponseToday(profileId: string, dateKey: string): boolean {
  return localStorage.getItem(`mg.greet.${profileId}`) !== dateKey;
}
export function markGreeted(profileId: string, dateKey: string) {
  localStorage.setItem(`mg.greet.${profileId}`, dateKey);
}
