import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { Wheel } from './Wheel';

const players = ['Аня', 'Боря', 'Вика', 'Гоша'];

test('draws one sector per player and highlights the spinner', () => {
  const { container } = render(
    <Wheel players={players} activeIndex={2} arrowRef={createRef()} disabled={false} onSpin={() => {}} />,
  );
  expect(container.querySelectorAll('.wheel__sector')).toHaveLength(4);
  expect(container.querySelector('.wheel__active')).not.toBeNull();
  expect(screen.getByText('Вика')).toBeInTheDocument();
});

test('hub triggers spin only when enabled', async () => {
  const onSpin = vi.fn();
  const { rerender } = render(
    <Wheel players={players} activeIndex={0} arrowRef={createRef()} disabled={false} onSpin={onSpin} />,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Крутить' }));
  expect(onSpin).toHaveBeenCalledTimes(1);
  rerender(<Wheel players={players} activeIndex={0} arrowRef={createRef()} disabled onSpin={onSpin} />);
  await userEvent.click(screen.getByRole('button', { name: 'Крутить' }));
  expect(onSpin).toHaveBeenCalledTimes(1);
});

test('long names are truncated on crowded wheels', () => {
  const many = Array.from({ length: 30 }, (_, i) => `Очень-очень-длинное-имя-игрока-${i}`);
  render(<Wheel players={many} activeIndex={0} arrowRef={createRef()} disabled={false} onSpin={() => {}} />);
  expect(screen.getAllByText(/…$/).length).toBeGreaterThan(0);
});

test('hub shows an icon, not text that could overflow it', () => {
  render(<Wheel players={players} activeIndex={0} arrowRef={createRef()} disabled={false} onSpin={() => {}} />);
  const hub = screen.getByRole('button', { name: 'Крутить' });
  expect(hub.textContent).toBe('');
  expect(hub.querySelector('svg.wheel__hub-icon')).not.toBeNull();
});
