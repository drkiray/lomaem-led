import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NavProvider, useNav } from './nav';

function Probe() {
  const { route, navigate } = useNav();
  return (
    <>
      <span data-testid="route">{route}</span>
      <button onClick={() => navigate('settings')}>go</button>
      <button onClick={() => navigate('hat-game', { replace: true })}>replace</button>
    </>
  );
}

test('navigate pushes history and Android back (popstate) restores previous screen', async () => {
  const push = vi.spyOn(window.history, 'pushState');
  render(<NavProvider><Probe /></NavProvider>);
  expect(screen.getByTestId('route')).toHaveTextContent('menu');

  await userEvent.click(screen.getByText('go'));
  expect(screen.getByTestId('route')).toHaveTextContent('settings');
  expect(push).toHaveBeenCalledWith({ route: 'settings' }, '');

  act(() => {
    window.dispatchEvent(new PopStateEvent('popstate', { state: { route: 'menu' } }));
  });
  expect(screen.getByTestId('route')).toHaveTextContent('menu');
});

test('popstate without state falls back to menu', async () => {
  render(<NavProvider><Probe /></NavProvider>);
  await userEvent.click(screen.getByText('go'));
  act(() => {
    window.dispatchEvent(new PopStateEvent('popstate', { state: null }));
  });
  expect(screen.getByTestId('route')).toHaveTextContent('menu');
});

test('replace uses replaceState', async () => {
  const replace = vi.spyOn(window.history, 'replaceState');
  render(<NavProvider><Probe /></NavProvider>);
  await userEvent.click(screen.getByText('replace'));
  expect(replace).toHaveBeenLastCalledWith({ route: 'hat-game' }, '');
  expect(screen.getByTestId('route')).toHaveTextContent('hat-game');
});
