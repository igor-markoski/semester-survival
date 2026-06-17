// ---------------------------------------------------------------------------
// Semester Survival — shared configuration, types & pure helpers.
// This module has NO dependencies on other game modules so everything can
// import it safely. Tuning data for levels/upgrades/quizzes/achievements lives
// in their own files; the simulation engine lives in engine.ts.
// Coordinates are "logical" pixels; the board is CSS-scaled to fit any screen.
// ---------------------------------------------------------------------------

// --- Board geometry --------------------------------------------------------
export const BOARD_W = 800; // play-field width
export const PLAY_H = 500; // play-field height (where items fall)
export const HEADER_H = 88; // dashboard height (sits above the play field)

// Card layout (the bordered frame around the dashboard + play field). Kept exact
// so the whole thing can be uniformly CSS-scaled to fit any viewport.
export const CARD_PAD = 14;
export const CARD_GAP = 12;
export const OUTER_W = BOARD_W + CARD_PAD * 2;
export const OUTER_H = CARD_PAD + HEADER_H + CARD_GAP + PLAY_H + CARD_PAD;
export const INNER_H = HEADER_H + CARD_GAP + PLAY_H; // menu screens fill this

// --- Player ----------------------------------------------------------------
export const PLAYER_W = 124; // base width (upgrades widen it)
export const PLAYER_H = 26;
export const PLAYER_BOTTOM_MARGIN = 16;
/** Top edge (y) of the player's hit-box inside the play field. */
export const PLAYER_TOP = PLAY_H - PLAYER_H - PLAYER_BOTTOM_MARGIN;
export const PLAYER_SPEED = 600; // px / second (keyboard)
export const POINTER_LERP = 26; // higher = snappier pointer following
export const ICE_ACCEL = 2600; // px/s² when the icy modifier is active
export const ICE_FRICTION = 2.4; // momentum decay on ice

// --- Items -----------------------------------------------------------------
export const ITEM_SIZE = 46;

// --- Scoring / lives -------------------------------------------------------
export const START_LIVES = 3;
export const MAX_LIVES = 6;
export const COFFEE_POINTS = 5; // base; upgrades raise it
export const EXAM_POINTS = 10;

// --- Power-ups -------------------------------------------------------------
export const POWER_CHANCE = 0.1; // chance a spawn is a power-up
export const HEART_CHANCE = 0.04; // chance a spawn is a bonus heart
export const MAGNET_DURATION = 5; // ⚡ pulls coffee toward the player
export const MAGNET_LERP = 3.2;
export const SLOW_DURATION = 4; // 🧠 slows the fall of everything
export const SLOW_FACTOR = 0.5;

// --- Difficulty ramp within a level ----------------------------------------
export const RAMP_PER_SEC = 0.02; // fall-speed grows the longer a level lasts
export const RAMP_MAX = 0.4; // capped at +40%

// --- Modifiers -------------------------------------------------------------
export const WIND_FORCE = 110; // px/s horizontal drift amplitude
export const WIND_PERIOD = 4.2; // seconds per wind oscillation
export const SWARM_EVERY = 5.5; // seconds between bug swarms
export const SWARM_COUNT = 4; // bad items per swarm
export const HOMING_LERP = 0.9; // how strongly distractions track the player
export const DEADLINE_EVERY = 10; // seconds between "deadline" rushes
export const DEADLINE_DURATION = 3; // seconds a rush lasts
export const DEADLINE_MULT = 1.55; // fall-speed multiplier during a rush
export const NIGHT_RADIUS = 190; // spotlight radius around the player

// --- Endless mode ----------------------------------------------------------
export const ENDLESS_WAVE_TIME = 16; // seconds per wave
export const ENDLESS_SPEED_PER_WAVE = 0.12; // +12% fall speed per wave
export const ENDLESS_SPAWN_DECAY = 0.05; // spawn interval shrinks per wave

