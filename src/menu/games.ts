import type { RouteName } from '../app/nav';

export interface GameEntry {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  accent: string;
  route: RouteName | null; // null = locked
}

export const GAMES: GameEntry[] = [
  { id: 'spinner', title: 'Крутилочка', subtitle: 'Крути стрелку — задавай вопрос', emoji: '🌀', accent: '#7fe7ff', route: 'spinner-setup' },
  { id: 'hat', title: 'Шляпа', subtitle: 'Объясни, покажи, назови', emoji: '🎩', accent: '#b69cff', route: 'hat-setup' },
  { id: 'truth', title: 'Правда или действие', subtitle: 'Скоро', emoji: '🎲', accent: '#ff7eb6', route: null },
  { id: 'networking', title: 'Нетворкинг', subtitle: 'Скоро', emoji: '🤝', accent: '#ffd166', route: null },
];
