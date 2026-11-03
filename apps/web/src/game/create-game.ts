import Phaser from 'phaser';
import { viewport } from '@pondbound/game-config';
import { BootScene } from './scenes/BootScene';

export function createGame(parent: HTMLElement) {
  return new Phaser.Game({
    type: Phaser.AUTO, parent, width: viewport.width, height: viewport.height,
    backgroundColor: viewport.background, pixelArt: true, roundPixels: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootScene],
  });
}
