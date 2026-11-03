import { act, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ServerStatus } from '../src/components/ServerStatus';

it('ends the connecting state when a health request times out', async () => {
  vi.useFakeTimers();
  try {
    vi.stubGlobal('fetch', vi.fn((_input, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    })));
    render(<ServerStatus />);
    expect(screen.getByText('Connecting to server…')).toBeInTheDocument();
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(screen.getByText('Server offline')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reconnect' })).toBeInTheDocument();
  } finally { vi.useRealTimers(); }
});
