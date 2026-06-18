// ---------------------------------------------------------------------------
// Central icon registry. The game used to render system emojis, which display
// inconsistently across browsers/OSes. Everything now maps to lucide-react SVG
// icons (code, not asset files) so visuals are identical everywhere.
//
// Data modules store an IconKey (a string); GameIcon renders it. One-off UI
// chrome (buttons, dashboard) imports lucide icons directly.
// ---------------------------------------------------------------------------
import {
  AlarmClock,
  BookOpen,
  Bomb,
  Brain,
  Bug,
  ClipboardList,
  Coffee,
  FileText,
  Flame,
  Gamepad2,
  Gem,
  GraduationCap,
  Heart,
  Infinity as InfinityIcon,
  type LucideIcon,
  Magnet,
  Medal,
  Moon,
  RectangleHorizontal,
  Scale,
  Shield,
  ShoppingCart,
  Smartphone,
  Snowflake,
  Sprout,
  Target,
  Timer,
  Wind,
  Zap,
} from "lucide-react";

export type IconKey =
  // falling items
  | "coffee"
  | "exam"
  | "bug"
  | "phone"
  | "gamepad"
  | "energy"
  | "focus"
  | "shield"
  | "heart"
  // modifiers
  | "wind"
  | "moon"
  | "ice"
  | "swarm"
  | "homing"
  | "deadline"
  // difficulties
  | "easy"
  | "normal"
  | "hard"
  // level themes
  | "book"
  | "clipboard"
  | "cap"
  // upgrades
  | "paddle"
  | "timer"
  // achievements
  | "medal"
  | "flame"
  | "gem"
  | "infinity"
  | "cart"
  | "bomb"
  | "target";

interface IconEntry {
  Icon: LucideIcon;
  /** Tailwind colour classes (text + optional fill for solid icons). */
  color: string;
}

const REGISTRY: Record<IconKey, IconEntry> = {
  // items
  coffee: { Icon: Coffee, color: "text-amber-300" },
  exam: { Icon: FileText, color: "text-sky-200" },
  bug: { Icon: Bug, color: "text-rose-400" },
  phone: { Icon: Smartphone, color: "text-rose-300" },
  gamepad: { Icon: Gamepad2, color: "text-rose-300" },
  energy: { Icon: Zap, color: "text-amber-300 fill-amber-300" },
  focus: { Icon: Brain, color: "text-fuchsia-300" },
  shield: { Icon: Shield, color: "text-cyan-300" },
  heart: { Icon: Heart, color: "text-rose-400 fill-rose-400" },
  // modifiers
  wind: { Icon: Wind, color: "text-cyan-300" },
  moon: { Icon: Moon, color: "text-indigo-300" },
  ice: { Icon: Snowflake, color: "text-sky-300" },
  swarm: { Icon: Bug, color: "text-rose-300" },
  homing: { Icon: Magnet, color: "text-rose-300" },
  deadline: { Icon: AlarmClock, color: "text-rose-300" },
  // difficulties
  easy: { Icon: Sprout, color: "text-emerald-300" },
  normal: { Icon: Scale, color: "text-sky-300" },
  hard: { Icon: Flame, color: "text-orange-300" },
  // level themes
  book: { Icon: BookOpen, color: "text-emerald-300" },
  clipboard: { Icon: ClipboardList, color: "text-amber-300" },
  cap: { Icon: GraduationCap, color: "text-sky-300" },
  // upgrades
  paddle: { Icon: RectangleHorizontal, color: "text-sky-300" },
  timer: { Icon: Timer, color: "text-sky-300" },
  // achievements
  medal: { Icon: Medal, color: "text-amber-300" },
  flame: { Icon: Flame, color: "text-orange-300" },
  gem: { Icon: Gem, color: "text-cyan-300" },
  infinity: { Icon: InfinityIcon, color: "text-amber-300" },
  cart: { Icon: ShoppingCart, color: "text-amber-300" },
  bomb: { Icon: Bomb, color: "text-rose-300" },
  target: { Icon: Target, color: "text-emerald-300" },
};

export function GameIcon({
  name,
  size = 24,
  strokeWidth = 2.4,
  className = "",
  muted = false,
}: {
  name: IconKey;
  size?: number;
  strokeWidth?: number;
  className?: string;
  /** Render in a dim neutral colour instead of the icon's theme colour. */
  muted?: boolean;
}) {
  const entry = REGISTRY[name];
  const { Icon } = entry;
  return (
    <Icon
      size={size}
      strokeWidth={strokeWidth}
      className={`${muted ? "text-slate-500" : entry.color} ${className}`}
      aria-hidden
    />
  );
}
