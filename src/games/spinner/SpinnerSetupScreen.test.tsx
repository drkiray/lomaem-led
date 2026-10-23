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

test('birthday toggle adds a highlighted name field; that person is player 1 and the plan is saved', async () => {
  const { navigate } = renderWithProviders(<SpinnerSetupScreen />);
  expect(screen.queryByLabelText('Имя именинника')).toBeNull();
  await userEvent.click(screen.getByText('Настройки партии'));
  await userEvent.click(screen.getByRole('switch', { name: 'Именинник' }));
  await userEvent.type(screen.getByLabelText('Имя игрока 1'), 'Маша');
  await userEvent.click(screen.getByRole('button', { name: 'Начать' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Впишите имя именинника');
  await userEvent.type(screen.getByLabelText('Имя именинника'), 'Денис');
  await userEvent.click(screen.getByRole('button', { name: 'Начать' }));
  expect(navigate).toHaveBeenCalledWith('spinner-game', { replace: true });
  const game = JSON.parse(localStorage.getItem('ll.spinner.game')!);
  expect(game.players).toEqual(['Денис', 'Маша']);
  expect(game.birthday).toMatchObject({ index: 0, since: 0 });
});

test('without the toggle there is no birthday plan', async () => {
  renderWithProviders(<SpinnerSetupScreen />);
  await userEvent.type(screen.getByLabelText('Имя игрока 1'), 'Маша');
  await userEvent.type(screen.getByLabelText('Имя игрока 2'), 'Петя');
  await userEvent.click(screen.getByRole('button', { name: 'Начать' }));
  expect(JSON.parse(localStorage.getItem('ll.spinner.game')!).birthday).toBeNull();
});

test('«Как в прошлый раз» restores the birthday person and counts them', async () => {
  localStorage.setItem('ll.lastPlayers', JSON.stringify(['Маша', 'Петя']));
  localStorage.setItem('ll.lastBirthday', JSON.stringify('Денис'));
  renderWithProviders(<SpinnerSetupScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Как в прошлый раз (3)' }));
  expect(screen.getByLabelText('Имя именинника')).toHaveValue('Денис');
  expect(screen.getByLabelText('Имя игрока 1')).toHaveValue('Маша');
  expect(screen.getByText('Игроков: 3')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Начать' }));
  expect(JSON.parse(localStorage.getItem('ll.lastBirthday')!)).toBe('Денис');
});

test('«Как в прошлый раз» without a past birthday person keeps the mode off', async () => {
  localStorage.setItem('ll.lastPlayers', JSON.stringify(['Маша', 'Петя']));
  renderWithProviders(<SpinnerSetupScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Как в прошлый раз (2)' }));
  expect(screen.queryByLabelText('Имя именинника')).toBeNull();
});
