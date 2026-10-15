import type { Landscape } from '../lib/useLandscape';
import { Button } from './Button';
import { Modal } from './Modal';

export function LandscapePrompt({ landscape }: { landscape: Landscape }) {
  return (
    <Modal
      open={landscape.offer}
      title="Поворачиваем экран"
      actions={
        <>
          <Button variant="ghost" onClick={landscape.decline}>Не сейчас</Button>
          <Button onClick={() => void landscape.enter()}>Включить</Button>
        </>
      }
    >
      <p>Игра пойдёт в горизонтальном режиме во весь экран — так лучше видно круг и вопросы. Поверните телефон.</p>
    </Modal>
  );
}

// Header button to get back into fullscreen after the back gesture left it.
export function FullscreenButton({ landscape }: { landscape: Landscape }) {
  if (!landscape.canEnter || landscape.offer) return null;
  return (
    <button type="button" className="icon-btn" aria-label="Во весь экран" onClick={() => void landscape.enter()}>
      ⛶
    </button>
  );
}
