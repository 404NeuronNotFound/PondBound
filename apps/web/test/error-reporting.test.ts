import { expect, it, vi } from 'vitest';
import { registerClientErrorReporter, reportRenderFailure } from '../src/lib/error-reporting';
import { ApiRequestError, initializePlayer } from '../src/lib/api';

it('reports render failures without raw messages, stack, location or account data', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
  const capture = vi.fn();
  const remove = registerClientErrorReporter(capture);
  try {
    reportRenderFailure(new TypeError('PRIVATE_RENDER_MESSAGE'));
    const report = capture.mock.calls[0]?.[0];
    expect(report).toEqual({
      event: 'client.render_failed',
      eventId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      timestamp: expect.any(String),
      errorKind: 'TypeError',
    });
    expect(Object.isFrozen(report)).toBe(true);
    expect(JSON.stringify([report, consoleError.mock.calls])).not.toContain(
      'PRIVATE_RENDER_MESSAGE',
    );
  } finally {
    remove();
  }
});

it('contains synchronous and asynchronous reporter failures', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  for (const capture of [
    () => {
      throw new Error('PRIVATE_REPORTER');
    },
    () => Promise.reject(new Error('PRIVATE_REPORTER')),
  ]) {
    const remove = registerClientErrorReporter(capture);
    try {
      expect(() => reportRenderFailure(new Error('PRIVATE_ERROR'))).not.toThrow();
      await Promise.resolve();
    } finally {
      remove();
    }
  }
});

it('retains only valid server request IDs on API failures', async () => {
  const id = '72ae44d4-2254-49ed-815f-282355ccad0c';
  for (const requestId of [id, 'UNTRUSTED_HEADER']) {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('PRIVATE_SERVER_MESSAGE', {
          status: 503,
          headers: { 'X-Request-Id': requestId },
        }),
      ),
    );
    await expect(initializePlayer('test-token')).rejects.toMatchObject({
      status: 503,
      requestId: requestId === id ? id : undefined,
      message: 'The request could not be completed.',
    });
    try {
      await initializePlayer('test-token');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiRequestError);
    }
  }
});
