import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import AccountPage from '../src/pages/AccountPage';
import { ApiRequestError } from '../src/lib/api';
import type * as Api from '../src/lib/api';

const auth = vi.hoisted(() => ({ getSession: vi.fn(), onAuthStateChange: vi.fn(), signInWithPassword: vi.fn(), signOut: vi.fn() }));
const initialize = vi.hoisted(() => vi.fn());
vi.mock('../src/lib/supabase', () => ({ supabase: { auth } }));
vi.mock('../src/lib/api', async importOriginal => ({ ...await importOriginal<typeof Api>(), initializePlayer: initialize }));
const session = { access_token: 'browser-token', user: { id: 'e662c562-93bd-4eac-ad9f-b60226744543', email: 'fisher@example.com' } } as Session;
const profile = { id: '72ae44d4-2254-49ed-815f-282355ccad0c', authId: session.user.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
let notify: (event: string, session: Session | null) => void;
let unsubscribe: ReturnType<typeof vi.fn>;

beforeEach(() => {
  unsubscribe = vi.fn();
  auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  auth.onAuthStateChange.mockImplementation(callback => { notify = callback; return { data: { subscription: { unsubscribe } } }; });
  auth.signInWithPassword.mockResolvedValue({ data: { session }, error: null });
  auth.signOut.mockResolvedValue({ error: null });
  initialize.mockResolvedValue(profile);
});

it('signs in, verifies/initializes the profile through the API, and signs out', async () => {
  const user = userEvent.setup();
  const view = render(<AccountPage />);
  expect(screen.getByRole('status')).toHaveTextContent('Restoring your session…');
  await user.type(await screen.findByLabelText('Email'), 'fisher@example.com');
  await user.type(screen.getByLabelText('Password'), 'example-password');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'fisher@example.com', password: 'example-password' });
  expect(await screen.findByText('Your Pondbound profile is ready.')).toBeInTheDocument();
  expect(initialize).toHaveBeenCalledWith(session.access_token, expect.any(AbortSignal));
  await user.click(screen.getByRole('button', { name: 'Sign out' }));
  expect(await screen.findByRole('heading', { name: 'Sign in to Pondbound.' })).toBeInTheDocument();
  expect(screen.queryByText('Your Pondbound profile is ready.')).not.toBeInTheDocument();
  expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  view.unmount();
  expect(unsubscribe).toHaveBeenCalledOnce();
});

it('shows safe sign-in errors without trying to initialize a profile', async () => {
  auth.signInWithPassword.mockResolvedValue({ data: { session: null }, error: { message: 'PRIVATE_PROVIDER_MESSAGE' } });
  const user = userEvent.setup();
  render(<AccountPage />);
  await user.type(await screen.findByLabelText('Email'), 'fisher@example.com');
  await user.type(screen.getByLabelText('Password'), 'wrong-password');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to sign in.');
  expect(screen.queryByText('PRIVATE_PROVIDER_MESSAGE')).not.toBeInTheDocument();
  expect(initialize).not.toHaveBeenCalled();
});

it('restores an existing session and handles verification failure', async () => {
  auth.getSession.mockResolvedValue({ data: { session }, error: null });
  initialize.mockRejectedValue(new ApiRequestError(401));
  render(<AccountPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Your session could not be verified.');
  expect(screen.queryByText('Your Pondbound profile is ready.')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
});

it('retries a temporary profile failure', async () => {
  auth.getSession.mockResolvedValue({ data: { session }, error: null });
  initialize.mockRejectedValueOnce(new ApiRequestError(503)).mockResolvedValueOnce(profile);
  const user = userEvent.setup();
  render(<AccountPage />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Your profile could not load.');
  await user.click(screen.getByRole('button', { name: 'Try again' }));
  expect(await screen.findByText('Your Pondbound profile is ready.')).toBeInTheDocument();
});

it('does not restore stale profile data after a sign-out event', async () => {
  auth.getSession.mockResolvedValue({ data: { session }, error: null });
  let finish!: (value: typeof profile) => void;
  initialize.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  render(<AccountPage />);
  await waitFor(() => expect(initialize).toHaveBeenCalled());
  act(() => notify('SIGNED_OUT', null));
  await act(async () => finish(profile));
  expect(screen.getByRole('heading', { name: 'Sign in to Pondbound.' })).toBeInTheDocument();
  expect(screen.queryByText('Your Pondbound profile is ready.')).not.toBeInTheDocument();
});
