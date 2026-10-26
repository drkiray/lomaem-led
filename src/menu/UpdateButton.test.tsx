import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UpdateButton } from './UpdateButton';

function stubSW(reg: Partial<ServiceWorkerRegistration> | undefined) {
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { getRegistration: () => Promise.resolve(reg) },
  });
}
afterEach(() => {
  // @ts-expect-error test cleanup
  delete navigator.serviceWorker;
});

test('shows the build date', () => {
  stubSW(undefined);
  render(<UpdateButton />);
  expect(screen.getByText(/^версия от /)).toBeInTheDocument();
});

test('nothing new: says so, no reload', async () => {
  stubSW({ update: () => Promise.resolve(undefined as never), installing: null, waiting: null });
  const reload = vi.fn();
  render(<UpdateButton reload={reload} />);
  await userEvent.click(screen.getByRole('button', { name: /Проверить обновления/ }));
  expect(await screen.findByText(/последняя версия/)).toBeInTheDocument();
  expect(reload).not.toHaveBeenCalled();
});

test('a new version gets activated and the app reloads', async () => {
  const listeners: (() => void)[] = [];
  const sw = {
    state: 'installing',
    postMessage: vi.fn(),
    addEventListener: (_: string, fn: () => void) => listeners.push(fn),
  };
  stubSW({ update: () => Promise.resolve(undefined as never), installing: sw as unknown as ServiceWorker, waiting: null });
  const reload = vi.fn();
  render(<UpdateButton reload={reload} />);
  await userEvent.click(screen.getByRole('button', { name: /Проверить обновления/ }));
  expect(await screen.findByText('Проверяем…')).toBeInTheDocument();
  sw.state = 'activated';
  listeners.forEach((fn) => fn());
  await vi.waitFor(() => expect(reload).toHaveBeenCalled());
});

test('offline: update() fails', async () => {
  stubSW({ update: () => Promise.reject(new Error('net')) });
  render(<UpdateButton reload={vi.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: /Проверить обновления/ }));
  expect(await screen.findByText(/Нет связи/)).toBeInTheDocument();
});