// --- Effect durations (seconds) -------------------------------------------
export const FLASH_DURATION = 0.34;
export const SHAKE_DURATION = 0.42;
export const BANNER_DURATION = 1.8;
export const POPUP_LIFE = 0.9;
export const PARTICLE_GRAVITY = 480;

// ---------------------------------------------------------------------------
// Item definitions
// ---------------------------------------------------------------------------
export type ItemGroup = "good" | "bad" | "power" | "heart";
export type PowerKind = "magnet" | "slow" | "shield";
export type ItemTypeId =
  | "coffee"
  | "exam"
  | "bug"
  | "distraction"
  | "energy"
  | "focus"
  | "shield"
  | "heart";

export interface ItemType {
  id: ItemTypeId;
  group: ItemGroup;
  emojis: string[];
  points: number;
  power?: PowerKind;
}

export const ITEM_TYPES: Record<ItemTypeId, ItemType> = {
  coffee: { id: "coffee", group: "good", emojis: ["☕"], points: COFFEE_POINTS },
  exam: { id: "exam", group: "good", emojis: ["📄"], points: EXAM_POINTS },
  bug: { id: "bug", group: "bad", emojis: ["🪲"], points: 0 },
  distraction: { id: "distraction", group: "bad", emojis: ["📱", "🎮"], points: 0 },
  energy: { id: "energy", group: "power", emojis: ["⚡"], points: 0, power: "magnet" },
  focus: { id: "focus", group: "power", emojis: ["🧠"], points: 0, power: "slow" },
  shield: { id: "shield", group: "power", emojis: ["🛡️"], points: 0, power: "shield" },
  heart: { id: "heart", group: "heart", emojis: ["❤️"], points: 0 },
};

export const POWER_LABEL: Record<PowerKind, string> = {
  magnet: "⚡ Магнет",
  slow: "🧠 Фокус",
  shield: "🛡️ Штит",
};

export interface SpawnEntry {
  type: ItemTypeId;
  weight: number;
}

// ---------------------------------------------------------------------------
// Difficulty
// ---------------------------------------------------------------------------
export type Difficulty = "easy" | "normal" | "hard";

export interface DifficultySettings {
  id: Difficulty;
  label: string;
  emoji: string;
  livesBonus: number;
  speedMul: number;
  goalMul: number; // scales objective targets
  coinMul: number;
}

export const DIFFICULTIES: Record<Difficulty, DifficultySettings> = {
  easy: { id: "easy", label: "Лесно", emoji: "🌱", livesBonus: 1, speedMul: 0.85, goalMul: 0.85, coinMul: 0.8 },
  normal: { id: "normal", label: "Нормално", emoji: "⚖️", livesBonus: 0, speedMul: 1, goalMul: 1, coinMul: 1 },
  hard: { id: "hard", label: "Тешко", emoji: "🔥", livesBonus: -1, speedMul: 1.22, goalMul: 1.15, coinMul: 1.5 },
};

// ---------------------------------------------------------------------------
// Objectives & modifiers
// ---------------------------------------------------------------------------
export type ObjectiveType =
  | "score"
  | "collectCoffee"
  | "collectExam"
  | "survive"
  | "combo"
  | "noHit"
  | "endless";

export interface Objective {
  type: ObjectiveType;
  target: number;
}

export type ModifierId = "wind" | "night" | "ice" | "swarm" | "homing" | "deadline";

export interface ModifierInfo {
  id: ModifierId;
  emoji: string;
  name: string;
  desc: string;
}

export const MODIFIERS: Record<ModifierId, ModifierInfo> = {
  wind: { id: "wind", emoji: "🌬️", name: "Ветар", desc: "Предметите се нишаат настрана." },
  night: { id: "night", emoji: "🌙", name: "Мрак", desc: "Гледаш само околу студентот." },
  ice: { id: "ice", emoji: "🧊", name: "Мраз", desc: "Лизгав паддл со инерција." },
  swarm: { id: "swarm", emoji: "🐝", name: "Рој", desc: "Багови во групни налети." },
  homing: { id: "homing", emoji: "🧲", name: "Гонење", desc: "Дистракциите те бркаат." },
  deadline: { id: "deadline", emoji: "⏰", name: "Дедлајн", desc: "Повремени налети на брзина." },
};

