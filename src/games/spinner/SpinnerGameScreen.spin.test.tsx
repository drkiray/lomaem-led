import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../test/render';
import { SpinnerGameScreen } from './SpinnerGameScreen';
import { createSpinnerGame } from './state';

// vi.mock is hoisted above imports, so shared mocks must come from vi.hoisted.
const { spinTo } = vi.hoisted(() => ({ spinTo: vi.fn((_target: number, _durationMs: number) => Promise.resolve()) }));
vi.mock('./useSpin', async () => {
  const { createRef } = await import('react');
  return { useSpin: () => ({ arrowRef: createRef(), spinTo, setRotation: () => {} }) };
});

test('tapping the hub spins once, lands on the planned answerer and records the card as seen', async () => {
  localStorage.setItem(
    'll.spinner.game',
    JSON.stringify(createSpinnerGame(['Маша', 'Петя', 'Оля'], { spinDurationSec: 4, actionRatio: 0 }, [
      { asker: 2, answerer: 0 },
      { asker: 0, answerer: 1 },
      { asker: 1, answerer: 2 },
    ])),
  );
  renderWithProviders(<SpinnerGameScreen />);
  const hub = screen.getByRole('button', { name: 'Крутить' });
  await userEvent.dblClick(hub);

  const dialog = await screen.findByRole('dialog', { name: 'Вопрос' });
  expect(dialog).toHaveTextContent('Оля → Маша');
  expect(spinTo).toHaveBeenCalledTimes(1);
  expect(spinTo.mock.calls[0][1]).toBe(4000);
  const seen = JSON.parse(localStorage.getItem('ll.spinner.seen')!);
  expect(seen).toHaveLength(1);
});
