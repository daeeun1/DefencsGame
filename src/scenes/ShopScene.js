import Phaser from 'phaser';
import { GAME_WIDTH, COLORS, FONT, EMOJI_FONT } from '../config.js';
import { createButton } from '../ui.js';
import { playMusic, sfx } from '../audio.js';
import { getSave, writeSave, shopLevel } from '../save.js';
import { SHOP_ITEMS, shopCost } from '../data/progress.js';
import { METHODS } from '../data/chefs.js';
import { revealEffect, ring, burst } from '../effects.js';
import {
  BOXES,
  TOOLS,
  TOOL_SLOTS,
  TOOL_ODDS,
  TOOL_MAX_LEVEL,
  ITEM_TIERS,
  HATS,
  FLOORS,
  openBox,
  toolById,
  toolEffect,
  effectText,
} from '../data/items.js';

const TABS = [
  { id: 'box', label: '🎁 상자' },
  { id: 'tools', label: '🔪 도구' },
  { id: 'style', label: '🎨 꾸미기' },
  { id: 'upgrade', label: '🏪 강화' },
];
const TOP = 230; // 탭 아래 내용이 시작하는 높이

// 🏪 가게: 팁을 쓰는 곳.
// 🎁 상자(도구·레시피·꾸미기 뽑기) / 🔪 도구(칼·냄비·옷 장착) / 🎨 꾸미기(모자, 판 바닥) / 🏪 강화(영구 강화)
export default class ShopScene extends Phaser.Scene {
  constructor() {
    super('Shop');
  }

  create(data) {
    playMusic('title');
    this.tab = data?.tab ?? this.registry.get('shopTab') ?? 'box';
    this.draw();
  }

  draw() {
    this.children.removeAll(true);
    this.registry.set('shopTab', this.tab);
    const save = getSave();

    this.add.rectangle(0, 0, GAME_WIDTH, 120, COLORS.hud).setOrigin(0);
    this.add.text(GAME_WIDTH / 2, 42, '🏪 가게', { fontFamily: FONT, fontSize: '40px', fontStyle: 'bold', color: COLORS.text }).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 92, `🪙 팁 ${save.tips}`, { fontFamily: FONT, fontSize: '28px', fontStyle: 'bold', color: COLORS.gold }).setOrigin(0.5);
    const back = this.add.text(24, 60, '←', { fontFamily: FONT, fontSize: '48px', color: COLORS.text }).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    back.on('pointerup', () => this.scene.start('Title'));

    // 탭
    const w = (GAME_WIDTH - 40) / TABS.length;
    TABS.forEach((tab, i) => {
      const x = 20 + i * w + w / 2;
      const on = tab.id === this.tab;
      const bg = this.add.rectangle(x, 172, w - 8, 68, on ? 0xe85d3a : COLORS.hud).setInteractive({ useHandCursor: true });
      this.add.text(x, 172, tab.label, { fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: on ? COLORS.text : '#b9a48f' }).setOrigin(0.5);
      bg.on('pointerup', () => {
        sfx.click();
        this.tab = tab.id;
        this.draw();
      });
    });

