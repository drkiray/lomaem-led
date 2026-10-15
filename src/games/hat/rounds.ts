import type { HatRound } from './state';

export const ROUNDS: Record<HatRound, { title: string; rules: string; icon: string }> = {
  1: {
    title: 'Объясняем словами',
    rules: 'Объясняй слово другими словами. Нельзя называть само слово и однокоренные.',
    icon: '🗣️',
  },
  2: {
    title: 'Показываем жестами',
    rules: 'Только жесты и мимика — ни звука! Слова те же, что в первом раунде.',
    icon: '🤸',
  },
  3: {
    title: 'Одно слово',
    rules: 'Объясняй ровно одним словом, без жестов. Слова вы уже знаете!',
    icon: '☝️',
  },
};
