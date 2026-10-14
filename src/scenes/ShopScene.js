import Phaser from 'phaser';
import { GAME_WIDTH, COLORS, FONT } from '../config.js';
import { createButton } from '../ui.js';
import { playMusic, sfx } from '../audio.js';
import { getSave, writeSave, shopLevel } from '../save.js';
import { SHOP_ITEMS, shopCost } from '../data/progress.js';

const ROW_HEIGHT = 190;

// 🏪 가게 강화 화면: 팁으로 다음 판부터 계속 적용되는 강화를 산다.
export default class ShopScene extends Phaser.Scene {
  constructor() {
    super('Shop');
  }

  create() {
    playMusic('title');
    this.add.rectangle(0, 0, GAME_WIDTH, 120, COLORS.hud).setOrigin(0);
    this.add
      .text(GAME_WIDTH / 2, 60, '🏪 가게 강화', { fontFamily: FONT, fontSize: '42px', fontStyle: 'bold', color: COLORS.text })
      .setOrigin(0.5);
    const back = this.add
      .text(30, 60, '←', { fontFamily: FONT, fontSize: '48px', color: COLORS.text })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });
    back.on('pointerup', () => this.scene.start('Title'));

    this.tipsText = this.add
      .text(GAME_WIDTH / 2, 175, '', { fontFamily: FONT, fontSize: '36px', fontStyle: 'bold', color: COLORS.gold })
      .setOrigin(0.5);

    const listTop = 240;
    this.rows = SHOP_ITEMS.map((item, i) => {
      const y = listTop + i * ROW_HEIGHT;
      const card = this.add.graphics();
      card.fillStyle(COLORS.hud, 1);
      card.fillRoundedRect(30, y, GAME_WIDTH - 60, ROW_HEIGHT - 20, 20);

      this.add.text(60, y + 30, `${item.emoji} ${item.name}`, {
        fontFamily: FONT,
        fontSize: '34px',
        fontStyle: 'bold',
        color: COLORS.text,
      });
      const level = this.add.text(60, y + 85, '', { fontFamily: FONT, fontSize: '24px', color: '#d8c8b4' });
      const effect = this.add.text(60, y + 120, '', { fontFamily: FONT, fontSize: '24px', color: COLORS.gold });
      const button = createButton(this, GAME_WIDTH - 150, y + (ROW_HEIGHT - 20) / 2, 200, 90, '', () => this.buy(item), {
        fontSize: 26,
      });
      return { item, level, effect, button };
    });

    this.refresh();
  }

  buy(item) {
    const save = getSave();
    const lv = shopLevel(item.id);
    const cost = shopCost(item, lv);
    if (lv >= item.max || save.tips < cost) return;
    save.tips -= cost;
    save.shop[item.id] = lv + 1;
    writeSave();
    sfx.coin();
    this.refresh();
  }

  refresh() {
    const save = getSave();
    this.tipsText.setText(`🪙 팁 ${save.tips}`);
    for (const row of this.rows) {
      const { item } = row;
      const lv = shopLevel(item.id);
      const maxed = lv >= item.max;
      row.level.setText(`Lv.${lv} / ${item.max}`);
      row.effect.setText(
        maxed ? `${item.effect(lv * item.per)} (최대)` : `${item.effect(lv * item.per)} → ${item.effect((lv + 1) * item.per)}`,
      );
      const cost = shopCost(item, lv);
      row.button.setLabel(maxed ? 'MAX' : `${cost}팁`);
      row.button.setEnabled(!maxed && save.tips >= cost);
    }
  }
}
