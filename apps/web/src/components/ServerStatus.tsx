import { useServerStatus } from '../hooks/useServerStatus';

export function ServerStatus() {
  const { status, reconnect } = useServerStatus();
  const label = {
    connecting: 'Connecting to server…',
    connected: 'Server connected',
    offline: 'Server offline',
  }[status];
  return (
    <div className="server-status" data-state={status}>
      <span className="status-dot" aria-hidden="true" />
      <span role="status" aria-live="polite">
        {label}
      </span>
      {status === 'offline' && (
        <button className="text-link" onClick={reconnect}>
          Reconnect
        </button>
      )}
    </div>
  );
}
