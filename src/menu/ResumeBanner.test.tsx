import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/render';
import { ResumeBanner } from './ResumeBanner';

test('renders nothing without saved games', () => {
  const { container } = renderWithProviders(<ResumeBanner />);
  expect(container).toBeEmptyDOMElement();
});

test('offers to continue a saved spinner game', async () => {
  localStorage.setItem('ll.spinner.game', '{"players":["a","b"]}');
  const { navigate } = renderWithProviders(<ResumeBanner />);
  expect(screen.getByText('Крутилочка')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Продолжить' }));
  expect(navigate).toHaveBeenCalledWith('spinner-game');
});

test('discarding removes the save and hides the banner', async () => {
  localStorage.setItem('ll.hat.game', '{}');
  renderWithProviders(<ResumeBanner />);
  await userEvent.click(screen.getByRole('button', { name: 'Сбросить' }));
  expect(localStorage.getItem('ll.hat.game')).toBeNull();
  expect(screen.queryByText('Шляпа')).not.toBeInTheDocument();
});
