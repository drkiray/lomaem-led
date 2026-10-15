import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type RouteName = 'menu' | 'settings' | 'spinner-setup' | 'spinner-game' | 'hat-setup' | 'hat-game';

export interface Nav {
  route: RouteName;
  navigate: (route: RouteName, opts?: { replace?: boolean }) => void;
  back: () => void;
}

export const NavContext = createContext<Nav | null>(null);

export function useNav(): Nav {
  const value = useContext(NavContext);
  if (!value) throw new Error('useNav must be used inside NavProvider');
  return value;
}

// Each screen change is mirrored into window.history so the Android back
// gesture moves between screens instead of closing the PWA.
export function NavProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<RouteName>('menu');

  useEffect(() => {
    window.history.replaceState({ route: 'menu' }, '');
    const onPop = (e: PopStateEvent) => {
      const state = e.state as { route?: RouteName } | null;
      setRoute(state?.route ?? 'menu');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((next: RouteName, opts?: { replace?: boolean }) => {
    if (opts?.replace) window.history.replaceState({ route: next }, '');
    else window.history.pushState({ route: next }, '');
    setRoute(next);
  }, []);

  const back = useCallback(() => window.history.back(), []);
  const value = useMemo(() => ({ route, navigate, back }), [route, navigate, back]);

  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}
