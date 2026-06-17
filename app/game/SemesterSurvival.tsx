"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import {
  BOARD_W,
  CARD_PAD,
  clamp,
  type Difficulty,
  DIFFICULTIES,
  type GameMode,
  OUTER_H,
  OUTER_W,
  SHAKE_DURATION,
  type Sim,
} from "./config";
import { type GameEvent, makeSim, step } from "./engine";
import { CAMPAIGN_LEVELS } from "./levels";
import { nextCost, UPGRADES } from "./upgrades";
import { pickQuestion, QUESTIONS, QUIZ_REWARD } from "./quiz";
import { type AchievementDef, ACHIEVEMENT_BY_ID } from "./achievements";
import { defaultSave, loadSave, type SaveState, saveSave } from "./save";
import { sound } from "./sound";
import Board from "./Board";
import {
  Achievements,
  AchievementToast,
  CampaignComplete,
  CampaignMap,
  EndlessOver,
  LevelComplete,
  LevelFailed,
  LevelIntro,
  MainMenu,
  PauseScreen,
  QuizScreen,
  Shop,
} from "./screens";

type Screen =
  | "menu"
  | "map"
  | "intro"
  | "playing"
  | "paused"
  | "quiz"
  | "levelComplete"
  | "levelFailed"
  | "campaignComplete"
  | "endlessOver"
  | "shop"
  | "achievements";

interface LevelResult {
  stars: number;
  coins: number;
  flawless: boolean;
}

interface EndlessResult {
  score: number;
  best: number;
  isNewBest: boolean;
}

const BOARD_SCREENS: Screen[] = [
  "playing",
  "paused",
  "quiz",
  "levelComplete",
  "levelFailed",
  "campaignComplete",
  "endlessOver",
];

function playEvent(e: GameEvent) {
  switch (e.t) {
    case "good":
      sound.good(e.mult);
      break;
    case "bad":
      sound.bad();
      break;
    case "shield":
      sound.shield();
      break;
    case "power":
      sound.power();
      break;
    case "heart":
      sound.heart();
      break;
    case "level":
      sound.level();
      break;
  }
}

function withUnlocks(s: SaveState, ids: string[]): { save: SaveState; unlocked: AchievementDef[] } {
  const achievements = { ...s.achievements };
  const unlocked: AchievementDef[] = [];
  for (const id of ids) {
    if (!achievements[id]) {
      achievements[id] = true;
      const def = ACHIEVEMENT_BY_ID[id];
      if (def) unlocked.push(def);
    }
  }
  return { save: { ...s, achievements }, unlocked };
}

