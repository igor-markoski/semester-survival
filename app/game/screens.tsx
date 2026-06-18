"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BedDouble,
  Check,
  Clock,
  Coins,
  Crown,
  FileText,
  Frown,
  Gem,
  GraduationCap,
  Home,
  Infinity as InfinityIcon,
  Lock,
  Map as MapIcon,
  PartyPopper,
  Pause,
  Play,
  RotateCcw,
  ShoppingCart,
  Star,
  Target,
  Trophy,
  X,
} from "lucide-react";
import { BOARD_W, type Difficulty, DIFFICULTIES, INNER_H, MODIFIERS } from "./config";
import { ACHIEVEMENTS } from "./achievements";
import { GameIcon, type IconKey } from "./icons";
import { type CampaignLevel, CAMPAIGN_LEVELS, objectiveLabel } from "./levels";
import { type Question, QUIZ_TIME } from "./quiz";
import type { SaveState } from "./save";
import { nextCost, UPGRADES } from "./upgrades";

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------
type Tone = "sky" | "emerald" | "rose" | "amber" | "slate";

const TONE: Record<Tone, string> = {
  sky: "from-sky-400 to-blue-600 shadow-sky-500/40 focus-visible:ring-sky-300",
  emerald: "from-emerald-400 to-green-600 shadow-emerald-500/40 focus-visible:ring-emerald-300",
  rose: "from-rose-500 to-red-600 shadow-rose-500/40 focus-visible:ring-rose-300",
  amber: "from-amber-400 to-orange-500 shadow-amber-500/40 focus-visible:ring-amber-300",
  slate: "from-slate-600 to-slate-700 shadow-black/30 focus-visible:ring-slate-300",
};

