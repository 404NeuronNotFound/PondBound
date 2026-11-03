import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/app/App';

const gameState = vi.hoisted(() => ({ fail: false }));
vi.mock('../src/game/GameCanvas', () => ({
  GameCanvas: () => {
    if (gameState.fail) throw new Error('Private engine diagnostic');
    return <div>Canvas preview</div>;
  },
}));

function open(path = '/') {
  return render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
}
function healthyResponse() {
  return new Response(JSON.stringify({ status: 'ok', service: 'pondbound-api' }));
}

beforeEach(() => {
  gameState.fail = false;
  vi.stubGlobal('fetch', vi.fn().mockImplementation(async () => healthyResponse()));
});

describe('application routes and shell', () => {
  it('navigates between pages while keeping shared navigation and footer', async () => {
    const user = userEvent.setup();
    open();
    expect(await screen.findByRole('heading', { level: 1, name: /every story starts/i })).toBeInTheDocument();
    const navigation = screen.getByRole('navigation', { name: 'Main navigation' });
    expect(within(navigation).getByRole('link', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    await user.click(screen.getByRole('link', { name: /visit the pond/i }));
    expect(await screen.findByRole('heading', { name: 'The pond is waiting.' })).toBeInTheDocument();
    expect(screen.getByText('Canvas preview')).toBeInTheDocument();
    expect(within(navigation).getByRole('link', { name: 'Pond preview' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(document.title).toBe('Pond preview · Pondbound');
    expect(screen.getByRole('main')).toHaveFocus();
    await user.click(within(navigation).getByRole('link', { name: 'Home' }));
    expect(await screen.findByRole('heading', { level: 1, name: /every story starts/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main-content');
  });

  it.each(['/play', '/play/'])('opens the deep link %s directly', async path => {
    open(path);
    expect(await screen.findByRole('heading', { name: 'The pond is waiting.' })).toBeInTheDocument();
    expect(document.title).toBe('Pond preview · Pondbound');
  });

  it('shows a recoverable 404 for an unknown path', async () => {
    const user = userEvent.setup();
    open('/missing/path');
    expect(screen.getByRole('heading', { name: 'This trail ends here.' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Back to the start' }));
    expect(await screen.findByRole('heading', { level: 1, name: /every story starts/i })).toBeInTheDocument();
  });

  it('keeps the shell usable offline and reconnects on request', async () => {
    const user = userEvent.setup();
    const fetch = vi.fn().mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce(healthyResponse());
    vi.stubGlobal('fetch', fetch);
    open();
    expect(await screen.findByText('Server offline')).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reconnect' }));
    expect(await screen.findByText('Server connected')).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('contains route failures and lets navigation recover', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    gameState.fail = true;
    const user = userEvent.setup();
    open('/play');
    expect(await screen.findByRole('alert')).toHaveTextContent('We hit a snag.');
    expect(screen.queryByText('Private engine diagnostic')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Home' }));
    expect(await screen.findByRole('heading', { level: 1, name: /every story starts/i })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('announces pending health checks and aborts them on unmount', async () => {
    let signal: AbortSignal | undefined;
    vi.stubGlobal('fetch', vi.fn((_input, options: RequestInit) => {
      signal = options.signal ?? undefined;
      return new Promise(() => {});
    }));
    const view = open();
    expect(screen.getByText('Connecting to server…')).toBeInTheDocument();
    await waitFor(() => expect(signal).toBeDefined());
    view.unmount();
    expect(signal?.aborted).toBe(true);
  });
});