export default function SemesterSurvival() {
  const [save, setSave] = useState<SaveState>(defaultSave);
  const [screen, setScreen] = useState<Screen>("menu");
  const [mode, setMode] = useState<GameMode>("campaign");
  const [week, setWeek] = useState(1);
  const [view, setView] = useState<Sim>(() => makeSim({ mode: "campaign", week: 1, difficulty: "normal", upgrades: {} }));
  const [scale, setScale] = useState(1);
  const [result, setResult] = useState<LevelResult | null>(null);
  const [endlessResult, setEndlessResult] = useState<EndlessResult | null>(null);
  const [quizIndex, setQuizIndex] = useState<number | null>(null);
  const [toast, setToast] = useState<AchievementDef | null>(null);

  const simRef = useRef<Sim>(view);
  const keysRef = useRef({ left: false, right: false });
  const rafRef = useRef<number | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const saveRef = useRef(save);
  const screenRef = useRef(screen);
  const scaleRef = useRef(scale);
  const weekRef = useRef(week);
  const pendingLastRef = useRef(false);
  const recentQuizRef = useRef<number[]>([]);
  const toastQueueRef = useRef<AchievementDef[]>([]);
  const toastBusyRef = useRef(false);
  saveRef.current = save;
  screenRef.current = screen;
  scaleRef.current = scale;
  weekRef.current = week;

  // --- load persisted save on mount ----------------------------------------
  useEffect(() => {
    const loaded = loadSave();
    saveRef.current = loaded;
    setSave(loaded);
    sound.setMuted(loaded.muted);
  }, []);

  // --- achievement toast queue ---------------------------------------------
  const pumpToast = useCallback(() => {
    if (toastBusyRef.current) return;
    const next = toastQueueRef.current.shift();
    if (!next) return;
    toastBusyRef.current = true;
    setToast(next);
    sound.unlock();
    window.setTimeout(() => {
      setToast(null);
      toastBusyRef.current = false;
      pumpToast();
    }, 2300);
  }, []);

  // --- persistence helper --------------------------------------------------
  const commitSave = useCallback(
    (next: SaveState, unlocked: AchievementDef[] = []) => {
      saveRef.current = next;
      setSave(next);
      saveSave(next);
      if (unlocked.length) {
        toastQueueRef.current.push(...unlocked);
        pumpToast();
      }
    },
    [pumpToast],
  );

  // --- run lifecycle -------------------------------------------------------
  const startRun = useCallback((runMode: GameMode, wk: number) => {
    const s = makeSim({
      mode: runMode,
      week: wk,
      difficulty: saveRef.current.difficulty,
      upgrades: saveRef.current.upgrades,
    });
    simRef.current = s;
    keysRef.current.left = false;
    keysRef.current.right = false;
    sound.unlock();
    setResult(null);
    setEndlessResult(null);
    setView(s);
    setMode(runMode);
    setWeek(wk);
    weekRef.current = wk;
    setScreen("playing");
  }, []);

  const finishCampaignLevel = useCallback((sim: Sim) => {
    const wk = weekRef.current;
    const lvl = CAMPAIGN_LEVELS[wk - 1];
    const lost = sim.startLives - sim.lives;
    const stars = lost <= 0 ? 3 : lost === 1 ? 2 : 1;
    const isLast = wk >= CAMPAIGN_LEVELS.length;
    const earned = Math.round(
      (lvl.coinReward + stars * 10 + Math.floor(sim.score / 8)) * DIFFICULTIES[saveRef.current.difficulty].coinMul,
    );
    const base = saveRef.current;
    const next: SaveState = {
      ...base,
      coins: base.coins + earned,
      stars: { ...base.stars, [wk]: Math.max(base.stars[wk] ?? 0, stars) },
      unlockedWeek: isLast ? base.unlockedWeek : Math.max(base.unlockedWeek, wk + 1),
      campaignComplete: base.campaignComplete || isLast,
      stats: {
        ...base.stats,
        totalCoffee: base.stats.totalCoffee + sim.coffeeRun,
        bestCombo: Math.max(base.stats.bestCombo, sim.bestCombo),
        flawlessWins: base.stats.flawlessWins + (sim.flawless ? 1 : 0),
      },
    };
    const ids = ["first_week"];
    if (sim.flawless) ids.push("flawless");
    if (sim.bestCombo >= 10) ids.push("combo4");
    if (next.stats.totalCoffee >= 100) ids.push("coffee100");
    if (base.difficulty === "hard") ids.push("hard_week");
    if (isLast) ids.push("graduate");
    const { save: withAch, unlocked } = withUnlocks(next, ids);
    commitSave(withAch, unlocked);

    sound.win();
    setResult({ stars, coins: earned, flawless: sim.flawless });
    if (lvl.hasQuiz) {
      const qi = pickQuestion(recentQuizRef.current);
      recentQuizRef.current = [qi, ...recentQuizRef.current].slice(0, 6);
      setQuizIndex(qi);
      pendingLastRef.current = isLast;
      setScreen("quiz");
    } else {
      setScreen(isLast ? "campaignComplete" : "levelComplete");
    }
  }, [commitSave]);

  const finishEndless = useCallback((score: number) => {
    const base = saveRef.current;
    const isNewBest = score > base.endlessBest;
    const next: SaveState = { ...base, endlessBest: Math.max(base.endlessBest, score) };
    const ids: string[] = [];
    if (score >= 300) ids.push("endless300");
    const { save: withAch, unlocked } = withUnlocks(next, ids);
    commitSave(withAch, unlocked);
    sound.lose();
    setEndlessResult({ score, best: next.endlessBest, isNewBest });
    setScreen("endlessOver");
  }, [commitSave]);

  const handleOutcome = useCallback(
    (outcome: "clear" | "fail") => {
      const sim = simRef.current;
      if (outcome === "fail") {
        if (sim.mode === "endless") finishEndless(sim.score);
        else {
          sound.lose();
          setScreen("levelFailed");
        }
      } else {
        finishCampaignLevel(sim);
      }
    },
    [finishCampaignLevel, finishEndless],
  );

  // --- game loop -----------------------------------------------------------
  useEffect(() => {
    if (screen !== "playing") return;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const { outcome, events } = step(simRef.current, dt, keysRef.current);
      for (const e of events) playEvent(e);
      setView({ ...simRef.current });
      if (outcome === "continue") {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }
      handleOutcome(outcome);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [screen, handleOutcome]);

  // --- keyboard ------------------------------------------------------------
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "ArrowLeft" || k === "a" || k === "A") {
        keysRef.current.left = true;
        e.preventDefault();
      } else if (k === "ArrowRight" || k === "d" || k === "D") {
        keysRef.current.right = true;
        e.preventDefault();
      } else if (k === "p" || k === "P" || k === "Escape") {
        if (screenRef.current === "playing") {
          e.preventDefault();
          setScreen("paused");
        } else if (screenRef.current === "paused") {
          e.preventDefault();
          setScreen("playing");
        }
      }
    };
    const onUp = (e: KeyboardEvent) => {
      const k = e.key;
      if (k === "ArrowLeft" || k === "a" || k === "A") keysRef.current.left = false;
      else if (k === "ArrowRight" || k === "d" || k === "D") keysRef.current.right = false;
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  // --- responsive scaling --------------------------------------------------
  useEffect(() => {
    const compute = () => {
      const sW = (window.innerWidth - 24) / OUTER_W;
      const sH = (window.innerHeight - 140) / OUTER_H;
      setScale(clamp(Math.min(sW, sH, 1), 0.4, 1));
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  // --- pointer control -----------------------------------------------------
  const handlePointer = useCallback((clientX: number) => {
    if (screenRef.current !== "playing") return;
    const el = boardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const logicalX = (clientX - rect.left) / scaleRef.current;
    const sim = simRef.current;
    sim.targetX = clamp(logicalX - sim.playerW / 2, 0, BOARD_W - sim.playerW);
  }, []);

  // --- actions -------------------------------------------------------------
  const setDifficulty = useCallback((d: Difficulty) => {
    commitSave({ ...saveRef.current, difficulty: d });
  }, [commitSave]);

  const toggleMute = useCallback(() => {
    const next = { ...saveRef.current, muted: !saveRef.current.muted };
    sound.setMuted(next.muted);
    commitSave(next);
  }, [commitSave]);

  const buyUpgrade = useCallback((id: string) => {
    const def = UPGRADES.find((u) => u.id === id);
    if (!def) return;
    const base = saveRef.current;
    const owned = base.upgrades[id] ?? 0;
    const cost = nextCost(def, owned);
    if (cost === null || base.coins < cost) return;
    const next: SaveState = {
      ...base,
      coins: base.coins - cost,
      upgrades: { ...base.upgrades, [id]: owned + 1 },
      stats: { ...base.stats, upgradesBought: base.stats.upgradesBought + 1 },
    };
    const ids: string[] = [];
    if (next.stats.upgradesBought >= 5) ids.push("shopaholic");
    const { save: withAch, unlocked } = withUnlocks(next, ids);
    commitSave(withAch, unlocked);
    sound.coin();
  }, [commitSave]);

  const onQuizResult = useCallback((correct: boolean) => {
    if (correct) {
      sound.correct();
      commitSave({ ...saveRef.current, coins: saveRef.current.coins + QUIZ_REWARD });
      setResult((r) => (r ? { ...r, coins: r.coins + QUIZ_REWARD } : r));
    } else {
      sound.wrong();
    }
    setScreen(pendingLastRef.current ? "campaignComplete" : "levelComplete");
  }, [commitSave]);

  // --- derived render state ------------------------------------------------
  const showBoard = BOARD_SCREENS.includes(screen);
  const lvl = CAMPAIGN_LEVELS[week - 1];
  const levelLabel = mode === "endless" ? "Бескрајно" : `Недела ${week}`;
  const levelName = mode === "endless" ? "Августовска сесија" : lvl?.name ?? "";

  const shakeAmp = showBoard && view.shakeTimer > 0 ? (view.shakeTimer / SHAKE_DURATION) * 8 : 0;
  const shakeStyle = shakeAmp
    ? { transform: `translate(${(Math.random() * 2 - 1) * shakeAmp}px, ${(Math.random() * 2 - 1) * shakeAmp}px)` }
    : undefined;

  let overlay: ReactNode = null;
  if (screen === "paused") overlay = <PauseScreen onResume={() => setScreen("playing")} onQuit={() => setScreen("menu")} />;
  else if (screen === "quiz" && quizIndex !== null)
    overlay = <QuizScreen question={QUESTIONS[quizIndex]} onResult={onQuizResult} />;
  else if (screen === "levelComplete" && result)
    overlay = (
      <LevelComplete
        stars={result.stars}
        coins={result.coins}
        flawless={result.flawless}
        onShop={() => setScreen("shop")}
        onNext={() => setScreen("map")}
      />
    );
  else if (screen === "levelFailed")
    overlay = <LevelFailed onRetry={() => startRun("campaign", week)} onMap={() => setScreen("map")} />;
  else if (screen === "campaignComplete")
    overlay = (
      <CampaignComplete
        totalStars={Object.values(save.stars).reduce((s, n) => s + n, 0)}
        onMenu={() => setScreen("menu")}
        onEndless={() => startRun("endless", 1)}
      />
    );
  else if (screen === "endlessOver" && endlessResult)
    overlay = (
      <EndlessOver
        score={endlessResult.score}
        best={endlessResult.best}
        isNewBest={endlessResult.isNewBest}
        onRetry={() => startRun("endless", 1)}
        onMenu={() => setScreen("menu")}
      />
    );

  return (
    <div className="flex flex-col items-center gap-3">
      <header className="text-center">
        <h1 className="bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300 bg-clip-text text-2xl font-black tracking-tight text-transparent drop-shadow sm:text-3xl">
          Преживеј го Семестарот 🎓
        </h1>
      </header>

      <div style={{ width: OUTER_W * scale, height: OUTER_H * scale }}>
        <div style={{ width: OUTER_W, height: OUTER_H, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <div
            style={{ width: OUTER_W, height: OUTER_H, padding: CARD_PAD, ...shakeStyle }}
            className="relative flex flex-col rounded-[28px] bg-gradient-to-b from-slate-900 to-slate-950 shadow-2xl shadow-black/60 ring-1 ring-white/10"
          >
            <button
              type="button"
              onClick={toggleMute}
              aria-label={save.muted ? "Вклучи звук" : "Исклучи звук"}
              className="absolute right-3 top-3 z-40 flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-lg ring-1 ring-white/10 transition hover:bg-white/10"
            >
              {save.muted ? "🔇" : "🔊"}
            </button>

            {toast && <AchievementToast emoji={toast.emoji} name={toast.name} />}

            {showBoard ? (
              <Board
                view={view}
                levelLabel={levelLabel}
                levelName={levelName}
                boardRef={boardRef}
                onPointer={handlePointer}
                overlay={overlay}
              />
            ) : screen === "menu" ? (
              <MainMenu
                save={save}
                onCampaign={() => setScreen("map")}
                onEndless={() => startRun("endless", 1)}
                onAchievements={() => setScreen("achievements")}
                onDifficulty={setDifficulty}
              />
            ) : screen === "map" ? (
              <CampaignMap
                save={save}
                onPlay={(wk) => {
                  setWeek(wk);
                  weekRef.current = wk;
                  setMode("campaign");
                  setScreen("intro");
                }}
                onShop={() => setScreen("shop")}
                onBack={() => setScreen("menu")}
              />
            ) : screen === "intro" && lvl ? (
              <LevelIntro level={lvl} onStart={() => startRun("campaign", week)} onBack={() => setScreen("map")} />
            ) : screen === "shop" ? (
              <Shop save={save} onBuy={buyUpgrade} onBack={() => setScreen("map")} />
            ) : screen === "achievements" ? (
              <Achievements save={save} onBack={() => setScreen("menu")} />
            ) : null}
          </div>
        </div>
      </div>

      <p className="max-w-xl text-center text-xs text-slate-500">
        🎮 <span className="text-slate-300">← →</span> / <span className="text-slate-300">A D</span> / влечи · Пауза{" "}
        <span className="text-slate-300">P</span> · <span className="text-amber-300/90">фати ☕ по ред за комбо!</span>
      </p>
    </div>
  );
}
