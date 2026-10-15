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

test('Нетворкинг shows its own icon instead of an emoji', () => {
  renderWithProviders(<MenuScreen />);
  const card = screen.getByRole('button', { name: /Нетворкинг/ });
  expect(card.querySelector('img.game-card__icon')).not.toBeNull();
  expect(card).not.toHaveTextContent('🤝');
});

test('credits link the author in Telegram', () => {
  renderWithProviders(<MenuScreen />);
  expect(screen.getByText(/игру сделал вот этот/)).toBeInTheDocument();
  const link = screen.getByRole('link', { name: 'крендель' });
  expect(link).toHaveAttribute('href', 'https://t.me/kirayslifes');
  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
});
