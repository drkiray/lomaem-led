import type { CSSProperties } from 'react';
import { useNav } from '../app/nav';
import { GAMES } from './games';
import { ResumeBanner } from './ResumeBanner';
import { UpdateButton } from './UpdateButton';

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
                // aria-disabled, not disabled: a disabled button gets no click, so no sound
                aria-disabled={locked || undefined}
                onClick={() => game.route && navigate(game.route)}
              >
                <span className="game-card__slot" aria-hidden="true">
                  {game.icon ? <img className="game-card__icon" src={game.icon} alt="" /> : game.emoji}
                </span>
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
      <p className="menu__credit">
        игру сделал вот этот{' '}
        <a href="https://t.me/kirayslifes" target="_blank" rel="noopener noreferrer">крендель</a>
      </p>
      <UpdateButton />
    </div>
  );
}
