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

  // Who talked the most overall
  if (timed.length >= 2) {
    const talk = totals(timed, n, (e) => e.answerer, (e) => e.ms);
    const i = best(players.map((_, idx) => idx), (idx) => talk[idx])!;
    awards.push({ player: i, icon: '🗣️', title: 'Душа разговора', name: players[i], detail: `${formatDuration(talk[i])} в ответах` });
  }

  // The single longest answer, with the question that started it
  const longest = best(timed, (e) => e.ms);
  if (longest) {
    const c = card(longest);
    awards.push({
      player: longest.answerer,
      icon: '⏳',
      title: 'Самый долгий ответ',
      name: players[longest.answerer],
      detail: formatDuration(longest.ms),
      quote: c ? fillTemplate(c.text, players[longest.asker], players[longest.answerer], birthdayName) : undefined,
    });
  }

  // The quickest answer (a few seconds of thinking at least, so not a mis-tap)
  const quick = timed.filter((e) => e.ms >= 3000 && e !== longest);
  if (timed.length >= 4 && quick.length > 0) {
    const fastest = best(quick, (e) => -e.ms)!;
    awards.push({ player: fastest.answerer, icon: '⚡', title: 'Блиц', name: players[fastest.answerer], detail: `ответ за ${formatDuration(fastest.ms)}` });
  }

  // Whose questions got people talking: longest answers on average
  const askedCount = totals(timed, n, (e) => e.asker, () => 1);
  const askedTime = totals(timed, n, (e) => e.asker, (e) => e.ms);
  const askers = players.map((_, idx) => idx).filter((idx) => askedCount[idx] > 0);
  if (askers.length >= 3) {
    const i = best(askers, (idx) => askedTime[idx] / askedCount[idx])!;
    awards.push({
      player: i,
      icon: '🔑',
      title: 'Умеет разговорить',
      name: players[i],
      detail: `в среднем ${formatDuration(askedTime[i] / askedCount[i])} на ответ`,
    });
  }

  // «не хочу отвечать» champion — only when it happened at all
  const rerolls = totals(log, n, (e) => e.answerer, (e) => e.rerolls);
  const shy = best(players.map((_, idx) => idx), (idx) => rerolls[idx])!;
  if (rerolls[shy] > 0) {
    awards.push({ player: shy, icon: '🙈', title: 'Загадка вечера', name: players[shy], detail: `${times(rerolls[shy])} просил(а) другую карточку` });
  }

  // Most actions done
  const acts = totals(log, n, (e) => e.answerer, (e) => (card(e)?.kind === 'action' ? 1 : 0));
  const doer = best(players.map((_, idx) => idx), (idx) => acts[idx])!;
  if (acts[doer] >= 2) {
    awards.push({ player: doer, icon: '🎭', title: 'Человек действия', name: players[doer], detail: `${acts[doer]} ${plural(acts[doer], 'действие', 'действия', 'действий')}` });
  }

  // Birthday mode: how much was said about the birthday person
  const aboutBirthday = log.filter((e) => card(e)?.birthday).length;
  if (state.birthday && aboutBirthday > 0) {
    awards.push({
      player: state.birthday.index,
      icon: '🎁',
      title: 'Главный герой',
      name: birthdayName,
      detail: `${aboutBirthday} ${plural(aboutBirthday, 'вопрос', 'вопроса', 'вопросов')} о нём или о ней`,
    });
  }

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
