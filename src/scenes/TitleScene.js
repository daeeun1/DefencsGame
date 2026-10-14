import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, FONT } from '../config.js';
import { createButton } from '../ui.js';
import { getSave, totalStars } from '../save.js';
import { playMusic, isOn, toggle } from '../audio.js';

// 첫 화면: 게임 제목, 내 팁과 별, 영업 시작 / 가게 강화 / 요리사 도감 버튼.
export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const centerX = GAME_WIDTH / 2;
    const height = this.scale.height; // 휴대폰마다 다른 실제 화면 높이
    const top = (height - GAME_HEIGHT) / 2; // 기준 높이보다 긴 만큼 전체를 가운데로 내린다
    const save = getSave();
    playMusic('title');

    // 주방 로고: 가운데 샐러드, 양옆에 식칼과 프라이팬
    const logoY = top + 265;
    this.add.circle(centerX, logoY, 110, 0xf3e3c3).setStrokeStyle(8, 0xe85d3a);
    const salad = this.add.image(centerX, logoY + 5, 'order_salad').setScale(10);
    this.add.circle(centerX - 165, logoY + 40, 62, 0xb8b8b8).setStrokeStyle(6, 0x3d2a1e);
    this.add.circle(centerX + 165, logoY + 40, 62, 0xb8b8b8).setStrokeStyle(6, 0x3d2a1e);
    const knife = this.add.image(centerX - 165, logoY + 40, 'tool_cut').setScale(9).setAngle(-20);
    const pan = this.add.image(centerX + 165, logoY + 40, 'tool_grill').setScale(11).setAngle(10);
    this.tweens.add({ targets: salad, y: salad.y - 10, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.tweens.add({ targets: knife, angle: -30, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.tweens.add({ targets: pan, angle: 20, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: 200 });

    this.add
      .text(centerX, top + 460, '주방 디펜스', {
        fontFamily: FONT,
        fontSize: '84px',
        fontStyle: 'bold',
        color: COLORS.text,
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, top + 545, '레일 위 주문을 막아라!', {
        fontFamily: FONT,
        fontSize: '32px',
        color: COLORS.gold,
      })
      .setOrigin(0.5);

    // 내 재화: 팁과 별
    this.add
      .text(centerX, top + 640, `🪙 팁 ${save.tips}    ⭐ 별 ${totalStars()}`, {
        fontFamily: FONT,
        fontSize: '34px',
        fontStyle: 'bold',
        color: COLORS.text,
        backgroundColor: '#3d2a1e',
        padding: { x: 28, y: 12 },
      })
      .setOrigin(0.5);

    createButton(this, centerX, top + 800, 400, 110, '🔥 영업 시작', () => this.scene.start('KitchenSelect'), { fontSize: 38 });
    createButton(this, centerX, top + 930, 400, 100, '🏪 가게 강화', () => this.scene.start('Shop'));
    createButton(this, centerX, top + 1050, 400, 100, '📖 요리사 도감', () => this.scene.start('Codex'));

    // 설정: 효과음 / 음악 / 진동 켜고 끄기
    const options = [
      { key: 'sfx', on: '🔊 효과음', off: '🔇 효과음' },
      { key: 'music', on: '🎵 음악', off: '🚫 음악' },
      { key: 'vibration', on: '📳 진동', off: '📴 진동' },
    ];
    options.forEach((option, i) => {
      const label = () => `${isOn(option.key) ? option.on : option.off} ${isOn(option.key) ? '켬' : '끔'}`;
      const text = this.add
        .text(centerX + (i - 1) * 220, height - 120, label(), {
          fontFamily: FONT,
          fontSize: '24px',
          color: COLORS.text,
          backgroundColor: '#3d2a1e',
          padding: { x: 14, y: 10 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      text.on('pointerup', () => {
        toggle(option.key);
        text.setText(label());
        text.setAlpha(isOn(option.key) ? 1 : 0.6);
      });
      text.setAlpha(isOn(option.key) ? 1 : 0.6);
    });

    this.add
      .text(centerX, height - 50, 'v0.9 · 개발 중', {
        fontFamily: FONT,
        fontSize: '22px',
        color: '#b9a48f',
      })
      .setOrigin(0.5);
  }
}
