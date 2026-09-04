// Progression event bus. The server attaches a `progression` object to any
// response that awarded XP (session saves, dailies, arcade scores...). An
// axios interceptor lifts it out and broadcasts it; ProgressionToasts listens.
import axios from 'axios';

export interface NewAchievement { key: string; name: string; icon: string; description: string; xp: number }
export interface NewUnlock { kind: 'theme' | 'caret' | 'sound'; key: string; name: string }
export interface ProgressionUpdate {
  xp: number;
  gained: number;
  level: number;
  leveledUp: boolean;
  floor: number;
  next: number;
  pct: number;
  newAchievements: NewAchievement[];
  newUnlocks: NewUnlock[];
}

export const PROGRESSION_EVENT = 'typo:progression';

export function emitProgression(update: ProgressionUpdate) {
  window.dispatchEvent(new CustomEvent(PROGRESSION_EVENT, { detail: update }));
}

let installed = false;
export function installProgressionWatcher() {
  if (installed) return;
  installed = true;
  axios.interceptors.response.use(res => {
    const p = res?.data?.progression;
    if (p && typeof p === 'object' && typeof p.level === 'number') emitProgression(p as ProgressionUpdate);
    return res;
  });
}
