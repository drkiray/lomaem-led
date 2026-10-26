import { BIRTHDAY_CARDS } from '../../content/birthdayCards';
import { SPINNER_CARDS } from '../../content/spinnerCards';
import { plural } from '../../lib/plural';
import { fillTemplate, type Card, type Level } from './deck';
import type { LogEntry, SpinnerState } from './state';

const CARDS = new Map<string, Card>([...SPINNER_CARDS, ...BIRTHDAY_CARDS].map((c) => [c.id, c]));

export interface Award {
  player: number;
  icon: string;
  title: string;
  name: string;
  detail: string;
  quote?: string;
}

export interface SpinnerSummary {
  durationMs: number;
  questions: number;
  actions: number;
  rounds: number;
  deepest: Level | null;
  awards: Award[];
}

export function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s} с`;
  const min = Math.round(s / 60);
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  return rest ? `${h} ч ${rest} мин` : `${h} ч`;
}

const times = (n: number) => `${n} ${plural(n, 'раз', 'раза', 'раз')}`;

// The entry with the highest score; ties keep the earliest. null when none qualify.
function best<T>(items: T[], score: (item: T) => number): T | null {
  let top: T | null = null;
  let topScore = -Infinity;
  for (const item of items) {
    const value = score(item);
    if (value > topScore) {
      top = item;
      topScore = value;
    }
  }
  return top;
}

function totals(log: LogEntry[], n: number, key: (e: LogEntry) => number, value: (e: LogEntry) => number): number[] {
  const sums = Array<number>(n).fill(0);
  for (const e of log) sums[key(e)] += value(e);
  return sums;
}

export function summarize(state: SpinnerState): SpinnerSummary {
  const { log, players } = state;
  const n = players.length;
  const card = (e: LogEntry) => CARDS.get(e.cardId);
  const birthdayName = state.birthday ? players[state.birthday.index] : '';
  const timed = log.filter((e) => e.ms > 0);
  const awards: Award[] = [];
  // One award per player: each nomination goes to the best player still without one.
  const taken = () => new Set(awards.map((a) => a.player));
  const free = () => players.map((_, i) => i).filter((i) => !taken().has(i));
  const freeEntries = (entries: LogEntry[]) => entries.filter((e) => !taken().has(e.answerer));
  const give = (player: number, icon: string, title: string, detail: string, quote?: string) =>
    awards.push({ player, icon, title, name: players[player], detail, quote });

  // Birthday mode: the birthday person's award comes first, it is theirs
  const aboutBirthday = log.filter((e) => card(e)?.birthday).length;
  if (state.birthday && aboutBirthday > 0) {
    give(state.birthday.index, '🎁', 'Главный герой', `${aboutBirthday} ${plural(aboutBirthday, 'вопрос', 'вопроса', 'вопросов')} о нём или о ней`);
  }

  // Who talked the most overall
  const talk = totals(timed, n, (e) => e.answerer, (e) => e.ms);
  const talker = best(free().filter((i) => talk[i] > 0), (i) => talk[i]);
  if (timed.length >= 2 && talker !== null) give(talker, '🗣️', 'Душа разговора', `${formatDuration(talk[talker])} в ответах`);

  // The single longest answer, with the question that started it
  const longest = best(freeEntries(timed), (e) => e.ms);
  if (longest) {
    const c = card(longest);
    give(longest.answerer, '⏳', 'Самый долгий ответ', formatDuration(longest.ms),
      c ? fillTemplate(c.text, players[longest.asker], players[longest.answerer], birthdayName) : undefined);
  }

  // The quickest answer (a few seconds of thinking at least, so not a mis-tap)
  const fastest = best(freeEntries(timed).filter((e) => e.ms >= 3000), (e) => -e.ms);
  if (timed.length >= 4 && fastest) give(fastest.answerer, '⚡', 'Блиц', `ответ за ${formatDuration(fastest.ms)}`);

  // Whose questions got people talking: longest answers on average
  const askedCount = totals(timed, n, (e) => e.asker, () => 1);
  const askedTime = totals(timed, n, (e) => e.asker, (e) => e.ms);
  const askers = players.map((_, i) => i).filter((i) => askedCount[i] > 0);
  const opener = best(free().filter((i) => askedCount[i] > 0), (i) => askedTime[i] / askedCount[i]);
  if (askers.length >= 3 && opener !== null) {
    give(opener, '🔑', 'Умеет разговорить', `в среднем ${formatDuration(askedTime[opener] / askedCount[opener])} на ответ`);
  }

  // «поменять карточку» champion — only when it happened at all
  const rerolls = totals(log, n, (e) => e.answerer, (e) => e.rerolls);
  const shy = best(free().filter((i) => rerolls[i] > 0), (i) => rerolls[i]);
  if (shy !== null) give(shy, '🙈', 'Загадка вечера', `${times(rerolls[shy])} просил(а) другую карточку`);

  // Most actions done
  const acts = totals(log, n, (e) => e.answerer, (e) => (card(e)?.kind === 'action' ? 1 : 0));
  const doer = best(free().filter((i) => acts[i] >= 2), (i) => acts[i]);
  if (doer !== null) give(doer, '🎭', 'Человек действия', `${acts[doer]} ${plural(acts[doer], 'действие', 'действия', 'действий')}`);

  awards.push(...consolations(state, awards));

  const levels = log.map((e) => card(e)?.level).filter((l): l is Level => l !== undefined);
  return {
    durationMs: Math.max(0, (state.finishedAt ?? Date.now()) - state.startedAt),
    questions: log.filter((e) => card(e)?.kind !== 'action').length,
    actions: log.filter((e) => card(e)?.kind === 'action').length,
    rounds: state.roundsDone,
    deepest: levels.length ? (Math.max(...levels) as Level) : null,
    awards,
  };
}

interface Candidate {
  icon: string;
  title: string;
  // higher fits better; null: doesn't fit this player
  score: (i: number) => number | null;
  detail: (i: number) => string;
}

const GENERIC: Omit<Candidate, 'score'>[] = [
  { icon: '💛', title: 'Тёплое сердце', detail: () => 'за искренность и хорошую компанию' },
  { icon: '✨', title: 'Искра компании', detail: () => 'без тебя вечер был бы совсем другим' },
  { icon: '🍀', title: 'Любимчик стрелки', detail: () => 'стрелка явно к тебе неравнодушна' },
];

// Everyone leaves with an award: players the main nominations missed get one
// that still says something true about their evening, else a warm generic one.
function consolations(state: SpinnerState, given: Award[]): Award[] {
  const { log, players } = state;
  const n = players.length;
  const credited = new Set(given.map((a) => a.player));
  const titles = new Set(given.map((a) => a.title));
  const timed = log.filter((e) => e.ms > 0);
  const answered = totals(log, n, (e) => e.answerer, () => 1);
  const asked = totals(log, n, (e) => e.asker, () => 1);
  const rerolls = totals(log, n, (e) => e.answerer, (e) => e.rerolls);
  const timedCount = totals(timed, n, (e) => e.answerer, () => 1);
  const talk = totals(timed, n, (e) => e.answerer, (e) => e.ms);
  const deep = totals(log, n, (e) => e.answerer, (e) => (CARDS.get(e.cardId)?.level === 3 ? 1 : 0));
  const avg = (i: number) => talk[i] / timedCount[i];

  const candidates: Candidate[] = [
    {
      icon: '🌊', title: 'Ныряльщик',
      score: (i) => (deep[i] > 0 ? deep[i] : null),
      detail: (i) => `${deep[i]} ${plural(deep[i], 'ответ', 'ответа', 'ответов')} на уровне «Глубина»`,
    },
    {
      icon: '📖', title: 'Открытая книга',
      score: (i) => (answered[i] > 0 && rerolls[i] === 0 ? answered[i] : null),
      detail: () => 'ни разу не попросил(а) другую карточку',
    },
    {
      icon: '✂️', title: 'Мастер краткости',
      score: (i) => (timedCount[i] > 0 ? -avg(i) : null),
      detail: (i) => `в среднем ${formatDuration(avg(i))} на ответ — коротко и по делу`,
    },
    {
      icon: '🎤', title: 'Главный по вопросам',
      score: (i) => (asked[i] > 0 ? asked[i] : null),
      detail: (i) => `${asked[i]} ${plural(asked[i], 'вопрос задан', 'вопроса задано', 'вопросов задано')}`,
    },
    {
      icon: '👂', title: 'Лучший слушатель',
      score: (i) => -talk[i],
      detail: () => 'дал(а) выговориться другим',
    },
  ];

  const out: Award[] = [];
  const award = (i: number, c: Omit<Candidate, 'score'>) => {
    out.push({ player: i, icon: c.icon, title: c.title, name: players[i], detail: c.detail(i) });
    credited.add(i);
  };
  for (const c of candidates) {
    if (titles.has(c.title)) continue;
    const open = players.map((_, i) => i).filter((i) => !credited.has(i) && c.score(i) !== null);
    if (open.length === 0) continue;
    award(best(open, (i) => c.score(i)!)!, c);
  }
  let g = 0;
  for (let i = 0; i < n; i++) if (!credited.has(i)) award(i, GENERIC[g++ % GENERIC.length]);
  return out;
}
