import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OwnWordsEntry } from './OwnWordsEntry';

test('each player privately enters words, hidden between players', async () => {
  const onDone = vi.fn();
  render(<OwnWordsEntry players={['Аня', 'Боря']} perPlayer={2} onDone={onDone} />);

  expect(screen.queryByLabelText('Слово 1')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Я Аня, показать' }));
  await userEvent.type(screen.getByLabelText('Слово 1'), 'кот');
  await userEvent.type(screen.getByLabelText('Слово 2'), 'дом');
  await userEvent.click(screen.getByRole('button', { name: 'Готово, спрятать' }));

  expect(screen.queryByDisplayValue('кот')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Я Боря, показать' }));
  expect(screen.getByLabelText('Слово 1')).toHaveValue('');
  await userEvent.type(screen.getByLabelText('Слово 1'), 'лес');
  await userEvent.click(screen.getByRole('button', { name: 'Готово, спрятать' }));

  expect(onDone).toHaveBeenCalledWith(['кот', 'дом', 'лес', '']);
});

test('cannot submit an empty list', async () => {
  render(<OwnWordsEntry players={['Аня']} perPlayer={2} onDone={vi.fn()} />);
  await userEvent.click(screen.getByRole('button', { name: 'Я Аня, показать' }));
  expect(screen.getByRole('button', { name: 'Готово, спрятать' })).toBeDisabled();
});
