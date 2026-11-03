export type ClientErrorReport = Readonly<{
  event: 'client.render_failed';
  eventId: string;
  timestamp: string;
  errorKind: 'Error' | 'TypeError' | 'RangeError';
}>;
export type ClientErrorReporter = (report: ClientErrorReport) => void | Promise<void>;
let reporter: ClientErrorReporter | undefined;

// Register at application startup when an approved reporting adapter is available.
export function registerClientErrorReporter(next: ClientErrorReporter) {
  const previous = reporter;
  reporter = next;
  return () => {
    if (reporter === next) reporter = previous;
  };
}

export function reportRenderFailure(error: unknown) {
  const report: ClientErrorReport = Object.freeze({
    event: 'client.render_failed',
    eventId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    errorKind:
      error instanceof TypeError
        ? 'TypeError'
        : error instanceof RangeError
          ? 'RangeError'
          : 'Error',
  });
  if (import.meta.env.DEV) console.error(JSON.stringify(report));
  try {
    void Promise.resolve(reporter?.(report)).catch(() => {});
  } catch {
    /* Rendering recovery must remain available. */
  }
}
