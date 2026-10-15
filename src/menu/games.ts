import type { RouteName } from '../app/nav';
import networkingIcon from '../assets/networking.png';

export interface GameEntry {
  id: string;
  title: string;
  subtitle: string;
  emoji: string;
  /** image shown instead of the emoji */
  icon?: string;
  accent: string;
  route: RouteName | null; // null = locked
}

export const GAMES: GameEntry[] = [
  { id: 'spinner', title: 'Крутилочка', subtitle: 'Крути стрелку — задавай вопрос', emoji: '🌀', accent: '#7fe7ff', route: 'spinner-setup' },
  { id: 'hat', title: 'Шляпа', subtitle: 'Объясни, покажи, назови', emoji: '🎩', accent: '#b69cff', route: 'hat-setup' },
  { id: 'truth', title: 'Правда или действие', subtitle: 'Скоро', emoji: '🎲', accent: '#ff7eb6', route: null },
  { id: 'networking', title: 'Нетворкинг', subtitle: 'Скоро', emoji: '🤝', icon: networkingIcon, accent: '#9b5cff', route: null },
];
