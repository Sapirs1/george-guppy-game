export class Bubble extends Phaser.Physics.Arcade.Image {
           textKey         ;
          bobTween                      ;
          label                          ;

  constructor(scene              , x        , y        , textKey         ) {
    super(scene, x, y, 'bubble');
    this.textKey = textKey;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    (this.body                              ).setAllowGravity(false);

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

  preUpdate(time        , delta        )       {
    super.preUpdate(time, delta);

    if (this.label) {
      this.label.setPosition(this.x, this.y - this.displayHeight / 2 - 4);
    }
  }

  destroy(fromScene          )       {
    this.bobTween = undefined;
    this.scene?.tweens?.killTweensOf(this);
    this.label?.destroy();
    this.label = undefined;
    super.destroy(fromScene);
  }

  pop()                {
    this.bobTween?.stop();
    this.bobTween = undefined;
    this.scene?.tweens?.killTweensOf(this);

    const body = this.body                                     ;
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
