import Phaser from 'phaser';
import { dialogues } from '../data/dialogue.js';
                                                        

/**
 * DialogueOverlay
 *
 * A modal overlay scene that streams one or more lines of dialogue from
 * the shared `dialogues` registry. It darkens the screen, draws a rounded
 * dialogue box at the bottom, and advances lines via pointer/tap or SPACE.
 *
 * Launched by GameScene like:
 *   this.scene.launch('DialogueOverlay', { dialogKey: 'snail_intro' });
 */
export class DialogueOverlay extends Phaser.Scene {
          dialogKey = '';
          lines                 = [];
          currentIndex = 0;

          overlayGraphics                              ;
          boxGraphics                              ;
          nameText                          ;
          lineText                          ;
          promptText                          ;

          typingTimer                         ;
          isTyping = false;

  constructor() {
    super({ key: 'DialogueOverlay' });
  }

  init(data                        )       {
    const key = data.dialogKey ?? '';

    if (!key || !dialogues[key]) {
      console.error(`[DialogueOverlay] Unknown dialogKey: "${key}"`);
      this.scene.stop('DialogueOverlay');
      return;
    }

    this.dialogKey = key;
    this.lines = dialogues[key];
    this.currentIndex = 0;
  }

  create()       {
    this.overlayGraphics = this.add.graphics();
    this.boxGraphics = this.add.graphics();

    this.nameText = this.add
      .text(0, 0, '', {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '22px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setDepth(1001);

    this.lineText = this.add
      .text(0, 0, '', {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '18px',
        color: '#eeeeee',
      })
      .setDepth(1001);

    this.promptText = this.add
      .text(0, 0, 'Tap or press SPACE to continue', {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '14px',
        color: '#aaccff',
      })
      .setOrigin(0.5, 1)
      .setDepth(1001);

    // Keep every UI element pinned to the viewport, ignoring any camera movement.
    [this.overlayGraphics, this.boxGraphics, this.nameText, this.lineText, this.promptText].forEach(
      (obj) => obj.setScrollFactor(0),
    );

    this.drawChrome();
    this.displayCurrentLine();
    this.setupInput();
    this.setupPromptPulse();

    this.scale.on('resize', this.drawChrome, this);
  }

          drawChrome()       {
    const width = this.scale.width;
    const height = this.scale.height;

    // Full-screen darkening layer.
    this.overlayGraphics.clear();
    this.overlayGraphics.fillStyle(0x000000, 0.6);
    this.overlayGraphics.fillRect(0, 0, width, height);

    // Rounded dialogue box pinned to the bottom of the viewport.
    const boxWidth = Math.min(width * 0.8, 960);
    const boxHeight = 140;
    const boxX = (width - boxWidth) / 2;
    const boxY = height - boxHeight - 32;

    this.boxGraphics.clear();
    this.boxGraphics.fillStyle(0x1a2a3a, 0.96);
    this.boxGraphics.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 16);

    const padding = 24;
    const textX = boxX + padding;
    const textY = boxY + padding;
    const wrapWidth = boxWidth - padding * 2;

    this.nameText.setPosition(textX, textY);
    this.lineText.setPosition(textX, textY + 32);
    this.lineText.setWordWrapWidth(wrapWidth);
    this.promptText.setPosition(width / 2, boxY + boxHeight - 14);
  }

          displayCurrentLine()       {
    const line = this.lines[this.currentIndex];
    if (!line) return;

    this.nameText.setText(line.speaker);
    this.startTyping(line.text);
  }

          startTyping(fullText        )       {
    this.isTyping = true;
    this.lineText.setText('');

    if (fullText.length === 0) {
      this.isTyping = false;
      return;
    }

    let index = 0;
    this.typingTimer = this.time.addEvent({
      delay: 20,
      callback: () => {
        index += 1;
        this.lineText.setText(fullText.slice(0, index));
        if (index >= fullText.length) {
          this.isTyping = false;
          this.clearTypingTimer();
        }
      },
      callbackScope: this,
      repeat: fullText.length - 1,
    });
  }

          advance()       {
    if (this.isTyping) {
      this.clearTypingTimer();
      const currentLine = this.lines[this.currentIndex];
      this.lineText.setText(currentLine?.text ?? '');
      this.isTyping = false;
      return;
    }

    this.currentIndex += 1;

    if (this.currentIndex >= this.lines.length) {
      this.scene.stop('DialogueOverlay');
      return;
    }

    this.displayCurrentLine();
  }

          setupInput()       {
    this.input.on('pointerdown', this.advance, this);

    const keyboard = this.input.keyboard;
    if (keyboard) {
      keyboard.on('keydown-SPACE', this.advance, this);
    }
  }

          setupPromptPulse()       {
    this.tweens.add({
      targets: this.promptText,
      alpha: 0.35,
      duration: 800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

          clearTypingTimer()       {
    if (this.typingTimer) {
      this.time.removeEvent(this.typingTimer);
      this.typingTimer = undefined;
    }
  }

          shutdown()       {
    this.clearTypingTimer();
    this.tweens.killTweensOf(this.promptText);

    this.input.off('pointerdown', this.advance, this);

    const keyboard = this.input.keyboard;
    if (keyboard) {
      keyboard.off('keydown-SPACE', this.advance, this);
    }

    this.scale.off('resize', this.drawChrome, this);
  }
}
