export type NameCase = 'gen' | 'dat' | 'acc' | 'ins' | 'prep';

// Names whose stem loses or changes a vowel / letter outside the plain rules.
const STEMS: Record<string, string> = { павел: 'Павл', лев: 'Льв', пётр: 'Петр', петр: 'Петр', любовь: '' };
const HISSING = /[жчшщ]$/;
const VELAR_HISSING = /[гкхжчшщ]$/;

const cap = (s: string, like: string) => (like[0] === like[0].toUpperCase() ? s[0].toUpperCase() + s.slice(1) : s);

// Declines a Russian first name (singular) by simple endings. Unknown shapes
// (foreign names, ends in -о/-е/-и/-у/-ы/-э/-ю, Latin letters) stay unchanged,
// which is the safest wrong answer.
export function declineName(name: string, nameCase: NameCase): string {
  const n = name.trim();
  if (!/^[А-Яа-яЁё-]+$/.test(n) || n.length < 2) return n;
  const lower = n.toLowerCase();
  if (lower in STEMS && STEMS[lower] === '') return n; // Любовь: feminine -ь, skip
  const last = lower.slice(-1);
  const prev = lower.slice(-2, -1);

  if (last === 'а') {
    const stem = n.slice(0, -1);
    const ins = HISSING.test(stem.toLowerCase()) || /ц$/i.test(stem) ? 'ей' : 'ой';
    return stem + ({ gen: VELAR_HISSING.test(stem.toLowerCase()) ? 'и' : 'ы', dat: 'е', acc: 'у', ins, prep: 'е' } as const)[nameCase];
  }
  if (last === 'я') {
    const stem = n.slice(0, -1);
    if (prev === 'и') return stem + ({ gen: 'и', dat: 'и', acc: 'ю', ins: 'ей', prep: 'и' } as const)[nameCase]; // Мария, Юлия
    return stem + ({ gen: 'и', dat: 'е', acc: 'ю', ins: 'ей', prep: 'е' } as const)[nameCase]; // Аня, Настя
  }
  if (last === 'й') {
    const stem = n.slice(0, -1); // Сергей, Дмитрий, Николай
    const ending = prev === 'и' ? ({ gen: 'я', dat: 'ю', acc: 'я', ins: 'ем', prep: 'и' } as const) : ({ gen: 'я', dat: 'ю', acc: 'я', ins: 'ем', prep: 'е' } as const);
    return stem + ending[nameCase];
  }
  if (last === 'ь') {
    const stem = n.slice(0, -1); // Игорь
    return stem + ({ gen: 'я', dat: 'ю', acc: 'я', ins: 'ем', prep: 'е' } as const)[nameCase];
  }
  if (/[бвгджзклмнпрстфхцчшщ]/.test(last)) {
    const stem = lower in STEMS ? cap(STEMS[lower], n) : n;
    const ins = HISSING.test(last) || last === 'ц' ? 'ем' : 'ом';
    return stem + ({ gen: 'а', dat: 'у', acc: 'а', ins, prep: 'е' } as const)[nameCase];
  }
  return n;
}
