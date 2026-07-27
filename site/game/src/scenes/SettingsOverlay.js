import Phaser from 'phaser';

/**
 * SettingsOverlay
 *
 * A small settings modal inspired by Om Nom Run's SettingsPopup.
 * Currently offers toggles for music and SFX placeholders, plus a
 * Return to Menu / Close option. The actual mute state is stored on
 * a simple module-level flag so gameplay scenes can read it later.
 */

export let musicEnabled = true;
export let sfxEnabled = true;

                               
                       
 

export class SettingsOverlay extends Phaser.Scene {
          returnScene = 'Menu';
          cardGraphics                              ;
          overlayGraphics                              ;
          toggles                                                                                       = [];

  constructor() {
    super({ key: 'SettingsOverlay' });
  }

  init(data                     )       {
    this.returnScene = data?.returnScene ?? 'Menu';
  }

  create()       {
    const { width, height } = this.scale;

    this.overlayGraphics = this.add.graphics();
    this.overlayGraphics.fillStyle(0x000000, 0.55);
    this.overlayGraphics.fillRect(0, 0, width, height);
    this.overlayGraphics.setScrollFactor(0).setDepth(2000);

    const cardWidth = Math.min(360, width * 0.82);
    const cardHeight = 300;
    const cardX = (width - cardWidth) / 2;
    const cardY = (height - cardHeight) / 2;

    this.cardGraphics = this.add.graphics();
    this.drawCard(cardX, cardY, cardWidth, cardHeight);
    this.cardGraphics.setScrollFactor(0).setDepth(2001);

    const title = this.add
      .text(width / 2, cardY + 36, 'Settings', {
        fontSize: '34px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#0b1d2e',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2002);

    this.addToggle(
      width / 2,
      cardY + 96,
      'Music',
      musicEnabled,
      (v) => {
        musicEnabled = v;
      }
    );

    this.addToggle(
      width / 2,
      cardY + 158,
      'Sound Effects',
      sfxEnabled,
      (v) => {
        sfxEnabled = v;
      }
    );

    this.addButton(
      width / 2,
      cardY + 232,
      this.returnScene === 'GameScene' ? 'Resume' : 'Menu',
      0x3498db,
      () => {
        this.scene.stop();
        if (this.returnScene === 'GameScene') {
          this.scene.resume('GameScene');
        } else {
          this.scene.start('Menu');
        }
      }
    );
  }

          addToggle(
    centerX        ,
    y        ,
    label        ,
    initial         ,
    onChange                          
  )       {
    const labelText = this.add
      .text(centerX - 70, y, label, {
        fontSize: '20px',
        color: '#d0efff',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0.5)
      .setScrollFactor(0)
      .setDepth(2002);

    const trackWidth = 64;
    const trackHeight = 30;
    const trackX = centerX + 20;
    const track = this.add.graphics();
    track.setScrollFactor(0).setDepth(2002);

    const knobRadius = 12;
    let state = initial;

    const draw = () => {
      track.clear();
      track.fillStyle(state ? 0x2ecc71 : 0x7f8c8d);
      track.fillRoundedRect(trackX, y - trackHeight / 2, trackWidth, trackHeight, trackHeight / 2);
      track.lineStyle(2, 0xffffff, 0.5);
      track.strokeRoundedRect(trackX, y - trackHeight / 2, trackWidth, trackHeight, trackHeight / 2);
      track.fillStyle(0xffffff);
      const knobX = state ? trackX + trackWidth - knobRadius - 4 : trackX + knobRadius + 4;
      track.fillCircle(knobX, y, knobRadius);
    };

    draw();

    const hit = this.add
      .zone(trackX + trackWidth / 2, y, trackWidth + 20, trackHeight + 20)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0)
      .setDepth(2003);

    hit.on('pointerdown', () => {
      state = !state;
      onChange(state);
      draw();
    });

    this.toggles.push({ label: labelText, state: initial, onChange });
  }

          addButton(
    centerX        ,
    y        ,
    label        ,
    color        ,
    onClick            
  )       {
    const w = 200;
    const h = 50;

    const bg = this.add.graphics();
    bg.fillStyle(color);
    bg.fillRoundedRect(centerX - w / 2, y - h / 2, w, h, 14);
    bg.lineStyle(3, 0xffffff, 0.5);
    bg.strokeRoundedRect(centerX - w / 2, y - h / 2, w, h, 14);
    bg.setScrollFactor(0).setDepth(2002);

    const text = this.add
      .text(centerX, y, label, {
        fontSize: '24px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2003);

    const zone = this.add
      .zone(centerX, y, w, h)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setScrollFactor(0)
      .setDepth(2004);

    zone.on('pointerdown', onClick);
    zone.on('pointerover', () => text.setScale(1.05));
    zone.on('pointerout', () => text.setScale(1));
  }

          drawCard(x        , y        , w        , h        )       {
    this.cardGraphics.clear();
    this.cardGraphics.fillStyle(0x000000, 0.25);
    this.cardGraphics.fillRoundedRect(x + 8, y + 8, w, h, 24);
    this.cardGraphics.fillStyle(0x1a3a52, 0.98);
    this.cardGraphics.fillRoundedRect(x, y, w, h, 24);
    this.cardGraphics.lineStyle(4, 0x62c4f5, 0.8);
    this.cardGraphics.strokeRoundedRect(x, y, w, h, 24);
  }
}
