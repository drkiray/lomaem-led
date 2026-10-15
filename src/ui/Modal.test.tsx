import { render, screen } from '@testing-library/react';
import { Modal } from './Modal';

// Rendered inside the screen, a fixed modal would be positioned by the
// screen's entry animation (a transform) and jump when that ends.
test('renders at the top of the document, outside the screen it is declared in', () => {
  const { container } = render(
    <div className="screen-enter">
      <Modal open title="Поворачиваем экран" actions={null}>текст</Modal>
    </div>,
  );
  const dialog = screen.getByRole('dialog', { name: 'Поворачиваем экран' });
  expect(container.contains(dialog)).toBe(false);
  expect(dialog.closest('.modal-backdrop')!.parentElement).toBe(document.body);
});

test('renders nothing when closed', () => {
  render(<Modal open={false} title="x" actions={null} />);
  expect(screen.queryByRole('dialog')).toBeNull();
});
