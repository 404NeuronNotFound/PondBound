import { lazy, Suspense } from 'react';
import { act, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { LoadingState } from '../src/components/LoadingState';

it('announces lazy loading and replaces it with the loaded view', async () => {
  let resolve!: (module: { default: () => React.JSX.Element }) => void;
  const pending = new Promise<{ default: () => React.JSX.Element }>(done => { resolve = done; });
  const Page = lazy(() => pending);
  render(<ErrorBoundary><Suspense fallback={<LoadingState label="Opening your next stop…" />}><Page /></Suspense></ErrorBoundary>);
  expect(screen.getByRole('status')).toHaveTextContent('Opening your next stop…');
  await act(async () => resolve({ default: () => <h1>Ready</h1> }));
  expect(await screen.findByRole('heading', { name: 'Ready' })).toBeInTheDocument();
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

it('catches a rejected route import and offers recovery without showing raw errors', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const Page = lazy(() => Promise.reject(new Error('Internal import failure')));
  render(<ErrorBoundary><Suspense fallback={<LoadingState />}><Page /></Suspense></ErrorBoundary>);
  expect(await screen.findByRole('alert')).toHaveTextContent('We hit a snag.');
  expect(screen.getByRole('link', { name: 'Back to the start' })).toHaveAttribute('href', '/');
  expect(screen.queryByText('Internal import failure')).not.toBeInTheDocument();
});
