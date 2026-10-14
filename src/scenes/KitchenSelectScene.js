import Phaser from 'phaser';
import { GAME_WIDTH, COLORS, FONT } from '../config.js';
import { getSave, totalStars } from '../save.js';
import { KITCHENS } from '../data/kitchens.js';

const CARD_HEIGHT = 200;
const GAP = 20;

// 주방 선택 화면: 열린 주방을 골라 영업을 시작한다.
export default class KitchenSelectScene extends Phaser.Scene {
  constructor() {
    super('KitchenSelect');
  }

  create() {
    const save = getSave();
    const stars = totalStars();

    this.add.rectangle(0, 0, GAME_WIDTH, 120, COLORS.hud).setOrigin(0);
    this.add
      .text(GAME_WIDTH / 2, 60, '🍳 주방 선택', { fontFamily: FONT, fontSize: '42px', fontStyle: 'bold', color: COLORS.text })
      .setOrigin(0.5);
    const back = this.add
      .text(30, 60, '←', { fontFamily: FONT, fontSize: '48px', color: COLORS.text })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });
    back.on('pointerup', () => this.scene.start('Title'));

    this.add
      .text(GAME_WIDTH / 2, 170, `⭐ 모은 별 ${stars}`, { fontFamily: FONT, fontSize: '32px', fontStyle: 'bold', color: COLORS.gold })
      .setOrigin(0.5);

    KITCHENS.forEach((kitchen, i) => {
      const x = 30;
      const y = 230 + i * (CARD_HEIGHT + GAP);
      const width = GAME_WIDTH - 60;
      const unlocked = stars >= kitchen.unlockStars;
      const best = save.bestStars[kitchen.id] ?? 0;

      const card = this.add.graphics();
      card.fillStyle(unlocked ? COLORS.hud : 0x2f241c, 1);
      card.fillRoundedRect(x, y, width, CARD_HEIGHT, 22);
      card.fillStyle(kitchen.floor[0], unlocked ? 1 : 0.25);
      card.fillRoundedRect(x + 20, y + 20, 140, CARD_HEIGHT - 40, 16);

      this.add.text(x + 90, y + CARD_HEIGHT / 2, unlocked ? kitchen.emoji : '🔒', { fontFamily: FONT, fontSize: '70px' }).setOrigin(0.5);

      const textColor = unlocked ? COLORS.text : '#7a6a5e';
      this.add.text(x + 185, y + 28, kitchen.name, { fontFamily: FONT, fontSize: '34px', fontStyle: 'bold', color: textColor });
      this.add.text(x + 185, y + 80, kitchen.desc, {
        fontFamily: FONT,
        fontSize: '22px',
        color: unlocked ? '#d8c8b4' : '#6a5a4e',
        wordWrap: { width: width - 205 },
      });

      const bottom = unlocked
        ? `${'⭐'.repeat(best)}${'☆'.repeat(3 - best)}${kitchen.tipBonus > 1 ? `   🪙 팁 ×${kitchen.tipBonus}` : ''}`
        : `🔒 별 ${kitchen.unlockStars}개가 필요해요`;
      this.add.text(x + 185, y + CARD_HEIGHT - 52, bottom, {
        fontFamily: FONT,
        fontSize: '26px',
        fontStyle: 'bold',
        color: unlocked ? COLORS.gold : '#8a7a6a',
      });

      if (unlocked) {
        const hit = this.add.rectangle(x, y, width, CARD_HEIGHT, 0, 0).setOrigin(0).setInteractive({ useHandCursor: true });
        hit.on('pointerup', () => this.scene.start('Game', { kitchen: kitchen.id }));
      }
    });
  }
}
