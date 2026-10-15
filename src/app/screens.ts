import type { ComponentType } from 'react';
import { MenuScreen } from '../menu/MenuScreen';
import { SettingsScreen } from '../settings/SettingsScreen';
import { SpinnerGameScreen } from '../games/spinner/SpinnerGameScreen';
import { SpinnerSetupScreen } from '../games/spinner/SpinnerSetupScreen';
import { HatSetupScreen } from '../games/hat/HatSetupScreen';
import { HatGameScreen } from '../games/hat/HatGameScreen';
import type { RouteName } from './nav';

export const SCREENS: Record<RouteName, ComponentType> = {
  menu: MenuScreen,
  settings: SettingsScreen,
  'spinner-setup': SpinnerSetupScreen,
  'spinner-game': SpinnerGameScreen,
  'hat-setup': HatSetupScreen,
  'hat-game': HatGameScreen,
};

// No ice cracking while a game is being played: it would distract the players.
const NO_CRACK: ReadonlySet<RouteName> = new Set<RouteName>(['spinner-game', 'hat-game']);
export const showsCrack = (route: RouteName) => !NO_CRACK.has(route);
