import { useState } from 'react';
import { plural } from '../../lib/plural';
import { Button } from '../../ui/Button';

interface Props {
  players: string[];
  perPlayer: number;
  onDone: (words: string[]) => void;
}

export function OwnWordsEntry({ players, perPlayer, onDone }: Props) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [collected, setCollected] = useState<string[]>([]);
  const [draft, setDraft] = useState<string[]>(() => Array(perPlayer).fill(''));
  const player = players[index];

  if (!revealed) {
    return (
      <div className="handoff">
        <p className="muted">Передай телефон</p>
        <h2 className="handoff__name">{player}</h2>
        <p className="muted">Остальные не подглядывают 👀</p>
        <Button size="lg" onClick={() => setRevealed(true)}>Я {player}, показать</Button>
        <p className="muted">Игрок {index + 1} из {players.length}</p>
      </div>
    );
  }

  const submit = () => {
    const next = [...collected, ...draft];
    if (index + 1 >= players.length) {
      onDone(next);
      return;
    }
    setCollected(next);
    setIndex(index + 1);
    setDraft(Array(perPlayer).fill(''));
    setRevealed(false);
  };

  return (
    <div className="stack">
      <h2 className="handoff__title">
        {player}, впиши {perPlayer} {plural(perPlayer, 'слово', 'слова', 'слов')}
      </h2>
      {draft.map((word, i) => (
        <input
          key={i}
          className="input"
          aria-label={`Слово ${i + 1}`}
          value={word}
          maxLength={40}
          autoComplete="off"
          onChange={(e) => setDraft(draft.map((w, k) => (k === i ? e.target.value : w)))}
        />
      ))}
      <Button size="lg" disabled={draft.every((w) => !w.trim())} onClick={submit}>Готово, спрятать</Button>
    </div>
  );
}
