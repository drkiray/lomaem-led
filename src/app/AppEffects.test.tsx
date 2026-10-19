import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/render';
import { AppEffects } from './AppEffects';

const playSfx = vi.hoisted(() => vi.fn());
vi.mock('../audio/sfx', () => ({ playSfx, preloadSfx: vi.fn() }));
const setMusicVolume = vi.hoisted(() => vi.fn(() => Promise.resolve(true)));
vi.mock('../audio/music', () => ({ setMusicVolume }));

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
      <button className="game-card" aria-disabled="true">Скоро</button>
    </>,
  );
}

beforeEach(() => playSfx.mockClear());

test('plain buttons tap, game cards select, back/remove buttons back', async () => {
  ui();
  await userEvent.click(screen.getByRole('button', { name: 'Обычная' }));
  await userEvent.click(screen.getByRole('button', { name: 'Игра' }));
  await userEvent.click(screen.getByRole('button', { name: 'Назад' }));
  await userEvent.click(screen.getByRole('button', { name: 'Скоро' })); // aria-disabled «скоро» card still chimes
  expect(playSfx.mock.calls.map((c) => c[0])).toEqual(['tap', 'select', 'back', 'select']);
});

test('disabled, opted-out and switch buttons are silent here', async () => {
  ui();
  await userEvent.click(screen.getByRole('button', { name: 'Выключена' }));
  await userEvent.click(screen.getByRole('button', { name: 'Без звука' }));
  await userEvent.click(screen.getByRole('switch', { name: 'Тумблер' }));
  expect(playSfx).not.toHaveBeenCalled();
});

test('music retries on gestures until play() succeeds, then stops listening', async () => {
  setMusicVolume.mockReset();
  let blocked = true;
  setMusicVolume.mockImplementation(() => Promise.resolve(!blocked));
  ui();
  await Promise.resolve();
  expect(setMusicVolume).toHaveBeenCalledTimes(1); // on mount: blocked
  await userEvent.click(screen.getByRole('button', { name: 'Обычная' }));
  const whileBlocked = setMusicVolume.mock.calls.length;
  expect(whileBlocked).toBeGreaterThan(1); // gesture retried
  await userEvent.click(screen.getByRole('button', { name: 'Обычная' }));
  expect(setMusicVolume.mock.calls.length).toBeGreaterThan(whileBlocked); // still blocked → keeps retrying
  blocked = false;
  await userEvent.click(screen.getByRole('button', { name: 'Обычная' })); // this one succeeds
  await Promise.resolve();
  const afterSuccess = setMusicVolume.mock.calls.length;
  await userEvent.click(screen.getByRole('button', { name: 'Обычная' }));
  expect(setMusicVolume).toHaveBeenCalledTimes(afterSuccess); // playing → listeners removed
});
