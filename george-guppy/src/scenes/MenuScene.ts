import Phaser from 'phaser';
import { SoundManager } from '../utils/SoundManager.js';

export class MenuScene extends Phaser.Scene {
  private soundManager!: SoundManager;

  constructor() {
    super({ key: 'Menu' });
  }

  create(): void {
    this.soundManager = new SoundManager(this);
    const { width, height } = this.scale;

    this.add
      .image(width / 2, height / 2, 'background_tank')
      .setDisplaySize(width, height)
      .setAlpha(0.65);

    // Decorative swimming George below the title card.
    this.add.sprite(width / 2, height / 2 + 110, 'george').setScale(1.7);

    // Title card with a subtle dark backing so it pops against the bubbles.
    const titleY = height / 2 - 130;
    const titleBg = this.add.graphics();
    titleBg.fillStyle(0x0b1d2e, 0.55);
    titleBg.fillRoundedRect(width / 2 - 260, titleY - 42, 520, 100, 20);

    this.add
      .text(width / 2, titleY, 'George the Cranky Guppy', {
        fontSize: '46px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#0b1d2e',
        strokeThickness: 10,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, titleY + 44, 'Book 1: The Water Has Opinions', {
        fontSize: '20px',
        color: '#a8d8f0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Big Om-Nom-Run-style start button.
    const btnWidth = 260;
    const btnHeight = 76;
    const btnX = width / 2 - btnWidth / 2;
    const btnY = height / 2 + 22;

    const buttonBg = this.add.graphics();
    buttonBg.fillStyle(0x22b14c);
    buttonBg.fillRoundedRect(btnX + 4, btnY + 4, btnWidth, btnHeight, 22);
    buttonBg.fillStyle(0x2ecc71);
    buttonBg.fillRoundedRect(btnX, btnY, btnWidth, btnHeight, 22);
    buttonBg.lineStyle(4, 0xffffff, 0.65);
    buttonBg.strokeRoundedRect(btnX, btnY, btnWidth, btnHeight, 22);

    const buttonText = this.add
      .text(width / 2, btnY + btnHeight / 2, 'PLAY', {
        fontSize: '38px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const buttonZone = this.add
      .zone(width / 2, btnY + btnHeight / 2, btnWidth, btnHeight)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    buttonZone.on('pointerdown', () => {
      this.soundManager.unlock();
      this.soundManager.startAmbience();

      buttonZone.disableInteractive();
      this.tweens.add({
        targets: buttonText,
        scale: 0.95,
        duration: 80,
        yoyo: true,
      });
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameScene', { levelIndex: 0 });
      });
    });

    buttonZone.on('pointerover', () => {
      buttonText.setScale(1.08);
      buttonBg.clear();
      buttonBg.fillStyle(0x22b14c);
      buttonBg.fillRoundedRect(btnX + 4, btnY + 4, btnWidth, btnHeight, 22);
      buttonBg.fillStyle(0x3ddb6b);
      buttonBg.fillRoundedRect(btnX, btnY, btnWidth, btnHeight, 22);
      buttonBg.lineStyle(4, 0xffffff, 0.8);
      buttonBg.strokeRoundedRect(btnX, btnY, btnWidth, btnHeight, 22);
    });

    buttonZone.on('pointerout', () => {
      buttonText.setScale(1);
      buttonBg.clear();
      buttonBg.fillStyle(0x22b14c);
      buttonBg.fillRoundedRect(btnX + 4, btnY + 4, btnWidth, btnHeight, 22);
      buttonBg.fillStyle(0x2ecc71);
      buttonBg.fillRoundedRect(btnX, btnY, btnWidth, btnHeight, 22);
      buttonBg.lineStyle(4, 0xffffff, 0.65);
      buttonBg.strokeRoundedRect(btnX, btnY, btnWidth, btnHeight, 22);
    });

    // Settings corner icon.
    const settingsZone = this.drawCornerIcon(width - 48, 48, '⚙', 0x9fdcf0);
    settingsZone.on('pointerdown', () => {
      this.scene.launch('SettingsOverlay', { returnScene: 'Menu' });
      this.scene.pause();
    });

    for (let i = 0; i < 22; i++) {
      const bubble = this.add.image(
        Phaser.Math.Between(0, width),
        height + Phaser.Math.Between(0, 200),
        'bubble'
      );
      bubble.setAlpha(Phaser.Math.FloatBetween(0.2, 0.55));
      bubble.setScale(Phaser.Math.FloatBetween(0.5, 1.2));

      this.tweens.add({
        targets: bubble,
        y: -60,
        x: `+=${Phaser.Math.Between(-60, 60)}`,
        duration: Phaser.Math.Between(4500, 9500),
        ease: 'Sine.easeInOut',
        repeat: -1,
        delay: Phaser.Math.Between(0, 5000),
      });
    }
  }

  private drawCornerIcon(x: number, y: number, label: string, color: number): Phaser.GameObjects.Zone {
    const g = this.add.graphics();
    g.fillStyle(0x0b1d2e, 0.6);
    g.fillCircle(x, y, 22);
    g.lineStyle(2, color, 0.7);
    g.strokeCircle(x, y, 22);
    this.add
      .text(x, y + 1, label, {
        fontSize: '22px',
        color: '#ffffff',
      })
      .setOrigin(0.5);

    const zone = this.add
      .zone(x, y, 48, 48)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => {
      g.clear();
      g.fillStyle(0x1a3a52, 0.75);
      g.fillCircle(x, y, 24);
      g.lineStyle(2, color, 1);
      g.strokeCircle(x, y, 24);
    });
    zone.on('pointerout', () => {
      g.clear();
      g.fillStyle(0x0b1d2e, 0.6);
      g.fillCircle(x, y, 22);
      g.lineStyle(2, color, 0.7);
      g.strokeCircle(x, y, 22);
    });
    return zone;
  }

  shutdown(): void {
    this.soundManager.stopAmbience();
  }
}
