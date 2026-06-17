// ---------------------------------------------------------------------------
// Tiny zero-asset sound engine built on the Web Audio API.
// Every effect is a synthesised oscillator envelope — no audio files needed.
// The AudioContext is created lazily on the first user gesture (game start),
// which satisfies browser autoplay policies.
// ---------------------------------------------------------------------------

type Win = Window & { webkitAudioContext?: typeof AudioContext };

let ctx: AudioContext | null = null;
let muted = false;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as Win).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Play a single tone with a quick attack / exponential decay. */
function tone(
  freq: number,
  dur: number,
  type: OscillatorType = "sine",
  vol = 0.2,
  delay = 0,
): void {
  const c = audio();
  if (!c || muted) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

function arpeggio(freqs: number[], step: number, type: OscillatorType, vol: number) {
  freqs.forEach((f, i) => tone(f, step * 1.6, type, vol, i * step));
}

export const sound = {
  /** Call inside a user gesture to unlock audio. */
  unlock(): void {
    audio();
  },
  setMuted(value: boolean): void {
    muted = value;
  },
  isMuted(): boolean {
    return muted;
  },
  /** Catch a good item — pitch rises with the combo multiplier. */
  good(multiplier = 1): void {
    tone(480 + multiplier * 130, 0.12, "triangle", 0.22);
    if (multiplier > 1) tone(720 + multiplier * 130, 0.1, "sine", 0.14, 0.04);
  },
  bad(): void {
    tone(150, 0.22, "sawtooth", 0.22);
    tone(90, 0.26, "square", 0.16, 0.02);
  },
  power(): void {
    tone(660, 0.1, "square", 0.18);
    tone(990, 0.13, "square", 0.18, 0.08);
  },
  shield(): void {
    tone(420, 0.1, "sine", 0.2);
    tone(840, 0.16, "sine", 0.16, 0.06);
  },
  heart(): void {
    tone(700, 0.1, "sine", 0.2);
    tone(1050, 0.18, "sine", 0.16, 0.08);
  },
  level(): void {
    arpeggio([523, 659, 784], 0.09, "triangle", 0.2);
  },
  win(): void {
    arpeggio([523, 659, 784, 1047], 0.12, "triangle", 0.22);
  },
  lose(): void {
    arpeggio([392, 330, 262], 0.14, "sawtooth", 0.2);
  },
  coin(): void {
    tone(880, 0.07, "square", 0.16);
    tone(1320, 0.1, "square", 0.16, 0.05);
  },
  correct(): void {
    arpeggio([659, 880, 1175], 0.1, "triangle", 0.2);
  },
  wrong(): void {
    tone(196, 0.3, "sawtooth", 0.2);
  },
  achievement(): void {
    arpeggio([784, 988, 1319, 1568], 0.1, "triangle", 0.22);
  },
};
