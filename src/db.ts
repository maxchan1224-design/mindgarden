import Dexie, { type Table } from 'dexie';
import type { Entry, Profile } from './domain';

class MindGardenDB extends Dexie {
  entries!: Table<Entry, string>;
  profiles!: Table<Profile, string>;
  constructor() {
    super('mind-garden');
    this.version(1).stores({
      entries: 'id, profileId, createdAt, dateKey, [profileId+dateKey], [profileId+createdAt]',
      profiles: 'id, createdAt',
    });
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
