export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="loading-ripple" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
