import { act } from '@testing-library/react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { expect, it, vi } from 'vitest';
import { rootErrorHandlers } from '../src/app/root-error-handlers';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { registerClientErrorReporter } from '../src/lib/error-reporting';

function consoleOutput(calls: unknown[][]) {
  return JSON.stringify(calls, (_key, value: unknown) =>
    value instanceof Error ? { message: value.message, stack: value.stack } : value,
  );
}

function Broken(): never {
  throw new Error('PRIVATE_REACT_PASSWORD person@private.example');
}

it('the actual React root reports a caught error once without raw console output', async () => {
  const output = vi.spyOn(console, 'error').mockImplementation(() => {});
  const capture = vi.fn();
  const remove = registerClientErrorReporter(capture);
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container, rootErrorHandlers);
  try {
    await act(async () =>
      root.render(
        <ErrorBoundary>
          <Broken />
        </ErrorBoundary>,
      ),
    );
    expect(container).toHaveTextContent('We hit a snag.');
    expect(capture).toHaveBeenCalledTimes(1);
    expect(capture.mock.calls[0]?.[0].eventId).toMatch(/^[0-9a-f-]{36}$/);
    expect(consoleOutput(output.mock.calls)).not.toContain('PRIVATE_REACT_PASSWORD');
    expect(consoleOutput(output.mock.calls)).not.toContain('person@private.example');
    expect(JSON.stringify(capture.mock.calls)).not.toContain('PRIVATE_REACT_PASSWORD');
  } finally {
    await act(async () => root.unmount());
    container.remove();
    remove();
  }
});

it('uncaught and recoverable root errors use the same sanitized event hook', async () => {
  const output = vi.spyOn(console, 'error').mockImplementation(() => {});
  const capture = vi.fn();
  const remove = registerClientErrorReporter(capture);
  const container = document.createElement('div');
  const root = createRoot(container, rootErrorHandlers);
  try {
    // act intentionally rethrows uncaught errors; exercise React's real callback path.
    flushSync(() => root.render(<Broken />));
    rootErrorHandlers.onRecoverableError?.(new Error('PRIVATE_RECOVERABLE'), {
      componentStack: 'PRIVATE_STACK',
    });
    expect(capture).toHaveBeenCalledTimes(2);
    const records = capture.mock.calls.map((call) => call[0]);
    expect(new Set(records.map((record) => record.eventId)).size).toBe(2);
    const serialized = consoleOutput(output.mock.calls) + JSON.stringify(records);
    for (const secret of [
      'PRIVATE_REACT_PASSWORD',
      'PRIVATE_RECOVERABLE',
      'PRIVATE_STACK',
      'person@private.example',
    ])
      expect(serialized).not.toContain(secret);
  } finally {
    await act(async () => root.unmount());
    container.remove();
    remove();
  }
});
