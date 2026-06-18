@AGENTS.md

# Semester Survival (Преживеј го Семестарот)

A polished, single-page browser **arcade catcher game** built as a university web
project. You play a student during exam week who must **catch falling academic
resources** (coffee, exams, power-ups) while **dodging distractions** (bugs,
phones, games) across **three levels**. Reach **50 points** to pass the semester;
lose all your lives and you're "seeing you in August."

Everything is rendered with **HTML/DOM + CSS + lucide-react SVG icons** — there
are **no image/sprite/audio asset files** anywhere in the project (icons are code,
not files, and render identically across browsers). Sound is synthesised at
runtime with the Web Audio API.

> ⚠️ **Out of date:** this doc still describes the original 3-level version. The
> game is now a 6-week **campaign** + **endless** mode with per-level objectives &
> modifiers, an upgrade shop, exam quizzes, achievements and difficulty modes
> (see `levels.ts`, `upgrades.ts`, `quiz.ts`, `achievements.ts`, `save.ts`,
> `engine.ts`, `Board.tsx`, `screens.tsx`, `icons.tsx`). The sections below need a
> refresh.

---

## Tech stack

| Concern        | Choice                                                              |
| -------------- | ------------------------------------------------------------------ |
| Framework      | **Next.js 16** (App Router, Turbopack, statically prerendered `/`) |
| UI library     | **React 19.2**                                                     |
| Styling        | **Tailwind CSS v4** (`@import "tailwindcss"` in `globals.css`)     |
| Win celebration| **canvas-confetti** (dynamically imported, browser-only)          |
| Icons          | **lucide-react** SVG components via `app/game/icons.tsx` (no emoji) |
| Sound          | **Web Audio API** oscillators (no files) — `app/game/sound.ts`     |
| Language       | TypeScript (strict), all UI copy in **Macedonian (Cyrillic)**     |

> ⚠️ This repo runs a **non-standard Next.js** (see `AGENTS.md`). Before touching
> framework-level code, read the bundled docs in `node_modules/next/dist/docs/`.
> The game itself is a plain `"use client"` component, so most app code is
> framework-agnostic React.

---

## File map

```
app/
  layout.tsx                 Root layout · metadata (Macedonian title) · lang="mk" · Geist fonts
  page.tsx                   Server component; centers <SemesterSurvival/> on a dark page
  globals.css                Tailwind import, dark theme, keyframes (ss-float, ss-fade, ss-pulse)
  game/
    config.ts                ★ All tuning, types, level data & PURE helpers (no React)
    sound.ts                 Web Audio sound engine (lazy AudioContext, mute flag)
    SemesterSurvival.tsx     ★ The game: rAF loop, step(), rendering, dashboard, overlays
next.config.ts               turbopack.root pinned to silence stray-lockfile warning
.claude/launch.json          Dev-server config for the preview tooling (npm run dev :3000)
```

The two files marked ★ are where ~all game logic lives. **`config.ts` is the
single source of truth for balance** — change a number there, not in the loop.

---

## Architecture (read this before editing the loop)

The game uses a **fixed-timestep-ish requestAnimationFrame loop** with a clear
split between simulation, rendering, and side effects. This pattern is deliberate
— do not "simplify" it into per-entity React state or framer-motion.

1. **Authoritative state lives in a ref** — `simRef.current: Sim`. It is mutated
   in place every frame and never triggers a render by itself.
2. **`step(sim, dt, keys)`** is a pure-ish module function (outside the
   component, so no stale closures). It mutates `sim` and returns
   `{ ended, events }`. It does **all** gameplay: movement, spawning, item
   motion, collisions, scoring, combos, power-ups, level progression, win/lose,
   and ageing of every timed effect/popup/particle.
3. **Rendering is a per-frame snapshot** — the loop calls
   `setView({ ...simRef.current })` once per frame so React re-renders from a
   fresh shallow copy. Arrays (`items`, `popups`, `particles`) are reassigned to
   new arrays inside `step`, so React sees the changes.
4. **Side effects are driven by returned `events`** — the loop plays sounds for
   each event and, on `ended`, sets status, fires confetti (win), and persists
   the high score. Keeping side effects out of `step` keeps it testable/pure.
