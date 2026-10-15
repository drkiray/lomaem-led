import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/render';
import { HatGameScreen } from './HatGameScreen';
import { createHatGame, type HatState } from './state';
import type { Team } from './teams';

const teams: Team[] = [
  { id: 't0', name: 'Кактусы', color: '#7fe7ff', players: ['Аня', 'Боря'] },
  { id: 't1', name: 'Ламы', color: '#ff7eb6', players: ['Вика', 'Гоша'] },
];
const base = () =>
  createHatGame({
    teams,
    words: ['кот', 'дом', 'лес'],
    order: ['кот', 'дом', 'лес'],
    config: { turnSeconds: 30, skipPenalty: false, lastWordSeconds: 5 },
    wordSetup: { mode: 'dictionary', difficulty: 'mix', count: 30, ownWords: [] },
  });
const save = (patch: Partial<HatState> = {}) => localStorage.setItem('ll.hat.game', JSON.stringify({ ...base(), ...patch }));
const stored = (): HatState => JSON.parse(localStorage.getItem('ll.hat.game')!);

afterEach(() => vi.useRealTimers());

test('no saved game', () => {
  renderWithProviders(<HatGameScreen />);
  expect(screen.getByText('Нет активной игры.')).toBeInTheDocument();
});

test('round intro → ready shows explainer and guessers', async () => {
  save();
  renderWithProviders(<HatGameScreen />);
  expect(screen.getByRole('heading', { name: 'Объясняем словами' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Поехали' }));
  expect(screen.getByText(/Объясняет/)).toHaveTextContent('Аня');
  expect(screen.getByText(/Угадывают:/)).toHaveTextContent('Боря');
});

test('full timed turn: countdown, guess, time up, last word, review, pass turn', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
  save({ phase: 'ready' });
  renderWithProviders(<HatGameScreen />);

  await user.click(screen.getByRole('button', { name: 'Старт' }));
  expect(screen.getByText('3')).toBeInTheDocument();
  for (let i = 0; i < 3; i++) act(() => vi.advanceTimersByTime(1000));

  expect(screen.getByText('кот')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Угадали ✓' }));
  expect(screen.getByText('дом')).toBeInTheDocument();

  act(() => vi.advanceTimersByTime(30000));
  expect(screen.getByText('Время вышло!')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Не успели' }));

  expect(screen.getByRole('checkbox', { name: /кот/ })).toHaveAttribute('aria-checked', 'true');
  expect(screen.getByRole('checkbox', { name: /дом/ })).toHaveAttribute('aria-checked', 'false');
  await user.click(screen.getByRole('button', { name: 'Передать ход' }));

  expect(screen.getByText(/Объясняет/)).toHaveTextContent('Вика');
  expect(stored().scores).toEqual({ t0: 1, t1: 0 });
});

test('round end shows scores and moves to the next round', async () => {
  save({ phase: 'roundEnd', hat: [], scores: { t0: 2, t1: 1 }, carryOverMs: 12000 });
  renderWithProviders(<HatGameScreen />);
  expect(screen.getByText(/осталось 12 сек/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Дальше: Показываем жестами' }));
  expect(screen.getByRole('heading', { name: 'Показываем жестами' })).toBeInTheDocument();
  expect(stored().hat).toHaveLength(3);
});

test('game end shows winner, replay resets scores, menu clears save', async () => {
  save({ phase: 'gameEnd', round: 3, hat: [], scores: { t0: 5, t1: 3 } });
  renderWithProviders(<HatGameScreen />);
  expect(screen.getByText('Победили «Кактусы»! 🏆')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Сыграть ещё' }));
  expect(stored()).toMatchObject({ phase: 'roundIntro', round: 1, scores: { t0: 0, t1: 0 } });
});

test('tie and exit to menu', async () => {
  save({ phase: 'gameEnd', round: 3, hat: [], scores: { t0: 4, t1: 4 } });
  const { back, navigate } = renderWithProviders(<HatGameScreen />);
  expect(screen.getByText('Ничья! 🤝')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'В меню' }));
  expect(back).toHaveBeenCalled(); // pop back to the menu entry, no phantom history entry
  expect(navigate).not.toHaveBeenCalled();
  expect(localStorage.getItem('ll.hat.game')).toBeNull();
});

test('replay in own-words mode returns to setup with the same teams instead of reusing words', async () => {
  save({ phase: 'gameEnd', round: 3, hat: [], scores: { t0: 5, t1: 3 }, wordSetup: { mode: 'own', difficulty: 'mix', count: 30, ownWords: ['кот', 'дом', 'лес'] } });
  const { navigate } = renderWithProviders(<HatGameScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Сыграть ещё' }));
  expect(navigate).toHaveBeenCalledWith('hat-setup', { replace: true });
  expect(localStorage.getItem('ll.hat.game')).toBeNull();
  expect(JSON.parse(localStorage.getItem('ll.hat.replay')!)).toEqual({ teams, mode: 'own' });
});
