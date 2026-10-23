import { fillTemplate } from '../games/spinner/deck';
import { BIRTHDAY_CARDS } from './birthdayCards';

test('ids and texts are unique, every level has cards', () => {
  expect(new Set(BIRTHDAY_CARDS.map((c) => c.id)).size).toBe(BIRTHDAY_CARDS.length);
  expect(new Set(BIRTHDAY_CARDS.map((c) => c.text)).size).toBe(BIRTHDAY_CARDS.length);
  for (const level of [1, 2, 3]) expect(BIRTHDAY_CARDS.filter((c) => c.level === level).length).toBeGreaterThanOrEqual(8);
});

test('all are questions that mention the birthday person and fill cleanly', () => {
  for (const c of BIRTHDAY_CARDS) {
    expect(c.kind).toBe('question');
    expect(c.birthday).toBe(true);
    expect(c.text).toContain('{birthday}');
    expect(fillTemplate(c.text, 'А', 'Б', 'Д')).not.toMatch(/[{}]/);
  }
});

test('the name always follows a dash (never declined)', () => {
  for (const c of BIRTHDAY_CARDS) expect(c.text).toMatch(/— \{birthday\}/);
});
