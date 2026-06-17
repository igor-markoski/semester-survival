// ---------------------------------------------------------------------------
// Persistent save state (localStorage). Loading merges with defaults so older
// saves stay forward-compatible. All access is wrapped so private-mode / disabled
// storage degrades gracefully.
// ---------------------------------------------------------------------------
import type { Difficulty } from "./config";

export interface SaveStats {
  totalCoffee: number;
  bestCombo: number;
  flawlessWins: number;
  upgradesBought: number;
}

export interface SaveState {
  version: number;
  coins: number;
  difficulty: Difficulty;
  muted: boolean;
  unlockedWeek: number; // highest week the player may enter (1-based)
  stars: Record<number, number>; // week -> best stars (0..3)
  campaignComplete: boolean;
  endlessBest: number;
  upgrades: Record<string, number>; // upgradeId -> owned level
  achievements: Record<string, boolean>;
  stats: SaveStats;
}

const KEY = "ss_save_v1";
const VERSION = 1;

export function defaultSave(): SaveState {
  return {
    version: VERSION,
    coins: 0,
    difficulty: "normal",
    muted: false,
    unlockedWeek: 1,
    stars: {},
    campaignComplete: false,
    endlessBest: 0,
    upgrades: {},
    achievements: {},
    stats: { totalCoffee: 0, bestCombo: 0, flawlessWins: 0, upgradesBought: 0 },
  };
}

export function loadSave(): SaveState {
  const base = defaultSave();
  if (typeof window === "undefined") return base;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<SaveState>;
    return {
      ...base,
      ...parsed,
      stars: { ...base.stars, ...(parsed.stars ?? {}) },
      upgrades: { ...base.upgrades, ...(parsed.upgrades ?? {}) },
      achievements: { ...base.achievements, ...(parsed.achievements ?? {}) },
      stats: { ...base.stats, ...(parsed.stats ?? {}) },
    };
  } catch {
    return base;
  }
}

export function saveSave(state: SaveState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}
