import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsProvider, useSettings } from './SettingsContext';

function Probe() {
  const { settings, update, reset } = useSettings();
  return (
    <>
      <span data-testid="vib">{String(settings.vibration)}</span>
      <button onClick={() => update({ vibration: false })}>off</button>
      <button onClick={reset}>reset</button>
    </>
  );
}

test('loads stored settings, persists updates, resets', async () => {
  localStorage.setItem('ll.settings', JSON.stringify({ sfxVolume: 0.1 }));
  render(<SettingsProvider><Probe /></SettingsProvider>);
  expect(screen.getByTestId('vib')).toHaveTextContent('true');

  await userEvent.click(screen.getByText('off'));
  expect(screen.getByTestId('vib')).toHaveTextContent('false');
  const stored = JSON.parse(localStorage.getItem('ll.settings')!);
  expect(stored.vibration).toBe(false);
  expect(stored.sfxVolume).toBe(0.1);

  await userEvent.click(screen.getByText('reset'));
  expect(JSON.parse(localStorage.getItem('ll.settings')!).sfxVolume).toBe(0.8);
});
