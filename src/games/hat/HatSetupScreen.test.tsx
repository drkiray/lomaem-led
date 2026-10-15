import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/render';
import { HatSetupScreen } from './HatSetupScreen';

async function enterPlayers(names: string[]) {
  for (let i = 0; i < names.length; i++) {
    if (i >= 4) await userEvent.click(screen.getByRole('button', { name: '+ Добавить игрока' }));
    await userEvent.type(screen.getByLabelText(`Имя игрока ${i + 1}`), names[i]);
  }
}

test('needs at least 4 players', async () => {
  renderWithProviders(<HatSetupScreen />);
  await enterPlayers(['Аня', 'Боря', 'Вика']);
  await userEvent.click(screen.getByRole('button', { name: 'Дальше' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Нужно минимум 4 игрока');
});

test('players → teams → dictionary words → game saved', async () => {
  const { navigate } = renderWithProviders(<HatSetupScreen />);
  await enterPlayers(['Аня', 'Боря', 'Вика', 'Гоша']);
  await userEvent.click(screen.getByRole('button', { name: 'Дальше' }));

  expect(screen.getByLabelText('Название команды 1')).toBeInTheDocument();
  expect(screen.getByLabelText('Название команды 2')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Дальше' }));

  await userEvent.click(screen.getByRole('button', { name: 'Начать игру' }));
  await waitFor(() => expect(navigate).toHaveBeenCalledWith('hat-game', { replace: true }));
  const game = JSON.parse(localStorage.getItem('ll.hat.game')!);
  expect(game.words).toHaveLength(40);
  expect(game.teams).toHaveLength(2);
  expect(game.config).toEqual({ turnSeconds: 60, skipPenalty: false, lastWordSeconds: 5 });
});

test('own-words mode goes through private entry', async () => {
  renderWithProviders(<HatSetupScreen />);
  await enterPlayers(['Аня', 'Боря', 'Вика', 'Гоша']);
  await userEvent.click(screen.getByRole('button', { name: 'Дальше' }));
  await userEvent.click(screen.getByRole('button', { name: 'Дальше' }));
  await userEvent.click(screen.getByRole('button', { name: 'Свои' }));
  await userEvent.click(screen.getByRole('button', { name: 'Вписать слова' }));
  expect(screen.getByRole('button', { name: /^Я .+, показать$/ })).toBeInTheDocument();
});

test('Android back gesture steps back inside the wizard instead of leaving it', async () => {
  const { back } = renderWithProviders(<HatSetupScreen />);
  await enterPlayers(['Аня', 'Боря', 'Вика', 'Гоша']);
  await userEvent.click(screen.getByRole('button', { name: 'Дальше' }));
  await userEvent.click(screen.getByRole('button', { name: 'Дальше' }));
  expect(screen.getByRole('group', { name: 'Откуда слова' })).toBeInTheDocument();

  act(() => window.history.back());
  await waitFor(() => expect(screen.getByLabelText('Название команды 1')).toBeInTheDocument());
  act(() => window.history.back());
  await waitFor(() => expect(screen.getByLabelText('Имя игрока 1')).toHaveValue('Аня'));
  expect(back).not.toHaveBeenCalled();
});

test('on-screen back arrow walks the same path', async () => {
  const { back } = renderWithProviders(<HatSetupScreen />);
  await enterPlayers(['Аня', 'Боря', 'Вика', 'Гоша']);
  await userEvent.click(screen.getByRole('button', { name: 'Дальше' }));
  await userEvent.click(screen.getByRole('button', { name: 'Назад' }));
  await waitFor(() => expect(screen.getByLabelText('Имя игрока 1')).toBeInTheDocument());
  await userEvent.click(screen.getByRole('button', { name: 'Назад' }));
  expect(back).toHaveBeenCalled();
});

test('replay of an own-words game opens the words step with the same teams', () => {
  const teams = [
    { id: 't0', name: 'Кактусы', color: '#7fe7ff', players: ['Аня', 'Боря'] },
    { id: 't1', name: 'Ламы', color: '#ff7eb6', players: ['Вика', 'Гоша'] },
  ];
  localStorage.setItem('ll.hat.replay', JSON.stringify({ teams, mode: 'own' }));
  renderWithProviders(<HatSetupScreen />);
  expect(screen.getByRole('group', { name: 'Откуда слова' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Свои' })).toHaveAttribute('aria-pressed', 'true');
  expect(localStorage.getItem('ll.hat.replay')).toBeNull();
});
