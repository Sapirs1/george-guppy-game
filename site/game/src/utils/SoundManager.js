import { createWaterAmbience, playBubbleBlip, playCrankSound } from './audio.js';
import { musicEnabled, sfxEnabled } from '../scenes/SettingsOverlay.js';

/**
 * SoundManager
 *
 * Centralized audio controller inspired by Om Nom Run's soundController.js
 * and musicController.js. It hides Web Audio lifecycle details from scenes and
 * provides a small, explicit API for the sounds used in George Guppy.
 */

export class SoundManager {
          scene              ;
          ambienceNode                        ;
          ambienceStarted = false;
          bubblePending = false;

  constructor(scene              ) {
    this.scene = scene;
  }

  /**
   * Ensures the Web Audio context is running after a user gesture.
   * Must be called from a pointerdown/tap handler before playing sounds.
   */
  unlock()       {
    if (this.scene.sound instanceof Phaser.Sound.WebAudioSoundManager) {
      const ctx = this.scene.sound.context;
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {
          // Ignore; the browser will remain silent for this session.
        });
      }
    }
  }

  /**
   * Starts the looping underwater ambience. Safe to call multiple times;
   * only one ambience stream is created.
   */
  startAmbience()       {
    if (this.ambienceStarted || !musicEnabled) {
      return;
    }
    try {
      this.ambienceNode = createWaterAmbience(this.scene);
    } catch {
      // Web Audio unavailable; continue without ambience.
    }
    this.ambienceStarted = true;
  }

  /**
   * Stops the ambience stream, used when leaving a scene.
   */
  stopAmbience()       {
    if (this.ambienceNode) {
      try {
        this.ambienceNode.stop();
      } catch {
        // Already stopped by the browser.
      }
      this.ambienceNode = undefined;
    }
    this.ambienceStarted = false;
  }

  /**
   * Plays the bubble collect blip.
   */
  playBubbleBlip()       {
    // Avoid overlapping blips if the user collects several bubbles instantly.
    if (this.bubblePending) {
      return;
    }
    this.bubblePending = true;
    this.scene.time.delayedCall(50, () => {
      this.bubblePending = false;
    });
    playBubbleBlip(this.scene);
  }

  /**
   * Plays the dissonant hazard/crank sound.
   */
  playCrank()       {
    playCrankSound(this.scene);
  }
}
