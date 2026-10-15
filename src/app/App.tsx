import { SettingsProvider } from '../settings/SettingsContext';
import { ScreenTransition } from '../ui/ScreenTransition';
import { NavProvider, useNav } from './nav';
import { SCREENS } from './screens';

function Router() {
  const { route } = useNav();
  const Current = SCREENS[route];
  return (
    <main className="app">
      <ScreenTransition routeKey={route}>
        <Current />
      </ScreenTransition>
    </main>
  );
}

export function App() {
  return (
    <SettingsProvider>
      <NavProvider>
        <Router />
      </NavProvider>
    </SettingsProvider>
  );
}
