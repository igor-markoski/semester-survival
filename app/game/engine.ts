// ---------------------------------------------------------------------------
// Simulation engine: makeSim() builds a run from a level + upgrades + difficulty;
// step() advances the world one frame, applying modifiers and tracking the
// objective. Both are pure of React — the component owns rendering & side effects.
// ---------------------------------------------------------------------------
import {
  addBurst,
  BANNER_DURATION,
  BOARD_W,
  clamp,
  comboMultiplier,
  DEADLINE_DURATION,
  DEADLINE_EVERY,
  DEADLINE_MULT,
  type Difficulty,
  DIFFICULTIES,
  ENDLESS_SPAWN_DECAY,
  ENDLESS_SPEED_PER_WAVE,
  ENDLESS_WAVE_TIME,
  type FallingItem,
  FLASH_DURATION,
  type GameMode,
  HEART_CHANCE,
  HOMING_LERP,
  ICE_ACCEL,
  ICE_FRICTION,
  ITEM_SIZE,
  ITEM_TYPES,
  type ItemTypeId,
  MAGNET_DURATION,
  MAGNET_LERP,
  MAX_LIVES,
  type Objective,
  PARTICLE_GRAVITY,
  type Particle,
  pick,
  pickType,
  PLAY_H,
  PLAYER_H,
  PLAYER_SPEED,
  PLAYER_TOP,
  POINTER_LERP,
  type Popup,
  POPUP_LIFE,
  POWER_CHANCE,
  POWER_POPUP,
  type PowerKind,
  RAMP_MAX,
  RAMP_PER_SEC,
  randRange,
  SHAKE_DURATION,
  type Sim,
  SLOW_DURATION,
  SLOW_FACTOR,
  START_LIVES,
  SWARM_COUNT,
  SWARM_EVERY,
  type Tone,
  WIND_FORCE,
  WIND_PERIOD,
} from "./config";
import type { IconKey } from "./icons";
import { CAMPAIGN_LEVELS, ENDLESS_BASE, objectiveLabel } from "./levels";
import { computeEffects } from "./upgrades";

export type GameEvent =
  | { t: "good"; mult: number }
  | { t: "bad" }
  | { t: "shield" }
  | { t: "power"; p: PowerKind }
  | { t: "heart" }
  | { t: "level" };

export type StepOutcome = "continue" | "clear" | "fail";

export interface StepResult {
  outcome: StepOutcome;
  events: GameEvent[];
}

