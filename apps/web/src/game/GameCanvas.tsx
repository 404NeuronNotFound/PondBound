import { useEffect, useRef, useState } from 'react';
import type Phaser from 'phaser';
import { LoadingState } from '../components/LoadingState';

export function GameCanvas() {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    let disposed = false;
    let game: Phaser.Game | undefined;
    void import('./create-game')
      .then(({ createGame }) => {
        if (!disposed && host.current)
          game = createGame(host.current, () => {
            if (!disposed) setReady(true);
          });
      })
      .catch((error) => {
        if (!disposed)
          setError(error instanceof Error ? error : new Error('The pond could not open.'));
      });
    return () => {
      disposed = true;
      game?.destroy(true);
    };
  }, []);
  if (error) throw error;
  return (
    <div className="game-frame" aria-busy={!ready}>
      <div
        ref={host}
        className="game-host"
        role="img"
        aria-label="Pondbound game viewport. The world is under construction."
      />
      {!ready && (
        <div className="game-loading">
          <LoadingState label="Preparing the pond…" />
        </div>
      )}
    </div>
  );
}