function Btn({
  children,
  onClick,
  tone = "sky",
  disabled,
  big,
}: {
  children: ReactNode;
  onClick: () => void;
  tone?: Tone;
  disabled?: boolean;
  big?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-full bg-gradient-to-b ${TONE[tone]} font-black text-white shadow-xl outline-none transition-transform duration-150 focus-visible:ring-4 ${
        big ? "px-9 py-3 text-lg" : "px-5 py-2 text-sm"
      } ${disabled ? "cursor-not-allowed opacity-40" : "hover:scale-105 active:scale-95"}`}
    >
      <span className="inline-flex items-center justify-center gap-2">{children}</span>
    </button>
  );
}

export function Stars({ count, size = 28 }: { count: number; size?: number }) {
  return (
    <div className="flex justify-center gap-1">
      {[0, 1, 2].map((i) => (
        <Star key={i} size={size} className={i < count ? "fill-amber-300 text-amber-300" : "text-slate-600"} />
      ))}
    </div>
  );
}

function ScreenFrame({
  title,
  subtitle,
  onBack,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  onBack?: () => void;
  children: ReactNode;
}) {
  return (
    <div
      style={{ width: BOARD_W, height: INNER_H }}
      className="ss-fade flex flex-col overflow-hidden rounded-2xl bg-white/5 ring-1 ring-white/10"
    >
      <header className="flex items-center gap-3 border-b border-white/10 px-6 py-4">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1.5 text-sm font-bold text-slate-200 ring-1 ring-white/10 transition hover:bg-white/10"
          >
            <ArrowLeft size={15} /> Назад
          </button>
        )}
        <div className="flex flex-col">
          <h2 className="text-xl font-black text-white">{title}</h2>
          {subtitle && <div className="text-xs text-slate-400">{subtitle}</div>}
        </div>
      </header>
      <div className="flex-1 overflow-y-auto p-6">{children}</div>
    </div>
  );
}

function OverlayShell({ children, tone }: { children: ReactNode; tone?: Tone }) {
  const glow =
    tone === "emerald" ? "from-emerald-500/15" : tone === "rose" ? "from-rose-500/15" : "from-sky-500/10";
  return (
    <div className={`ss-fade absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-b ${glow} to-slate-950/92 px-8 backdrop-blur-sm`}>
      {children}
    </div>
  );
}

function totalStars(save: SaveState): number {
  return Object.values(save.stars).reduce((s, n) => s + n, 0);
}

// ---------------------------------------------------------------------------
// Main menu
// ---------------------------------------------------------------------------
export function MainMenu({
  save,
  onCampaign,
  onEndless,
  onAchievements,
  onDifficulty,
}: {
  save: SaveState;
  onCampaign: () => void;
  onEndless: () => void;
  onAchievements: () => void;
  onDifficulty: (d: Difficulty) => void;
}) {
  const unlocked = ACHIEVEMENTS.filter((a) => save.achievements[a.id]).length;
  return (
    <div
      style={{ width: BOARD_W, height: INNER_H }}
      className="ss-fade flex flex-col items-center justify-center gap-5 rounded-2xl bg-[radial-gradient(120%_100%_at_50%_0%,#1e293b_0%,#0f172a_60%,#0b1120_100%)] p-8 ring-1 ring-white/10"
    >
      <div className="flex flex-col items-center text-center">
        <GraduationCap size={52} className="text-sky-300" />
        <h2 className="mt-1 bg-gradient-to-r from-sky-300 via-cyan-200 to-emerald-300 bg-clip-text text-4xl font-black text-transparent">
          Преживеј го Семестарот
        </h2>
        <p className="mt-1 text-sm text-slate-400">Аркадна игра низ цел еден семестар</p>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-3">
        <Btn onClick={onCampaign} tone="emerald" big>
          <Play size={20} className="fill-white" /> Кампања (Семестар)
        </Btn>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onEndless}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-b from-amber-400 to-orange-500 px-4 py-2.5 text-sm font-black text-white shadow-lg transition hover:scale-[1.03] active:scale-95"
          >
            <InfinityIcon size={18} /> Бескрајно
          </button>
          <button
            type="button"
            onClick={onAchievements}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-white/5 px-4 py-2.5 text-sm font-black text-slate-100 ring-1 ring-white/10 transition hover:bg-white/10"
          >
            <Trophy size={17} className="text-amber-300" /> Постигнувања
          </button>
        </div>
      </div>

      {/* Difficulty */}
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Тежина</span>
        <div className="flex gap-2">
          {Object.values(DIFFICULTIES).map((d) => {
            const active = save.difficulty === d.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => onDifficulty(d.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold transition ${
                  active
                    ? "bg-sky-500/90 text-white ring-2 ring-sky-300"
                    : "bg-white/5 text-slate-300 ring-1 ring-white/10 hover:bg-white/10"
                }`}
              >
                <GameIcon name={d.icon} size={15} /> {d.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm text-slate-300">
        <span className="inline-flex items-center gap-1">
          <Coins size={15} className="text-amber-300" /> {save.coins}
        </span>
        <span className="inline-flex items-center gap-1">
          <Star size={15} className="fill-amber-300 text-amber-300" /> {totalStars(save)}/{CAMPAIGN_LEVELS.length * 3}
        </span>
        <span className="inline-flex items-center gap-1">
          <Trophy size={15} className="text-amber-300" /> {unlocked}/{ACHIEVEMENTS.length}
        </span>
        {save.endlessBest > 0 && (
          <span className="inline-flex items-center gap-1">
            <InfinityIcon size={15} className="text-sky-300" /> {save.endlessBest}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Campaign map
// ---------------------------------------------------------------------------
export function CampaignMap({
  save,
  onPlay,
  onShop,
  onBack,
}: {
  save: SaveState;
  onPlay: (week: number) => void;
  onShop: () => void;
  onBack: () => void;
}) {
  return (
    <ScreenFrame
      title="Семестар — мапа"
      subtitle={
        <span className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <Coins size={13} className="text-amber-300" /> {save.coins}
          </span>
          <span className="inline-flex items-center gap-1">
            <Star size={13} className="fill-amber-300 text-amber-300" /> {totalStars(save)}/{CAMPAIGN_LEVELS.length * 3}
          </span>
        </span>
      }
      onBack={onBack}
    >
      <div className="grid grid-cols-3 gap-4">
        {CAMPAIGN_LEVELS.map((lvl) => {
          const locked = lvl.week > save.unlockedWeek;
          const stars = save.stars[lvl.week] ?? 0;
          const done = stars > 0 || lvl.week < save.unlockedWeek;
          return (
            <button
              key={lvl.week}
              type="button"
              disabled={locked}
              onClick={() => onPlay(lvl.week)}
              className={`flex flex-col items-center gap-1 rounded-2xl p-4 text-center ring-1 transition ${
                locked
                  ? "cursor-not-allowed bg-slate-800/40 text-slate-500 ring-white/5"
                  : "bg-white/5 text-white ring-white/10 hover:scale-[1.03] hover:bg-white/10"
              }`}
            >
              <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-sky-300/80">
                Недела {lvl.week}
                {lvl.isBoss && <Crown size={12} className="text-amber-300" />}
              </span>
              {locked ? <Lock size={30} className="text-slate-500" /> : <GameIcon name={lvl.icon} size={30} />}
              <span className="text-sm font-bold">{lvl.name}</span>
              {locked ? (
                <span className="text-[11px] text-slate-500">Заклучено</span>
              ) : (
                <Stars count={stars} size={15} />
              )}
              {done && !locked && <span className="text-[10px] text-emerald-300/80">положено</span>}
            </button>
          );
        })}
      </div>
      <div className="mt-6 flex justify-center">
        <Btn onClick={onShop} tone="amber">
          <ShoppingCart size={16} /> Продавница за надградби
        </Btn>
      </div>
    </ScreenFrame>
  );
}

// ---------------------------------------------------------------------------
// Level intro
// ---------------------------------------------------------------------------
export function LevelIntro({
  level,
  onStart,
  onBack,
}: {
  level: CampaignLevel;
  onStart: () => void;
  onBack: () => void;
}) {
  return (
    <div
      style={{ width: BOARD_W, height: INNER_H }}
      className="ss-fade flex flex-col items-center justify-center gap-4 rounded-2xl bg-[radial-gradient(120%_100%_at_50%_0%,#1e293b_0%,#0f172a_60%,#0b1120_100%)] p-8 text-center ring-1 ring-white/10"
    >
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-sky-300/80">
        Недела {level.week}
        {level.isBoss && (
          <>
            · <Crown size={13} className="text-amber-300" /> Босс
          </>
        )}
      </span>
      <GameIcon name={level.icon} size={52} />
      <h2 className="text-3xl font-black text-white">{level.name}</h2>
      <p className="max-w-md text-sm text-slate-300">{level.blurb}</p>

      <div className="rounded-2xl bg-white/5 px-6 py-3 ring-1 ring-white/10">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-emerald-300/80">Цел</div>
        <div className="flex items-center justify-center gap-2 text-lg font-black text-white">
          <Target size={20} className="text-emerald-300" /> {objectiveLabel(level.objective)}
        </div>
      </div>

      {(level.modifiers.length > 0 || level.hasQuiz) && (
        <div className="flex flex-wrap justify-center gap-2">
          {level.modifiers.map((m) => (
            <span
              key={m}
              title={MODIFIERS[m].desc}
              className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 px-3 py-1 text-xs font-bold text-rose-200 ring-1 ring-rose-400/30"
            >
              <GameIcon name={MODIFIERS[m].icon} size={14} /> {MODIFIERS[m].name}
            </span>
          ))}
          {level.hasQuiz && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-bold text-amber-200 ring-1 ring-amber-400/30">
              <FileText size={14} /> Бонус прашање
            </span>
          )}
        </div>
      )}

      <div className="mt-2 flex gap-3">
        <Btn onClick={onBack} tone="slate">
          <ArrowLeft size={16} /> Назад
        </Btn>
        <Btn onClick={onStart} tone="emerald" big>
          <Play size={20} className="fill-white" /> Започни
        </Btn>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shop
// ---------------------------------------------------------------------------
export function Shop({
  save,
  onBuy,
  onBack,
}: {
  save: SaveState;
  onBuy: (id: string) => void;
  onBack: () => void;
}) {
  return (
    <ScreenFrame
      title="Продавница"
      subtitle={
        <span className="inline-flex items-center gap-1">
          <Coins size={13} className="text-amber-300" /> {save.coins} монети
        </span>
      }
      onBack={onBack}
    >
      <div className="grid grid-cols-2 gap-3">
        {UPGRADES.map((u) => {
          const owned = save.upgrades[u.id] ?? 0;
          const cost = nextCost(u, owned);
          const maxed = cost === null;
          const afford = cost !== null && save.coins >= cost;
          return (
            <div key={u.id} className="flex flex-col gap-2 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <div className="flex items-center gap-2">
                <GameIcon name={u.icon} size={26} />
                <div className="flex flex-col">
                  <span className="text-sm font-black text-white">{u.name}</span>
                  <div className="mt-0.5 flex gap-1">
                    {Array.from({ length: u.maxLevel }).map((_, i) => (
                      <span key={i} className={`h-1.5 w-5 rounded-full ${i < owned ? "bg-emerald-400" : "bg-white/15"}`} />
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400">{u.desc}</p>
              <button
                type="button"
                disabled={maxed || !afford}
                onClick={() => onBuy(u.id)}
                className={`mt-auto inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-sm font-black transition ${
                  maxed
                    ? "bg-emerald-500/20 text-emerald-300"
                    : afford
                      ? "bg-amber-500/90 text-white hover:scale-[1.03] active:scale-95"
                      : "cursor-not-allowed bg-white/5 text-slate-500"
                }`}
              >
                {maxed ? (
                  <>
                    <Check size={15} /> Максимум
                  </>
                ) : (
                  <>
                    <Coins size={14} /> {cost}
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </ScreenFrame>
  );
}

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------
export function Achievements({ save, onBack }: { save: SaveState; onBack: () => void }) {
  const unlocked = ACHIEVEMENTS.filter((a) => save.achievements[a.id]).length;
  return (
    <ScreenFrame title="Постигнувања" subtitle={`${unlocked}/${ACHIEVEMENTS.length} отклучени`} onBack={onBack}>
      <div className="grid grid-cols-2 gap-3">
        {ACHIEVEMENTS.map((a) => {
          const got = !!save.achievements[a.id];
          return (
            <div
              key={a.id}
              className={`flex items-center gap-3 rounded-2xl p-3 ring-1 ${
                got ? "bg-emerald-500/10 ring-emerald-400/30" : "bg-white/5 ring-white/10"
              }`}
            >
              {got ? <GameIcon name={a.icon} size={30} /> : <Lock size={28} className="text-slate-500" />}
              <div className="flex flex-col">
                <span className={`text-sm font-black ${got ? "text-white" : "text-slate-400"}`}>{a.name}</span>
                <span className="text-xs text-slate-400">{a.desc}</span>
              </div>
            </div>
          );
        })}
      </div>
    </ScreenFrame>
  );
}

// ---------------------------------------------------------------------------
// In-play overlays
// ---------------------------------------------------------------------------
export function PauseScreen({ onResume, onQuit }: { onResume: () => void; onQuit: () => void }) {
  return (
    <OverlayShell>
      <div className="flex flex-col items-center text-center">
        <Pause size={48} className="fill-white text-white" />
        <h2 className="mt-2 text-3xl font-black text-white">Пауза</h2>
        <p className="mt-2 text-sm text-slate-300">
          Притисни <span className="text-slate-100">P</span> / <span className="text-slate-100">Esc</span> за продолжување.
        </p>
        <div className="mt-6 flex gap-3">
          <Btn onClick={onQuit} tone="slate">
            <Home size={16} /> Мени
          </Btn>
          <Btn onClick={onResume} tone="sky" big>
            <Play size={20} className="fill-white" /> Продолжи
          </Btn>
        </div>
      </div>
    </OverlayShell>
  );
}

export function QuizScreen({
  question,
  onResult,
}: {
  question: Question;
  onResult: (correct: boolean) => void;
}) {
  const [picked, setPicked] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUIZ_TIME);
  const done = useRef(false);

  const finish = useCallback(
    (idx: number) => {
      if (done.current) return;
      done.current = true;
      setPicked(idx);
      window.setTimeout(() => onResult(idx === question.answer), 1100);
    },
    [onResult, question.answer],
  );

  useEffect(() => {
    const id = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          window.clearInterval(id);
          finish(-1);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [finish]);

  return (
    <OverlayShell tone="amber">
      <div className="flex w-full max-w-lg flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-3">
          <FileText size={26} className="text-amber-300" />
          <h2 className="text-2xl font-black text-amber-200">Бонус прашање</h2>
          <span className={`inline-flex items-center gap-1 tabular-nums text-lg font-black ${timeLeft <= 4 ? "text-rose-300" : "text-slate-300"}`}>
            <Clock size={18} /> {timeLeft}
          </span>
        </div>
        <p className="text-lg font-bold text-white">{question.q}</p>
        <div className="flex w-full flex-col gap-2">
          {question.options.map((opt, i) => {
            let cls = "bg-white/5 text-slate-100 ring-white/10 hover:bg-white/10";
            if (picked !== null) {
              if (i === question.answer) cls = "bg-emerald-500/30 text-white ring-emerald-400/60";
              else if (i === picked) cls = "bg-rose-500/30 text-white ring-rose-400/60";
              else cls = "bg-white/5 text-slate-500 ring-white/10";
            }
            return (
              <button
                key={i}
                type="button"
                disabled={picked !== null}
                onClick={() => finish(i)}
                className={`rounded-xl px-5 py-3 text-left text-base font-bold ring-1 transition ${cls} ${picked === null ? "active:scale-[0.98]" : ""}`}
              >
                {opt}
              </button>
            );
          })}
        </div>
        {picked !== null && (
          <p className={`inline-flex items-center gap-1 text-sm font-black ${picked === question.answer ? "text-emerald-300" : "text-rose-300"}`}>
            {picked === question.answer ? (
              <>
                <Check size={16} /> Точно! Бонус монети.
              </>
            ) : (
              <>
                <X size={16} /> Грешка.
              </>
            )}
          </p>
        )}
      </div>
    </OverlayShell>
  );
}

export function LevelComplete({
  stars,
  coins,
  flawless,
  onShop,
  onNext,
}: {
  stars: number;
  coins: number;
  flawless: boolean;
  onShop: () => void;
  onNext: () => void;
}) {
  return (
    <OverlayShell tone="emerald">
      <div className="flex flex-col items-center text-center">
        <h2 className="inline-flex items-center gap-2 text-3xl font-black text-emerald-300">
          Неделата е положена! <PartyPopper size={28} className="text-amber-300" />
        </h2>
        <div className="mt-3">
          <Stars count={stars} size={36} />
        </div>
        {flawless && (
          <p className="mt-1 inline-flex items-center gap-1 text-sm font-bold text-amber-300">
            <Gem size={15} className="text-cyan-300" /> Без изгубен живот!
          </p>
        )}
        <div className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-white/5 px-8 py-3 text-lg font-black text-white ring-1 ring-white/10">
          <Coins size={20} className="text-amber-300" /> +{coins} монети
        </div>
        <div className="mt-6 flex gap-3">
          <Btn onClick={onShop} tone="amber">
            <ShoppingCart size={16} /> Продавница
          </Btn>
          <Btn onClick={onNext} tone="emerald" big>
            <Play size={20} className="fill-white" /> Продолжи
          </Btn>
        </div>
      </div>
    </OverlayShell>
  );
}

export function LevelFailed({ onRetry, onMap }: { onRetry: () => void; onMap: () => void }) {
  return (
    <OverlayShell tone="rose">
      <div className="flex flex-col items-center text-center">
        <h2 className="inline-flex items-center gap-2 text-3xl font-black text-rose-300">
          Не успеа... <Frown size={28} />
        </h2>
        <p className="mt-2 text-sm text-slate-300">Целта не е исполнета. Пробај повторно!</p>
        <div className="mt-6 flex gap-3">
          <Btn onClick={onMap} tone="slate">
            <MapIcon size={16} /> Мапа
          </Btn>
          <Btn onClick={onRetry} tone="rose" big>
            <RotateCcw size={18} /> Обиди се пак
          </Btn>
        </div>
      </div>
    </OverlayShell>
  );
}

export function CampaignComplete({
  totalStars: stars,
  onMenu,
  onEndless,
}: {
  totalStars: number;
  onMenu: () => void;
  onEndless: () => void;
}) {
  return (
    <OverlayShell tone="emerald">
      <div className="flex flex-col items-center text-center">
        <GraduationCap size={60} className="text-emerald-300" />
        <h2 className="mt-2 text-3xl font-black text-emerald-300">Дипломиравте!</h2>
        <p className="mt-2 max-w-md text-sm text-slate-300">
          Го положивте целиот семестар низ сите 6 недели. Честитки, инженеру!
        </p>
        <div className="mt-3 inline-flex items-center gap-2 text-2xl font-black text-white">
          <Star size={24} className="fill-amber-300 text-amber-300" /> {stars} / {CAMPAIGN_LEVELS.length * 3}
        </div>
        <div className="mt-6 flex gap-3">
          <Btn onClick={onMenu} tone="slate">
            <Home size={16} /> Мени
          </Btn>
          <Btn onClick={onEndless} tone="amber" big>
            <InfinityIcon size={20} /> Бескрајно
          </Btn>
        </div>
      </div>
    </OverlayShell>
  );
}

export function EndlessOver({
  score,
  best,
  isNewBest,
  onRetry,
  onMenu,
}: {
  score: number;
  best: number;
  isNewBest: boolean;
  onRetry: () => void;
  onMenu: () => void;
}) {
  return (
    <OverlayShell tone="rose">
      <div className="flex flex-col items-center text-center">
        <h2 className="inline-flex items-center gap-2 text-3xl font-black text-rose-300">
          Крај на сесијата <BedDouble size={28} />
        </h2>
        <div className="mt-4 rounded-2xl bg-white/5 px-8 py-4 ring-1 ring-white/10">
          <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">Резултат</div>
          <div className="text-4xl font-black text-white">{score}</div>
          {isNewBest ? (
            <div className="ss-pulse mt-1 inline-flex items-center gap-1 text-sm font-black text-amber-300">
              <Trophy size={15} /> Нов рекорд!
            </div>
          ) : (
            <div className="mt-1 text-xs text-slate-400">Рекорд: {best}</div>
          )}
        </div>
        <div className="mt-6 flex gap-3">
          <Btn onClick={onMenu} tone="slate">
            <Home size={16} /> Мени
          </Btn>
          <Btn onClick={onRetry} tone="amber" big>
            <RotateCcw size={18} /> Пак
          </Btn>
        </div>
      </div>
    </OverlayShell>
  );
}

// ---------------------------------------------------------------------------
// Achievement toast
// ---------------------------------------------------------------------------
export function AchievementToast({ icon, name, index = 0 }: { icon: IconKey; name: string; index?: number }) {
  return (
    <div className="ss-fade pointer-events-none absolute left-1/2 z-40 -translate-x-1/2" style={{ top: 16 + index * 50 }}>
      <div className="flex items-center gap-2 rounded-full bg-emerald-500/90 px-4 py-2 text-sm font-black text-white shadow-xl ring-1 ring-emerald-300/50">
        <GameIcon name={icon} size={18} className="text-white" />
        <span>Постигнување: {name}</span>
      </div>
    </div>
  );
}
