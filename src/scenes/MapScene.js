import Phaser from 'phaser';
import { GAME_WIDTH, COLORS, FONT, EMOJI_FONT } from '../config.js';
import { createButton } from '../ui.js';
import { playMusic, sfx } from '../audio.js';
import { getSave, totalStars } from '../save.js';
import { METHODS } from '../data/chefs.js';
import { MONSTERS } from '../data/monsters.js';
import { KITCHENS } from '../data/kitchens.js';
import {
  TOWNS,
  STAGES_PER_TOWN,
  stageStars,
  isStageOpen,
  townsOpen,
  townStars,
  nextStage,
  allTownsCleared,
  hasFeature,
} from '../data/towns.js';
import { stageRun, endlessRun } from '../data/runs.js';

// 지도에서 스테이지 칸이 놓이는 가로 위치 (아래 1번에서 위 10번까지 구불구불)
const PATH_X = [170, 360, 550, 360, 170, 360, 550, 360, 170, 360];

// 🗺️ 동네 지도: 동네를 ◀ ▶로 넘겨 보고, 스테이지를 눌러 시작한다.
export default class MapScene extends Phaser.Scene {
  constructor() {
    super('Map');
  }

  // data.town: 처음 보여 줄 동네, data.play: 바로 안내 창을 띄울 스테이지 { town, stage }
  create(data) {
    playMusic('title');
    const open = townsOpen();
    const next = nextStage();
    this.town = Math.min(open - 1, data?.town ?? this.registry.get('town') ?? next.town);
    this.height_ = this.scale.height;
    this.draw();
    if (data?.play) this.showStage(data.play.town, data.play.stage);
  }

