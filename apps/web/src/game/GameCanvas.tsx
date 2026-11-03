import { useEffect, useRef } from 'react';
import type Phaser from 'phaser';

export function GameCanvas() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let disposed = false;
    let game: Phaser.Game | undefined;
    void import('./create-game').then(({ createGame }) => {
      if (!disposed && host.current) game = createGame(host.current);
    });
    return () => { disposed = true; game?.destroy(true); };
  }, []);
  return <div ref={host} className="game-host" role="img" aria-label="Pondbound game viewport. The world is under construction." />;
}
