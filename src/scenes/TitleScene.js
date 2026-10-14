import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, FONT } from '../config.js';
import { createButton } from '../ui.js';
import { getSave, totalStars } from '../save.js';

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

    this.add.text(centerX, top + 290, '👨‍🍳', { fontSize: '150px' }).setOrigin(0.5);

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

    createButton(this, centerX, top + 800, 400, 110, '🔥 영업 시작', () => this.scene.start('Game'), { fontSize: 38 });
    createButton(this, centerX, top + 930, 400, 100, '🏪 가게 강화', () => this.scene.start('Shop'));
    createButton(this, centerX, top + 1050, 400, 100, '📖 요리사 도감', () => this.scene.start('Codex'));

    this.add
      .text(centerX, height - 50, 'v0.7 · 개발 중', {
        fontFamily: FONT,
        fontSize: '22px',
        color: '#b9a48f',
      })
      .setOrigin(0.5);
  }
}
