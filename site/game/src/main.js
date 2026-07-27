import Phaser from 'phaser';
import { gameConfig } from './config.js';

function removeLoadingText()       {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.remove();
  }
}

const game = new Phaser.Game(gameConfig);

window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});

game.events.on('ready', removeLoadingText);
