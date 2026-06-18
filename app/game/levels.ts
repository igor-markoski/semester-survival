// ---------------------------------------------------------------------------
// Campaign level definitions + the endless-mode base config.
// A "level" is data; the engine reads it to build a run. Each week has its own
// objective and modifiers so it plays differently — not just faster.
// ---------------------------------------------------------------------------
import type { ModifierId, Objective, SpawnEntry } from "./config";
import type { IconKey } from "./icons";

export interface CampaignLevel {
  week: number;
  name: string;
  icon: IconKey;
  blurb: string;
  objective: Objective;
  timeLimit: number; // seconds; 0 = none. For survive/noHit this is the goal.
  speedMin: number;
  speedMax: number;
  spawnEvery: number;
  spawnJitter: number;
  pool: SpawnEntry[];
  modifiers: ModifierId[];
  isBoss: boolean;
  hasQuiz: boolean;
  coinReward: number;
}

export const CAMPAIGN_LEVELS: CampaignLevel[] = [
  {
    week: 1,
    name: "Прв ден",
    icon: "book",
    blurb: "Семестарот почнува лежерно. Навикни се на фаќањето.",
    objective: { type: "collectCoffee", target: 6 },
    timeLimit: 0,
    speedMin: 120,
    speedMax: 165,
    spawnEvery: 0.95,
    spawnJitter: 0.25,
    pool: [
      { type: "coffee", weight: 60 },
      { type: "bug", weight: 40 },
    ],
    modifiers: [],
    isBoss: false,
    hasQuiz: false,
    coinReward: 40,
  },
  {
    week: 2,
    name: "Ред за кафе",
    icon: "wind",
    blurb: "Ветер дува низ кампусот — предметите се нишаат.",
    objective: { type: "score", target: 30 },
    timeLimit: 0,
    speedMin: 160,
    speedMax: 220,
    spawnEvery: 0.82,
    spawnJitter: 0.22,
    pool: [
      { type: "coffee", weight: 50 },
      { type: "bug", weight: 30 },
      { type: "distraction", weight: 20 },
    ],
    modifiers: ["wind"],
    isBoss: false,
    hasQuiz: false,
    coinReward: 55,
  },
  {
    week: 3,
    name: "Прв колоквиум",
    icon: "clipboard",
    blurb: "Колоквиумска недела! Багови во ројеви. Издржи!",
    objective: { type: "survive", target: 45 },
    timeLimit: 45,
    speedMin: 200,
    speedMax: 270,
    spawnEvery: 0.62,
    spawnJitter: 0.2,
    pool: [
      { type: "coffee", weight: 44 },
      { type: "bug", weight: 34 },
      { type: "distraction", weight: 22 },
    ],
    modifiers: ["swarm"],
    isBoss: true,
    hasQuiz: true,
    coinReward: 85,
  },
  {
    week: 4,
    name: "Ноќно бубање",
    icon: "moon",
    blurb: "Учиш ноќе на мрак, а дедлајните забрзуваат сè.",
    objective: { type: "collectCoffee", target: 12 },
    timeLimit: 45,
    speedMin: 210,
    speedMax: 285,
    spawnEvery: 0.7,
    spawnJitter: 0.2,
    pool: [
      { type: "coffee", weight: 52 },
      { type: "bug", weight: 28 },
      { type: "distraction", weight: 20 },
    ],
    modifiers: ["night", "deadline"],
    isBoss: false,
    hasQuiz: false,
    coinReward: 80,
  },
  {
    week: 5,
    name: "Хаос пред крај",
    icon: "ice",
    blurb: "Лизгав под и дистракции што те бркаат. Фати ги испитите!",
    objective: { type: "collectExam", target: 4 },
    timeLimit: 0,
    speedMin: 235,
    speedMax: 310,
    spawnEvery: 0.66,
    spawnJitter: 0.2,
    pool: [
      { type: "coffee", weight: 32 },
      { type: "exam", weight: 28 },
      { type: "bug", weight: 24 },
      { type: "distraction", weight: 16 },
    ],
    modifiers: ["ice", "homing"],
    isBoss: false,
    hasQuiz: false,
    coinReward: 95,
  },
  {
    week: 6,
    name: "Финален испит",
    icon: "cap",
    blurb: "Сè на едно место: рој, дедлајн и мрак. Преживеј и дипломирај!",
    objective: { type: "survive", target: 60 },
    timeLimit: 60,
    speedMin: 260,
    speedMax: 360,
    spawnEvery: 0.55,
    spawnJitter: 0.18,
    pool: [
      { type: "coffee", weight: 40 },
      { type: "exam", weight: 10 },
      { type: "bug", weight: 30 },
      { type: "distraction", weight: 20 },
    ],
    modifiers: ["swarm", "deadline", "night"],
    isBoss: true,
    hasQuiz: true,
    coinReward: 140,
  },
];

/** Base spawn config for endless mode (the engine escalates it per wave). */
export const ENDLESS_BASE = {
  speedMin: 175,
  speedMax: 245,
  spawnEvery: 0.8,
  spawnJitter: 0.2,
  pool: [
    { type: "coffee", weight: 46 },
    { type: "exam", weight: 7 },
    { type: "bug", weight: 30 },
    { type: "distraction", weight: 17 },
  ] as SpawnEntry[],
};

/** Human-readable Macedonian description of an objective. */
export function objectiveLabel(o: Objective): string {
  switch (o.type) {
    case "score":
      return `Собери ${o.target} поени`;
    case "collectCoffee":
      return `Фати ${o.target} кафиња`;
    case "collectExam":
      return `Фати ${o.target} испити`;
    case "survive":
      return `Преживеј ${o.target} секунди`;
    case "combo":
      return `Достигни комбо ×${o.target}`;
    case "noHit":
      return `Преживеј ${o.target}с без грешка`;
    case "endless":
      return "Преживеј што подолго!";
  }
}
