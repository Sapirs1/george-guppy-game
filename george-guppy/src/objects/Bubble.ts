// Phaser is used at RUNTIME here (instanceof / class extends), not just as a
// type. Without this import it resolved only via a window.Phaser global that the
// classic-script vendor build happens to set — so the ESM/importmap build threw
// "Phaser is not defined".
import Phaser from 'phaser';

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
          // Each world's bubbles spell a short phrase in George's voice, so the
          // words have to be readable. At 12px they rendered around 5.8 CSS px
          // on a phone — grey smudges. 26 design px lands at roughly 12.7.
          fontSize: '26px',
          color: '#ffffff',
          fontStyle: 'bold',
          stroke: '#0b1d2e',
          strokeThickness: 5,
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
