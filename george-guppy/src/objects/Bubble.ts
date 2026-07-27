export class Bubble extends Phaser.Physics.Arcade.Image {
  readonly textKey?: string;
  private bobTween?: Phaser.Tweens.Tween;
  private label?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number, textKey?: string) {
    super(scene, x, y, 'bubble');
    this.textKey = textKey;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);

    this.bobTween = scene.tweens.add({
      targets: this,
      y: y - 6,
      duration: 900,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
    });

    if (textKey) {
      this.label = scene.add.text(
        x,
        y - this.displayHeight / 2 - 4,
        textKey,
        {
          fontSize: '12px',
          color: '#ffffff',
          stroke: '#0b1d2e',
          strokeThickness: 3,
        }
      );
      this.label.setOrigin(0.5, 1);
    }
  }

  preUpdate(_time: number, _delta: number): void {
    // NOTE: Phaser.Physics.Arcade.Image has NO preUpdate on its prototype
    // (only Sprite does), so calling super.preUpdate() here throws every frame.
    if (this.label) {
      this.label.setPosition(this.x, this.y - this.displayHeight / 2 - 4);
    }
  }

  destroy(fromScene?: boolean): void {
    this.bobTween = undefined;
    this.scene?.tweens?.killTweensOf(this);
    this.label?.destroy();
    this.label = undefined;
    super.destroy(fromScene);
  }

  pop(): Promise<void> {
    this.bobTween?.stop();
    this.bobTween = undefined;
    this.scene?.tweens?.killTweensOf(this);

    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (body) {
      body.setVelocity(0, 0);
    }

    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this,
        scaleX: 1.5,
        scaleY: 1.5,
        alpha: 0,
        duration: 180,
        ease: 'Power1',
        onComplete: () => {
          resolve();
          this.destroy();
        },
      });
    });
  }
}
