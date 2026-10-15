import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/render';
import { MenuScreen } from './MenuScreen';

test('shows two playable and two locked games', () => {
  renderWithProviders(<MenuScreen />);
  expect(screen.getByRole('button', { name: /Крутилочка/ })).toBeEnabled();
  expect(screen.getByRole('button', { name: /Шляпа/ })).toBeEnabled();
  expect(screen.getByRole('button', { name: /Правда или действие/ })).toBeDisabled();
  expect(screen.getByRole('button', { name: /Нетворкинг/ })).toBeDisabled();
  expect(screen.getAllByText('Скоро')).toHaveLength(2);
});

test('opens game setup and settings', async () => {
  const { navigate } = renderWithProviders(<MenuScreen />);
  await userEvent.click(screen.getByRole('button', { name: /Крутилочка/ }));
  expect(navigate).toHaveBeenCalledWith('spinner-setup');
  await userEvent.click(screen.getByRole('button', { name: /Шляпа/ }));
  expect(navigate).toHaveBeenCalledWith('hat-setup');
  await userEvent.click(screen.getByRole('button', { name: 'Настройки' }));
  expect(navigate).toHaveBeenCalledWith('settings');
});