// ---------------------------------------------------------------------------
// Runtime simulation types
// ---------------------------------------------------------------------------
export type GameMode = "campaign" | "endless";
export type Tone = "good" | "bad" | "power";

export interface FallingItem {
  id: number;
  type: ItemTypeId;
  group: ItemGroup;
  power?: PowerKind;
  emoji: string;
  points: number;
  x: number;
  y: number;
  speed: number;
  wobble: number;
  golden: boolean;
}

export interface Popup {
  id: number;
  x: number;
  y: number;
  text: string;
  tone: Tone;
  life: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

/** Full authoritative game state. Lives in a ref and is stepped each frame. */
export interface Sim {
  // mode & per-run tunables (after upgrades + difficulty)
  mode: GameMode;
  playerW: number;
  coffeePoints: number;
  powerMult: number;
  speedMul: number;
  // spawn config (resolved for the active level)
  speedMin: number;
  speedMax: number;
  spawnEvery: number;
  spawnJitter: number;
  pool: SpawnEntry[];
  allowSpecials: boolean;
  // objective tracking
  objective: Objective;
  timeLimit: number; // 0 = none
  objectiveDone: boolean;
  coffeeCount: number;
  examCount: number;
  bestCombo: number;
  flawless: boolean;
  levelClock: number;
  // modifiers
  modifiers: ModifierId[];
  rushTimer: number;
  rushCooldown: number;
  swarmCooldown: number;
  // endless
  wave: number;
  waveClock: number;
  // core gameplay
  score: number;
  lives: number;
  startLives: number;
  level: number; // week number / display level / endless wave
  combo: number;
  coffeeRun: number;
  playerX: number;
  playerVX: number;
  playerVel: number; // momentum (ice)
  targetX: number | null;
  items: FallingItem[];
  popups: Popup[];
  particles: Particle[];
  spawnTimer: number;
  nextId: number;
  // power-ups
  magnetTimer: number;
  slowTimer: number;
  shield: boolean;
  // visual effect timers
  flashTone: Tone | null;
  flashTimer: number;
  shakeTimer: number;
  bannerLevel: number | null;
  bannerTimer: number;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------
export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Combo streak → score multiplier. */
export function comboMultiplier(combo: number): number {
  if (combo >= 10) return 4;
  if (combo >= 6) return 3;
  if (combo >= 3) return 2;
  return 1;
}

/** Weighted random pick of an item type from a pool. */
export function pickType(pool: SpawnEntry[]): ItemTypeId {
  const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = Math.random() * total;
  for (const entry of pool) {
    roll -= entry.weight;
    if (roll <= 0) return entry.type;
  }
  return pool[pool.length - 1].type;
}

/** Spawn a small radial burst of particles at (x, y). */
export function addBurst(sim: Sim, x: number, y: number, tone: Tone): void {
  const palette =
    tone === "good"
      ? ["#34d399", "#22d3ee", "#a7f3d0"]
      : tone === "bad"
        ? ["#fb7185", "#f43f5e", "#fda4af"]
        : ["#fcd34d", "#38bdf8", "#fde68a"];
  for (let i = 0; i < 9; i++) {
    const ang = (Math.PI * 2 * i) / 9 + Math.random() * 0.6;
    const sp = 90 + Math.random() * 130;
    sim.particles.push({
      id: sim.nextId++,
      x,
      y,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp - 60,
      life: 0.55 + Math.random() * 0.25,
      maxLife: 0.8,
      color: palette[i % palette.length],
      size: 5 + Math.random() * 5,
    });
  }
}
