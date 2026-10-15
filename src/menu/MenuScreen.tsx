import type { CSSProperties } from 'react';
import { useNav } from '../app/nav';
import { GAMES } from './games';
import { ResumeBanner } from './ResumeBanner';

export function MenuScreen() {
  const { navigate } = useNav();
  return (
    <div className="menu">
      <header className="menu__header">
        <button type="button" className="icon-btn" aria-label="Настройки" onClick={() => navigate('settings')}>
          ⚙️
        </button>
      </header>
      <h1 className="logo">
        Ломаем <span>Лёд</span>
      </h1>
      <p className="menu__tagline">Игры, чтобы растопить любую компанию</p>
      <ResumeBanner />
      <ul className="game-list">
        {GAMES.map((game) => {
          const locked = game.route === null;
          return (
            <li key={game.id}>
              <button
                type="button"
                className={`game-card ${locked ? 'game-card--locked' : ''}`}
                style={{ '--accent': game.accent } as CSSProperties}
                disabled={locked}
                onClick={() => game.route && navigate(game.route)}
              >
                <span className="game-card__emoji" aria-hidden="true">{game.emoji}</span>
                <span className="game-card__text">
                  <span className="game-card__title">{game.title}</span>
                  <span className="game-card__subtitle">{game.subtitle}</span>
                </span>
                {locked && <span className="game-card__lock" aria-hidden="true">🔒</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