5. **The loop only runs while `status === "playing"`** (a `useEffect` keyed on
   `status`). Pause is a `pausedRef` early-return inside the loop, so the rAF
   keeps ticking but the sim freezes.

`dt` is clamped to `0.05s` so a backgrounded tab can't teleport items on resume.

### Why refs + snapshot instead of plain state?

Collisions and combos must be computed **atomically** from one consistent state
each frame. A single mutable `Sim` makes that trivial and avoids the
multi-`setState` ordering hazards you'd get from separate `score`/`lives`/`items`
atoms updated 60×/second.

### Why no framer-motion on falling items?

The falling items are positioned by the loop via
`transform: translate3d(x, y, 0)` every frame. A spring/animation library would
fight that loop and break AABB collision math. CSS-driven effects tied to the sim
clock (flash opacity, banner, particles) give the polish with zero risk.

---

## Game mechanics (current tuning — all in `config.ts`)

### Goal, lives, progression
- **Win:** reach **`WIN_SCORE = 50`** points.
- **Lose:** **`lives` reaches 0** (start with `START_LIVES = 3`).
- **Lives can exceed the start** via the rare ❤️ drop, capped at `MAX_LIVES = 5`.
  The dashboard renders `max(START_LIVES, lives)` heart slots.
- **Level is derived from score** (`levelForScore`), never stored as the source
  of truth:

  | Level | Name           | Score range | Fall speed (px/s) | Spawn interval |
  | ----- | -------------- | ----------- | ----------------- | -------------- |
  | 1     | Прв колоквиум  | 0 – 14      | 120–168           | 0.95s ± 0.25   |
  | 2     | Втор колоквиум | 15 – 34     | 180–250           | 0.78s ± 0.22   |
  | 3     | Финален испит  | 35 – 50     | 250–366           | 0.60s ± 0.20   |

  Crossing into a new level flashes a **"Ниво N"** banner for `BANNER_DURATION = 2s`
  and plays an arpeggio.

### Falling items (`ITEM_TYPES`)
Each item has a `group` that decides what catching it does:

| Emoji        | id            | group   | Effect on catch                                            |
| ------------ | ------------- | ------- | --------------------------------------------------------- |
| ☕           | `coffee`      | good    | `+5 × combo multiplier`, advances combo                   |
| 📄           | `exam`        | good    | `+10 × combo multiplier`, advances combo (level ≥ 2)      |
| 🪲           | `bug`         | bad     | `−1 life`, resets combo (unless shielded)                 |
| 📱 / 🎮      | `distraction` | bad     | `−1 life`, resets combo (level ≥ 2)                       |
| ⚡           | `energy`      | power   | 5s **magnet**: good items curve toward the player         |
| 🧠           | `focus`       | power   | 4s **slow-motion**: everything falls at 50%               |
| 🛡️           | `shield`      | power   | grants a **shield** that blocks the next bad hit          |
| ❤️           | `heart`       | heart   | `+1 life` (up to `MAX_LIVES`)                              |

**Power-ups, exams and hearts only spawn from level 2 onward** — level 1 stays a
clean coffee-vs-bug tutorial, per the original brief. Power-ups/hearts fall at
0.78× speed so they're catchable; they have a golden pulsing glow.

Spawn selection (`spawnItem`): at level ≥ 2 roll `HEART_CHANCE = 4%` (only if not
at max lives), then `POWER_CHANCE = 10%`, otherwise pick from the level's weighted
`pool`. Items missed (fall past the floor) are removed cleanly with no penalty.

### Combo system
- `sim.combo` counts **consecutive good catches**.
- Multiplier (`comboMultiplier`): `<3 → ×1`, `3–5 → ×2`, `6–9 → ×3`, `≥10 → ×4`.
- A **dashboard chip** `🔥 Комбо ×N` appears when the multiplier > 1.
- Catching an **unblocked bad item resets the combo to 0**. Missing a good item
  does **not** reset it (kept forgiving). Power-up/heart catches keep the streak.
- Catch SFX pitch rises with the multiplier.

### Difficulty ramp
Within each level, fall speed of **newly spawned** items grows with time-in-level:
`rampFactor = 1 + min(RAMP_MAX 0.40, levelTime × RAMP_PER_SEC 0.02)`. It resets to
1.0 on each level change.

