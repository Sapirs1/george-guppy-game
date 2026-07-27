import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { PauseOverlay } from './scenes/PauseOverlay';
import { LevelCompleteOverlay } from './scenes/LevelCompleteOverlay';
import { SettingsOverlay } from './scenes/SettingsOverlay';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  // Fixed design resolution. Every level is authored at 800x600 and each scene
  // lays its UI out once in create() against this.scale.width/height, so the
  // game size must stay constant — Phaser.Scale.FIT then scales the canvas to
  // fill whatever container it is embedded in, letterboxing as needed.
  // (Sizing the game to window.innerWidth instead left the 800x600 world
  // stranded in the top-left corner of a much larger canvas.)
  width: 800,
  height: 600,
  backgroundColor: '#0b1d2e',
  pixelArt: false,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  audio: {
    disableWebAudio: false,
  },
  scene: [BootScene, MenuScene, GameScene, PauseOverlay, LevelCompleteOverlay, SettingsOverlay],
};
