import { screen } from '@testing-library/react';
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
  expect(navigate).toHaveBeenCalledWith('hat-game', { replace: true });
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
