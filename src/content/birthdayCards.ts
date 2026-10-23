import type { Card, Level } from '../games/spinner/deck';

// Questions the spinner reads to the answerer about the birthday person, who is
// just called by name. {birthday} is the name in the nominative; {birthday:gen},
// {birthday:dat}, {birthday:acc}, {birthday:ins} and {birthday:prep} are declined
// by src/lib/declension.ts. No word may agree with the name in gender.
// Ids come from list positions: append new cards at the END only.

const RAW: Record<Level, string[]> = {
  1: [
    'Расскажи, как и когда ты познакомился(ась) с {birthday:ins}.',
    'Каким было твоё первое впечатление о {birthday:prep}? Оно изменилось?',
    'Назови три слова, которые лучше всего описывают {birthday:acc}.',
    'Что ты чаще всего делаешь вместе с {birthday:ins}?',
    'Какой подарок ты выбрал(а) бы для {birthday:gen}, если бы бюджет был безграничным?',
    'За что тебе нравится {birthday}? Назови одну причину.',
    'Какая самая забавная привычка или странность есть у {birthday:gen}?',
    'Угадай, что {birthday} выберет в ресторане на ужин первым делом.',
  ],
  2: [
    'Расскажи своё самое яркое воспоминание, связанное с {birthday:ins}.',
    'Какая смешная история с {birthday:ins} до сих пор вызывает у тебя улыбку?',
    'Чему ты научился(ась) у {birthday:gen}?',
    'Какое качество {birthday:gen} ты хотел(а) бы перенять?',
    'Каким ты представляешь {birthday:acc} через десять лет?',
    'Расскажи о моменте, когда ты был(а) приятно удивлён(а) поступком {birthday:gen}.',
    'Какой совет ты дал(а) бы {birthday:dat} на новый год жизни?',
    'В какой ситуации ты без раздумий позвал(а) бы на помощь {birthday:acc}?',
  ],
  3: [
    'Скажи {birthday:dat} что-то важное, что обычно не говорят вслух.',
    'За что ты по-настоящему благодарен(на) {birthday:dat}?',
    'Какой поступок {birthday:gen} ты запомнил(а) надолго?',
    'Что ты пожелаешь {birthday:dat} от всего сердца, без шаблонных фраз?',
    'Расскажи, что {birthday} значит для тебя.',
    'Какой момент, проведённый рядом с {birthday:ins}, ты пережил(а) бы заново?',
    'Расскажи, как знакомство с {birthday:ins} повлияло на твою жизнь, пусть совсем чуть-чуть.',
    'Что ты ценишь в {birthday:prep} больше всего, но редко говоришь?',
  ],
};

export const BIRTHDAY_CARDS: Card[] = ([1, 2, 3] as Level[]).flatMap((level) =>
  RAW[level].map((text, i): Card => ({ id: `b${level}-q${i + 1}`, level, kind: 'question', text, birthday: true })),
);
