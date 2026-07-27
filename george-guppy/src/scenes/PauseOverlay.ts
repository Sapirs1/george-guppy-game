import Phaser from 'phaser';

/**
 * PauseOverlay
 *
 * A centered modal overlay that pauses the active GameScene and presents
 * Resume, Restart, and Menu options. Styled after polished mobile menu
 * popups: rounded card, soft shadow, large tap targets, and a clear title.
 *
 * GameScene launches it with:
 *   this.scene.launch('PauseOverlay', { levelIndex: this.levelIndex });
 *   this.scene.pause();
 */

interface PauseOverlayData {
  levelIndex?: number;
}

export class PauseOverlay extends Phaser.Scene {
  private levelIndex = 0;

  private overlay!: Phaser.GameObjects.Graphics;
  private card!: Phaser.GameObjects.Graphics;
  private buttons: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: 'PauseOverlay' });
  }

  init(data: PauseOverlayData): void {
    this.levelIndex =
      typeof data?.levelIndex === 'number' && Number.isFinite(data.levelIndex)
        ? data.levelIndex
        : 0;
  }

  create(): void {
    const { width, height } = this.scale;

    // Semi-transparent dark backdrop.
    this.overlay = this.add.graphics();
    this.overlay.fillStyle(0x000000, 0.55);
    this.overlay.fillRect(0, 0, width, height);
    this.overlay.setScrollFactor(0);
    this.overlay.setDepth(1000);

    // Centered card dimensions. The card is taller than it used to be because
    // the four buttons now carry tap targets that clear the 44 CSS px minimum
    // once the fixed 800x600 canvas is scaled down to a phone (~0.49x).
    const cardWidth = Math.min(360, width * 0.8);
    const cardHeight = 492;
    const cardX = (width - cardWidth) / 2;
    const cardY = (height - cardHeight) / 2;

    this.card = this.add.graphics();
    this.drawCard(cardX, cardY, cardWidth, cardHeight);
    this.card.setScrollFactor(0);
    this.card.setDepth(1001);

    const title = this.add
      .text(width / 2, cardY + 44, 'Paused', {
        fontSize: '40px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#0b1d2e',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(1002);

    const centerX = width / 2;
    const buttonWidth = 220;
    const buttonHeight = 76;
    const buttonRadius = 18;
    // The hit zone is taller than the drawn button: 94 design px is ~45.8 CSS
    // px on a 390px-wide phone, over the 44px Apple HIG minimum. The 96px gap
    // below keeps neighbouring zones 2px apart so they can never overlap.
    const buttonHitHeight = 94;

    const makeButton = (label: string, y: number, color: number, onClick: () => void) => {
      const bg = this.add.graphics();
      bg.fillStyle(color, 1);
      bg.fillRoundedRect(centerX - buttonWidth / 2, y, buttonWidth, buttonHeight, buttonRadius);
      bg.lineStyle(3, 0xffffff, 0.5);
      bg.strokeRoundedRect(centerX - buttonWidth / 2, y, buttonWidth, buttonHeight, buttonRadius);
      bg.setScrollFactor(0).setDepth(1002);

      const text = this.add
        .text(centerX, y + buttonHeight / 2, label, {
          fontSize: '30px',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(1003);

      const zone = this.add
        .zone(centerX, y + buttonHeight / 2, buttonWidth, buttonHitHeight)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true })
        .setScrollFactor(0)
        .setDepth(1004);

      zone.on('pointerdown', () => {
        onClick();
      });

      // Gentle scale pulse on hover (desktop) to invite clicks.
      zone.on('pointerover', () => {
        text.setScale(1.05);
      });
      zone.on('pointerout', () => {
        text.setScale(1);
      });

      this.buttons.push(text);
    };

    const baseY = cardY + 96;
    const gap = 96;

    makeButton('Resume', baseY, 0x2ecc71, () => {
      this.scene.stop();
      this.scene.resume('GameScene');
    });

    makeButton('Restart', baseY + gap, 0xf39c12, () => {
      this.scene.stop();
      this.scene.start('GameScene', { levelIndex: this.levelIndex });
    });

    makeButton('Settings', baseY + gap * 2, 0x3498db, () => {
      this.scene.stop();
      this.scene.launch('SettingsOverlay', { returnScene: 'GameScene' });
    });

    makeButton('Menu', baseY + gap * 3, 0xe74c3c, () => {
      this.scene.stop();
      this.scene.stop('GameScene');
      this.scene.start('Menu');
    });
  }

  private drawCard(x: number, y: number, w: number, h: number): void {
    this.card.clear();
    // Drop shadow.
    this.card.fillStyle(0x000000, 0.25);
    this.card.fillRoundedRect(x + 8, y + 8, w, h, 24);
    // Card background.
    this.card.fillStyle(0x1a3a52, 0.98);
    this.card.fillRoundedRect(x, y, w, h, 24);
    // Thick border.
    this.card.lineStyle(4, 0x62c4f5, 0.8);
    this.card.strokeRoundedRect(x, y, w, h, 24);
  }
}
