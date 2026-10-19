import { useState } from 'react';
import { SettingsProvider } from '../settings/SettingsContext';
import { ScreenTransition } from '../ui/ScreenTransition';
import { AppEffects } from './AppEffects';
import { NavProvider, useNav } from './nav';
import { SCREENS, showsCrack } from './screens';
import { Splash } from './Splash';

function Router() {
  const { route } = useNav();
  const Current = SCREENS[route];
  return (
    <main className="app">
      <ScreenTransition routeKey={route} crack={showsCrack(route)}>
        <Current />
      </ScreenTransition>
    </main>
  );
}

export function App() {
  const [started, setStarted] = useState(false);
  return (
    <SettingsProvider>
      <NavProvider>
        <AppEffects />
        {started ? <Router /> : <Splash onStart={() => setStarted(true)} />}
      </NavProvider>
    </SettingsProvider>
  );
}
