import Phaser from 'phaser';
import { GAME_WIDTH, COLORS, FONT, EMOJI_FONT } from '../config.js';
import { createButton } from '../ui.js';
import { playMusic, sfx } from '../audio.js';
import { getSave, writeSave, codexLevel, isDiscovered } from '../save.js';
import { CHEFS, LINES, METHODS, TIERS } from '../data/chefs.js';
import { CODEX_DAMAGE_PER_LEVEL, CODEX_MAX_LEVEL, codexCost } from '../data/progress.js';
import { EGG_TOTAL, eggCount, findEgg, MAKER_RECIPE } from '../eastereggs.js';

const COLS = 4;
const CARD_W = 160;
const CARD_H = 128;
const GAP = 10;

// 📖 레시피 도감: 만난 유닛을 모아 보고, 팁으로 유닛별 공격력을 영구히 올린다.
// 레시피 줄마다 한 열(빵, 고기, 디저트, 국물)에 일반 → 전설 순서로 놓고, 맨 아래 줄은 특별 유닛.
export default class CodexScene extends Phaser.Scene {
  constructor() {
    super('Codex');
  }

  create() {
    playMusic('title');
    this.selected = null;

    this.add.rectangle(0, 0, GAME_WIDTH, 120, COLORS.hud).setOrigin(0);
    this.add
      .text(GAME_WIDTH / 2, 45, '📖 레시피 도감', { fontFamily: FONT, fontSize: '40px', fontStyle: 'bold', color: COLORS.text })
      .setOrigin(0.5);
    this.headerInfo = this.add
      .text(GAME_WIDTH / 2, 95, '', { fontFamily: FONT, fontSize: '24px', color: COLORS.gold })
      .setOrigin(0.5);
    const back = this.add
      .text(30, 60, '←', { fontFamily: FONT, fontSize: '48px', color: COLORS.text })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });
    back.on('pointerup', () => this.scene.start('Title'));

    // 유닛 카드: 열 = 레시피 줄, 행 = 등급. 마지막 행은 특별 유닛 (총괄 주방장, 신화, 비밀)
    const gridWidth = COLS * CARD_W + (COLS - 1) * GAP;
    const left = (GAME_WIDTH - gridWidth) / 2;
    const gridTop = 186;
    LINES.forEach((method, col) => {
      this.add
        .text(left + col * (CARD_W + GAP) + CARD_W / 2, gridTop - 30, `${METHODS[method].emoji} ${METHODS[method].name} 줄`, {
          fontFamily: FONT,
          fontSize: '22px',
          fontStyle: 'bold',
          color: COLORS.gold,
        })
        .setOrigin(0.5);
    });
    const specials = CHEFS.filter((c) => !LINES.includes(c.method) || c.tier === 5);
    const place = (chef) => {
      const special = specials.indexOf(chef);
      if (special >= 0) return [special, 4];
      return [LINES.indexOf(chef.method), chef.tier - 1];
    };
    this.cards = CHEFS.map((chef) => {
      const [col, row] = place(chef);
      const x = left + col * (CARD_W + GAP);
      const y = gridTop + row * (CARD_H + GAP) + (row === 4 ? 14 : 0);
      const found = isDiscovered(chef.id);

      const bg = this.add.graphics();
      const cx = x + CARD_W / 2;
      this.add.circle(cx, y + 44, 32, found ? TIERS[chef.tier].color : 0x5a4a3e).setStrokeStyle(4, 0x2b1d14);
      if (found) this.add.text(cx, y + 44, chef.emoji, { fontFamily: EMOJI_FONT, fontSize: '36px' }).setOrigin(0.5);
      else this.add.text(cx, y + 44, '?', { fontFamily: FONT, fontSize: '36px', fontStyle: 'bold', color: '#b9a48f' }).setOrigin(0.5);
      const shown = found ? chef.name : '???';
      this.add
        .text(cx, y + 92, shown, {
          fontFamily: FONT,
          fontSize: shown.length > 7 ? '14px' : '18px', // 긴 이름은 작게
          fontStyle: 'bold',
          color: found ? COLORS.text : '#8a7a6a',
          align: 'center',
          wordWrap: { width: CARD_W - 12, useAdvancedWrap: true },
        })
        .setOrigin(0.5);
      const level = this.add.text(x + CARD_W - 8, y + 8, '', { fontFamily: FONT, fontSize: '16px', color: COLORS.gold }).setOrigin(1, 0);

      const hit = this.add.rectangle(x, y, CARD_W, CARD_H, 0, 0).setOrigin(0).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => this.select(chef));
      return { chef, bg, x, y, level, found };
    });

    // 아래쪽: 고른 유닛 정보와 레벨업 버튼
    const detailTop = gridTop + 5 * (CARD_H + GAP) + 30;
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

    // 🥚 비밀 유닛을 뺀 모든 유닛을 발견하면 "만든 사람의 레시피"가 열린다
    const complete = CHEFS.filter((c) => !c.hidden).every((c) => isDiscovered(c.id));
    if (complete) {
      const secret = this.add
        .text(GAME_WIDTH - 24, 60, '📜', { fontFamily: FONT, fontSize: '44px' })
        .setOrigin(1, 0.5)
        .setInteractive({ useHandCursor: true });
      this.tweens.add({ targets: secret, angle: 10, duration: 400, yoyo: true, repeat: -1 });
      secret.on('pointerup', () => this.showMakerRecipe());
    }

    this.refresh();
  }

  // 🥚 만든 사람의 레시피 (도감을 다 채우면 열리는 비밀 페이지)
  showMakerRecipe() {
    findEgg('maker');
    const height = this.scale.height;
    const shade = this.add.rectangle(0, 0, GAME_WIDTH, height, 0x000000, 0.8).setOrigin(0).setDepth(20).setInteractive();
    const paper = this.add
      .text(GAME_WIDTH / 2, height / 2, MAKER_RECIPE + '\n\n(눌러서 닫기)', {
        fontFamily: FONT,
        fontSize: '26px',
        color: COLORS.textDark,
        backgroundColor: '#fff8ec',
        padding: { x: 40, y: 36 },
        lineSpacing: 10,
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(21);
    shade.on('pointerup', () => {
      shade.destroy();
      paper.destroy();
      this.refresh();
    });
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
    sfx.upgrade();
    this.refresh();
  }

  refresh() {
    const save = getSave();
    const foundCount = CHEFS.filter((c) => isDiscovered(c.id)).length;
    this.headerInfo.setText(`발견 ${foundCount}/${CHEFS.length}   🥚 비밀 ${eggCount()}/${EGG_TOTAL}   🪙 ${save.tips}`);

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
      this.detail.setText('카드를 누르면 정보가 보여요.\n레벨을 올리면 그 유닛의 공격력이\n모든 판에서 영구히 올라가요.');
      this.levelButton.setVisible(false);
      return;
    }
    this.levelButton.setVisible(true);

    if (!isDiscovered(chef.id)) {
      this.detail.setText(`❓ 아직 만나지 못한 유닛이에요.\n[${TIERS[chef.tier].name}] 등급`);
      this.levelButton.setLabel('🔒');
      this.levelButton.setEnabled(false);
      return;
    }

    const lv = codexLevel(chef.id);
    const bonus = Math.round(lv * CODEX_DAMAGE_PER_LEVEL * 100);
    this.detail.setText(
      `[${TIERS[chef.tier].name}] ${chef.emoji} ${chef.name}\n${chef.ability ?? METHODS[chef.method].role}\nLv.${lv} / ${CODEX_MAX_LEVEL} · 공격력 +${bonus}%`,
    );
    const maxed = lv >= CODEX_MAX_LEVEL;
    const cost = codexCost(chef.tier, lv);
    this.levelButton.setLabel(maxed ? 'MAX' : `레벨업\n${cost}팁`);
    this.levelButton.setEnabled(!maxed && save.tips >= cost);
  }
}
