import Phaser from 'phaser';
import { GAME_WIDTH, COLORS, FONT, EMOJI_FONT } from '../config.js';
import { createButton } from '../ui.js';
import { playMusic, sfx } from '../audio.js';
import { getSave, writeSave } from '../save.js';
import { ALL_LINES, METHODS, DECK_SIZE, chefsOfLine } from '../data/chefs.js';
import { MONSTERS } from '../data/monsters.js';
import { lineLevelOf } from '../data/progress.js';
import { TOWNS, townsOpen } from '../data/towns.js';

const CARD_W = 330;
const CARD_H = 130;
const GAP = 14;

// 🃏 덱 고르기: 모은 레시피 줄 중 4줄을 골라 판에 가져간다.
// 판에서는 덱의 4줄 재료만 뽑기에서 나온다. 다음 스테이지 손님이 좋아하는 요리를 보고 고르면 좋다.
export default class DeckScene extends Phaser.Scene {
  constructor() {
    super('Deck');
  }

  // data.from: 돌아갈 화면 ('Journey' 또는 'Codex')
  create(data) {
    playMusic('title');
    this.from = data?.from ?? 'Journey';
    const save = getSave();
    this.picked = [...save.deck];

    this.add.rectangle(0, 0, GAME_WIDTH, 120, COLORS.hud).setOrigin(0);
    this.add.text(GAME_WIDTH / 2, 45, '🃏 덱 고르기', { fontFamily: FONT, fontSize: '40px', fontStyle: 'bold', color: COLORS.text }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 95, `판에 가져갈 레시피 ${DECK_SIZE}줄을 골라요`, { fontFamily: FONT, fontSize: '22px', color: COLORS.gold }).setOrigin(0.5);
    const back = this.add.text(24, 60, '←', { fontFamily: FONT, fontSize: '48px', color: COLORS.text }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    back.on('pointerup', () => this.scene.start(this.from));

    // 가장 먼 동네 손님이 좋아하는 요리 (덱을 고르는 힌트)
    const town = TOWNS[townsOpen() - 1];
    const guests = Object.keys(town.mix).map((key) => MONSTERS[key]);
    const wants = [...new Set(guests.map((m) => m.likes).filter((l) => l && l !== 'random'))];
    this.add
      .text(GAME_WIDTH / 2, 160, `${town.emoji} ${town.name} 손님: ${guests.map((m) => m.emoji).join('')}`, {
        fontFamily: EMOJI_FONT,
        fontSize: '26px',
        color: COLORS.text,
      })
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, 200, `좋아하는 요리: ${wants.map((l) => METHODS[l].emoji).join(' ')}`, { fontFamily: EMOJI_FONT, fontSize: '24px', color: '#d8c8b4' })
      .setOrigin(0.5);

    const left = (GAME_WIDTH - CARD_W * 2 - GAP) / 2;
    this.cards = ALL_LINES.map((line, i) => {
      const x = left + (i % 2) * (CARD_W + GAP);
      const y = 240 + Math.floor(i / 2) * (CARD_H + GAP);
      const owned = save.lines.includes(line);
      const g = this.add.graphics();
      const method = METHODS[line];
      this.add.text(x + 18, y + 32, `${method.emoji} ${method.name}`, { fontFamily: FONT, fontSize: '28px', fontStyle: 'bold', color: owned ? COLORS.text : '#7a6a5e' }).setOrigin(0, 0.5);
      if (owned) {
        const { level } = lineLevelOf(save.lineXp?.[line] ?? 0);
        this.add.text(x + CARD_W - 16, y + 32, `Lv.${level}`, { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: COLORS.gold }).setOrigin(1, 0.5);
        this.add.text(x + 18, y + 72, method.role, { fontFamily: FONT, fontSize: '21px', color: '#d8c8b4' }).setOrigin(0, 0.5);
        this.add
          .text(x + 18, y + 106, chefsOfLine(line).map((c) => c.emoji).join(' '), { fontFamily: EMOJI_FONT, fontSize: '24px' })
          .setOrigin(0, 0.5);
      } else {
        const town = TOWNS.findIndex((t) => t.newLine === line);
        this.add.text(x + 18, y + 80, `🔒 동네 ${town + 1}이 열리면`, { fontFamily: FONT, fontSize: '22px', color: '#8a7a6a' }).setOrigin(0, 0.5);
      }
      const badge = this.add.text(x + CARD_W - 16, y + CARD_H - 24, '', { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: COLORS.gold }).setOrigin(1, 0.5);
      const hit = this.add.rectangle(x, y, CARD_W, CARD_H, 0, 0).setOrigin(0).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => {
        if (!owned) return sfx.denied();
        this.toggle(line);
      });
      return { line, x, y, g, owned, badge, wanted: wants.includes(line) };
    });

    const bottom = Math.max(240 + 4 * (CARD_H + GAP) + 80, this.scale.height - 90);
    this.status = this.add.text(GAME_WIDTH / 2, bottom - 90, '', { fontFamily: FONT, fontSize: '24px', color: COLORS.text }).setOrigin(0.5);
    this.saveButton = createButton(this, GAME_WIDTH / 2, bottom, 380, 96, '✅ 이 덱으로', () => this.saveDeck(), { fontSize: 32, color: 0x3f9a4a });
    this.refresh();
  }

  toggle(line) {
    sfx.click();
    if (this.picked.includes(line)) this.picked = this.picked.filter((l) => l !== line);
    else if (this.picked.length < DECK_SIZE) this.picked.push(line);
    else {
      sfx.denied();
      this.status.setText(`이미 ${DECK_SIZE}줄이에요. 하나를 빼고 골라요`);
      return;
    }
    this.refresh();
  }

  refresh() {
    for (const card of this.cards) {
      const on = this.picked.includes(card.line);
      card.g.clear();
      card.g.fillStyle(!card.owned ? 0x2f241c : on ? 0x5a3d2a : COLORS.hud, 1);
      card.g.fillRoundedRect(card.x, card.y, CARD_W, CARD_H, 18);
      if (on) {
        card.g.lineStyle(5, 0xffd54f, 1);
        card.g.strokeRoundedRect(card.x, card.y, CARD_W, CARD_H, 18);
      }
      card.badge.setText(on ? `✅ ${this.picked.indexOf(card.line) + 1}` : card.wanted && card.owned ? '💡 추천' : '');
    }
    const full = this.picked.length === DECK_SIZE;
    this.status.setText(full ? `덱: ${this.picked.map((l) => METHODS[l].emoji).join(' ')}` : `${DECK_SIZE - this.picked.length}줄 더 골라요`);
    this.saveButton.setEnabled(full);
  }

  saveDeck() {
    if (this.picked.length !== DECK_SIZE) return;
    const save = getSave();
    save.deck = [...this.picked];
    writeSave();
    sfx.upgrade();
    this.scene.start(this.from);
  }
}
