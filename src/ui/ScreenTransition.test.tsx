import { render } from '@testing-library/react';
import { ScreenTransition } from './ScreenTransition';

const shape = (c: HTMLElement) => [...c.querySelectorAll('.ice-crack path')].map((p) => p.getAttribute('d')).join('|');

test('crack sits behind the screen content and differs on each transition', () => {
  const { container, rerender } = render(<ScreenTransition routeKey="menu"><p>Меню</p></ScreenTransition>);
  expect(container.querySelector('.ice-crack')).toBeNull();

  rerender(<ScreenTransition routeKey="settings"><p>Настройки</p></ScreenTransition>);
  const crack = container.querySelector('.ice-crack')!;
  const content = container.querySelector('.screen-enter')!;
  expect(crack.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  const first = shape(container);

  rerender(<ScreenTransition routeKey="menu"><p>Меню</p></ScreenTransition>);
  expect(shape(container)).not.toBe(first);
});
