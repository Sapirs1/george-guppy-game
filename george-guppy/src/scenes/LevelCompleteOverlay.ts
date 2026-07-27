import Phaser from 'phaser';
import { levels } from '../data/levels.js';

/**
 * LevelCompleteOverlay
 *
 * Shown when a level is finished. Displays a circular/confetti-like burst,
 * the level name, number of bubbles collected, and a large "Next Level" CTA
 * (or "Home" for the final level). Styled after mobile reward popups with
 * a bright card and chunky button.
 *
 * GameScene launches it with:
 *   this.scene.launch('LevelCompleteOverlay', { levelIndex, bubblesCollected, totalBubbles });
 */

interface LevelCompleteData {
  levelIndex?: number;
  bubblesCollected?: number;
  totalBubbles?: number;
}

export class LevelCompleteOverlay extends Phaser.Scene {
  private levelIndex = 0;
  private bubblesCollected = 0;
  private totalBubbles = 0;

  private overlay!: Phaser.GameObjects.Graphics;
  private card!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'LevelCompleteOverlay' });
  }

  init(data: LevelCompleteData): void {
    this.levelIndex =
      typeof data?.levelIndex === 'number' && Number.isFinite(data.levelIndex)
        ? data.levelIndex
        : 0;
    this.bubblesCollected =
      typeof data?.bubblesCollected === 'number' && Number.isFinite(data.bubblesCollected)
        ? data.bubblesCollected
        : 0;
    this.totalBubbles =
      typeof data?.totalBubbles === 'number' && Number.isFinite(data.totalBubbles)
        ? data.totalBubbles
        : 0;
  }

  create(): void {
    const { width, height } = this.scale;
    const isLastLevel = this.levelIndex >= levels.length - 1;
    const levelName = levels[this.levelIndex]?.name ?? `Level ${this.levelIndex + 1}`;

    // Darkened full-screen backdrop.
    this.overlay = this.add.graphics();
    this.overlay.fillStyle(0x000000, 0.5);
    this.overlay.fillRect(0, 0, width, height);
    this.overlay.setScrollFactor(0).setDepth(1000);

    const cardWidth = Math.min(420, width * 0.85);
    // The finale card carries a second button (the book prompt), so it needs
    // the extra height.
    const cardHeight = isLastLevel ? 440 : 360;
    const cardX = (width - cardWidth) / 2;
    const cardY = (height - cardHeight) / 2;

    this.card = this.add.graphics();
    this.drawCard(cardX, cardY, cardWidth, cardHeight);
    this.card.setScrollFactor(0).setDepth(1001);

    const centerX = width / 2;

    this.add
      .text(centerX, cardY + 44, isLastLevel ? 'You got George home!' : 'Level Complete!', {
        fontSize: isLastLevel ? '30px' : '40px',
        color: '#ffe600',
        fontStyle: 'bold',
        stroke: '#0b1d2e',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1002);

    this.add
      .text(centerX, cardY + 94, levelName, {
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1002);

    // Bubble collection stat with a little icon circle.
    const statY = cardY + 156;
    const bubbleIcon = this.add.graphics();
    bubbleIcon.fillStyle(0x62c4f5, 1);
    bubbleIcon.fillCircle(centerX - 90, statY, 18);
    bubbleIcon.setScrollFactor(0).setDepth(1002);

    this.add
      .text(centerX - 90, statY - 1, '●', {
        fontSize: '18px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1003);

    this.add
      .text(centerX - 50, statY, `Bubbles: ${this.bubblesCollected} / ${this.totalBubbles}`, {
        fontSize: '22px',
        color: '#d0efff',
      })
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(1002);

    // Confetti / bubble burst behind the button.
    this.spawnBurst(centerX, cardY + 240);

    // Big CTA.
    const buttonWidth = 240;
    const buttonHeight = 64;
    const buttonY = cardY + 264;
    const buttonColor = isLastLevel ? 0xffb300 : 0x2ecc71;
    const buttonLabel = isLastLevel ? 'Read Book 1' : 'Next Level';

    // On the finale, point children (and the grown-up next to them) at the book
    // the game is a companion to. Home is still one tap away, just below.
    if (isLastLevel) {
      this.add
        .text(centerX, cardY + 206, 'George is even crankier in print.', {
          fontSize: '18px',
          color: '#d0efff',
          align: 'center',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(1002);
    }

    const ctaBg = this.add.graphics();
    ctaBg.fillStyle(buttonColor, 1);
    ctaBg.fillRoundedRect(centerX - buttonWidth / 2, buttonY, buttonWidth, buttonHeight, 20);
    ctaBg.lineStyle(4, 0xffffff, 0.5);
    ctaBg.strokeRoundedRect(centerX - buttonWidth / 2, buttonY, buttonWidth, buttonHeight, 20);
    ctaBg.setScrollFactor(0).setDepth(1002);

    const ctaText = this.add
      .text(centerX, buttonY + buttonHeight / 2, buttonLabel, {
        fontSize: '30px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1003);

    const zone = this.add
      .zone(centerX, buttonY + buttonHeight / 2, buttonWidth, buttonHeight)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0)
      .setDepth(1004);

    zone.on('pointerdown', () => {
      if (isLastLevel) {
        // Deliberately does NOT tear the game down — the child keeps their
        // finished game behind the new tab.
        this.openBookPage();
        return;
      }
      this.scene.stop('GameScene');
      this.scene.stop();
      this.scene.start('GameScene', { levelIndex: this.levelIndex + 1 });
    });

    zone.on('pointerover', () => ctaText.setScale(1.05));
    zone.on('pointerout', () => ctaText.setScale(1));

    if (isLastLevel) {
      this.buildHomeButton(centerX, buttonY + 82);
    }
  }

  /**
   * Opens the Book 1 page in a new tab. The game usually runs inside an iframe
   * on the site, so a new tab is used rather than navigating the frame — the
   * child does not lose the game they just finished. Wrapped because a popup
   * blocker (or an unusual embedding) can make this throw.
   */
  private openBookPage(): void {
    try {
      window.open('/start', '_blank', 'noopener');
    } catch {
      // Nothing useful to do — the Home button below is still available.
    }
  }

  private buildHomeButton(centerX: number, y: number): void {
    const w = 200;
    const h = 52;

    const bg = this.add.graphics();
    bg.fillStyle(0x3498db, 1);
    bg.fillRoundedRect(centerX - w / 2, y, w, h, 18);
    bg.lineStyle(3, 0xffffff, 0.45);
    bg.strokeRoundedRect(centerX - w / 2, y, w, h, 18);
    bg.setScrollFactor(0).setDepth(1002);

    const label = this.add
      .text(centerX, y + h / 2, 'Home', {
        fontSize: '26px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1003);

    const zone = this.add
      .zone(centerX, y + h / 2, w, h)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0)
      .setDepth(1004);

    zone.on('pointerdown', () => {
      this.scene.stop('GameScene');
      this.scene.stop();
      this.scene.start('Menu');
    });

    zone.on('pointerover', () => label.setScale(1.05));
    zone.on('pointerout', () => label.setScale(1));
  }

  private drawCard(x: number, y: number, w: number, h: number): void {
    this.card.clear();
    // Drop shadow.
    this.card.fillStyle(0x000000, 0.25);
    this.card.fillRoundedRect(x + 8, y + 8, w, h, 28);
    // Card background.
    this.card.fillStyle(0x15405c, 0.98);
    this.card.fillRoundedRect(x, y, w, h, 28);
    // Accent border.
    this.card.lineStyle(5, 0xffe600, 0.9);
    this.card.strokeRoundedRect(x, y, w, h, 28);
  }

  private spawnBurst(x: number, y: number): void {
    const emitter = this.add.particles(0, 0, 'bubble', {
      x,
      y,
      speed: { min: 60, max: 180 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.9, end: 0 },
      lifespan: 500,
      quantity: 18,
      emitting: false,
      tint: [0x62c4f5, 0xffe600, 0xffffff],
    });
    emitter.setScrollFactor(0).setDepth(1000);
    emitter.explode(18, x, y);
    this.time.delayedCall(550, () => emitter.destroy());
  }
}