    if (this.tab === 'box') this.drawBoxes();
    else if (this.tab === 'tools') this.drawTools();
    else if (this.tab === 'style') this.drawStyle();
    else this.drawUpgrades();
  }

  // ───────── 🎁 상자 ─────────

  drawBoxes() {
    const save = getSave();
    const odds = Object.entries(TOOL_ODDS)
      .map(([tier, w]) => `${ITEM_TIERS[tier].name} ${w}%`)
      .join(' · ');
    BOXES.forEach((box, i) => {
      const y = TOP + i * 230;
      const g = this.add.graphics();
      g.fillStyle(COLORS.hud, 1);
      g.fillRoundedRect(30, y, GAME_WIDTH - 60, 210, 22);
      g.lineStyle(4, box.color, 1);
      g.strokeRoundedRect(30, y, GAME_WIDTH - 60, 210, 22);
      const icon = this.add.text(110, y + 95, box.emoji, { fontFamily: EMOJI_FONT, fontSize: '84px' }).setOrigin(0.5);
      this.tweens.add({ targets: icon, angle: { from: -6, to: 6 }, duration: 600 + i * 120, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.add.text(195, y + 38, box.name, { fontFamily: FONT, fontSize: '32px', fontStyle: 'bold', color: COLORS.text }).setOrigin(0, 0.5);
      this.add
        .text(195, y + 88, box.desc, { fontFamily: FONT, fontSize: '20px', color: '#d8c8b4', wordWrap: { width: GAME_WIDTH - 260 } })
        .setOrigin(0, 0.5);
      if (box.id === 'tool') this.add.text(195, y + 125, odds, { fontFamily: FONT, fontSize: '16px', color: '#b9a48f' }).setOrigin(0, 0.5);
      createButton(this, GAME_WIDTH - 150, y + 168, 220, 64, `🪙 ${box.cost} 열기`, () => this.open(box.id), {
        fontSize: 26,
        color: box.color,
        enabled: save.tips >= box.cost,
      });
    });
  }

  // 상자 열기: 상자가 흔들리다 펑! 하고 나온 것을 보여 준다
  open(boxId) {
    const result = openBox(boxId);
    if (!result) return sfx.denied();
    const cx = GAME_WIDTH / 2;
    const cy = this.scale.height / 2;
    const layer = this.add.layer().setDepth(30);
    layer.add(this.add.rectangle(0, 0, GAME_WIDTH, this.scale.height, 0x000000, 0.8).setOrigin(0).setInteractive());
    const boxIcon = this.add.text(cx, cy - 60, result.box.emoji, { fontFamily: EMOJI_FONT, fontSize: '140px' }).setOrigin(0.5);
    layer.add(boxIcon);
    sfx.summon(1);
    this.tweens.add({
      targets: boxIcon,
      angle: { from: -12, to: 12 },
      duration: 90,
      yoyo: true,
      repeat: 5,
      onComplete: () => {
        boxIcon.destroy();
        this.reveal(layer, result, cx, cy);
      },
    });
  }

  reveal(layer, result, cx, cy) {
    const tier = ITEM_TIERS[result.tier] ?? ITEM_TIERS[1];
    revealEffect(this, layer, cx, cy - 60, result.tier, tier.color);
    sfx.summon(Math.min(3, result.tier));
    if (result.tier >= 3) sfx.mythic();
    let emoji = '🪙';
    let title = '';
    let sub = '';
    if (result.kind === 'tool') {
      emoji = result.item.emoji;
      title = `[${tier.name}] ${result.item.name}`;
      sub = result.maxed
        ? `이미 최대 레벨! 팁 ${Math.floor(result.box.cost / 2)}을 돌려받았어요`
        : `${result.isNew ? '✨ 새 도구!' : `⬆️ Lv.${result.level}로 강해졌어요!`}\n${effectText(toolEffect(result.item, result.level))}`;
    } else if (result.kind === 'recipe') {
      emoji = METHODS[result.line].emoji;
      title = result.big ? '🎉 대박!' : `${METHODS[result.line].name} 줄 경험치`;
      sub = `${METHODS[result.line].emoji} ${METHODS[result.line].name} 줄 경험치 +${result.xp}`;
    } else if (result.refund) {
      title = '꾸미기를 다 모았어요!';
      sub = `팁 ${result.refund}을 돌려받았어요`;
    } else {
      emoji = result.item.emoji;
      title = `[${tier.name}] ${result.item.name}`;
      sub = `✨ 새 ${result.hat ? '모자' : '판 바닥'}! 🎨 꾸미기에서 써 보세요`;
    }
    layer.add(this.add.circle(cx, cy - 60, 110, tier.color, 0.35).setStrokeStyle(8, tier.color));
    const icon = this.add.text(cx, cy - 60, emoji, { fontFamily: EMOJI_FONT, fontSize: '120px' }).setOrigin(0.5).setScale(0);
    layer.add(icon);
    this.tweens.add({ targets: icon, scale: 1, duration: 350, ease: 'Back.Out' });
    layer.add(
      this.add
        .text(cx, cy + 110, title, { fontFamily: FONT, fontSize: '36px', fontStyle: 'bold', color: '#' + tier.color.toString(16).padStart(6, '0'), stroke: '#2b1d14', strokeThickness: 6 })
        .setOrigin(0.5),
    );
    layer.add(this.add.text(cx, cy + 175, sub, { fontFamily: FONT, fontSize: '24px', color: COLORS.text, align: 'center', lineSpacing: 6 }).setOrigin(0.5, 0));
    const again = createButton(this, cx - 135, cy + 330, 240, 90, `한 번 더 🪙${result.box.cost}`, () => {
      layer.destroy();
      this.draw();
      this.open(result.box.id);
    }, { fontSize: 24, color: result.box.color, enabled: getSave().tips >= result.box.cost });
    const ok = createButton(this, cx + 135, cy + 330, 240, 90, '좋아요!', () => {
      layer.destroy();
      this.draw();
    }, { fontSize: 30, color: 0x3f9a4a });
    layer.add([again, ok]);
  }

  // ───────── 🔪 도구 ─────────

  drawTools() {
    const save = getSave();
    // 위: 장착한 도구 3칸
    TOOL_SLOTS.forEach((slot, i) => {
      const y = TOP + i * 96;
      const tool = toolById(save.equipped?.[slot.id]);
      const level = tool ? save.tools[tool.id] : 0;
      const g = this.add.graphics();
      g.fillStyle(0x3d2a1e, 1);
      g.fillRoundedRect(30, y, GAME_WIDTH - 60, 84, 16);
      if (tool) {
        g.lineStyle(4, ITEM_TIERS[tool.tier].color, 1);
        g.strokeRoundedRect(30, y, GAME_WIDTH - 60, 84, 16);
      }
      this.add.text(70, y + 42, slot.emoji, { fontFamily: EMOJI_FONT, fontSize: '40px' }).setOrigin(0.5);
      this.add
        .text(115, y + 26, tool ? `${tool.emoji} ${tool.name}  Lv.${level}` : `${slot.name} 칸이 비어 있어요`, {
          fontFamily: FONT,
          fontSize: '24px',
          fontStyle: 'bold',
          color: tool ? COLORS.text : '#8a7a6a',
        })
        .setOrigin(0, 0.5);
      this.add
        .text(115, y + 60, tool ? effectText(toolEffect(tool, level)) : '🎁 도구 상자에서 얻어요', { fontFamily: FONT, fontSize: '19px', color: COLORS.gold })
        .setOrigin(0, 0.5);
    });

    // 아래: 모든 도구 (가진 것은 눌러서 장착)
    const gridTop = TOP + 3 * 96 + 20;
    this.add.text(30, gridTop, '눌러서 장착 · 같은 도구가 또 나오면 레벨 업', { fontFamily: FONT, fontSize: '20px', color: '#b9a48f' });
    const perRow = 5;
    const size = (GAME_WIDTH - 60) / perRow;
    TOOLS.forEach((tool, i) => {
      const x = 30 + (i % perRow) * size + size / 2;
      const y = gridTop + 80 + Math.floor(i / perRow) * 150;
      const level = save.tools?.[tool.id] ?? 0;
      const equipped = save.equipped?.[tool.slot] === tool.id;
      this.add.circle(x, y, 44, level ? ITEM_TIERS[tool.tier].color : 0x5a4a3e, level ? 0.9 : 1).setStrokeStyle(equipped ? 6 : 3, equipped ? 0xffd54f : 0x2b1d14);
      this.add.text(x, y, level ? tool.emoji : '?', { fontFamily: level ? EMOJI_FONT : FONT, fontSize: '44px', fontStyle: 'bold', color: '#b9a48f' }).setOrigin(0.5);
      this.add
        .text(x, y + 60, level ? `${tool.name}\nLv.${level}${level >= TOOL_MAX_LEVEL ? ' MAX' : ''}` : ITEM_TIERS[tool.tier].name, {
          fontFamily: FONT,
          fontSize: '15px',
          color: level ? COLORS.text : '#8a7a6a',
          align: 'center',
          wordWrap: { width: size - 6, useAdvancedWrap: true },
        })
        .setOrigin(0.5, 0);
      if (equipped) this.add.text(x + 34, y - 34, '✅', { fontFamily: EMOJI_FONT, fontSize: '22px' }).setOrigin(0.5);
      const hit = this.add.circle(x, y, 50, 0, 0).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => {
        if (!level) return sfx.denied();
        sfx.upgrade();
        save.equipped ??= {};
        save.equipped[tool.slot] = equipped ? null : tool.id; // 다시 누르면 벗기
        writeSave();
        this.draw();
      });
    });
  }

  // ───────── 🎨 꾸미기 ─────────

  drawStyle() {
    const save = getSave();
    save.wear ??= {};
    const owned = (id) => save.cosmetics?.includes(id);

    // 미리 보기: 판 바닥 두 칸 위에 모자 쓴 요리
    const floor = FLOORS.find((f) => f.id === save.wear.floor)?.colors ?? [0xf3e3c3, 0xe8d3ab];
    const hat = HATS.find((h) => h.id === save.wear.hat)?.emoji;
    const px = GAME_WIDTH / 2;
    this.add.rectangle(px - 60, TOP + 80, 120, 120, floor[0]);
    this.add.rectangle(px + 60, TOP + 80, 120, 120, floor[1]);
    for (const [i, emoji] of [['-60', '🌾'], ['60', '🥩']]) {
      this.add.text(px + Number(i), TOP + 88, emoji, { fontFamily: EMOJI_FONT, fontSize: '56px' }).setOrigin(0.5);
      if (hat) this.add.text(px + Number(i) - 4, TOP + 42, hat, { fontFamily: EMOJI_FONT, fontSize: '32px' }).setOrigin(0.5);
    }

    const section = (title, list, key, top) => {
      this.add.text(30, top, title, { fontFamily: FONT, fontSize: '26px', fontStyle: 'bold', color: COLORS.gold });
      const items = [{ id: null, emoji: '🚫', name: '없음', tier: 1 }, ...list];
      const size = (GAME_WIDTH - 60) / items.length;
      items.forEach((item, i) => {
        const x = 30 + i * size + size / 2;
        const y = top + 85;
        const have = item.id === null || owned(item.id);
        const on = (save.wear[key] ?? null) === item.id;
        this.add.circle(x, y, 42, have ? ITEM_TIERS[item.tier].color : 0x5a4a3e, have ? 0.85 : 1).setStrokeStyle(on ? 6 : 3, on ? 0xffd54f : 0x2b1d14);
        this.add.text(x, y, have ? item.emoji : '?', { fontFamily: have ? EMOJI_FONT : FONT, fontSize: '40px', fontStyle: 'bold', color: '#b9a48f' }).setOrigin(0.5);
        this.add
          .text(x, y + 56, have ? item.name : ITEM_TIERS[item.tier].name, { fontFamily: FONT, fontSize: '16px', color: have ? COLORS.text : '#8a7a6a', align: 'center' })
          .setOrigin(0.5, 0);
        const hit = this.add.circle(x, y, 46, 0, 0).setInteractive({ useHandCursor: true });
        hit.on('pointerup', () => {
          if (!have) return sfx.denied();
          sfx.click();
          save.wear[key] = item.id;
          writeSave();
          this.draw();
        });
      });
    };
    section('🎩 요리 모자', HATS, 'hat', TOP + 170);
    section('🟫 판 바닥', FLOORS, 'floor', TOP + 370);
    this.add
      .text(GAME_WIDTH / 2, TOP + 580, '🎨 꾸미기 상자에서 새 모자와 바닥을 얻어요\n(모양만 바뀌고 강해지지는 않아요)', {
        fontFamily: FONT,
        fontSize: '20px',
        color: '#b9a48f',
        align: 'center',
      })
      .setOrigin(0.5, 0);
  }

  // ───────── 🏪 강화 ─────────

  drawUpgrades() {
    const save = getSave();
    SHOP_ITEMS.forEach((item, i) => {
      const y = TOP + i * 170;
      const lv = shopLevel(item.id);
      const maxed = lv >= item.max;
      const cost = shopCost(item, lv);
      const card = this.add.graphics();
      card.fillStyle(COLORS.hud, 1);
      card.fillRoundedRect(30, y, GAME_WIDTH - 60, 150, 20);
      this.add.text(60, y + 24, `${item.emoji} ${item.name}`, { fontFamily: FONT, fontSize: '30px', fontStyle: 'bold', color: COLORS.text });
      this.add.text(60, y + 72, `Lv.${lv} / ${item.max}`, { fontFamily: FONT, fontSize: '22px', color: '#d8c8b4' });
      this.add.text(60, y + 104, maxed ? `${item.effect(lv * item.per)} (최대)` : `${item.effect(lv * item.per)} → ${item.effect((lv + 1) * item.per)}`, {
        fontFamily: FONT,
        fontSize: '22px',
        color: COLORS.gold,
      });
      createButton(this, GAME_WIDTH - 140, y + 75, 180, 84, maxed ? 'MAX' : `${cost}팁`, () => {
        if (maxed || save.tips < cost) return;
        save.tips -= cost;
        save.shop[item.id] = lv + 1;
        writeSave();
        sfx.coin();
        ring(this, this.children, GAME_WIDTH - 140, y + 75, 0xffd54f, 60);
        burst(this, this.children, GAME_WIDTH - 140, y + 75, [0xffd54f, 0xfff8ec], 10);
        this.time.delayedCall(250, () => this.draw());
      }, { fontSize: 26, enabled: !maxed && save.tips >= cost });
    });
  }
}
