import Phaser from 'phaser';

/**
 * MissionPanel
 *
 * A small top-right objective panel inspired by Om Nom Run's
 * MissionPanelSmall / MissionTypes UI. It shows a level goal and
 * celebrates when the goal is met.
 *
 * The panel stays pinned to the viewport (scrollFactor 0) and repositions
 * itself on resize so it looks correct on desktop and mobile.
 */

export class MissionPanel {
  private objectiveText: Phaser.GameObjects.Text;
  private checkIcon: Phaser.GameObjects.Text;
  private bg: Phaser.GameObjects.Graphics;
  private completed = false;
  private destroyHandlers: (() => void)[] = [];
  private scene: Phaser.Scene;
  private objective: string;
  private accentColor: number;

  constructor(
    scene: Phaser.Scene,
    objective: string,
    accentColor = 0xffe600
  ) {
    this.scene = scene;
    this.objective = objective;
    this.accentColor = accentColor;
    this.bg = scene.add.graphics();
    // The canvas is a fixed 800x600 scaled with FIT, so on a 390px-wide phone
    // every design px renders at roughly 0.49 CSS px. The objective used to be
    // 14 design px — about 6.8 CSS px. 32 design px lands at ~15.6.
    this.checkIcon = scene.add
      .text(0, 0, '✓', {
        fontSize: '30px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.objectiveText = scene.add
      .text(0, 0, objective, {
        fontSize: '32px',
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'right',
      })
      .setOrigin(1, 0);

    this.updatePositions();
    [this.bg, this.checkIcon, this.objectiveText].forEach((obj) => {
      obj.setDepth(100).setScrollFactor(0);
    });

    const resizeCb = this.updatePositions.bind(this);
    scene.scale.on('resize', resizeCb);
    this.destroyHandlers.push(() => scene.scale.off('resize', resizeCb));
  }

  setObjective(value: string): void {
    this.objective = value;
    this.objectiveText.setText(value);
    this.updatePositions();
  }

  complete(): void {
    if (this.completed) {
      return;
    }
    this.completed = true;
    this.objectiveText.setColor('#8aff8a');
    this.checkIcon.setVisible(true);
    this.updatePositions();

    this.scene.tweens.add({
      targets: [this.bg, this.objectiveText, this.checkIcon],
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 120,
      yoyo: true,
    });
  }

  destroy(): void {
    for (const fn of this.destroyHandlers) fn();
    this.bg.destroy();
    this.checkIcon.destroy();
    this.objectiveText.destroy();
  }

  private updatePositions(): void {
    const pad = 12;
    const width = this.scene.scale.width;
    // At the larger, readable font a one-line objective would run most of the
    // way across the canvas, so it wraps instead and the panel grows downwards.
    this.objectiveText.setWordWrapWidth(Math.min(320, Math.max(160, width * 0.44)));

    const textWidth = Math.max(80, this.objectiveText.width);
    const panelWidth = textWidth + pad * 2 + (this.completed ? 42 : 0);
    const panelHeight = this.objectiveText.height + pad * 2;
    const originX = width - 14 - panelWidth;
    // Below GameScene's top-right pause button (56px plus its enlarged hit
    // zone, ~84px of vertical reach) — at this size the panel would cover it.
    const originY = 96;

    this.bg.clear();
    // Drop shadow.
    this.bg.fillStyle(0x000000, 0.25);
    this.bg.fillRoundedRect(originX + 4, originY + 4, panelWidth, panelHeight, 10);
    // Backing.
    this.bg.fillStyle(0x0b1d2e, 0.85);
    this.bg.fillRoundedRect(originX, originY, panelWidth, panelHeight, 10);
    // Accent border.
    this.bg.lineStyle(2, this.accentColor, 0.8);
    this.bg.strokeRoundedRect(originX, originY, panelWidth, panelHeight, 10);

    this.objectiveText.setPosition(originX + panelWidth - pad, originY + pad);

    if (this.completed) {
      this.checkIcon.setPosition(originX + pad + 15, originY + panelHeight / 2);
    }
  }
}
