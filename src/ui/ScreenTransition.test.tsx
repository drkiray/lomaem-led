import { fireEvent, render } from '@testing-library/react';
import { ScreenTransition } from './ScreenTransition';

const shape = (c: HTMLElement) => [...c.querySelectorAll('.ice-crack path')].map((p) => p.getAttribute('d')).join('|');

// The crack waits for the new screen to finish fading in: while the screen is
// still translucent the crack would show through buttons and text.
const settle = (c: HTMLElement) => fireEvent.animationEnd(c.querySelector('.screen-enter')!);

test('every screen, the first one too, cracks once it has settled', () => {
  const { container } = render(<ScreenTransition routeKey="menu"><p>Меню</p></ScreenTransition>);
  expect(container.querySelector('.ice-crack')).toBeNull();
  settle(container);
  expect(container.querySelector('.ice-crack')).not.toBeNull();
});

test('each line grows on its own schedule', () => {
  const { container } = render(<ScreenTransition routeKey="menu"><p>Меню</p></ScreenTransition>);
  settle(container);
  const path = container.querySelector<SVGPathElement>('.ice-crack path')!;
  expect(path.style.animationDelay).toMatch(/s$/);
  expect(path.style.animationDuration).toMatch(/s$/);
});

test('crack appears only after the screen has settled, behind the content', () => {
  const { container, rerender } = render(<ScreenTransition routeKey="menu"><p>Меню</p></ScreenTransition>);
  settle(container);

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

test('lines keep pathLength scaling so they grow instead of showing dotted at once', () => {
  const { container } = render(<ScreenTransition routeKey="menu"><p>Меню</p></ScreenTransition>);
  settle(container);
  for (const p of container.querySelectorAll('.ice-crack path')) {
    expect(p.getAttribute('pathLength')).toBe('1');
    expect(p.getAttribute('vector-effect')).toBeNull();
  }
});

test('no crack when the screen opts out (game screens)', () => {
  const { container } = render(<ScreenTransition routeKey="spinner-game" crack={false}><p>Игра</p></ScreenTransition>);
  settle(container);
  expect(container.querySelector('.ice-crack')).toBeNull();
});
