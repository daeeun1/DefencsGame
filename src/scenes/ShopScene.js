import Phaser from 'phaser';
import { GAME_WIDTH, COLORS, FONT, EMOJI_FONT } from '../config.js';
import { createButton } from '../ui.js';
import { playMusic, sfx } from '../audio.js';
import { getSave, writeSave } from '../save.js';
import { METHODS } from '../data/chefs.js';
import { revealEffect } from '../effects.js';
import { BOXES, TOOLS, TOOL_SLOTS, TOOL_ODDS, STYLE_ODDS, TOOL_MAX_LEVEL, ITEM_TIERS, openBox, freeBoxReady, toolById, toolEffect, effectText } from '../data/items.js';
import { COSMETICS, COSMETIC_SLOTS, THEMES, cosmeticById, themeById, isAvailable, themeProgress } from '../data/cosmetics.js';
import { currentEvent } from '../data/events.js';

const TABS = [
  { id: 'box', label: '🎁 상자' },
  { id: 'tools', label: '🔪 도구' },
  { id: 'style', label: '🎨 꾸미기' },
];
const TOP = 230; // 탭 아래 내용이 시작하는 높이

// 🏪 가게: 팁을 쓰는 곳.
// 🎁 상자(도구·레시피·꾸미기 뽑기) / 🔪 도구(칼·냄비·옷 장착) / 🎨 꾸미기
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
    this.add
      .text(GAME_WIDTH / 2, 92, `🪙 팁 ${save.tips}`, { fontFamily: FONT, fontSize: '26px', fontStyle: 'bold', color: COLORS.gold })
      .setOrigin(0.5);
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
    else this.drawStyle();
  }

  // ───────── 🎁 상자 ─────────

  drawBoxes() {
    const save = getSave();
    // 위: 🆓 오늘 무료 꾸미기 상자
    const free = freeBoxReady();
    const freeButton = createButton(this, GAME_WIDTH / 2, TOP + 32, GAME_WIDTH - 60, 64, free ? '🆓 오늘의 무료 꾸미기 상자 열기!' : '🆓 무료 상자는 내일 또 열려요', () => this.open('style', 'free'), {
      fontSize: 26,
      color: 0x3f9a4a,
      enabled: free,
    });
    if (free) this.tweens.add({ targets: freeButton, scale: 1.04, duration: 450, yoyo: true, repeat: -1 });

    const odds = (o) =>
      Object.entries(o)
        .map(([tier, w]) => `${ITEM_TIERS[tier].name} ${w}%`)
        .join(' · ');
    BOXES.forEach((box, i) => {
      const y = TOP + 84 + i * 200;
      const g = this.add.graphics();
      g.fillStyle(COLORS.hud, 1);
      g.fillRoundedRect(30, y, GAME_WIDTH - 60, 186, 22);
      g.lineStyle(4, box.color, 1);
      g.strokeRoundedRect(30, y, GAME_WIDTH - 60, 186, 22);
      const icon = this.add.text(100, y + 80, box.emoji, { fontFamily: EMOJI_FONT, fontSize: '76px' }).setOrigin(0.5);
      this.tweens.add({ targets: icon, angle: { from: -6, to: 6 }, duration: 600 + i * 120, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.add.text(180, y + 32, box.name, { fontFamily: FONT, fontSize: '30px', fontStyle: 'bold', color: COLORS.text }).setOrigin(0, 0.5);
      this.add
        .text(180, y + 72, box.desc, { fontFamily: FONT, fontSize: '19px', color: '#d8c8b4', wordWrap: { width: GAME_WIDTH - 230 } })
        .setOrigin(0, 0.5);
      const info = [];
      if (box.id === 'tool') info.push(odds(TOOL_ODDS));
      if (box.id === 'style') info.push(odds(STYLE_ODDS));
      if (box.pity) info.push(`전설까지 최대 ${box.pity - (save.pity?.[box.id] ?? 0)}번`);
      if (info.length) this.add.text(180, y + 106, info.join('  ·  '), { fontFamily: FONT, fontSize: '15px', color: '#b9a48f' }).setOrigin(0, 0.5);
      createButton(this, GAME_WIDTH - 150, y + 150, 200, 54, `🪙 ${box.cost}`, () => this.open(box.id, 'tips'), {
        fontSize: 24,
        color: box.color,
        enabled: save.tips >= box.cost,
      });
    });
  }

  // 상자 열기: 상자가 흔들리다 펑! 하고 나온 것을 보여 준다
  open(boxId, pay = 'tips') {
    const result = openBox(boxId, pay);
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
    if (!layer.scene) return; // 그사이 화면이 바뀌었다
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
    } else {
      const slot = COSMETIC_SLOTS.find((x) => x.id === result.item.slot);
      emoji = result.item.emoji;
      title = `[${tier.name}] ${result.item.name}`;
      sub = result.isNew
        ? `✨ 새 ${slot.name}! (${themeById(result.item.theme).emoji} ${themeById(result.item.theme).name} 세트)\n🎨 꾸미기에서 써 보세요`
        : `이미 가진 꾸미기 → 🪙 팁 ${result.refund} 돌려받기`;
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
      this.open(result.box.id, 'tips');
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
    save.cosmetics ??= [];
    this.styleSlot ??= 'hat';
    const eventId = currentEvent().id;

    // 미리 보기: 레일 한 줄, 판 바닥 두 칸, 모자 쓴 요리, 날아가는 꼬리, 배부른 생쥐
    const wear = (slot) => cosmeticById(save.wear[slot]);
    const floor = wear('floor')?.colors ?? [0xf3e3c3, 0xe8d3ab];
    const rail = wear('rail')?.rail ?? [COLORS.rail, COLORS.railStripe, COLORS.railSlat];
    const py = TOP + 20;
    this.add.rectangle(GAME_WIDTH / 2, py + 30, GAME_WIDTH - 60, 60, rail[0]);
    this.add.rectangle(GAME_WIDTH / 2, py + 30, GAME_WIDTH - 72, 44, rail[1]);
    for (let x = 50; x < GAME_WIDTH - 40; x += 26) this.add.rectangle(x, py + 30, 8, 40, rail[2]);
    this.add.text(GAME_WIDTH - 110, py + 26, '🐭', { fontFamily: EMOJI_FONT, fontSize: '42px' }).setOrigin(0.5);
    const feed = wear('feed')?.emojis ?? ['😋'];
    feed.forEach((e, i) => this.add.text(GAME_WIDTH - 150 + i * 36, py - 6, e, { fontFamily: EMOJI_FONT, fontSize: '26px' }).setOrigin(0.5));
    this.add.rectangle(150, py + 120, 110, 110, floor[0]);
    this.add.rectangle(260, py + 120, 110, 110, floor[1]);
    this.add.text(150, py + 128, '🌾', { fontFamily: EMOJI_FONT, fontSize: '54px' }).setOrigin(0.5);
    if (wear('hat')) this.add.text(144, py + 82, wear('hat').emoji, { fontFamily: EMOJI_FONT, fontSize: '30px' }).setOrigin(0.5).setAngle(-12);
    const trail = wear('trail')?.emojis ?? [];
    for (let i = 0; i < 4; i++) {
      const t = i / 4;
      const x = 330 + t * 230;
      const y = py + 120 - Math.sin(t * Math.PI) * 60;
      if (i === 3) this.add.text(x, y, '🥖', { fontFamily: EMOJI_FONT, fontSize: '34px' }).setOrigin(0.5);
      else if (trail.length) this.add.text(x, y, trail[i % trail.length], { fontFamily: EMOJI_FONT, fontSize: '22px' }).setOrigin(0.5).setAlpha(0.4 + t * 0.6);
    }
    const title = THEMES.find((t) => t.id === save.wear.title)?.title;
    this.add
      .text(GAME_WIDTH / 2, py + 200, title ? `칭호: ${title}` : `모은 꾸미기 ${save.cosmetics.length}/${COSMETICS.length}`, {
        fontFamily: FONT,
        fontSize: '22px',
        color: COLORS.gold,
      })
      .setOrigin(0.5);

    // 칸 고르기 (+ 세트)
    const chips = [...COSMETIC_SLOTS, { id: 'sets', emoji: '🏅', name: '세트' }];
    const cw = (GAME_WIDTH - 40) / chips.length;
    const chipY = py + 250;
    chips.forEach((chip, i) => {
      const x = 20 + i * cw + cw / 2;
      const on = chip.id === this.styleSlot;
      const bg = this.add.rectangle(x, chipY, cw - 6, 58, on ? 0x8e4fc0 : 0x3d2a1e).setInteractive({ useHandCursor: true });
      this.add.text(x, chipY, `${chip.emoji}\n${chip.name}`, { fontFamily: FONT, fontSize: '16px', color: on ? COLORS.text : '#b9a48f', align: 'center' }).setOrigin(0.5);
      bg.on('pointerup', () => {
        sfx.click();
        this.styleSlot = chip.id;
        this.draw();
      });
    });

    const gridTop = chipY + 60;
    if (this.styleSlot === 'sets') return this.drawSets(gridTop);

    // 그 칸의 꾸미기 (없음 + 전부)
    const items = [{ id: null, emoji: '🚫', name: '없음', tier: 1, theme: 'basic' }, ...COSMETICS.filter((c) => c.slot === this.styleSlot)];
    const perRow = 5;
    const size = (GAME_WIDTH - 40) / perRow;
    items.forEach((item, i) => {
      const x = 20 + (i % perRow) * size + size / 2;
      const y = gridTop + 55 + Math.floor(i / perRow) * 130;
      const have = item.id === null || save.cosmetics.includes(item.id);
      const on = (save.wear[this.styleSlot] ?? null) === item.id;
      const available = item.id === null || isAvailable(item, eventId);
      this.add.circle(x, y, 42, have ? ITEM_TIERS[item.tier].color : 0x5a4a3e, have ? 0.85 : 1).setStrokeStyle(on ? 6 : 3, on ? 0xffd54f : 0x2b1d14);
      this.add
        .text(x, y, have ? item.emoji : available ? '?' : '🔒', { fontFamily: have || !available ? EMOJI_FONT : FONT, fontSize: have ? '40px' : '34px', fontStyle: 'bold', color: '#b9a48f' })
        .setOrigin(0.5);
      const theme = themeById(item.theme);
      this.add
        .text(x, y + 50, have ? item.name : `${theme.emoji} ${ITEM_TIERS[item.tier].name}`, {
          fontFamily: FONT,
          fontSize: '15px',
          color: have ? COLORS.text : '#8a7a6a',
          align: 'center',
          wordWrap: { width: size - 6, useAdvancedWrap: true },
        })
        .setOrigin(0.5, 0);
      const hit = this.add.circle(x, y, 46, 0, 0).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => {
        if (have) {
          sfx.click();
          save.wear[this.styleSlot] = item.id;
          writeSave();
          return this.draw();
        }
        if (!available) return this.toast(`${theme.emoji} ${theme.name} 이벤트 때만 얻을 수 있어요`);
        this.toast('🎨 꾸미기 상자에서 나와요');
      });
    });
  }

  // 🏅 세트: 테마마다 모은 개수, 다 모으면 칭호를 고를 수 있다
  drawSets(top) {
    const save = getSave();
    const eventId = currentEvent().id;
    const eventTag = (theme) => (!theme.event ? '' : theme.event === eventId ? ' 🎉지금!' : ' 🔒이벤트');
    themeProgress(save.cosmetics).forEach(({ theme, have, total, done }, i) => {
      const y = top + 20 + i * 76;
      const g = this.add.graphics();
      g.fillStyle(done ? 0x5a3d2a : 0x3d2a1e, 1);
      g.fillRoundedRect(30, y, GAME_WIDTH - 60, 66, 16);
      if (save.wear.title === theme.id) {
        g.lineStyle(4, 0xffd54f, 1);
        g.strokeRoundedRect(30, y, GAME_WIDTH - 60, 66, 16);
      }
      this.add.text(60, y + 33, `${theme.emoji} ${theme.name} 세트`, { fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: COLORS.text }).setOrigin(0, 0.5);
      const items = COSMETICS.filter((c) => c.theme === theme.id)
        .map((c) => (save.cosmetics.includes(c.id) ? c.emoji : '·'))
        .join(' ');
      this.add.text(290, y + 33, items, { fontFamily: EMOJI_FONT, fontSize: '22px', color: '#8a7a6a' }).setOrigin(0, 0.5);
      this.add
        .text(GAME_WIDTH - 50, y + 33, done ? (save.wear.title === theme.id ? '✅ 칭호' : '칭호 달기') : `${have}/${total}${eventTag(theme)}`, {
          fontFamily: FONT,
          fontSize: '20px',
          color: done ? COLORS.gold : '#b9a48f',
        })
        .setOrigin(1, 0.5);
      if (done) {
        const hit = this.add.rectangle(30, y, GAME_WIDTH - 60, 66, 0, 0).setOrigin(0).setInteractive({ useHandCursor: true });
        hit.on('pointerup', () => {
          sfx.upgrade();
          save.wear.title = save.wear.title === theme.id ? null : theme.id;
          writeSave();
          this.draw();
        });
      }
    });
  }

  toast(message) {
    const t = this.add
      .text(GAME_WIDTH / 2, this.scale.height - 120, message, { fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: COLORS.text, backgroundColor: '#2b1d14', padding: { x: 16, y: 10 } })
      .setOrigin(0.5)
      .setDepth(30);
    this.tweens.add({ targets: t, alpha: 0, delay: 1500, duration: 400, onComplete: () => t.destroy() });
  }
}
