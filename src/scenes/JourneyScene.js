import Phaser from 'phaser';
import { GAME_WIDTH, COLORS, FONT, EMOJI_FONT } from '../config.js';
import { createButton } from '../ui.js';
import { playMusic, sfx } from '../audio.js';
import { getSave } from '../save.js';
import { METHODS } from '../data/chefs.js';
import { MONSTERS } from '../data/monsters.js';
import { TOWNS, TOWN_WAVES, townsOpen, townStars, bestWave, hasFeature } from '../data/towns.js';
import { startKit } from '../data/runs.js';

const CARD_H = 128;
const GAP = 10;

// 🗺️ 여정: 동네 6개가 한 줄로 이어진 길. 한 판은 웨이브 1부터 쭉 이어진다.
// 보스를 이긴 동네의 다음 동네에서 출발할 수 있고, 중간 저장이 있으면 이어 할 수 있다.
export default class JourneyScene extends Phaser.Scene {
  constructor() {
    super('Journey');
  }

  create() {
    playMusic('title');
    const save = getSave();
    const h = this.scale.height;
    this.add.rectangle(0, 0, GAME_WIDTH, h, 0x2b1d14).setOrigin(0);

    this.add.rectangle(0, 0, GAME_WIDTH, 110, COLORS.hud).setOrigin(0);
    this.add.text(GAME_WIDTH / 2, 40, '🗺️ 여정', { fontFamily: FONT, fontSize: '40px', fontStyle: 'bold', color: COLORS.text }).setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, 88, `🏁 최고 웨이브 ${bestWave()}   ⭐ ${TOWNS.reduce((sum, _, i) => sum + townStars(i), 0)}/${TOWNS.length * 3}`, {
        fontFamily: FONT,
        fontSize: '24px',
        color: COLORS.gold,
      })
      .setOrigin(0.5);
    const back = this.add.text(24, 55, '←', { fontFamily: FONT, fontSize: '48px', color: COLORS.text }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    back.on('pointerup', () => this.scene.start('Title'));

    // ▶ 이어 하기 (중간 저장이 있으면)
    let y = 128;
    const snap = save.journey;
    if (snap) {
      const t = TOWNS[Math.min(TOWNS.length - 1, Math.floor((snap.wave - 1) / TOWN_WAVES))];
      const resume = createButton(this, GAME_WIDTH / 2, y + 40, GAME_WIDTH - 60, 80, `▶ 이어 하기  ${t.emoji} 웨이브 ${snap.wave}`, () => this.scene.start('Game', { resume: true }), {
        fontSize: 30,
        color: 0x3f9a4a,
      });
      this.tweens.add({ targets: resume, scale: 1.03, duration: 500, yoyo: true, repeat: -1 });
      y += 96;
    }

    // 동네 카드 6개 + 그 너머
    const open = townsOpen();
    TOWNS.forEach((town, i) => {
      const top = y + i * (CARD_H + GAP);
      const unlocked = i < open;
      const g = this.add.graphics();
      g.fillStyle(unlocked ? town.color : 0x3d2a1e, unlocked ? 1 : 0.8);
      g.fillRoundedRect(30, top, GAME_WIDTH - 60, CARD_H, 20);
      g.lineStyle(4, 0x14171c, 0.6);
      g.strokeRoundedRect(30, top, GAME_WIDTH - 60, CARD_H, 20);
      const dark = unlocked ? COLORS.textDark : '#8a7a6a';
      this.add.text(80, top + CARD_H / 2, unlocked ? town.emoji : '🔒', { fontFamily: EMOJI_FONT, fontSize: '54px' }).setOrigin(0.5);
      this.add
        .text(130, top + 30, `${i + 1}. ${town.name}`, { fontFamily: FONT, fontSize: '28px', fontStyle: 'bold', color: dark })
        .setOrigin(0, 0.5);
      const from = i * TOWN_WAVES + 1;
      const guests = Object.keys(town.mix)
        .map((key) => MONSTERS[key].emoji)
        .join('');
      this.add
        .text(130, top + 66, `웨이브 ${from}~${from + TOWN_WAVES - 1} · ${guests}`, { fontFamily: EMOJI_FONT, fontSize: '21px', color: dark })
        .setOrigin(0, 0.5);
      const stars = townStars(i);
      this.add
        .text(130, top + 100, `보스 ${MONSTERS[town.boss].emoji}  ${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}`, { fontFamily: EMOJI_FONT, fontSize: '20px', color: dark })
        .setOrigin(0, 0.5);
      if (unlocked) {
        const label = i === 0 ? '▶ 처음부터' : '▶ 여기서 출발';
        createButton(this, GAME_WIDTH - 130, top + CARD_H / 2, 170, 70, label, () => this.start(i), { fontSize: 22, color: i === 0 ? 0xe85d3a : 0x3f7fd0 });
      } else {
        this.add
          .text(GAME_WIDTH - 50, top + CARD_H / 2, `동네 ${i}\n보스를 이기면`, { fontFamily: FONT, fontSize: '20px', color: '#8a7a6a', align: 'right' })
          .setOrigin(1, 0.5);
      }
    });

    // 아래: 덱
    const bottom = Math.max(y + TOWNS.length * (CARD_H + GAP) + 50, h - 60);
    const deck = save.deck;
    if (hasFeature('deck')) {
      createButton(this, GAME_WIDTH / 2, bottom, 360, 70, `🃏 덱 ${deck.map((l) => METHODS[l].emoji).join('')}`, () => this.scene.start('Deck', { from: 'Journey' }), {
        fontSize: 26,
        color: 0x8e4fc0,
      });
    } else {
      this.add.text(GAME_WIDTH / 2, bottom, '61웨이브부터는 끝없이! 🏆 최고 웨이브 랭킹', { fontFamily: FONT, fontSize: '20px', color: '#b9a48f' }).setOrigin(0.5);
    }
  }

  // 출발: 중간 저장이 있으면 지워진다고 알려 준다
  start(town) {
    const go = () => this.scene.start('Game', { startTown: town });
    if (!getSave().journey) return go();
    sfx.click();
    const cx = GAME_WIDTH / 2;
    const cy = this.scale.height / 2;
    const layer = this.add.layer().setDepth(30);
    layer.add(this.add.rectangle(0, 0, GAME_WIDTH, this.scale.height, 0x000000, 0.7).setOrigin(0).setInteractive());
    const box = this.add.graphics();
    box.fillStyle(0x3d2a1e, 1);
    box.fillRoundedRect(cx - 280, cy - 170, 560, 340, 24);
    layer.add(box);
    const kit = startKit(town);
    const kitText = town > 0 ? `\n🎒 출발 꾸러미: 골드 +${kit.gold}, 희귀 ${kit.rare}, 영웅 ${kit.hero}` : '';
    layer.add(
      this.add
        .text(cx, cy - 70, `새로 출발하면\n이어 하던 여정은 사라져요${kitText}`, { fontFamily: FONT, fontSize: '26px', color: COLORS.text, align: 'center', lineSpacing: 8 })
        .setOrigin(0.5),
    );
    layer.add(createButton(this, cx - 130, cy + 100, 220, 84, '취소', () => layer.destroy(), { color: 0x7d8594, fontSize: 28 }));
    layer.add(createButton(this, cx + 130, cy + 100, 220, 84, '새로 출발', go, { color: 0xe85d3a, fontSize: 28 }));
  }
}
