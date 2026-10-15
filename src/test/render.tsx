import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { NavContext, type RouteName } from '../app/nav';
import { SettingsProvider } from '../settings/SettingsContext';

export function renderWithProviders(
  ui: ReactElement,
  { route = 'menu' as RouteName, navigate = vi.fn(), back = vi.fn() } = {},
) {
  const result = render(
    <SettingsProvider>
      <NavContext.Provider value={{ route, navigate, back }}>{ui}</NavContext.Provider>
    </SettingsProvider>,
  );
  return { navigate, back, ...result };
}
