import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/render';
import { stubFullscreen, unstubFullscreen } from '../../test/fullscreen';
import { SpinnerGameScreen } from './SpinnerGameScreen';
import { createSpinnerGame, type SpinnerState } from './state';

const turns = [
  { asker: 0, answerer: 1 },
  { asker: 1, answerer: 0 },
];
const save = (patch: Partial<SpinnerState> = {}) =>
  localStorage.setItem(
    'll.spinner.game',
    JSON.stringify({ ...createSpinnerGame(['Маша', 'Петя'], { spinDurationSec: 4, actionRatio: 0.3 }, turns), ...patch }),
  );

test('without a saved game offers a new one', () => {
  renderWithProviders(<SpinnerGameScreen />);
  expect(screen.getByText('Нет активной игры.')).toBeInTheDocument();
});

test('shows whose turn it is', () => {
  save();
  renderWithProviders(<SpinnerGameScreen />);
  expect(screen.getByText(/Крутит:/)).toHaveTextContent('Крутит: Маша');
  expect(screen.getByText(/Раунд 1: Знакомство/)).toBeInTheDocument();
});

test('card shows asker → answerer and filled text; Готово passes the turn', async () => {
  save({ phase: 'card', cardId: 'l1-a1' });
  renderWithProviders(<SpinnerGameScreen />);
  const dialog = screen.getByRole('dialog', { name: 'Действие' });
  expect(dialog).toHaveTextContent('Маша → Петя');
  expect(dialog).toHaveTextContent('Маша ждёт от тебя искренний комплимент');
  await userEvent.click(screen.getByRole('button', { name: 'Готово' }));
  expect(screen.getByText(/Крутит:/)).toHaveTextContent('Крутит: Петя');
  expect(JSON.parse(localStorage.getItem('ll.spinner.game')!).turnIndex).toBe(1);
});

test('round end offers next level', async () => {
  save({ phase: 'roundEnd', turnIndex: 1 });
  renderWithProviders(<SpinnerGameScreen />);
  expect(screen.getByRole('dialog', { name: 'Раунд 1 завершён' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Раунд 2' }));
  expect(screen.getByText(/Раунд 2: Глубже/)).toBeInTheDocument();
});

test('after level 3 can finish the game', async () => {
  save({ phase: 'roundEnd', level: 3, turnIndex: 1 });
  const { back, navigate } = renderWithProviders(<SpinnerGameScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Завершить игру' }));
  expect(localStorage.getItem('ll.spinner.game')).toBeNull();
  expect(back).toHaveBeenCalled(); // pop back to the menu entry, no phantom history entry
  expect(navigate).not.toHaveBeenCalled();
});

test('level pill switches round after confirmation', async () => {
  save();
  renderWithProviders(<SpinnerGameScreen />);
  await userEvent.click(screen.getByRole('button', { name: '3' }));
  await userEvent.click(screen.getByRole('button', { name: 'Перейти' }));
  expect(screen.getByText(/Раунд 3: Психология/)).toBeInTheDocument();
});

test('exit via ✕ asks for confirmation', async () => {
  save();
  const { back, navigate } = renderWithProviders(<SpinnerGameScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Завершить' }));
  await userEvent.click(screen.getByRole('button', { name: 'Завершить игру' }));
  expect(back).toHaveBeenCalled(); // pop back to the menu entry, no phantom history entry
  expect(navigate).not.toHaveBeenCalled();
  expect(localStorage.getItem('ll.spinner.game')).toBeNull();
});

test('offers landscape fullscreen on start; «Включить» enters it', async () => {
  const fs = stubFullscreen();
  save();
  renderWithProviders(<SpinnerGameScreen />);
  const prompt = screen.getByRole('dialog', { name: 'Поворачиваем экран' });
  expect(prompt).toHaveTextContent('горизонтальном');
  await userEvent.click(screen.getByRole('button', { name: 'Включить' }));
  expect(fs.requestFullscreen).toHaveBeenCalled();
  expect(fs.lock).toHaveBeenCalledWith('landscape');
  expect(screen.queryByRole('dialog', { name: 'Поворачиваем экран' })).toBeNull();
  unstubFullscreen();
});

test('«Не сейчас» keeps portrait and leaves a fullscreen button in the header', async () => {
  const fs = stubFullscreen();
  save();
  renderWithProviders(<SpinnerGameScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Не сейчас' }));
  expect(fs.requestFullscreen).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Во весь экран' }));
  expect(fs.requestFullscreen).toHaveBeenCalled();
  unstubFullscreen();
});

test('no landscape prompt when turned off in settings', () => {
  stubFullscreen();
  localStorage.setItem('ll.settings', JSON.stringify({ landscapeGames: false }));
  save();
  renderWithProviders(<SpinnerGameScreen />);
  expect(screen.queryByRole('dialog', { name: 'Поворачиваем экран' })).toBeNull();
  unstubFullscreen();
});
