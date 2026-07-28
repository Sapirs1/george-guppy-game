import Phaser from 'phaser';
import { gameConfig } from './config';

function removeLoadingText(): void {
  // The standalone page uses #loading; the site embed uses #status, which also
  // carries the visible "engine failed to load" message instead of leaving a
  // child staring at a spinner forever. Support both.
  const loading =
    document.getElementById('loading') ?? document.getElementById('status');
  if (loading) {
    loading.remove();
  }
}

const game = new Phaser.Game(gameConfig);

// No manual resize handler: the game uses Phaser.Scale.FIT with a fixed 800x600
// design resolution, so the Scale Manager rescales the canvas to its parent on
// its own. Calling scale.resize() here would overwrite that base size (resize()
// is for Scale.NONE) and strand the world in a corner of the canvas again.

// Expose the instance so the host page (and automated tests) can inspect it —
// the site embed's load watchdog checks for this before declaring a failure.
(window as unknown as { georgeGame: Phaser.Game }).georgeGame = game;

game.events.on('ready', removeLoadingText);
