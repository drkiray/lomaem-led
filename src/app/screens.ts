import type { ComponentType } from 'react';
import { MenuScreen } from '../menu/MenuScreen';
import { ComingSoon } from './ComingSoon';
import type { RouteName } from './nav';

export const SCREENS: Record<RouteName, ComponentType> = {
  menu: MenuScreen,
  settings: ComingSoon,
  'spinner-setup': ComingSoon,
  'spinner-game': ComingSoon,
  'hat-setup': ComingSoon,
  'hat-game': ComingSoon,
};
