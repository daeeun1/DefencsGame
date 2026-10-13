import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, FONT } from '../config.js';
import { createButton } from '../ui.js';

// 첫 화면: 게임 제목과 시작 버튼.
export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const centerX = GAME_WIDTH / 2;
    const height = this.scale.height; // 휴대폰마다 다른 실제 화면 높이
    const top = (height - GAME_HEIGHT) / 2; // 기준 높이보다 긴 만큼 전체를 가운데로 내린다

    this.add.text(centerX, top + 380, '👨‍🍳', { fontSize: '160px' }).setOrigin(0.5);

    this.add
      .text(centerX, top + 560, '주방 디펜스', {
        fontFamily: FONT,
        fontSize: '84px',
        fontStyle: 'bold',
        color: COLORS.text,
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, top + 650, '레일 위 주문을 막아라!', {
        fontFamily: FONT,
        fontSize: '32px',
        color: COLORS.gold,
      })
      .setOrigin(0.5);

    createButton(this, centerX, top + 900, 360, 110, '영업 시작', () => {
      this.scene.start('Game');
    });

    this.add
      .text(centerX, height - 60, 'v0.1 · 개발 중', {
        fontFamily: FONT,
        fontSize: '22px',
        color: '#b9a48f',
      })
      .setOrigin(0.5);
  }
}