### Collision
Axis-aligned bounding box in **logical pixels** (the board is CSS-scaled, but the
sim always works in 800×500 space). The player hit-box is `PLAYER_W × PLAYER_H`
at `PLAYER_TOP`; an item is caught when it vertically reaches the paddle band and
horizontally overlaps it.

---

## Controls
- **Move:** `←` / `→` arrows, or `A` / `D`, or **drag** with mouse/touch anywhere
  on the play field (pointer position is mapped back to logical coords through the
  board rect and current scale).
- **Pause/resume:** `P` or `Esc` (only while playing).
- **Start/restart:** the on-screen button, or `Enter` / `Space` on a non-playing
  screen.
- **Mute:** 🔊/🔇 button (top-right of the card), persisted.

Keyboard input is held in `keysRef` (set by `window` keydown/keyup listeners);
pointer sets `sim.targetX`. Keyboard takes priority and clears the pointer target.

---

## Juice / feedback
- **Particles** — a 9-particle radial burst on every catch (green/red/gold by
  tone), with gravity, aged in the loop. Rendered as tiny `rounded-full` divs.
- **Flash** — full-field tint (emerald good / rose bad / sky power) whose opacity
  decays from `FLASH_DURATION`.
- **Screen shake** — the card jitters when you take damage (`SHAKE_DURATION`).
- **Floating popups** — `+N`, `+N ×M`, `−1 ❤️`, `🛡️ Блокирано`, power labels.
- **Player lean** — the paddle tilts based on horizontal velocity; the shield
  shows a cyan ring/glow.
- **Sound** — synthesised cues for catch/bad/power/shield/heart/level/win/lose.
- **Confetti** — `canvas-confetti` burst + side fountains on win.
- **Stars** — win screen shows ⭐⭐⭐ based on lives left (`≥3 → 3`, else lives).

## States / screens
`status: "start" | "playing" | "win" | "lose"` drives full-field overlays inside
the board. The dashboard (Ниво / Поени progress bar / Животи) stays visible behind
overlays. A separate `paused` boolean renders a Пауза overlay over live play.

## Persistence (localStorage)
- `ss_highscore` — best score, shown on the start screen and end screens, with a
  pulsing **"🏆 Нов рекорд!"** when beaten.
- `ss_muted` — mute preference, applied on mount.

Both are wrapped in try/catch so private-mode / disabled storage degrades safely.

## Responsiveness
The board is authored at a fixed logical size (`OUTER_W × OUTER_H`) and uniformly
**CSS-scaled** to fit the viewport (width *and* height, never upscaled past 1×).
A wrapper reserves the scaled footprint so the page never overflows. Because the
sim stays in logical pixels, physics/collision are unaffected by scaling.

---

## Working on this project

```bash
npm run dev      # dev server (Turbopack) on http://localhost:3000
npm run build    # production build — must stay green
npx tsc --noEmit # type-check (strict)
npx eslint app   # lint (next lint was removed in Next 16; call eslint directly)
```

### Conventions & gotchas
- **Tune in `config.ts`.** Keep `step()` mechanical; keep numbers/data in config.
- **Keep `step()` free of React/side effects.** Emit `events` and handle
  sound/confetti/persistence in the component.
- **All physics in logical pixels** (800×500). Never read scaled DOM sizes into
  the sim except when mapping pointer input (which divides by `scaleRef`).
- **No asset files.** Visuals = lucide-react SVG icons (`icons.tsx`) + CSS shapes;
  audio = Web Audio. Don't add images/sprites/sound files. New game visuals should
  add an `IconKey` to the registry, not hardcode an emoji.
- **Browser-only libs** (canvas-confetti) must be **dynamically imported** inside
  handlers so SSR/prerender never touches `window`.
- **UI copy is Macedonian Cyrillic** — match the existing tone.
- **No leaks:** the rAF is cancelled on cleanup; key/resize listeners are removed;
  all timed effects/popups/particles are aged and culled inside the loop (no stray
  `setInterval`/`setTimeout`). Preserve this when adding features.
- Respects `prefers-reduced-motion` (ambient float & pulse animations disable).
