import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../ui/Button';
import { cleanPlayers, loadLastPlayers } from './players';

interface Props {
  players: string[];
  onChange: (players: string[]) => void;
}

export function PlayerListInput({ players, onChange }: Props) {
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const last = useMemo(loadLastPlayers, []);

  useEffect(() => {
    if (focusIndex === null) return;
    inputs.current[focusIndex]?.focus();
    setFocusIndex(null);
  }, [focusIndex]);

  const setAt = (index: number, name: string) => onChange(players.map((p, i) => (i === index ? name : p)));
  const removeAt = (index: number) => onChange(players.filter((_, i) => i !== index));
  const add = () => {
    onChange([...players, '']);
    setFocusIndex(players.length);
  };

  return (
    <div className="players">
      {last.length > 0 && (
        <Button variant="ghost" onClick={() => onChange([...last])}>
          Как в прошлый раз ({last.length})
        </Button>
      )}
      <ol className="players__list">
        {players.map((name, i) => (
          <li key={i} className="players__row">
            <span className="players__num">{i + 1}</span>
            <input
              ref={(el) => {
                inputs.current[i] = el;
              }}
              className="input"
              value={name}
              placeholder={`Игрок ${i + 1}`}
              aria-label={`Имя игрока ${i + 1}`}
              maxLength={20}
              autoCapitalize="words"
              enterKeyHint="next"
              onChange={(e) => setAt(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                if (i === players.length - 1) add();
                else inputs.current[i + 1]?.focus();
              }}
            />
            <button
              type="button"
              className="icon-btn icon-btn--small"
              aria-label={`Удалить игрока ${i + 1}`}
              onClick={() => removeAt(i)}
            >
              ✕
            </button>
          </li>
        ))}
      </ol>
      <Button variant="ghost" onClick={add}>+ Добавить игрока</Button>
      <p className="muted">Игроков: {cleanPlayers(players).length}</p>
    </div>
  );
}
