import { fireEvent, render } from '@testing-library/react';
import { ScreenTransition } from './ScreenTransition';

const shape = (c: HTMLElement) => [...c.querySelectorAll('.ice-crack path')].map((p) => p.getAttribute('d')).join('|');

// The crack waits for the new screen to finish fading in: while the screen is
// still translucent the crack would show through buttons and text.
const settle = (c: HTMLElement) => fireEvent.animationEnd(c.querySelector('.screen-enter')!);

test('crack appears only after the screen has settled, behind the content', () => {
  const { container, rerender } = render(<ScreenTransition routeKey="menu"><p>Меню</p></ScreenTransition>);
  settle(container);
  expect(container.querySelector('.ice-crack')).toBeNull();

  rerender(<ScreenTransition routeKey="settings"><p>Настройки</p></ScreenTransition>);
  expect(container.querySelector('.ice-crack')).toBeNull();
  settle(container);
  const crack = container.querySelector('.ice-crack')!;
  const content = container.querySelector('.screen-enter')!;
  expect(crack.compareDocumentPosition(content) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});

test('animations of elements inside the screen do not start the crack', () => {
  const { container, rerender } = render(<ScreenTransition routeKey="menu"><p>Меню</p></ScreenTransition>);
  rerender(<ScreenTransition routeKey="settings"><p className="inner">Настройки</p></ScreenTransition>);
  fireEvent.animationEnd(container.querySelector('.inner')!);
  expect(container.querySelector('.ice-crack')).toBeNull();
});

test('a new pattern on each transition', () => {
  const { container, rerender } = render(<ScreenTransition routeKey="menu"><p>Меню</p></ScreenTransition>);
  rerender(<ScreenTransition routeKey="settings"><p>Настройки</p></ScreenTransition>);
  settle(container);
  const first = shape(container);
  rerender(<ScreenTransition routeKey="menu"><p>Меню</p></ScreenTransition>);
  settle(container);
  expect(shape(container)).not.toBe(first);
});
