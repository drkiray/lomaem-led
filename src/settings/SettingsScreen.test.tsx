import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/render';
import { SettingsScreen } from './SettingsScreen';

const stored = () => JSON.parse(localStorage.getItem('ll.settings')!);

test('toggles vibration and keep-awake', async () => {
  renderWithProviders(<SettingsScreen />);
  await userEvent.click(screen.getByRole('switch', { name: /Вибрация/ }));
  expect(stored().vibration).toBe(false);
  await userEvent.click(screen.getByRole('switch', { name: /Не гасить экран/ }));
  expect(stored().keepAwake).toBe(false);
});

test('toggles landscape mode for Крутилочка', async () => {
  renderWithProviders(<SettingsScreen />);
  const toggle = screen.getByRole('switch', { name: /Крутилочка горизонтально/ });
  expect(toggle).toHaveAttribute('aria-checked', 'true');
  await userEvent.click(toggle);
  expect(stored().landscapeGames).toBe(false);
});

test('changes hat turn time via segmented control', async () => {
  renderWithProviders(<SettingsScreen />);
  await userEvent.click(screen.getByRole('button', { name: '30с' }));
  expect(stored().hat.turnSeconds).toBe(30);
});

test('clears spinner question history', async () => {
  localStorage.setItem('ll.spinner.seen', '["a"]');
  renderWithProviders(<SettingsScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Сбросить историю вопросов' }));
  expect(localStorage.getItem('ll.spinner.seen')).toBeNull();
  expect(screen.getByRole('button', { name: /История очищена/ })).toBeInTheDocument();
});

test('reset all asks for confirmation then restores defaults', async () => {
  renderWithProviders(<SettingsScreen />);
  await userEvent.click(screen.getByRole('switch', { name: /Вибрация/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Сбросить все настройки' }));
  expect(screen.getByRole('dialog', { name: 'Сбросить все настройки?' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Сбросить' }));
  expect(stored().vibration).toBe(true);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('back arrow calls nav.back', async () => {
  const { back } = renderWithProviders(<SettingsScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Назад' }));
  expect(back).toHaveBeenCalled();
});

test('sound credits dialog names Kenney and the CC0 license', async () => {
  renderWithProviders(<SettingsScreen />);
  await userEvent.click(screen.getByRole('button', { name: 'Авторы звукового сопровождения' }));
  const dialog = screen.getByRole('dialog', { name: 'Авторы звукового сопровождения' });
  expect(dialog).toHaveTextContent('Kenney');
  expect(dialog).toHaveTextContent('CC0');
  expect(dialog).toHaveTextContent('FreeGroove');
  expect(screen.getByRole('link', { name: 'kenney.nl' })).toHaveAttribute('href', 'https://kenney.nl');
  await userEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
  expect(screen.queryByRole('dialog')).toBeNull();
});
