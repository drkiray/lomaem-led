import { useReducer } from 'react';
import { useNav, type RouteName } from '../app/nav';
import { KEYS, loadJSON, removeKey } from '../lib/storage';
import { Button } from '../ui/Button';

const SAVED_GAMES: { key: string; route: RouteName; title: string }[] = [
  { key: KEYS.spinnerGame, route: 'spinner-game', title: 'Крутилочка' },
  { key: KEYS.hatGame, route: 'hat-game', title: 'Шляпа' },
];

export function ResumeBanner() {
  const { navigate } = useNav();
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const saved = SAVED_GAMES.filter((g) => loadJSON<unknown>(g.key, null) !== null);
  if (saved.length === 0) return null;

  return (
    <div className="resume">
      {saved.map((g) => (
        <div key={g.key} className="resume__item">
          <span>
            Продолжить игру? <b>{g.title}</b>
          </span>
          <div className="resume__actions">
            <Button onClick={() => navigate(g.route)}>Продолжить</Button>
            <Button variant="ghost" onClick={() => { removeKey(g.key); rerender(); }}>Сбросить</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
