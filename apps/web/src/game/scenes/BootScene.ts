import Phaser from 'phaser';

// Engine integration check only. Original sprites and the starter map belong to Phase 1.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }
  create() {
    this.add
      .text(480, 245, 'PONDBOUND', {
        fontFamily: 'monospace',
        fontSize: '32px',
        color: '#d8eacb',
        letterSpacing: 8,
      })
      .setOrigin(0.5);
    this.add
      .text(480, 295, 'The water is waiting.', {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#8cafa1',
      })
      .setOrigin(0.5);
  }
}
