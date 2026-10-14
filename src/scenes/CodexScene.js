import Phaser from 'phaser';
import { GAME_WIDTH, COLORS, FONT } from '../config.js';
import { createButton } from '../ui.js';
import { getSave, writeSave, codexLevel, isDiscovered } from '../save.js';
import { CHEFS, METHODS, TIERS } from '../data/chefs.js';
import { CODEX_DAMAGE_PER_LEVEL, CODEX_MAX_LEVEL, codexCost } from '../data/progress.js';

const COLS = 3;
const CARD_W = 200;
const CARD_H = 125;
const GAP = 12;

// 📖 요리사 도감: 만난 요리사를 모아 보고, 팁으로 요리사별 공격력을 영구히 올린다.
export default class CodexScene extends Phaser.Scene {
  constructor() {
    super('Codex');
  }

  create() {
    this.selected = null;

    this.add.rectangle(0, 0, GAME_WIDTH, 120, COLORS.hud).setOrigin(0);
    this.add
      .text(GAME_WIDTH / 2, 45, '📖 요리사 도감', { fontFamily: FONT, fontSize: '40px', fontStyle: 'bold', color: COLORS.text })
      .setOrigin(0.5);
    this.headerInfo = this.add
      .text(GAME_WIDTH / 2, 95, '', { fontFamily: FONT, fontSize: '24px', color: COLORS.gold })
      .setOrigin(0.5);
    const back = this.add
      .text(30, 60, '←', { fontFamily: FONT, fontSize: '48px', color: COLORS.text })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });
    back.on('pointerup', () => this.scene.start('Title'));

    // 요리사 카드 (3열)
    const gridWidth = COLS * CARD_W + (COLS - 1) * GAP;
    const left = (GAME_WIDTH - gridWidth) / 2;
    const gridTop = 140;
    this.cards = CHEFS.map((chef, i) => {
      const x = left + (i % COLS) * (CARD_W + GAP);
      const y = gridTop + Math.floor(i / COLS) * (CARD_H + GAP);
      const found = isDiscovered(chef.id);

      const bg = this.add.graphics();
      this.add.circle(x + 45, y + CARD_H / 2, 34, found ? TIERS[chef.tier].color : 0x5a4a3e).setStrokeStyle(4, 0x2b1d14);
      this.add
        .text(x + 45, y + CARD_H / 2, found ? chef.emoji ?? METHODS[chef.method].emoji : '❓', { fontFamily: FONT, fontSize: '34px' })
        .setOrigin(0.5);
      this.add.text(x + 88, y + 22, found ? chef.name : '???', {
        fontFamily: FONT,
        fontSize: '20px',
        fontStyle: 'bold',
        color: found ? COLORS.text : '#8a7a6a',
        wordWrap: { width: CARD_W - 95, useAdvancedWrap: true },
      });
      const level = this.add.text(x + 88, y + CARD_H - 34, '', { fontFamily: FONT, fontSize: '20px', color: COLORS.gold });

      const hit = this.add.rectangle(x, y, CARD_W, CARD_H, 0, 0).setOrigin(0).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => this.select(chef));
      return { chef, bg, x, y, level, found };
    });

    // 아래쪽: 고른 요리사 정보와 레벨업 버튼
    const rows = Math.ceil(CHEFS.length / COLS);
    const detailTop = gridTop + rows * (CARD_H + GAP) + 10;
    this.detail = this.add.text(40, detailTop, '', {
      fontFamily: FONT,
      fontSize: '24px',
      color: COLORS.text,
      lineSpacing: 8,
      wordWrap: { width: GAME_WIDTH - 300 },
    });
    this.levelButton = createButton(this, GAME_WIDTH - 140, detailTop + 55, 220, 100, '', () => this.levelUp(), {
      fontSize: 26,
    });

    this.refresh();
  }

  select(chef) {
    this.selected = chef;
    this.refresh();
  }

  levelUp() {
    const chef = this.selected;
    if (!chef || !isDiscovered(chef.id)) return;
    const save = getSave();
    const lv = codexLevel(chef.id);
    const cost = codexCost(chef.tier, lv);
    if (lv >= CODEX_MAX_LEVEL || save.tips < cost) return;
    save.tips -= cost;
    save.codex[chef.id] = lv + 1;
    writeSave();
    this.refresh();
  }

  refresh() {
    const save = getSave();
    const foundCount = CHEFS.filter((c) => isDiscovered(c.id)).length;
    this.headerInfo.setText(`발견 ${foundCount} / ${CHEFS.length}    🪙 팁 ${save.tips}`);

    for (const card of this.cards) {
      const lv = codexLevel(card.chef.id);
      card.level.setText(card.found ? `Lv.${lv}` : '');
      card.bg.clear();
      card.bg.fillStyle(COLORS.hud, 1);
      card.bg.fillRoundedRect(card.x, card.y, CARD_W, CARD_H, 16);
      if (this.selected === card.chef) {
        card.bg.lineStyle(5, 0xffd54f, 1);
        card.bg.strokeRoundedRect(card.x, card.y, CARD_W, CARD_H, 16);
      }
    }

    const chef = this.selected;
    if (!chef) {
      this.detail.setText('요리사를 누르면 정보가 보여요.\n레벨을 올리면 그 요리사의 공격력이\n모든 판에서 영구히 올라가요.');
      this.levelButton.setVisible(false);
      return;
    }
    this.levelButton.setVisible(true);

    if (!isDiscovered(chef.id)) {
      this.detail.setText(`❓ 아직 만나지 못한 요리사예요.\n[${TIERS[chef.tier].name}] 등급`);
      this.levelButton.setLabel('🔒');
      this.levelButton.setEnabled(false);
      return;
    }

    const lv = codexLevel(chef.id);
    const bonus = Math.round(lv * CODEX_DAMAGE_PER_LEVEL * 100);
    this.detail.setText(
      `[${TIERS[chef.tier].name}] ${chef.name}\n${chef.ability ?? METHODS[chef.method].role}\nLv.${lv} / ${CODEX_MAX_LEVEL} · 공격력 +${bonus}%`,
    );
    const maxed = lv >= CODEX_MAX_LEVEL;
    const cost = codexCost(chef.tier, lv);
    this.levelButton.setLabel(maxed ? 'MAX' : `레벨업\n${cost}팁`);
    this.levelButton.setEnabled(!maxed && save.tips >= cost);
  }
}
