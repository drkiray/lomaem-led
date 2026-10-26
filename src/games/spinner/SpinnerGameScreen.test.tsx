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
  expect(document.querySelector('.spinner-game__turn')).toHaveTextContent(/^Маша, .+!$/);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Раунд 1 «Поверхность»');
});

test('card shows asker → answerer and filled text; Готово passes the turn', async () => {
  save({ phase: 'card', cardId: 'l1-a1' });
  renderWithProviders(<SpinnerGameScreen />);
  const dialog = screen.getByRole('dialog', { name: 'Действие' });
  expect(dialog).toHaveTextContent('Маша → Петя');
  expect(dialog).toHaveTextContent('Я жду от тебя искренний комплимент');
  await userEvent.click(screen.getByRole('button', { name: 'Готово' }));
  expect(document.querySelector('.spinner-game__turn')).toHaveTextContent(/^Петя, .+!$/);
  expect(JSON.parse(localStorage.getItem('ll.spinner.game')!).turnIndex).toBe(1);
});

test('round end offers next level', async () => {
  save({ phase: 'roundEnd', turnIndex: 1 });
  renderWithProviders(<SpinnerGameScreen />);
  expect(screen.getByRole('dialog', { name: 'Раунд 1 завершён' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Раунд 2' }));
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Раунд 2 «Погружение»');
});

test('after level 3 can finish the game', async () => {
  save({ phase: 'roundEnd', level: 3, turnIndex: 1 });
  const { back, navigate } = renderWithProviders(<SpinnerGameScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Завершить партию' }));
  expect(localStorage.getItem('ll.spinner.game')).toBeNull();
  expect(back).toHaveBeenCalled(); // pop back to the menu entry, no phantom history entry
  expect(navigate).not.toHaveBeenCalled();
});

test('no round switcher: the header just names the round', () => {
  save({ level: 3 });
  renderWithProviders(<SpinnerGameScreen />);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Раунд 3 «Глубина»');
  expect(screen.queryByRole('button', { name: '3' })).toBeNull();
});

test('gear menu: «Вернуться в меню» keeps the game, «Продолжить» closes the menu', async () => {
  save();
  const { back } = renderWithProviders(<SpinnerGameScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Меню игры' }));
  expect(screen.getByRole('dialog', { name: 'Пауза' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Продолжить' }));
  expect(screen.queryByRole('dialog', { name: 'Пауза' })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Меню игры' }));
  await userEvent.click(screen.getByRole('button', { name: 'Вернуться в меню' }));
  expect(back).toHaveBeenCalled();
  expect(localStorage.getItem('ll.spinner.game')).not.toBeNull();
});

test('«Завершить партию» from the gear menu asks for confirmation', async () => {
  save();
  const { back, navigate } = renderWithProviders(<SpinnerGameScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Меню игры' }));
  await userEvent.click(screen.getByRole('button', { name: 'Завершить партию' }));
  expect(screen.getByRole('dialog', { name: 'Завершить партию?' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Завершить партию' }));
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

test('«поменять карточку» replaces the question with another question', async () => {
  save({ phase: 'card', cardId: 'l1-q1', usedIds: ['l1-q1'] });
  renderWithProviders(<SpinnerGameScreen />);
  const dialog = screen.getByRole('dialog', { name: 'Вопрос' });
  expect(screen.queryByRole('heading', { name: 'Вопрос' })).toBeNull(); // no visible title on a plain question
  const before = dialog.querySelector('.spin-card__text')!.textContent;
  await userEvent.click(screen.getByRole('button', { name: /поменять карточку/ }));
  expect(screen.getByRole('dialog', { name: 'Вопрос' }).querySelector('.spin-card__text')!.textContent).not.toBe(before);
  const game = JSON.parse(localStorage.getItem('ll.spinner.game')!);
  expect(game.cardId).not.toBe('l1-q1');
  expect(game.cardId).toMatch(/^l1-q/);
  expect(game.usedIds).toEqual(['l1-q1', game.cardId]);
  expect(game.turnIndex).toBe(0);
});

test('birthday card is festive, names the birthday person and keeps its kind on reroll', async () => {
  localStorage.setItem(
    'll.spinner.game',
    JSON.stringify({
      ...createSpinnerGame(['Денис', 'Аня', 'Петя'], { spinDurationSec: 4, actionRatio: 0.3 }, [
        { asker: 1, answerer: 2 },
        { asker: 2, answerer: 1 },
        { asker: 0, answerer: 1 },
      ], { index: 0, since: 0, every: 2 }),
      phase: 'card',
      cardId: 'b1-q1',
      usedIds: ['b1-q1'],
    }),
  );
  renderWithProviders(<SpinnerGameScreen />);
  const dialog = screen.getByRole('dialog', { name: 'Вопрос про именинника' });
  expect(dialog).toHaveClass('modal--festive');
  expect(dialog).toHaveTextContent('🎁');
  expect(dialog).toHaveTextContent('Аня → Петя');
  expect(dialog).toHaveTextContent('Денис');
  await userEvent.click(screen.getByRole('button', { name: /поменять карточку/ }));
  expect(JSON.parse(localStorage.getItem('ll.spinner.game')!).cardId).toMatch(/^b1-q/);
});

test('ending a played game shows the summary; «В меню» clears it', async () => {
  save({ log: [{ asker: 0, answerer: 1, cardId: 'l1-q1', ms: 120000, rerolls: 0 }, { asker: 1, answerer: 0, cardId: 'l1-q2', ms: 30000, rerolls: 1 }] });
  const { back } = renderWithProviders(<SpinnerGameScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Меню игры' }));
  await userEvent.click(screen.getByRole('button', { name: 'Завершить партию' }));
  expect(screen.getByRole('dialog', { name: 'Завершить партию?' })).toHaveTextContent('Покажем итоги');
  await userEvent.click(screen.getByRole('button', { name: 'Завершить партию' }));
  expect(screen.getByRole('heading', { name: 'Итоги вечера' })).toBeInTheDocument();
  expect(screen.getByText('Душа разговора')).toBeInTheDocument();
  expect(screen.getByText('Самый долгий ответ')).toBeInTheDocument(); // one award each
  expect(JSON.parse(localStorage.getItem('ll.spinner.game')!).phase).toBe('summary'); // survives a reload
  await userEvent.click(screen.getByRole('button', { name: 'В меню' }));
  expect(localStorage.getItem('ll.spinner.game')).toBeNull();
  expect(back).toHaveBeenCalled();
});

test('«Новая игра» from the summary opens setup', async () => {
  save({ phase: 'summary', log: [{ asker: 0, answerer: 1, cardId: 'l1-q1', ms: 1000, rerolls: 0 }] });
  const { navigate } = renderWithProviders(<SpinnerGameScreen />);
  expect(screen.queryByRole('button', { name: 'Назад' })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Новая игра' }));
  expect(navigate).toHaveBeenCalledWith('spinner-setup', { replace: true });
  expect(localStorage.getItem('ll.spinner.game')).toBeNull();
});
