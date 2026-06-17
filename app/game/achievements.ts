// ---------------------------------------------------------------------------
// Achievement definitions. Unlock conditions are evaluated by the orchestrator
// (which has the run context) and stored in the save file.
// ---------------------------------------------------------------------------

export interface AchievementDef {
  id: string;
  name: string;
  emoji: string;
  desc: string;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "first_week", name: "Прв чекор", emoji: "🥉", desc: "Положи ја првата недела." },
  { id: "combo4", name: "Машина за комбо", emoji: "🔥", desc: "Достигни комбо ×4." },
  { id: "flawless", name: "Без грешка", emoji: "💎", desc: "Положи недела без изгубен живот." },
  { id: "coffee100", name: "Кофеински наркоман", emoji: "☕", desc: "Фати вкупно 100 кафиња." },
  { id: "graduate", name: "Дипломиран!", emoji: "🎓", desc: "Заврши ја целата кампања." },
  { id: "endless300", name: "Маратонец", emoji: "🏃", desc: "Постигни 300+ во Бескрајно." },
  { id: "shopaholic", name: "Шопингхоличар", emoji: "🛒", desc: "Купи 5 надградби." },
  { id: "hard_week", name: "Бескомпромисен", emoji: "🧨", desc: "Положи недела на Тешко." },
];

export const ACHIEVEMENT_BY_ID: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENTS.map((a) => [a.id, a]),
);
