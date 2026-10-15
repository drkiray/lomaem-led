import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/render';
import { SpinnerSetupScreen } from './SpinnerSetupScreen';

test('requires at least two names', async () => {
  const { navigate } = renderWithProviders(<SpinnerSetupScreen />);
  await userEvent.type(screen.getByLabelText('Имя игрока 1'), 'Маша');
  await userEvent.click(screen.getByRole('button', { name: 'Начать' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Нужно минимум 2 игрока');
  expect(navigate).not.toHaveBeenCalled();
});

test('starts a game, saves it and remembers players', async () => {
  const { navigate } = renderWithProviders(<SpinnerSetupScreen />);
  await userEvent.type(screen.getByLabelText('Имя игрока 1'), 'Маша');
  await userEvent.type(screen.getByLabelText('Имя игрока 2'), 'Петя');
  await userEvent.click(screen.getByRole('button', { name: 'Начать' }));
  expect(navigate).toHaveBeenCalledWith('spinner-game', { replace: true });
  const game = JSON.parse(localStorage.getItem('ll.spinner.game')!);
  expect(game.players).toEqual(['Маша', 'Петя']);
  expect(game.turns).toHaveLength(2);
  expect(JSON.parse(localStorage.getItem('ll.lastPlayers')!)).toEqual(['Маша', 'Петя']);
});

test('warns about very large groups', async () => {
  localStorage.setItem('ll.lastPlayers', JSON.stringify(Array.from({ length: 31 }, (_, i) => `P${i}`)));
  renderWithProviders(<SpinnerSetupScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Как в прошлый раз (31)' }));
  expect(screen.getByText(/Больше 30 игроков/)).toBeInTheDocument();
});
