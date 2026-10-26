import { createSpinnerGame, type LogEntry, type SpinnerState } from './state';
import { formatDuration, summarize } from './summary';

const players = ['Аня', 'Боря', 'Вика'];
const game = (log: LogEntry[], patch: Partial<SpinnerState> = {}): SpinnerState => ({
  ...createSpinnerGame(players, { spinDurationSec: 4, actionRatio: 0.3 }, [], null, 0),
  finishedAt: 65 * 60 * 1000,
  log,
  ...patch,
});
const e = (asker: number, answerer: number, cardId: string, sec: number, rerolls = 0): LogEntry => ({ asker, answerer, cardId, ms: sec * 1000, rerolls });

test('formatDuration', () => {
  expect(formatDuration(9000)).toBe('9 с');
  expect(formatDuration(4 * 60 * 1000)).toBe('4 мин');
  expect(formatDuration(65 * 60 * 1000)).toBe('1 ч 5 мин');
  expect(formatDuration(120 * 60 * 1000)).toBe('2 ч');
});

test('counts and awards', () => {
  const s = summarize(game([
    e(0, 1, 'l1-q1', 300),
    e(1, 2, 'l2-q1', 30, 2),
    e(2, 0, 'l1-a1', 10),
    e(0, 2, 'l1-a2', 40),
  ], { roundsDone: 1 }));
  expect(s).toMatchObject({ questions: 2, actions: 2, rounds: 1, deepest: 2, durationMs: 65 * 60 * 1000 });
  const byTitle = Object.fromEntries(s.awards.map((a) => [a.title, a]));
  expect(byTitle['Душа разговора']).toMatchObject({ name: 'Боря', detail: '5 мин в ответах' });
  expect(byTitle['Самый долгий ответ'].name).toBe('Боря');
  expect(byTitle['Самый долгий ответ'].quote).toBeTruthy();
  expect(byTitle['Блиц']).toMatchObject({ name: 'Аня', detail: 'ответ за 10 с' });
  expect(byTitle['Умеет разговорить'].name).toBe('Аня');
  expect(byTitle['Загадка вечера']).toMatchObject({ name: 'Вика', detail: '2 раза просил(а) другую карточку' });
  expect(byTitle['Человек действия']).toBeUndefined(); // Аня and Вика did one each
});

test('nothing timed (old save) gives no time awards, no crash', () => {
  const s = summarize(game([e(0, 1, 'l1-q1', 0)]));
  expect(s.awards.map((a) => a.title)).not.toContain('Самый долгий ответ');
  expect(s.questions).toBe(1);
});

test('birthday award counts questions about the birthday person', () => {
  const s = summarize(game([e(1, 2, 'b1-q1', 20), e(2, 1, 'b1-q2', 20)], { birthday: { index: 0, since: 0, every: 2 } }));
  expect(s.awards.find((a) => a.title === 'Главный герой')).toMatchObject({ name: 'Аня', detail: '2 вопроса о нём или о ней' });
});

test('everyone leaves with at least one award', () => {
  const many = ['Аня', 'Боря', 'Вика', 'Гена', 'Даша', 'Егор', 'Женя', 'Зоя', 'Илья', 'Катя'];
  const log = [e(0, 1, 'l1-q1', 200), e(1, 2, 'l3-q1', 20), e(2, 3, 'l1-q3', 30, 1), e(3, 4, 'l1-q4', 50)];
  const s = summarize({ ...game(log), players: many });
  for (let i = 0; i < many.length; i++) expect(s.awards.some((a) => a.player === i)).toBe(true);
  const byTitle = Object.fromEntries(s.awards.map((a) => [a.title, a.name]));
  expect(byTitle['Открытая книга']).toBe('Даша'); // answered, never asked for another card
  expect(byTitle['Лучший слушатель']).toBe('Егор');
  expect(s.awards.filter((a) => a.title === 'Тёплое сердце').length).toBeGreaterThan(0);
});
