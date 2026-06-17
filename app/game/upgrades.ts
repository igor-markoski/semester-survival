// ---------------------------------------------------------------------------
// Shop upgrades. Bought with ☕-coins, persisted, and applied at the start of
// every run via computeEffects().
// ---------------------------------------------------------------------------
import { COFFEE_POINTS, PLAYER_W } from "./config";

export interface UpgradeDef {
  id: string;
  name: string;
  emoji: string;
  desc: string;
  maxLevel: number;
  costs: number[]; // costs[i] = price to buy level i+1
}

export const UPGRADES: UpgradeDef[] = [
  {
    id: "paddle",
    name: "Поширок паддл",
    emoji: "🧱",
    desc: "+16px ширина по ниво — полесно фаќање.",
    maxLevel: 3,
    costs: [120, 200, 320],
  },
  {
    id: "coffee",
    name: "Поскапо кафе",
    emoji: "☕",
    desc: "+1 поен по фатено кафе.",
    maxLevel: 3,
    costs: [140, 240, 380],
  },
  {
    id: "power",
    name: "Подолги бонуси",
    emoji: "⏱️",
    desc: "+25% траење на ⚡ и 🧠.",
    maxLevel: 3,
    costs: [150, 260, 400],
  },
  {
    id: "life",
    name: "Дополнителен живот",
    emoji: "❤️",
    desc: "+1 почетен живот.",
    maxLevel: 2,
    costs: [260, 460],
  },
  {
    id: "magnet",
    name: "Почетен магнет",
    emoji: "⚡",
    desc: "Започни секое ниво со 3с магнет.",
    maxLevel: 1,
    costs: [350],
  },
  {
    id: "shield",
    name: "Почетен штит",
    emoji: "🛡️",
    desc: "Започни секое ниво со штит.",
    maxLevel: 1,
    costs: [420],
  },
];

export interface UpgradeEffects {
  playerW: number;
  coffeePoints: number;
  powerMult: number;
  startLivesBonus: number;
  startShield: boolean;
  startMagnet: number; // seconds
}

/** Price to buy the next level of an upgrade, or null if maxed. */
export function nextCost(def: UpgradeDef, owned: number): number | null {
  return owned >= def.maxLevel ? null : def.costs[owned];
}

/** Resolve owned-upgrade levels into concrete run effects. */
export function computeEffects(owned: Record<string, number>): UpgradeEffects {
  const lvl = (id: string) => owned[id] ?? 0;
  return {
    playerW: PLAYER_W + lvl("paddle") * 16,
    coffeePoints: COFFEE_POINTS + lvl("coffee"),
    powerMult: 1 + lvl("power") * 0.25,
    startLivesBonus: lvl("life"),
    startShield: lvl("shield") >= 1,
    startMagnet: lvl("magnet") >= 1 ? 3 : 0,
  };
}

/** Total number of upgrade levels the player owns (for achievements). */
export function totalUpgradeLevels(owned: Record<string, number>): number {
  return Object.values(owned).reduce((sum, n) => sum + n, 0);
}
