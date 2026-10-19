import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { SPLASH_LOAD_MS } from './Splash';

afterEach(() => vi.useRealTimers());

test('starts on the splash: loading bar first, then «Поиграем?» opens the menu', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  render(<App />);
  expect(screen.getByRole('heading', { name: 'Ломаем Лёд' })).toBeInTheDocument();
  expect(screen.getByRole('progressbar', { name: 'Загрузка' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Поиграем?' })).toBeNull();
  expect(screen.queryByText('Игры, чтобы растопить любую компанию')).toBeNull();

  act(() => void vi.advanceTimersByTime(SPLASH_LOAD_MS));
  expect(screen.queryByRole('progressbar')).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Поиграем?' }));

  expect(screen.getByRole('heading', { name: 'Ломаем Лёд' })).toBeInTheDocument();
  expect(screen.getByText('Игры, чтобы растопить любую компанию')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Поиграем?' })).toBeNull();
});
