"use client";

import type { ReactNode, RefObject } from "react";
import { AlarmClock, BookOpen, Brain, FileText, Flame, GraduationCap, Heart, Pencil } from "lucide-react";
import {
  BANNER_DURATION,
  BOARD_W,
  CARD_GAP,
  clamp,
  comboMultiplier,
  HEADER_H,
  ITEM_SIZE,
  MAGNET_DURATION,
  NIGHT_RADIUS,
  PLAY_H,
  PLAYER_H,
  PLAYER_TOP,
  type Sim,
  SLOW_DURATION,
} from "./config";
import { objectiveProgress } from "./engine";
import { GameIcon, type IconKey } from "./icons";

interface BoardProps {
  view: Sim;
  levelLabel: string; // "Недела N" or "Бескрајно"
  levelName: string; // weekly name, or "Августовска сесија"
  boardRef: RefObject<HTMLDivElement | null>;
  onPointer: (clientX: number) => void;
  overlay?: ReactNode;
}

export default function Board({
  view,
  levelLabel,
  levelName,
  boardRef,
  onPointer,
  overlay,
}: BoardProps) {
  const tilt = clamp(view.playerVX * 0.018, -10, 10);
  const playerCenter = view.playerX + view.playerW / 2;
  const night = view.modifiers.includes("night");

  return (
    <>
      <Dashboard view={view} levelLabel={levelLabel} levelName={levelName} />

      <div
        ref={boardRef}
        onPointerMove={(e) => onPointer(e.clientX)}
        onPointerDown={(e) => onPointer(e.clientX)}
        style={{ width: BOARD_W, height: PLAY_H, marginTop: CARD_GAP }}
        className="relative touch-none select-none overflow-hidden rounded-2xl bg-[radial-gradient(120%_100%_at_50%_0%,#1e293b_0%,#0f172a_55%,#0b1120_100%)] ring-1 ring-inset ring-white/10"
      >
        <Ambient />

        {/* Active power-up chips */}
        <div className="pointer-events-none absolute left-3 top-3 z-[6] flex gap-2">
          {view.magnetTimer > 0 && (
            <EffectChip icon="energy" frac={view.magnetTimer / (MAGNET_DURATION * view.powerMult)} ring="ring-amber-300/50" bar="bg-amber-300" />
          )}
          {view.slowTimer > 0 && (
            <EffectChip icon="focus" frac={view.slowTimer / (SLOW_DURATION * view.powerMult)} ring="ring-sky-300/50" bar="bg-sky-300" />
          )}
          {view.shield && <EffectChip icon="shield" frac={1} ring="ring-cyan-300/50" bar="bg-cyan-300" />}
        </div>

        {/* Goal line just above the player */}
        <div
          className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-white/10"
          style={{ top: PLAYER_TOP - 2 }}
        />

        {/* Falling items */}
        {view.items.map((item) => {
          const rot =
            item.group === "bad"
              ? Math.sin(item.y * 0.05 + item.wobble) * 16
              : Math.sin(item.y * 0.03 + item.wobble) * 5;
          return (
            <div
              key={item.id}
              className="absolute left-0 top-0 flex items-center justify-center will-change-transform"
              style={{
                width: ITEM_SIZE,
                height: ITEM_SIZE,
                transform: `translate3d(${item.x}px, ${item.y}px, 0)`,
              }}
            >
              {item.golden && <span className="ss-pulse absolute inset-1 rounded-full bg-amber-300/30 blur-md" />}
              <span className="relative" style={{ transform: `rotate(${rot}deg)` }}>
                <GameIcon name={item.icon} size={34} className="drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]" />
              </span>
            </div>
          );
        })}

        {/* Particle bursts */}
        {view.particles.map((p) => (
          <div
            key={p.id}
            className="absolute left-0 top-0 rounded-full will-change-transform"
            style={{
              width: p.size,
              height: p.size,
              background: p.color,
              transform: `translate3d(${p.x - p.size / 2}px, ${p.y - p.size / 2}px, 0)`,
              opacity: clamp(p.life / p.maxLife, 0, 1),
            }}
          />
        ))}

        {/* Score / damage popups */}
        {view.popups.map((p) => (
          <div
            key={p.id}
            className={`pointer-events-none absolute left-0 top-0 flex items-center gap-1 whitespace-nowrap text-lg font-black will-change-transform ${
              p.tone === "good" ? "text-emerald-300" : p.tone === "bad" ? "text-rose-300" : "text-amber-300"
            }`}
            style={{
              transform: `translate3d(${p.x}px, ${p.y}px, 0) translateX(-50%)`,
              opacity: Math.min(1, p.life / 0.45),
              textShadow: "0 2px 8px rgba(0,0,0,0.6)",
            }}
          >
            {p.icon && <GameIcon name={p.icon} size={16} />}
            <span>{p.text}</span>
          </div>
        ))}

        {/* Player (capsule paddle + student); leans while moving */}
        <div
          className="absolute left-0 top-0 will-change-transform"
          style={{
            width: view.playerW,
            height: PLAYER_H,
            transform: `translate3d(${view.playerX}px, ${PLAYER_TOP}px, 0)`,
          }}
        >
          <div className="relative h-full w-full" style={{ transform: `rotate(${tilt}deg)`, transformOrigin: "50% 80%" }}>
            <span className="absolute left-1/2 -translate-x-1/2" style={{ bottom: PLAYER_H - 4 }}>
              <GraduationCap size={26} strokeWidth={2.4} className="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
            </span>
            <div
              className={`h-full w-full rounded-full bg-gradient-to-b from-sky-400 to-blue-600 ring-2 ${
                view.shield ? "ring-cyan-300/80" : "ring-sky-200/40"
              }`}
              style={{ boxShadow: view.shield ? "0 0 22px rgba(34,211,238,0.75)" : "0 0 18px rgba(56,189,248,0.55)" }}
            >
              <div className="mx-3 mt-1 h-1.5 rounded-full bg-white/40" />
            </div>
          </div>
        </div>

        {/* Night spotlight */}
        {night && (
          <div
            className="pointer-events-none absolute inset-0 z-[7]"
            style={{
              background: `radial-gradient(circle ${NIGHT_RADIUS}px at ${playerCenter}px ${PLAYER_TOP}px, rgba(2,6,23,0) 0%, rgba(2,6,23,0) 55%, rgba(2,6,23,0.92) 78%)`,
            }}
          />
        )}

        {/* Deadline rush indicator */}
        {view.rushTimer > 0 && (
          <>
            <div className="pointer-events-none absolute inset-0 z-[7] ring-4 ring-inset ring-rose-500/40" />
            <div className="pointer-events-none absolute left-1/2 top-3 z-[8] -translate-x-1/2">
              <span className="ss-pulse flex items-center gap-1 rounded-full bg-rose-600/80 px-3 py-1 text-sm font-black text-white shadow-lg">
                <AlarmClock size={15} strokeWidth={2.6} /> ДЕДЛАЈН!
              </span>
            </div>
          </>
        )}

        {/* Catch / damage flash */}
        {view.flashTimer > 0 && (
          <div
            className={`pointer-events-none absolute inset-0 z-[8] ${
              view.flashTone === "good" ? "bg-emerald-400" : view.flashTone === "bad" ? "bg-rose-500" : "bg-sky-400"
            }`}
            style={{ opacity: (view.flashTimer / 0.34) * 0.4 }}
          />
        )}

        {/* Endless wave banner */}
        {view.bannerLevel !== null && <WaveBanner wave={view.bannerLevel} timer={view.bannerTimer} />}

        {/* Overlay screens (pause / quiz / results) */}
        {overlay}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
function Dashboard({ view, levelLabel, levelName }: { view: Sim; levelLabel: string; levelName: string }) {
  const mult = comboMultiplier(view.combo);
  const prog = objectiveProgress(view);
  const endless = view.mode === "endless";
  const livesSlots = Math.max(view.startLives, view.lives);

  return (
    <div
      style={{ height: HEADER_H }}
      className="flex items-center justify-between gap-4 rounded-2xl bg-white/5 px-5 ring-1 ring-white/10"
    >
      {/* Level + score */}
      <div className="flex min-w-[150px] flex-col">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-sky-300/80">{levelLabel}</span>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-white">{view.score}</span>
          <span className="text-xs font-medium text-slate-400">поени</span>
        </div>
        <span className="-mt-0.5 truncate text-xs font-medium text-slate-400">{levelName}</span>
      </div>

      {/* Objective */}
      <div className="flex flex-1 flex-col">
        <div className="flex items-end justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-emerald-300/80">
              {endless ? "Бран" : "Цел"}
            </span>
            {mult > 1 && (
              <span className="ss-pulse flex items-center gap-0.5 rounded-full bg-amber-400/20 px-2 py-0.5 text-[11px] font-black text-amber-300 ring-1 ring-amber-300/40">
                <Flame size={11} strokeWidth={2.6} /> ×{mult}
              </span>
            )}
          </div>
          <span className="flex items-center gap-2 text-sm font-bold text-white">
            {endless ? (
              <span>Бран {view.wave}</span>
            ) : (
              <>
                <span className="text-slate-300">{prog.label}</span>
                <span>
                  {prog.cur}
                  <span className="text-slate-500"> / {prog.target}</span>
                </span>
                {prog.timeLeft !== null && (
                  <span className={`flex items-center gap-0.5 tabular-nums ${prog.timeLeft <= 5 ? "text-rose-300" : "text-amber-300"}`}>
                    <AlarmClock size={13} strokeWidth={2.4} /> {prog.timeLeft}s
                  </span>
                )}
              </>
            )}
          </span>
        </div>
        <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-slate-700/60 ring-1 ring-inset ring-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-sky-400 transition-[width] duration-150 ease-out"
            style={{ width: `${endless ? clamp((view.waveClock / 16) * 100, 0, 100) : prog.frac * 100}%` }}
          />
        </div>
      </div>

      {/* Lives */}
      <div className="flex min-w-[120px] flex-col items-end">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-rose-300/80">Животи</span>
        <div className="mt-1 flex flex-wrap justify-end gap-1">
          {Array.from({ length: livesSlots }).map((_, i) =>
            i < view.lives ? (
              <Heart key={i} size={18} className="fill-rose-500 text-rose-500 drop-shadow-[0_0_6px_rgba(244,63,94,0.6)]" />
            ) : (
              <Heart key={i} size={18} className="text-slate-600" />
            ),
          )}
        </div>
      </div>
    </div>
  );
}

function EffectChip({ icon, frac, ring, bar }: { icon: IconKey; frac: number; ring: string; bar: string }) {
  return (
    <div className={`flex flex-col items-center gap-1 rounded-xl bg-slate-900/70 px-2 py-1 ring-1 ${ring}`}>
      <GameIcon name={icon} size={18} />
      <div className="h-1 w-7 overflow-hidden rounded-full bg-white/15">
        <div className={`h-full ${bar}`} style={{ width: `${clamp(frac * 100, 0, 100)}%` }} />
      </div>
    </div>
  );
}

function Ambient() {
  const deco = [
    { Icon: BookOpen, left: "8%", top: "18%", d: "0s", s: 26 },
    { Icon: Pencil, left: "82%", top: "12%", d: "1.1s", s: 22 },
    { Icon: FileText, left: "68%", top: "30%", d: "2.2s", s: 24 },
    { Icon: Brain, left: "20%", top: "40%", d: "0.6s", s: 22 },
    { Icon: GraduationCap, left: "45%", top: "16%", d: "1.7s", s: 22 },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {deco.map(({ Icon, left, top, d, s }, i) => (
        <span key={i} className="ss-float absolute" style={{ left, top, animationDelay: d }}>
          <Icon size={s} className="text-white/10" />
        </span>
      ))}
    </div>
  );
}

function WaveBanner({ wave, timer }: { wave: number; timer: number }) {
  const appear = clamp((BANNER_DURATION - timer) / 0.25, 0, 1);
  const disappear = clamp(timer / 0.5, 0, 1);
  const opacity = Math.min(appear, disappear);
  const scale = 0.7 + 0.3 * appear;
  return (
    <div className="pointer-events-none absolute inset-0 z-[9] flex items-center justify-center">
      <div className="flex flex-col items-center" style={{ opacity, transform: `scale(${scale})` }}>
        <span className="bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-6xl font-black tracking-tight text-transparent drop-shadow-[0_4px_18px_rgba(251,191,36,0.45)]">
          Бран {wave}
        </span>
      </div>
    </div>
  );
}
