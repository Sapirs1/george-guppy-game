import Phaser from 'phaser';
import { DialogueOverlay } from './DialogueOverlay';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  preload(): void {
    this.createGeorgeTexture();
    this.createBubbleTexture();
    this.createNpcSnailTexture();
    this.createNpcSpongeTexture();
    this.createNpcFishTexture();
    this.createNpcFrogTexture();
    this.createWallTexture();
    this.createPlantTexture();
    this.createDrainTexture();
    this.createBackgroundTexture('background_tank', 0x9fdcf0, 0x2f7fb6);
    this.createBackgroundTexture('background_barrel', 0xffe0b2, 0xd48845);
    this.createBackgroundTexture('background_sink', 0xe0e0e0, 0x8a8a8a);
    this.createBackgroundTexture('bg_strange_tank', 0x9fdcf0, 0x2f7fb6);
    this.createBackgroundTexture('bg_rain_barrel', 0xffe0b2, 0xd48845);
    this.createBackgroundTexture('bg_kitchen_sink', 0xe0e0e0, 0x8a8a8a);
    this.createBackgroundTexture('bg_homecoming', 0xa8f0c8, 0x3b82a6);
  }

  create(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    const background = this.add.graphics();
    background.fillStyle(0x0b1d2e);
    background.fillRect(0, 0, width, height);

    const barWidth = 320;
    const barHeight = 22;
    const barX = width / 2 - barWidth / 2;
    const barY = height / 2;

    // Track fill with a lively animated stripe.
    const barBackground = this.add.graphics();
    barBackground.fillStyle(0x1f3a52);
    barBackground.fillRoundedRect(barX, barY, barWidth, barHeight, 11);
    barBackground.lineStyle(2, 0x3c6e8f, 1);
    barBackground.strokeRoundedRect(barX, barY, barWidth, barHeight, 11);

    const bar = this.add.graphics();
    bar.fillStyle(0x62c4f5);
    bar.fillRoundedRect(barX, barY, barWidth * 0.6, barHeight, 11);

    // Simulate the remaining fill so the bar feels like real loading.
    this.tweens.add({
      targets: {},
      duration: 450,
      onUpdate: (tween: Phaser.Tweens.Tween) => {
        const progress = 0.6 + tween.getValue() * 0.4;
        bar.clear();
        bar.fillStyle(0x62c4f5);
        bar.fillRoundedRect(barX, barY, barWidth * progress, barHeight, 11);
      },
    });

    this.add
      .text(width / 2, barY - 38, 'George is waking up…', {
        fontSize: '22px',
        color: '#a8d8f0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, barY + 36, 'Book 1: The Water Has Opinions', {
        fontSize: '16px',
        color: '#74a7c4',
      })
      .setOrigin(0.5);

    // Register the overlay scene without starting it so GameScene can launch it on demand.
    this.scene.add('DialogueOverlay', DialogueOverlay);

    this.time.delayedCall(900, () => {
      this.scene.start('Menu');
    });
  }

  private createGeorgeTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    g.fillStyle(0xff8c42);
    g.fillEllipse(34, 20, 38, 26);

    g.fillStyle(0xffa94d);
    g.fillEllipse(26, 36, 16, 7);
    g.fillEllipse(26, 4, 16, 7);

    g.fillStyle(0xff8c42);
    g.beginPath();
    g.moveTo(18, 20);
    g.lineTo(4, 8);
    g.lineTo(4, 32);
    g.closePath();
    g.fillPath();

    g.fillStyle(0xffffff);
    g.fillCircle(44, 16, 8);
    g.fillStyle(0x222222);
    g.fillCircle(46, 16, 3.5);

    g.lineStyle(3, 0x5a2d0c);
    g.beginPath();
    g.moveTo(38, 8);
    g.lineTo(52, 14);
    g.strokePath();

    g.generateTexture('george', 64, 40);
  }

  private createBubbleTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    g.fillStyle(0xbfdfff, 0.35);
    g.fillCircle(18, 18, 16);

    g.fillStyle(0xffffff, 0.55);
    g.fillCircle(12, 12, 4);

    g.lineStyle(2, 0xffffff, 0.45);
    g.strokeCircle(18, 18, 16);

    g.generateTexture('bubble', 36, 36);
  }

  private createNpcSnailTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    g.fillStyle(0xc2b280);
    g.fillEllipse(30, 26, 28, 12);

    g.fillStyle(0x6b8e6b);
    g.fillCircle(18, 18, 16);

    g.lineStyle(2, 0x3a4a3a);
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.arc(18, 18, 5 + i * 4, Math.PI / 4, Math.PI * 2 + Math.PI / 4 + i * 0.4, false);
      g.strokePath();
    }

    g.lineStyle(2, 0x8b7355);
    g.beginPath();
    g.moveTo(38, 22);
    g.lineTo(44, 14);
    g.moveTo(38, 26);
    g.lineTo(44, 30);
    g.strokePath();

    g.generateTexture('npc_snail', 52, 36);
    // Alias used by level data (kept in sync with npc_snail art).
    g.generateTexture('snail', 52, 36);
  }

  private createNpcSpongeTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    g.fillStyle(0xffd700);
    g.fillRoundedRect(0, 0, 48, 56, 8);

    g.fillStyle(0xbdb76b, 0.75);
    g.fillCircle(14, 18, 5);
    g.fillCircle(34, 32, 6);
    g.fillCircle(20, 42, 4);
    g.fillCircle(38, 14, 3);

    g.lineStyle(3, 0xcdb85f);
    g.strokeRoundedRect(0, 0, 48, 56, 8);

    g.generateTexture('npc_sponge', 48, 56);
    // Alias used by level data (kept in sync with npc_sponge art).
    g.generateTexture('sponge', 48, 56);
  }

  private createNpcFishTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    g.fillStyle(0xff6f61);
    g.fillEllipse(25, 18, 34, 20);

    g.fillStyle(0xff6f61);
    g.beginPath();
    g.moveTo(10, 18);
    g.lineTo(2, 8);
    g.lineTo(2, 28);
    g.closePath();
    g.fillPath();

    g.fillStyle(0xffffff);
    g.fillCircle(31, 14, 5);
    g.fillStyle(0x111111);
    g.fillCircle(33, 14, 2);

    g.generateTexture('npc_fish', 50, 38);
  }

  private createWallTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    g.fillStyle(0x35546e);
    g.fillRoundedRect(0, 0, 40, 40, 10);

    g.lineStyle(2, 0x5b8bad);
    g.strokeRoundedRect(0, 0, 40, 40, 10);

    g.generateTexture('wall', 40, 40);
  }

  private strokeQuadratic(
    g: Phaser.GameObjects.Graphics,
    x0: number,
    y0: number,
    cx: number,
    cy: number,
    x1: number,
    y1: number,
    points = 12
  ): void {
    const curve = new Phaser.Curves.QuadraticBezier(
      new Phaser.Math.Vector2(x0, y0),
      new Phaser.Math.Vector2(cx, cy),
      new Phaser.Math.Vector2(x1, y1)
    );
    curve.draw(g, points);
  }

  private createPlantTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    g.lineStyle(5, 0x2e8b57);
    this.strokeQuadratic(g, 20, 70, 6, 50, 22, 30, 12);
    this.strokeQuadratic(g, 22, 30, 34, 10, 20, 0, 12);

    g.fillStyle(0x3cb371);
    g.fillEllipse(20, 18, 12, 6);
    g.fillEllipse(24, 40, 8, 5);
    g.fillEllipse(16, 52, 8, 5);

    g.generateTexture('plant', 40, 72);
  }

  private createDrainTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    g.fillStyle(0x1c1c1c);
    g.fillCircle(24, 24, 24);

    g.lineStyle(3, 0x444444);
    for (let i = 0; i < 4; i++) {
      g.beginPath();
      g.arc(24, 24, 6 + i * 5, 0, Math.PI * 1.5);
      g.strokePath();
    }

    g.lineStyle(2, 0x0f0f0f);
    g.strokeCircle(24, 24, 14);

    g.generateTexture('drain', 48, 48);
  }

  private createNpcFrogTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    g.fillStyle(0x66bb44);
    g.fillEllipse(24, 34, 40, 16);

    g.fillStyle(0x88dd66);
    g.fillEllipse(24, 28, 24, 10);

    g.fillStyle(0x99ee77);
    g.fillCircle(18, 12, 7);
    g.fillCircle(30, 12, 7);

    g.fillStyle(0x111111);
    g.fillCircle(19, 12, 2.5);
    g.fillCircle(31, 12, 2.5);

    g.lineStyle(2, 0x448833);
    g.beginPath();
    g.moveTo(20, 36);
    g.lineTo(12, 42);
    g.moveTo(28, 36);
    g.lineTo(36, 42);
    g.strokePath();

    g.generateTexture('frog', 48, 48);
  }

  private createBackgroundTexture(key: string, top: number, bottom: number): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const color1 = Phaser.Display.Color.ValueToColor(top);
    const color2 = Phaser.Display.Color.ValueToColor(bottom);

    for (let y = 0; y <= 511; y++) {
      const interpolated = Phaser.Display.Color.Interpolate.ColorWithColor(color1, color2, 511, y);
      const c = Phaser.Display.Color.GetColor(interpolated.r, interpolated.g, interpolated.b);
      g.fillStyle(c);
      g.fillRect(0, y, 512, 1);
    }

    g.fillStyle(0xffffff, 0.04);
    g.fillRoundedRect(32, 32, 448, 448, 64);

    g.generateTexture(key, 512, 512);
  }
}
