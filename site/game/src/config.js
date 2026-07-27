import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { PauseOverlay } from './scenes/PauseOverlay.js';
import { LevelCompleteOverlay } from './scenes/LevelCompleteOverlay.js';
import { SettingsOverlay } from './scenes/SettingsOverlay.js';

export const gameConfig                               = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: window.innerWidth,
  height: window.innerHeight,
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
    mode: Phaser.Scale.SHOW_ALL,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  audio: {
    disableWebAudio: false,
  },
  scene: [BootScene, MenuScene, GameScene, PauseOverlay, LevelCompleteOverlay, SettingsOverlay],
};
