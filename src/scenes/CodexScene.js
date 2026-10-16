import Phaser from 'phaser';
import { GAME_WIDTH, COLORS, FONT, EMOJI_FONT } from '../config.js';
import { createButton } from '../ui.js';
import { playMusic, sfx } from '../audio.js';
import { getSave, isDiscovered } from '../save.js';
import { CHEFS, ALL_LINES, METHODS, chefsOfLine, rankOf } from '../data/chefs.js';
import { lineLevelOf, LINE_DAMAGE_PER_LEVEL, LINE_MAX_LEVEL } from '../data/progress.js';
import { TOWNS, hasFeature } from '../data/towns.js';
import { EGG_TOTAL, eggCount, findEgg, MAKER_RECIPE } from '../eastereggs.js';

const CARD_W = 330;
const CARD_H = 150;
const GAP = 14;

// 📖 레시피: 모은 레시피 줄 8개와 줄 레벨, 만난 요리, 특별 요리.
// 줄 레벨은 판을 끝낼 때 덱에 넣은 줄이 경험치를 받아 오른다 (요리 양 +6%씩).
export default class CodexScene extends Phaser.Scene {
  constructor() {
    super('Codex');
  }

  create() {
    playMusic('title');
    const save = getSave();
    this.add.rectangle(0, 0, GAME_WIDTH, 120, COLORS.hud).setOrigin(0);
    this.add.text(GAME_WIDTH / 2, 45, '📖 레시피', { fontFamily: FONT, fontSize: '40px', fontStyle: 'bold', color: COLORS.text }).setOrigin(0.5);
    const found = CHEFS.filter((c) => isDiscovered(c.id)).length;
    this.add
      .text(GAME_WIDTH / 2, 95, `줄 ${save.lines.length}/${ALL_LINES.length}   요리 ${found}/${CHEFS.length}   🥚 비밀 ${eggCount()}/${EGG_TOTAL}`, {
        fontFamily: FONT,
        fontSize: '22px',
        color: COLORS.gold,
      })
      .setOrigin(0.5);
    const back = this.add.text(24, 60, '←', { fontFamily: FONT, fontSize: '48px', color: COLORS.text }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    back.on('pointerup', () => this.scene.start('Title'));

    // 줄 카드 8개 (2열)
    const left = (GAME_WIDTH - CARD_W * 2 - GAP) / 2;
    const top = 140;
    this.cards = ALL_LINES.map((line, i) => {
      const x = left + (i % 2) * (CARD_W + GAP);
      const y = top + Math.floor(i / 2) * (CARD_H + GAP);
      return this.drawLineCard(line, x, y);
    });

    // 📖 신화 도감: 아직 못 만든 신화는 까만 실루엣으로 보인다. 그 밖의 특별 요리(총괄 주방장, 비밀)는 옆에
    const specialY = top + 4 * (CARD_H + GAP) + 6;
    const mythics = CHEFS.filter((c) => c.mythic);
    const others = CHEFS.filter((c) => c.special || c.hidden);
    const specials = [...mythics, ...others];
    const madeMythics = mythics.filter((c) => isDiscovered(c.id)).length;
    this.add.text(left, specialY, `📖 신화 ${madeMythics}/${mythics.length}  ·  ✨ 특별 ${others.filter((c) => isDiscovered(c.id)).length}/${others.length}`, {
      fontFamily: FONT,
      fontSize: '22px',
      fontStyle: 'bold',
      color: COLORS.gold,
    });
    const perRow = 10;
    const step = (GAME_WIDTH - 2 * left) / perRow;
    specials.forEach((chef, i) => {
      const x = left + step / 2 + (i % perRow) * step;
      const y = specialY + 58 + Math.floor(i / perRow) * 66;
      const seen = isDiscovered(chef.id);
      const rank = rankOf(chef);
      this.add.circle(x, y, 28, seen ? rank.color : 0x5a4a3e).setStrokeStyle(3, 0x2b1d14);
      // 신화는 못 만들어도 모양(실루엣)은 보인다
      const icon = chef.mythic || seen
        ? this.add.text(x, y, chef.emoji, { fontFamily: EMOJI_FONT, fontSize: '30px' }).setOrigin(0.5)
        : this.add.text(x, y, '?', { fontFamily: FONT, fontSize: '30px', fontStyle: 'bold', color: '#b9a48f' }).setOrigin(0.5);
      if (!seen && chef.mythic) icon.setTint(0x000000).setAlpha(0.75);
      icon.setInteractive({ useHandCursor: true });
      const recipe = chef.ingredients ? `\n재료: ${chef.ingredients.map((id) => CHEFS.find((c) => c.id === id).emoji).join(' + ')}` : '';
      const stars = chef.stars ? ` ${'★'.repeat(chef.stars)}` : '';
      icon.on('pointerup', () => {
        if (seen) this.showDetail(`[${rank.name}] ${chef.emoji} ${chef.name}${stars}\n${chef.ability ?? METHODS[chef.method].role}${recipe}`);
        else if (chef.mythic) this.showDetail(`[신화] ??? ${stars}\n아직 못 만들었어요. 판에서 📖를 눌러 보세요${recipe}`);
        else this.showDetail(`❓ 아직 만나지 못한 ${rank.name} 요리예요`);
      });
    });
    const specialRows = Math.ceil(specials.length / perRow);

    // 아래: 고른 것 설명과 덱 버튼
    this.detail = this.add.text(left, specialY + 40 + specialRows * 66, '줄 카드를 누르면 자세히 보여요.\n판을 끝낼 때 덱에 넣은 줄이 경험치를 받아요.', {
      fontFamily: FONT,
      fontSize: '22px',
      color: COLORS.text,
      lineSpacing: 6,
      wordWrap: { width: GAME_WIDTH - 60 },
    });
    if (hasFeature('deck')) {
      createButton(this, GAME_WIDTH / 2, Math.max(specialY + 120 + specialRows * 66 + 60, this.scale.height - 60), 360, 76, '🃏 덱 고르기', () => this.scene.start('Deck', { from: 'Codex' }), {
        fontSize: 30,
        color: 0x8e4fc0,
      });
    }

    // 🥚 비밀 요리를 뺀 모든 요리를 만나면 "만든 사람의 레시피"가 열린다
    const complete = CHEFS.filter((c) => !c.hidden).every((c) => isDiscovered(c.id));
    if (complete) {
      const secret = this.add.text(GAME_WIDTH - 24, 60, '📜', { fontFamily: EMOJI_FONT, fontSize: '44px' }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
      this.tweens.add({ targets: secret, angle: 10, duration: 400, yoyo: true, repeat: -1 });
      secret.on('pointerup', () => this.showMakerRecipe());
    }
  }

  // 줄 카드: 이모지와 이름, 레벨과 경험치 막대, 일반 → 전설 요리 4개
  drawLineCard(line, x, y) {
    const save = getSave();
    const method = METHODS[line];
    const owned = save.lines.includes(line);
    const inDeck = save.deck.includes(line);
    const g = this.add.graphics();
    g.fillStyle(owned ? COLORS.hud : 0x2f241c, 1);
    g.fillRoundedRect(x, y, CARD_W, CARD_H, 18);
    if (inDeck) {
      g.lineStyle(4, 0xffd54f, 1);
      g.strokeRoundedRect(x, y, CARD_W, CARD_H, 18);
    }
    this.add.text(x + 18, y + 30, `${method.emoji} ${method.name}`, { fontFamily: FONT, fontSize: '28px', fontStyle: 'bold', color: owned ? COLORS.text : '#7a6a5e' }).setOrigin(0, 0.5);
    if (inDeck) this.add.text(x + CARD_W - 14, y + 30, '🃏덱', { fontFamily: FONT, fontSize: '18px', color: COLORS.gold }).setOrigin(1, 0.5);

    if (!owned) {
      const town = TOWNS.findIndex((t) => t.newLine === line);
      this.add.text(x + 18, y + 80, `🔒 동네 ${town + 1}이 열리면`, { fontFamily: FONT, fontSize: '22px', color: '#8a7a6a' }).setOrigin(0, 0.5);
      this.add.text(x + 18, y + 115, method.role, { fontFamily: FONT, fontSize: '18px', color: '#6a5a4e' }).setOrigin(0, 0.5);
    } else {
      const { level, xp, need } = lineLevelOf(save.lineXp?.[line] ?? 0);
      this.add.text(x + 18, y + 68, `Lv.${level}`, { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: COLORS.gold }).setOrigin(0, 0.5);
      const bar = this.add.graphics();
      bar.fillStyle(0x5a4a3e, 1);
      bar.fillRoundedRect(x + 90, y + 61, CARD_W - 110, 14, 7);
      bar.fillStyle(0x6dc04a, 1);
      bar.fillRoundedRect(x + 90, y + 61, need ? Math.max(14, ((CARD_W - 110) * xp) / need) : CARD_W - 110, 14, 7);
      chefsOfLine(line).forEach((chef, i) => {
        const seen = isDiscovered(chef.id);
        this.add
          .text(x + 40 + i * 72, y + 112, seen ? chef.emoji : '?', { fontFamily: seen ? EMOJI_FONT : FONT, fontSize: '36px', fontStyle: 'bold', color: '#8a7a6a' })
          .setOrigin(0.5);
      });
    }
    const hit = this.add.rectangle(x, y, CARD_W, CARD_H, 0, 0).setOrigin(0).setInteractive({ useHandCursor: true });
    hit.on('pointerup', () => {
      sfx.click();
      this.showLine(line);
    });
  }

  showLine(line) {
    const save = getSave();
    const method = METHODS[line];
    const units = chefsOfLine(line)
      .map((c) => (isDiscovered(c.id) ? `${c.emoji}${c.name}` : '???'))
      .join(' → ');
    if (!save.lines.includes(line)) {
      this.showDetail(`${method.emoji} ${method.name} 줄 · ${method.role}\n${units}`);
      return;
    }
    const { level } = lineLevelOf(save.lineXp?.[line] ?? 0);
    const bonus = Math.round(level * LINE_DAMAGE_PER_LEVEL * 100);
    this.showDetail(`${method.emoji} ${method.name} 줄 · ${method.role}\nLv.${level}/${LINE_MAX_LEVEL} · 요리 양 +${bonus}%\n${units}`);
  }

  showDetail(text) {
    this.detail.setText(text);
  }

  // 🥚 만든 사람의 레시피 (요리를 다 만나면 열리는 비밀 페이지)
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
    });
  }
}
