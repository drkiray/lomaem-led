import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { PlayerListInput } from './PlayerListInput';

function Harness({ initial = ['', ''] }: { initial?: string[] }) {
  const [players, setPlayers] = useState(initial);
  return (
    <>
      <PlayerListInput players={players} onChange={setPlayers} />
      <output data-testid="value">{JSON.stringify(players)}</output>
    </>
  );
}

const value = () => JSON.parse(screen.getByTestId('value').textContent!);

test('types names, adds and removes rows', async () => {
  render(<Harness />);
  await userEvent.type(screen.getByLabelText('Имя игрока 1'), 'Маша');
  await userEvent.type(screen.getByLabelText('Имя игрока 2'), 'Петя');
  await userEvent.click(screen.getByRole('button', { name: '+ Добавить игрока' }));
  expect(value()).toEqual(['Маша', 'Петя', '']);
  expect(screen.getByLabelText('Имя игрока 3')).toHaveFocus();
  await userEvent.click(screen.getByRole('button', { name: 'Удалить игрока 1' }));
  expect(value()).toEqual(['Петя', '']);
});

test('Enter on last row adds a new row', async () => {
  render(<Harness initial={['Маша']} />);
  await userEvent.type(screen.getByLabelText('Имя игрока 1'), '{Enter}');
  expect(value()).toEqual(['Маша', '']);
});

test('"как в прошлый раз" fills remembered names', async () => {
  localStorage.setItem('ll.lastPlayers', '["Аня","Боря","Вика"]');
  render(<Harness />);
  await userEvent.click(screen.getByRole('button', { name: 'Как в прошлый раз (3)' }));
  expect(value()).toEqual(['Аня', 'Боря', 'Вика']);
});
