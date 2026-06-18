// ---------------------------------------------------------------------------
// Achievement definitions. Unlock conditions are evaluated by the orchestrator
// (which has the run context) and stored in the save file.
// ---------------------------------------------------------------------------

import type { IconKey } from "./icons";

export interface AchievementDef {
  id: string;
  name: string;
  icon: IconKey;
  desc: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_week", name: "Прв чекор", icon: "medal", desc: "Положи ја првата недела." },
  { id: "combo4", name: "Машина за комбо", icon: "flame", desc: "Достигни комбо ×4." },
  { id: "flawless", name: "Без грешка", icon: "gem", desc: "Положи недела без изгубен живот." },
  { id: "coffee100", name: "Кофеински наркоман", icon: "coffee", desc: "Фати вкупно 100 кафиња." },
  { id: "graduate", name: "Дипломиран!", icon: "cap", desc: "Заврши ја целата кампања." },
  { id: "endless300", name: "Маратонец", icon: "infinity", desc: "Постигни 300+ во Бескрајно." },
  { id: "shopaholic", name: "Шопингхоличар", icon: "cart", desc: "Купи 5 надградби." },
  { id: "hard_week", name: "Бескомпромисен", icon: "bomb", desc: "Положи недела на Тешко." },
];

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);