  draw() {
    this.children.removeAll(true);
    const town = TOWNS[this.town];
    const h = this.height_;
    this.registry.set('town', this.town);

    // 배경: 동네 색 체크무늬
    const bg = this.add.graphics();
    const size = 60;
    for (let y = 0; y < h; y += size) {
      for (let x = 0; x < GAME_WIDTH; x += size) {
        bg.fillStyle(town.floor[(x / size + y / size) % 2], 1);
        bg.fillRect(x, y, size, size);
      }
    }
    // 동네 큰 그림 (흐리게)
    this.add.text(GAME_WIDTH / 2, h / 2 + 40, town.emoji, { fontFamily: EMOJI_FONT, fontSize: '360px' }).setOrigin(0.5).setAlpha(0.12);

    // 위: 제목과 전체 별
    this.add.rectangle(0, 0, GAME_WIDTH, 110, COLORS.hud).setOrigin(0);
    this.add.text(GAME_WIDTH / 2, 55, '🗺️ 동네 지도', { fontFamily: FONT, fontSize: '40px', fontStyle: 'bold', color: COLORS.text }).setOrigin(0.5);
    this.add.text(GAME_WIDTH - 24, 55, `⭐ ${totalStars()}`, { fontFamily: FONT, fontSize: '28px', fontStyle: 'bold', color: COLORS.gold }).setOrigin(1, 0.5);
    const back = this.add.text(24, 55, '←', { fontFamily: FONT, fontSize: '48px', color: COLORS.text }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    back.on('pointerup', () => this.scene.start('Title'));

    // 동네 이름표와 ◀ ▶
    const open = townsOpen();
    const bar = this.add.graphics();
    bar.fillStyle(0x3d2a1e, 0.92);
    bar.fillRoundedRect(20, 124, GAME_WIDTH - 40, 112, 22);
    this.add
      .text(GAME_WIDTH / 2, 160, `${town.emoji} 동네 ${this.town + 1}. ${town.name}`, { fontFamily: FONT, fontSize: '34px', fontStyle: 'bold', color: COLORS.text })
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, 205, `⭐ ${townStars(this.town)} / ${STAGES_PER_TOWN * 3}`, { fontFamily: FONT, fontSize: '24px', color: COLORS.gold })
      .setOrigin(0.5);
    const arrow = (x, label, delta) => {
      const target = this.town + delta;
      const ok = target >= 0 && target < TOWNS.length;
      const t = this.add
        .text(x, 180, label, { fontFamily: FONT, fontSize: '52px', fontStyle: 'bold', color: COLORS.text })
        .setOrigin(0.5)
        .setAlpha(ok ? 1 : 0.25)
        .setInteractive({ useHandCursor: true });
      t.on('pointerup', () => {
        if (!ok) return;
        sfx.click();
        this.town = target;
        this.draw();
      });
    };
    arrow(62, '◀', -1);
    arrow(GAME_WIDTH - 62, '▶', 1);

    const locked = this.town >= open;
    const top = 290;
    const bottom = h - 265;
    const step = (bottom - top) / (STAGES_PER_TOWN - 1);
    const pos = (stage) => ({ x: PATH_X[stage - 1], y: bottom - (stage - 1) * step });

    // 길: 스테이지 칸을 잇는 점선
    const path = this.add.graphics();
    path.lineStyle(14, 0x3d2a1e, locked ? 0.15 : 0.35);
    for (let stage = 1; stage < STAGES_PER_TOWN; stage++) {
      const a = pos(stage);
      const b = pos(stage + 1);
      path.lineBetween(a.x, a.y, b.x, b.y);
    }

    // 스테이지 칸
    for (let stage = 1; stage <= STAGES_PER_TOWN; stage++) {
      const { x, y } = pos(stage);
      const isBoss = stage === STAGES_PER_TOWN;
      const stageOpen = !locked && isStageOpen(this.town, stage);
      const stars = stageStars(this.town, stage);
      const isNext = stageOpen && stars === 0;
      const r = isBoss ? 54 : 42;
      const color = !stageOpen ? 0x7a6a5e : stars > 0 ? 0x3f9a4a : isBoss ? 0xe8564a : 0xe85d3a;
      const node = this.add.container(x, y);
      node.add(this.add.circle(0, 6, r, 0x14171c, 0.5));
      node.add(this.add.circle(0, 0, r, color).setStrokeStyle(6, isNext ? 0xffd54f : 0x3d2a1e));
      const label = !stageOpen ? '🔒' : isBoss ? MONSTERS[town.boss].emoji : `${stage}`;
      node.add(
        this.add
          .text(0, 0, label, { fontFamily: isBoss || !stageOpen ? EMOJI_FONT : FONT, fontSize: isBoss ? '54px' : '34px', fontStyle: 'bold', color: COLORS.text })
          .setOrigin(0.5),
      );
      if (stageOpen) {
        node.add(
          this.add
            .text(0, r + 16, '⭐'.repeat(stars) + '☆'.repeat(3 - stars), { fontFamily: FONT, fontSize: '22px', color: COLORS.gold, stroke: '#3d2a1e', strokeThickness: 4 })
            .setOrigin(0.5),
        );
      }
      if (KITCHENS.some((k) => k.id === town.gimmicks?.[stage]) && stageOpen) {
        node.add(this.add.text(r - 6, -r + 6, '⚠️', { fontFamily: EMOJI_FONT, fontSize: '24px' }).setOrigin(0.5));
      }
      if (isNext) this.tweens.add({ targets: node, scale: 1.1, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      const hit = this.add.circle(x, y, r + 10, 0, 0).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => {
        if (!stageOpen) return sfx.denied();
        sfx.click();
        this.showStage(this.town, stage);
      });
    }

    // 아래: 동네 설명, 덱, 무한 모드
    const info = this.add.graphics();
    info.fillStyle(0x3d2a1e, 0.92);
    info.fillRoundedRect(20, h - 195, GAME_WIDTH - 40, 180, 22);
    const desc = locked ? `🔒 동네 ${this.town}의 보스 손님을 배부르게 하면 열려요` : town.desc;
    this.add
      .text(GAME_WIDTH / 2, h - 160, desc, { fontFamily: FONT, fontSize: '21px', color: COLORS.text, align: 'center', wordWrap: { width: GAME_WIDTH - 80 } })
      .setOrigin(0.5);
    this.add
      .text(GAME_WIDTH / 2, h - 117, `🔓 ${town.opens}`, { fontFamily: FONT, fontSize: '19px', color: '#d8c8b4' })
      .setOrigin(0.5);

    const deck = getSave().deck;
    const buttons = [];
    if (hasFeature('deck')) buttons.push({ label: `🃏 덱 ${deck.map((l) => METHODS[l].emoji).join('')}`, color: 0x8e4fc0, onClick: () => this.scene.start('Deck', { from: 'Map' }) });
    if (allTownsCleared()) buttons.push({ label: '♾️ 무한 모드', color: 0xc77d2e, onClick: () => this.scene.start('Game', { run: endlessRun(getSave().deck) }) });
    buttons.forEach((b, i) => {
      const w = buttons.length === 1 ? 360 : 300;
      const x = buttons.length === 1 ? GAME_WIDTH / 2 : GAME_WIDTH / 2 + (i === 0 ? -160 : 160);
      createButton(this, x, h - 58, w, 62, b.label, b.onClick, { fontSize: 26, color: b.color });
    });
  }

  // 스테이지 안내 창: 나오는 손님과 좋아하는 요리, 최고 별, 시작 버튼
  showStage(town, stage) {
    const t = TOWNS[town];
    const run = stageRun(town, stage, getSave().deck);
    const centerX = GAME_WIDTH / 2;
    const centerY = this.height_ / 2;
    const parts = [];
    const shade = this.add.rectangle(0, 0, GAME_WIDTH, this.height_, 0x000000, 0.7).setOrigin(0).setInteractive();
    const box = this.add.graphics();
    box.fillStyle(0x3d2a1e, 1);
    box.fillRoundedRect(centerX - 300, centerY - 340, 600, 680, 24);
    box.lineStyle(5, 0xffd54f, 1);
    box.strokeRoundedRect(centerX - 300, centerY - 340, 600, 680, 24);
    const text = (y, message, size, color = COLORS.text, bold = false) =>
      this.add
        .text(centerX, y, message, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: bold ? 'bold' : '', color, align: 'center', wordWrap: { width: 540 } })
        .setOrigin(0.5);
    const isBoss = stage === STAGES_PER_TOWN;
    const stars = stageStars(town, stage);
    parts.push(
      shade,
      box,
      text(centerY - 285, `${t.emoji} ${town + 1}-${stage}${isBoss ? ' 보스!' : ''}`, 44, isBoss ? '#ff8a8a' : COLORS.text, true),
      text(centerY - 230, `웨이브 ${run.totalWaves} · 최고 ${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}`, 24, COLORS.gold),
      text(centerY - 175, '오늘 오는 손님', 24, '#d8c8b4'),
    );

    // 손님과 좋아하는 요리
    const mix = Object.keys(run.mix(99));
    const guests = isBoss ? [...mix, t.boss] : mix;
    const perRow = 4;
    guests.forEach((key, i) => {
      const m = MONSTERS[key];
      const row = Math.floor(i / perRow);
      const inRow = Math.min(perRow, guests.length - row * perRow);
      const x = centerX + (i % perRow - (inRow - 1) / 2) * 130;
      const y = centerY - 105 + row * 110;
      parts.push(this.add.text(x, y, m.emoji, { fontFamily: EMOJI_FONT, fontSize: m.boss ? '62px' : '52px' }).setOrigin(0.5));
      const likes = m.likesCycle ? '🔄' : m.likes === 'random' ? '❓' : m.likes ? METHODS[m.likes].emoji : '🐤';
      parts.push(this.add.text(x + 34, y - 30, likes, { fontFamily: EMOJI_FONT, fontSize: '24px', backgroundColor: '#fff8ec', padding: { x: 3, y: 2 } }).setOrigin(0.5));
      parts.push(text(y + 44, m.name, 17, COLORS.text).setX(x));
    });

    const notes = [];
    if (run.gimmick) notes.push(`⚠️ ${KITCHENS.find((k) => k.gimmick === run.gimmick)?.desc ?? '주방 사고'}`);
    const lines = getSave().deck.filter((l) => !mix.some((key) => MONSTERS[key].likes === l));
    if (mix.some((key) => MONSTERS[key].likes && !getSave().deck.includes(MONSTERS[key].likes) && MONSTERS[key].likes !== 'random')) {
      notes.push('💡 좋아하는 요리가 덱에 없는 손님이 있어요');
    } else if (lines.length === 0) notes.push('💡 덱의 요리를 모두 좋아하는 손님들이에요');
    parts.push(text(centerY + 150, notes.join('\n'), 20, '#ffd54f'));

    const close = () => parts.forEach((p) => p.destroy());
    parts.push(
      createButton(this, centerX - 140, centerY + 260, 230, 96, '닫기', close, { color: 0x7d8594 }),
      createButton(this, centerX + 130, centerY + 260, 260, 96, '▶ 시작', () => this.scene.start('Game', { run }), { color: 0x3f9a4a, fontSize: 38 }),
    );
    for (const p of parts) p.setDepth(20);
  }
}
