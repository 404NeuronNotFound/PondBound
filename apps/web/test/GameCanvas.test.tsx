import { act, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { GameCanvas } from '../src/game/GameCanvas';
import { createGame } from '../src/game/create-game';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

vi.mock('../src/game/create-game', () => ({ createGame: vi.fn() }));

it('keeps the loading state until the engine is ready and destroys it on unmount', async () => {
  const destroy = vi.fn();
  let onReady!: () => void;
  vi.mocked(createGame).mockImplementation((_parent, callback) => {
    onReady = callback;
    return { destroy } as unknown as ReturnType<typeof createGame>;
  });
  const view = render(<GameCanvas />);
  expect(screen.getByRole('status')).toHaveTextContent('Preparing the pond…');
  await waitFor(() => expect(createGame).toHaveBeenCalledTimes(1));
  act(() => onReady());
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
  view.unmount();
  expect(destroy).toHaveBeenCalledWith(true);
});

it('sends asynchronous engine startup failures to the error boundary', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.mocked(createGame).mockImplementation(() => {
    throw new Error('Engine failed');
  });
  render(
    <ErrorBoundary>
      <GameCanvas />
    </ErrorBoundary>,
  );
  expect(await screen.findByRole('alert')).toHaveTextContent('We hit a snag.');
  expect(screen.queryByText('Engine failed')).not.toBeInTheDocument();
});
