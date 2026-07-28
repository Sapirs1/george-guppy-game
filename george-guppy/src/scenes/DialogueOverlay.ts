import Phaser from 'phaser';
import { dialogues } from '../data/dialogue.js';
import type { DialogueLine } from '../data/dialogue.js';

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
  private dialogKey = '';
  private lines: DialogueLine[] = [];
  private currentIndex = 0;

  private overlayGraphics!: Phaser.GameObjects.Graphics;
  private boxGraphics!: Phaser.GameObjects.Graphics;
  private nameText!: Phaser.GameObjects.Text;
  private lineText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;

  private typingTimer?: Phaser.Time.TimerEvent;
  private isTyping = false;

  constructor() {
    super({ key: 'DialogueOverlay' });
  }

  init(data: { dialogKey?: string }): void {
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

  create(): void {
    this.overlayGraphics = this.add.graphics();
    this.boxGraphics = this.add.graphics();

    // The canvas is a fixed 800x600 scaled with FIT, so on a 390px-wide phone
    // every design px renders at roughly 0.49 CSS px. The story text used to be
    // 18 design px — about 8.8 CSS px, half the readable minimum. 34 design px
    // lands at ~16.6 CSS px. The speaker name stays a step above it.
    this.nameText = this.add
      .text(0, 0, '', {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '38px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setDepth(1001);

    this.lineText = this.add
      .text(0, 0, '', {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '34px',
        color: '#eeeeee',
      })
      .setDepth(1001);

    this.promptText = this.add
      .text(0, 0, 'Tap or press SPACE to continue', {
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '24px',
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

    // Phaser never calls a Scene subclass's shutdown() on its own. Without this the
    // resize listener above survives every conversation and piles up on the global
    // Scale Manager.
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.shutdown, this);
  }

  private drawChrome(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    // Full-screen darkening layer.
    this.overlayGraphics.clear();
    this.overlayGraphics.fillStyle(0x000000, 0.6);
    this.overlayGraphics.fillRect(0, 0, width, height);

    // Rounded dialogue box pinned to the bottom of the viewport. It is wider
    // and taller than it used to be because the story text now renders at a
    // size a child can actually read on a phone.
    const padding = 26;
    const nameGap = 14;
    const promptGap = 16;
    const bottomPadding = 18;

    const boxWidth = Math.min(width * 0.92, 960);
    this.lineText.setWordWrapWidth(boxWidth - padding * 2);

    // Size the box to the tallest line in this conversation rather than a fixed
    // 140px, so a long line is never clipped — and measure it once up front so
    // the box does not resize under the reader while a line types itself out.
    const nameHeight = this.nameText.height;
    const bodyHeight = this.measureTallestLine();
    const boxHeight =
      padding +
      nameHeight +
      nameGap +
      bodyHeight +
      promptGap +
      this.promptText.height +
      bottomPadding;

    const boxX = (width - boxWidth) / 2;
    const boxY = Math.max(16, height - boxHeight - 32);

    this.boxGraphics.clear();
    this.boxGraphics.fillStyle(0x1a2a3a, 0.96);
    this.boxGraphics.fillRoundedRect(boxX, boxY, boxWidth, boxHeight, 16);

    const textX = boxX + padding;
    const textY = boxY + padding;

    this.nameText.setPosition(textX, textY);
    this.lineText.setPosition(textX, textY + nameHeight + nameGap);
    this.promptText.setPosition(width / 2, boxY + boxHeight - bottomPadding);
  }

  /**
   * The tallest wrapped height across every line in this conversation, measured
   * with the live Text object so it reflects the real font metrics.
   */
  private measureTallestLine(): number {
    if (this.lines.length === 0) {
      return this.lineText.height;
    }

    const restore = this.lineText.text;
    let tallest = 0;
    for (const line of this.lines) {
      this.lineText.setText(line.text);
      tallest = Math.max(tallest, this.lineText.height);
    }
    this.lineText.setText(restore);
    return tallest;
  }

  private displayCurrentLine(): void {
    const line = this.lines[this.currentIndex];
    if (!line) return;

    this.nameText.setText(line.speaker);
    this.startTyping(line.text);
  }

  private startTyping(fullText: string): void {
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

  private advance(): void {
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

  private setupInput(): void {
    this.input.on('pointerdown', this.advance, this);

    const keyboard = this.input.keyboard;
    if (keyboard) {
      keyboard.on('keydown-SPACE', this.advance, this);
    }
  }

  private setupPromptPulse(): void {
    this.tweens.add({
      targets: this.promptText,
      alpha: 0.35,
      duration: 800,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });
  }

  private clearTypingTimer(): void {
    if (this.typingTimer) {
      this.time.removeEvent(this.typingTimer);
      this.typingTimer = undefined;
    }
  }

  private shutdown(): void {
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
