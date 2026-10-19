import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/render';
import { AppEffects } from './AppEffects';

const playSfx = vi.hoisted(() => vi.fn());
vi.mock('../audio/sfx', () => ({ playSfx, preloadSfx: vi.fn() }));
vi.mock('../audio/music', () => ({ setMusicVolume: vi.fn() }));

function ui() {
  renderWithProviders(
    <>
      <AppEffects />
      <button>Обычная</button>
      <button disabled>Выключена</button>
      <button data-sfx="none">Без звука</button>
      <button role="switch" aria-checked="false">Тумблер</button>
      <button aria-label="Назад">←</button>
      <button className="game-card">Игра</button>
    </>,
  );
}

beforeEach(() => playSfx.mockClear());

test('plain buttons tap, game cards select, back/remove buttons back', async () => {
  ui();
  await userEvent.click(screen.getByRole('button', { name: 'Обычная' }));
  await userEvent.click(screen.getByRole('button', { name: 'Игра' }));
  await userEvent.click(screen.getByRole('button', { name: 'Назад' }));
  expect(playSfx.mock.calls.map((c) => c[0])).toEqual(['tap', 'select', 'back']);
});

test('disabled, opted-out and switch buttons are silent here', async () => {
  ui();
  await userEvent.click(screen.getByRole('button', { name: 'Выключена' }));
  await userEvent.click(screen.getByRole('button', { name: 'Без звука' }));
  await userEvent.click(screen.getByRole('switch', { name: 'Тумблер' }));
  expect(playSfx).not.toHaveBeenCalled();
});