export interface MakeSimOpts {
  mode: GameMode;
  week: number; // ignored for endless
  difficulty: Difficulty;
  upgrades: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------
export function makeSim(opts: MakeSimOpts): Sim {
  const diff = DIFFICULTIES[opts.difficulty];
  const eff = computeEffects(opts.upgrades);
  const isEndless = opts.mode === "endless";
  const level = isEndless
    ? null
    : CAMPAIGN_LEVELS[clamp(opts.week, 1, CAMPAIGN_LEVELS.length) - 1];

  const src = isEndless ? ENDLESS_BASE : level!;
  const speedMin = src.speedMin * diff.speedMul;
  const speedMax = src.speedMax * diff.speedMul;

  let objective: Objective;
  let timeLimit = 0;
  if (isEndless) {
    objective = { type: "endless", target: 0 };
  } else {
    const base = level!.objective;
    if (base.type === "survive" || base.type === "noHit") {
      const tgt = Math.round(base.target * diff.goalMul);
      objective = { type: base.type, target: tgt };
      timeLimit = tgt;
    } else {
      objective = { type: base.type, target: Math.max(1, Math.round(base.target * diff.goalMul)) };
      timeLimit = level!.timeLimit;
    }
  }

  const startLives = clamp(START_LIVES + eff.startLivesBonus + diff.livesBonus, 1, MAX_LIVES);

  return {
    mode: opts.mode,
    playerW: eff.playerW,
    coffeePoints: eff.coffeePoints,
    powerMult: eff.powerMult,
    speedMul: diff.speedMul,
    speedMin,
    speedMax,
    spawnEvery: src.spawnEvery,
    spawnJitter: src.spawnJitter,
    pool: src.pool,
    allowSpecials: isEndless || level!.week >= 2,
    objective,
    timeLimit,
    objectiveDone: false,
    coffeeCount: 0,
    examCount: 0,
    bestCombo: 0,
    flawless: true,
    levelClock: 0,
    modifiers: isEndless ? [] : level!.modifiers,
    rushTimer: 0,
    rushCooldown: DEADLINE_EVERY * 0.6,
    swarmCooldown: SWARM_EVERY * 0.7,
    wave: isEndless ? 1 : 0,
    waveClock: 0,
    score: 0,
    lives: startLives,
    startLives,
    level: isEndless ? 1 : level!.week,
    combo: 0,
    coffeeRun: 0,
    playerX: (BOARD_W - eff.playerW) / 2,
    playerVX: 0,
    playerVel: 0,
    targetX: null,
    items: [],
    popups: [],
    particles: [],
    spawnTimer: 0.6,
    nextId: 1,
    magnetTimer: eff.startMagnet,
    slowTimer: 0,
    shield: eff.startShield,
    flashTone: null,
    flashTimer: 0,
    shakeTimer: 0,
    bannerLevel: null,
    bannerTimer: 0,
  };
}

// ---------------------------------------------------------------------------
// Spawning
// ---------------------------------------------------------------------------
function makeItem(sim: Sim, typeId: ItemTypeId, speedFactor: number): FallingItem {
  const type = ITEM_TYPES[typeId];
  const special = type.group === "power" || type.group === "heart";
  const base = randRange(sim.speedMin, sim.speedMax) * speedFactor;
  const points = typeId === "coffee" ? sim.coffeePoints : type.points;
  return {
    id: sim.nextId++,
    type: typeId,
    group: type.group,
    power: type.power,
    icon: pick(type.icons),
    points,
    x: randRange(6, BOARD_W - ITEM_SIZE - 6),
    y: -ITEM_SIZE,
    speed: special ? base * 0.78 : base,
    wobble: Math.random() * Math.PI * 2,
    golden: special,
  };
}

function spawnItem(sim: Sim, speedFactor: number): FallingItem {
  if (sim.allowSpecials) {
    const roll = Math.random();
    if (sim.lives < MAX_LIVES && roll < HEART_CHANCE) return makeItem(sim, "heart", speedFactor);
    if (roll < HEART_CHANCE + POWER_CHANCE) {
      const powers: ItemTypeId[] = sim.shield
        ? ["energy", "focus"]
        : ["energy", "focus", "shield"];
      return makeItem(sim, pick(powers), speedFactor);
    }
  }
  return makeItem(sim, pickType(sim.pool), speedFactor);
}

// ---------------------------------------------------------------------------
// Per-frame step
// ---------------------------------------------------------------------------
function popup(sim: Sim, x: number, y: number, text: string, tone: Tone, icon?: IconKey): Popup {
  return { id: sim.nextId++, x, y, text, tone, life: POPUP_LIFE, icon };
}

export function step(
  sim: Sim,
  dt: number,
  keys: { left: boolean; right: boolean },
): StepResult {
  const events: GameEvent[] = [];
  sim.levelClock += dt;

  const hasWind = sim.modifiers.includes("wind");
  const hasIce = sim.modifiers.includes("ice");
  const hasSwarm = sim.modifiers.includes("swarm");
  const hasHoming = sim.modifiers.includes("homing");
  const hasDeadline = sim.modifiers.includes("deadline");

  // --- movement ------------------------------------------------------------
  const prevX = sim.playerX;
  const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  const maxX = BOARD_W - sim.playerW;
  if (hasIce) {
    if (dir !== 0) {
      sim.targetX = null;
      sim.playerVel += dir * ICE_ACCEL * dt;
    } else if (sim.targetX !== null) {
      sim.playerVel += clamp((sim.targetX - sim.playerX) * 8, -ICE_ACCEL, ICE_ACCEL) * dt;
    }
    sim.playerVel *= Math.max(0, 1 - ICE_FRICTION * dt);
    sim.playerX += sim.playerVel * dt;
    if (sim.playerX < 0) {
      sim.playerX = 0;
      sim.playerVel = 0;
    } else if (sim.playerX > maxX) {
      sim.playerX = maxX;
      sim.playerVel = 0;
    }
  } else {
    if (dir !== 0) {
      sim.targetX = null;
      sim.playerX = clamp(sim.playerX + dir * PLAYER_SPEED * dt, 0, maxX);
    } else if (sim.targetX !== null) {
      const t = Math.min(1, dt * POINTER_LERP);
      sim.playerX = clamp(sim.playerX + (sim.targetX - sim.playerX) * t, 0, maxX);
    }
    sim.playerVel = 0;
  }
  sim.playerVX = (sim.playerX - prevX) / Math.max(dt, 1e-4);

  // --- difficulty / speed scaling ------------------------------------------
  const speedFactor =
    sim.mode === "endless"
      ? 1 + sim.wave * ENDLESS_SPEED_PER_WAVE
      : 1 + Math.min(RAMP_MAX, sim.levelClock * RAMP_PER_SEC);
  const slow = sim.slowTimer > 0 ? SLOW_FACTOR : 1;

  // deadline rushes
  if (hasDeadline) {
    sim.rushCooldown -= dt;
    if (sim.rushTimer <= 0 && sim.rushCooldown <= 0) {
      sim.rushTimer = DEADLINE_DURATION;
      sim.rushCooldown = DEADLINE_EVERY;
    }
  }
  const rush = sim.rushTimer > 0 ? DEADLINE_MULT : 1;
  if (sim.rushTimer > 0) sim.rushTimer = Math.max(0, sim.rushTimer - dt);

  // --- spawning ------------------------------------------------------------
  let interval = sim.spawnEvery;
  if (sim.mode === "endless") {
    interval = Math.max(0.16, sim.spawnEvery * (1 - sim.wave * ENDLESS_SPAWN_DECAY));
  }
  sim.spawnTimer -= dt;
  if (sim.spawnTimer <= 0) {
    sim.items.push(spawnItem(sim, speedFactor));
    sim.spawnTimer = Math.max(0.16, interval + randRange(-sim.spawnJitter, sim.spawnJitter));
  }
  // swarm bursts
  if (hasSwarm) {
    sim.swarmCooldown -= dt;
    if (sim.swarmCooldown <= 0) {
      for (let i = 0; i < SWARM_COUNT; i++) {
        sim.items.push(makeItem(sim, pick(["bug", "distraction"]), speedFactor));
      }
      sim.swarmCooldown = SWARM_EVERY;
    }
  }

  // --- move items + collisions ---------------------------------------------
  const wind = hasWind ? Math.sin((sim.levelClock * Math.PI * 2) / WIND_PERIOD) * WIND_FORCE : 0;
  const playerCenter = sim.playerX + sim.playerW / 2;
  const playerLeft = sim.playerX;
  const playerRight = sim.playerX + sim.playerW;
  const magnetOn = sim.magnetTimer > 0;
  const survivors: FallingItem[] = [];

  for (const item of sim.items) {
    if (wind !== 0) item.x = clamp(item.x + wind * dt, 0, BOARD_W - ITEM_SIZE);
    if (magnetOn && item.group === "good") {
      const ic = item.x + ITEM_SIZE / 2;
      item.x = clamp(item.x + (playerCenter - ic) * Math.min(1, dt * MAGNET_LERP), 0, BOARD_W - ITEM_SIZE);
    }
    if (hasHoming && item.group === "bad") {
      const ic = item.x + ITEM_SIZE / 2;
      item.x = clamp(item.x + (playerCenter - ic) * Math.min(1, dt * HOMING_LERP), 0, BOARD_W - ITEM_SIZE);
    }
    item.y += item.speed * dt * slow * rush;

    const overlapV = item.y + ITEM_SIZE >= PLAYER_TOP && item.y <= PLAYER_TOP + PLAYER_H;
    const overlapH = item.x < playerRight && item.x + ITEM_SIZE > playerLeft;

    if (overlapV && overlapH) {
      const cx = item.x + ITEM_SIZE / 2;
      const cy = PLAYER_TOP;
      if (item.group === "good") {
        sim.combo += 1;
        sim.bestCombo = Math.max(sim.bestCombo, sim.combo);
        const m = comboMultiplier(sim.combo);
        const pts = item.points * m;
        sim.score += pts;
        if (item.type === "coffee") {
          sim.coffeeCount += 1;
          sim.coffeeRun += 1;
        } else if (item.type === "exam") {
          sim.examCount += 1;
        }
        sim.flashTone = "good";
        sim.flashTimer = FLASH_DURATION;
        addBurst(sim, cx, cy, "good");
        sim.popups.push(popup(sim, cx, cy, m > 1 ? `+${pts} ×${m}` : `+${pts}`, "good"));
        events.push({ t: "good", mult: m });
      } else if (item.group === "bad") {
        if (sim.shield) {
          sim.shield = false;
          sim.flashTone = "power";
          sim.flashTimer = FLASH_DURATION;
          addBurst(sim, cx, cy, "power");
          sim.popups.push(popup(sim, cx, cy, "Блокирано", "power", "shield"));
          events.push({ t: "shield" });
        } else {
          sim.lives -= 1;
          sim.combo = 0;
          sim.flawless = false;
          sim.flashTone = "bad";
          sim.flashTimer = FLASH_DURATION;
          sim.shakeTimer = SHAKE_DURATION;
          addBurst(sim, cx, cy, "bad");
          sim.popups.push(popup(sim, cx, cy, "−1", "bad", "heart"));
          events.push({ t: "bad" });
        }
      } else if (item.group === "power" && item.power) {
        if (item.power === "magnet") sim.magnetTimer = MAGNET_DURATION * sim.powerMult;
        else if (item.power === "slow") sim.slowTimer = SLOW_DURATION * sim.powerMult;
        else if (item.power === "shield") sim.shield = true;
        sim.flashTone = "power";
        sim.flashTimer = FLASH_DURATION;
        addBurst(sim, cx, cy, "power");
        sim.popups.push(popup(sim, cx, cy, POWER_POPUP[item.power].text, "power", POWER_POPUP[item.power].icon));
        events.push({ t: "power", p: item.power });
      } else if (item.group === "heart") {
        sim.lives = Math.min(MAX_LIVES, sim.lives + 1);
        sim.flashTone = "good";
        sim.flashTimer = FLASH_DURATION;
        addBurst(sim, cx, cy, "good");
        sim.popups.push(popup(sim, cx, cy, "+1", "good", "heart"));
        events.push({ t: "heart" });
      }
      continue;
    }

    if (item.y > PLAY_H) continue; // missed
    survivors.push(item);
  }
  sim.items = survivors;

  // --- endless wave escalation ---------------------------------------------
  if (sim.mode === "endless") {
    sim.waveClock += dt;
    if (sim.waveClock >= ENDLESS_WAVE_TIME) {
      sim.waveClock -= ENDLESS_WAVE_TIME;
      sim.wave += 1;
      sim.level = sim.wave;
      sim.bannerLevel = sim.wave;
      sim.bannerTimer = BANNER_DURATION;
      events.push({ t: "level" });
    }
  }

  // --- objective tracking (campaign only) ----------------------------------
  if (sim.mode === "campaign" && !sim.objectiveDone) {
    const o = sim.objective;
    let done = false;
    if (o.type === "score") done = sim.score >= o.target;
    else if (o.type === "collectCoffee") done = sim.coffeeCount >= o.target;
    else if (o.type === "collectExam") done = sim.examCount >= o.target;
    else if (o.type === "survive") done = sim.levelClock >= o.target;
    else if (o.type === "combo") done = sim.bestCombo >= o.target;
    else if (o.type === "noHit") done = sim.levelClock >= o.target && sim.flawless;
    if (done) sim.objectiveDone = true;
  }

  // --- age effects, popups & particles -------------------------------------
  if (sim.flashTimer > 0) sim.flashTimer = Math.max(0, sim.flashTimer - dt);
  if (sim.shakeTimer > 0) sim.shakeTimer = Math.max(0, sim.shakeTimer - dt);
  if (sim.magnetTimer > 0) sim.magnetTimer = Math.max(0, sim.magnetTimer - dt);
  if (sim.slowTimer > 0) sim.slowTimer = Math.max(0, sim.slowTimer - dt);
  if (sim.bannerTimer > 0) {
    sim.bannerTimer = Math.max(0, sim.bannerTimer - dt);
    if (sim.bannerTimer === 0) sim.bannerLevel = null;
  }
  if (sim.popups.length) {
    const alive: Popup[] = [];
    for (const p of sim.popups) {
      p.life -= dt;
      p.y -= 36 * dt;
      if (p.life > 0) alive.push(p);
    }
    sim.popups = alive;
  }
  if (sim.particles.length) {
    const alive: Particle[] = [];
    for (const p of sim.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += PARTICLE_GRAVITY * dt;
      if (p.life > 0) alive.push(p);
    }
    sim.particles = alive;
  }

  // --- outcome -------------------------------------------------------------
  let outcome: StepOutcome = "continue";
  if (sim.lives <= 0) {
    outcome = "fail";
  } else if (sim.mode === "campaign") {
    if (sim.objectiveDone) outcome = "clear";
    else if (
      sim.timeLimit > 0 &&
      sim.objective.type !== "survive" &&
      sim.objective.type !== "noHit" &&
      sim.levelClock >= sim.timeLimit
    ) {
      outcome = "fail";
    }
  }

  return { outcome, events };
}

// ---------------------------------------------------------------------------
// Objective progress (for the HUD)
// ---------------------------------------------------------------------------
export interface ObjectiveProgress {
  label: string;
  cur: number;
  target: number;
  frac: number;
  timeLeft: number | null;
}

export function objectiveProgress(sim: Sim): ObjectiveProgress {
  const o = sim.objective;
  let cur = 0;
  if (o.type === "score") cur = sim.score;
  else if (o.type === "collectCoffee") cur = sim.coffeeCount;
  else if (o.type === "collectExam") cur = sim.examCount;
  else if (o.type === "survive" || o.type === "noHit") cur = Math.floor(sim.levelClock);
  else if (o.type === "combo") cur = sim.bestCombo;
  else if (o.type === "endless") cur = sim.score;

  const target = o.target;
  const frac = target > 0 ? clamp(cur / target, 0, 1) : 0;
  const timeLeft = sim.timeLimit > 0 ? Math.max(0, Math.ceil(sim.timeLimit - sim.levelClock)) : null;
  return { label: objectiveLabel(o), cur, target, frac, timeLeft };
}
