// ---------------------------------------------------------------------------
// Exam mini-quiz question bank (Macedonian). A random question is shown as a
// bonus round on quiz levels; a correct answer awards bonus coins.
// ---------------------------------------------------------------------------

export interface Question {
  q: string;
  options: string[];
  answer: number; // index into options
}

export const QUIZ_REWARD = 60; // bonus coins for a correct answer
export const QUIZ_TIME = 12; // seconds to answer

export const QUESTIONS: Question[] = [
  { q: "Што враќа console.log(typeof null) во JavaScript?", options: ["\"object\"", "\"null\"", "\"undefined\""], answer: 0 },
  { q: "Колку бита има еден бајт?", options: ["4", "8", "16"], answer: 1 },
  { q: "Која структура работи по принцип LIFO?", options: ["Ред (queue)", "Стек (stack)", "Листа"], answer: 1 },
  { q: "Што значи „HTML“?", options: ["HyperText Markup Language", "High Tech Modern Language", "Hyperlink Markup Logic"], answer: 0 },
  { q: "Бинарниот број 1010 во декаден систем е?", options: ["8", "10", "12"], answer: 1 },
  { q: "Кој оператор е строга еднаквост во JS?", options: ["==", "===", "="], answer: 1 },
  { q: "Временска сложеност на бинарно пребарување?", options: ["O(n)", "O(log n)", "O(n²)"], answer: 1 },
  { q: "Што значи „CSS“?", options: ["Cascading Style Sheets", "Computer Style System", "Creative Style Sheets"], answer: 0 },
  { q: "Колку е 2¹⁰?", options: ["512", "1024", "2048"], answer: 1 },
  { q: "Што НЕ е програмски јазик?", options: ["Python", "HTTP", "Java"], answer: 1 },
  { q: "Кофеинот во кафето е?", options: ["Стимуланс", "Депресант", "Витамин"], answer: 0 },
  { q: "Ознака за коментар во Python е?", options: ["//", "#", "<!-- -->"], answer: 1 },
];

/** Pick a random question index (optionally avoiding recently used ones). */
export function pickQuestion(exclude: number[] = []): number {
  const pool = QUESTIONS.map((_, i) => i).filter((i) => !exclude.includes(i));
  const from = pool.length > 0 ? pool : QUESTIONS.map((_, i) => i);
  return from[Math.floor(Math.random() * from.length)];
}
