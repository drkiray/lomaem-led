import type { ComponentType } from 'react';
import { MenuScreen } from '../menu/MenuScreen';
import { SettingsScreen } from '../settings/SettingsScreen';
import { SpinnerGameScreen } from '../games/spinner/SpinnerGameScreen';
import { SpinnerSetupScreen } from '../games/spinner/SpinnerSetupScreen';
import { ComingSoon } from './ComingSoon';
import type { RouteName } from './nav';

export const SCREENS: Record<RouteName, ComponentType> = {
  menu: MenuScreen,
  settings: SettingsScreen,
  'spinner-setup': SpinnerSetupScreen,
  'spinner-game': SpinnerGameScreen,
  'hat-setup': ComingSoon,
  'hat-game': ComingSoon,
};
