// Shown as «{name}, {phrase}» above the wheel; a new one every turn.
// Imperatives that don't depend on the player's gender.
export const SPIN_PHRASES: string[] = [
  'крути!',
  'жми!',
  'вращай!',
  'закручивай!',
  'зажигай!',
  'жмакай!',
  'жми, ёкарный бабай!',
  'тыкай смелее!',
  'раскручивай!',
  'крутани от души!',
  'запускай шарманку!',
  'врубай рулетку!',
  'жги!',
  'поехали!',
  'погнали!',
  'твой выход!',
  'жми на газ!',
  'вжух — и крути!',
  'вращайте барабан!',
  'да пребудет с тобой сила!',
  'жми на кнопку — получишь результат!',
  'ставки сделаны, крути!',
  'колдуй!',
  'покажи класс!',
  'судьба ждёт!',
  'не томи!',
  'крути, как в последний раз!',
  'давай, не стесняйся!',
  'закрути интригу!',
  'жмякни!',
  'тапай!',
  'нажми, если не боишься!',
  'включай режим «рулетка»!',
  'запускай барабан судьбы!',
  'кто не рискует — тот не крутит!',
  'выбирай жертву!',
  'пусть стрелка решит!',
  'крути-верти!',
];

// A random phrase, never the same one twice in a row.
export function pickSpinPhrase(previous: string | null, rng: () => number = Math.random): string {
  const pool = SPIN_PHRASES.filter((p) => p !== previous);
  return pool[Math.floor(rng() * pool.length)];
}
