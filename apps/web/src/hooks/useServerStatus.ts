import { useEffect, useState } from 'react';
import { getHealth } from '../lib/api';

export function useServerStatus() {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'offline'>('connecting');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let disposed = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    void getHealth(controller.signal)
      .then(() => {
        if (!disposed) setStatus('connected');
      })
      .catch(() => {
        if (!disposed) setStatus('offline');
      })
      .finally(() => window.clearTimeout(timeout));
    return () => {
      disposed = true;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [attempt]);
  return {
    status,
    reconnect: () => {
      setStatus('connecting');
      setAttempt((value) => value + 1);
    },
  };
}
