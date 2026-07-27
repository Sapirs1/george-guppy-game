export class Player extends Phaser.Physics.Arcade.Sprite {
  targetX: number;
  targetY: number;
  speed = 180;
  isCranky = false;

  private readonly wiggleSpeed = 0.025;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'george');

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.targetX = x;
    this.targetY = y;

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setDrag(0.9);
    body.setDamping(true);
  }

  swimTo(pointerX: number, pointerY: number): void {
    this.targetX = pointerX;
    this.targetY = pointerY;
    this.setFlipX(pointerX < this.x);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);

    const body = this.body as Phaser.Physics.Arcade.Body;
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const distance = Math.hypot(dx, dy);

    if (distance < 6) {
      body.setVelocity(0, 0);
      this.setAngle(0);
      return;
    }

    const angle = Math.atan2(dy, dx);
    const vx = Math.cos(angle) * this.speed;
    const vy = Math.sin(angle) * this.speed;

    body.setVelocity(vx, vy);

    // Tail wiggle while swimming.
    const wiggle = Math.sin(time * this.wiggleSpeed) * 4;
    this.setAngle(Phaser.Math.RadToDeg(angle) + wiggle);
  }

  setCranky(value: boolean): void {
    this.isCranky = value;
    if (value) {
      this.setTint(0x88ccff);
    } else {
      this.clearTint();
    }
  }
}
