// 🎁 상자와 아이템: 팁으로 상자를 열어 주방 도구, 레시피 경험치, 꾸미기를 얻는다.
//
// 🔪 주방 도구: 칼, 냄비, 옷 3칸에 하나씩 장착한다. 같은 도구가 또 나오면 레벨이 오른다 (최대 5).
//   레벨이 1 오를 때마다 효과가 25%씩 커진다.
//   effect 종류: speed(모든 칼질 속도 +비율), lineSpeed{줄}, damage(모든 요리 양 +비율), lineDamage{줄},
//                startGold(시작 골드), hand(손 힘 최대), summonDiscount(뽑기 비용 -), tips(판 끝 팁 +비율)
// 🎨 꾸미기: 요리 위에 쓰는 모자, 판 바닥 색. 강해지지는 않고 모양만 바뀐다.

import { getSave, writeSave } from '../save.js';

export const ITEM_TIERS = {
  1: { name: '일반', color: 0xb8b8b8 },
  2: { name: '희귀', color: 0x4a90e2 },
  3: { name: '영웅', color: 0x9b59b6 },
  4: { name: '전설', color: 0xf39c12 },
};

export const TOOL_MAX_LEVEL = 5;

export const TOOL_SLOTS = [
  { id: 'knife', emoji: '🔪', name: '칼' },
  { id: 'pan', emoji: '🍳', name: '냄비' },
  { id: 'coat', emoji: '🥼', name: '옷' },
];

export const TOOLS = [
  // 🔪 칼: 칼질 속도
  { id: 'kitchen_knife', slot: 'knife', tier: 1, emoji: '🔪', name: '식칼', effect: { speed: 0.04 } },
  { id: 'bread_knife', slot: 'knife', tier: 1, emoji: '🔪', name: '빵칼', effect: { lineSpeed: { cut: 0.12 } } },
  { id: 'sashimi_knife', slot: 'knife', tier: 2, emoji: '🔪', name: '회칼', effect: { speed: 0.08 } },
  { id: 'twin_knife', slot: 'knife', tier: 3, emoji: '⚔️', name: '쌍칼', effect: { speed: 0.12 } },
  { id: 'golden_knife', slot: 'knife', tier: 4, emoji: '🗡️', name: '전설의 황금 칼', effect: { speed: 0.2 } },
  // 🍳 냄비: 요리 양
  { id: 'tin_pot', slot: 'pan', tier: 1, emoji: '🍳', name: '양은 냄비', effect: { damage: 0.04 } },
  { id: 'earthen_pot', slot: 'pan', tier: 1, emoji: '🍲', name: '뚝배기', effect: { lineDamage: { boil: 0.12 } } },
  { id: 'iron_pot', slot: 'pan', tier: 2, emoji: '🍳', name: '무쇠 솥', effect: { damage: 0.08 } },
  { id: 'copper_pot', slot: 'pan', tier: 3, emoji: '🥘', name: '구리 냄비', effect: { damage: 0.12 } },
  { id: 'rainbow_pot', slot: 'pan', tier: 4, emoji: '🌈', name: '전설의 무지개 냄비', effect: { damage: 0.2 } },
  // 🥼 옷: 골드, 손 힘, 팁
  { id: 'cotton_apron', slot: 'coat', tier: 1, emoji: '🥼', name: '면 앞치마', effect: { startGold: 15 } },
  { id: 'gloves', slot: 'coat', tier: 1, emoji: '🧤', name: '주방 장갑', effect: { hand: 2 } },
  { id: 'check_apron', slot: 'coat', tier: 2, emoji: '🥼', name: '체크 앞치마', effect: { startGold: 25, tips: 0.05 } },
  { id: 'chef_coat', slot: 'coat', tier: 3, emoji: '🥼', name: '셰프 가운', effect: { startGold: 40, hand: 3 } },
  { id: 'star_coat', slot: 'coat', tier: 4, emoji: '🌟', name: '전설의 별 가운', effect: { startGold: 50, summonDiscount: 2, tips: 0.1 } },
];

// 🎨 꾸미기
export const HATS = [
  { id: 'ribbon', tier: 1, emoji: '🎀', name: '리본' },
  { id: 'cap', tier: 1, emoji: '🧢', name: '야구 모자' },
  { id: 'straw', tier: 2, emoji: '👒', name: '밀짚모자' },
  { id: 'silk', tier: 3, emoji: '🎩', name: '실크햇' },
  { id: 'crown', tier: 4, emoji: '👑', name: '왕관' },
];

export const FLOORS = [
  { id: 'mint', tier: 1, emoji: '🍃', name: '민트 체크', colors: [0xd9f2e6, 0xc2e6d4] },
  { id: 'strawberry', tier: 1, emoji: '🍓', name: '딸기 우유', colors: [0xfde2ea, 0xf6c9d7] },
  { id: 'night', tier: 2, emoji: '🌙', name: '밤하늘', colors: [0x4a4f80, 0x3c406c] },
  { id: 'sakura', tier: 3, emoji: '🌸', name: '벚꽃', colors: [0xffe4f0, 0xf6c2da] },
  { id: 'gold', tier: 4, emoji: '✨', name: '황금 주방', colors: [0xffe9a8, 0xf5d77a] },
];

// 🎁 상자
export const BOXES = [
  { id: 'tool', emoji: '🎁', name: '도구 상자', desc: '칼·냄비·옷 중 하나. 같은 도구면 레벨 업!', cost: 100, color: 0xe85d3a },
  { id: 'recipe', emoji: '📖', name: '레시피 상자', desc: '내 레시피 줄 하나에 경험치 (가끔 대박)', cost: 60, color: 0x3f9a4a },
  { id: 'style', emoji: '🎨', name: '꾸미기 상자', desc: '새 모자나 판 바닥 (못 가진 것만 나와요)', cost: 80, color: 0x8e4fc0 },
];

// 상자에서 나오는 등급 확률
export const TOOL_ODDS = { 1: 70, 2: 22, 3: 7, 4: 1 };
const STYLE_ODDS = { 1: 60, 2: 28, 3: 10, 4: 2 };
// 레시피 상자 경험치: 75% 작게, 20% 중간, 5% 대박
const RECIPE_XP = [
  { xp: 30, w: 75 },
  { xp: 80, w: 20 },
  { xp: 200, w: 5, big: true },
];

export function toolById(id) {
  return TOOLS.find((t) => t.id === id);
}

export function cosmeticById(id) {
  return HATS.find((h) => h.id === id) ?? FLOORS.find((f) => f.id === id);
}

// 레벨이 반영된 도구 효과 (레벨 1마다 25%씩 커진다)
export function toolEffect(tool, level) {
  const scale = 1 + 0.25 * (level - 1);
  const out = {};
  for (const [key, value] of Object.entries(tool.effect)) {
    if (typeof value === 'object') out[key] = Object.fromEntries(Object.entries(value).map(([k, v]) => [k, v * scale]));
    else out[key] = key === 'startGold' || key === 'hand' || key === 'summonDiscount' ? Math.round(value * scale) : value * scale;
  }
  return out;
}

// 효과를 글로 ("칼질 속도 +4%")
export function effectText(effect) {
  const pct = (v) => `+${Math.round(v * 100)}%`;
  const parts = [];
  for (const [key, value] of Object.entries(effect)) {
    if (key === 'speed') parts.push(`칼질 속도 ${pct(value)}`);
    else if (key === 'damage') parts.push(`요리 양 ${pct(value)}`);
    else if (key === 'lineSpeed') for (const [line, v] of Object.entries(value)) parts.push(`${lineName(line)} 칼질 ${pct(v)}`);
    else if (key === 'lineDamage') for (const [line, v] of Object.entries(value)) parts.push(`${lineName(line)} 요리 양 ${pct(v)}`);
    else if (key === 'startGold') parts.push(`시작 골드 +${value}`);
    else if (key === 'hand') parts.push(`손 힘 +${value}`);
    else if (key === 'summonDiscount') parts.push(`뽑기 비용 -${value}`);
    else if (key === 'tips') parts.push(`팁 ${pct(value)}`);
  }
  return parts.join(', ');
}

const LINE_NAMES = { cut: '🍞빵', grill: '🍖고기', chill: '🍰디저트', boil: '🍲국물' };
function lineName(line) {
  return LINE_NAMES[line] ?? line;
}

function noEffects() {
  return { speed: 0, damage: 0, lineSpeed: {}, lineDamage: {}, startGold: 0, hand: 0, summonDiscount: 0, tips: 0 };
}

// 지금 장착한 도구 효과를 모두 더한 값 (게임 시작할 때 쓴다)
export function equippedEffects() {
  const save = getSave();
  const total = noEffects();
  for (const id of Object.values(save.equipped ?? {})) {
    const tool = toolById(id);
    const level = save.tools?.[id];
    if (!tool || !level) continue;
    for (const [key, value] of Object.entries(toolEffect(tool, level))) {
      if (typeof value === 'object') for (const [line, v] of Object.entries(value)) total[key][line] = (total[key][line] ?? 0) + v;
      else total[key] += value;
    }
  }
  return total;
}

equippedEffects.empty = noEffects; // 도구를 쓰지 않는 판 (오늘의 도전)

// 지금 쓰고 있는 모자 이모지, 판 바닥 색 (없으면 null)
export function wornHat() {
  return HATS.find((h) => h.id === getSave().wear?.hat)?.emoji ?? null;
}
export function wornFloor() {
  return FLOORS.find((f) => f.id === getSave().wear?.floor)?.colors ?? null;
}

function pickWeighted(entries, rnd = Math.random) {
  const total = entries.reduce((sum, e) => sum + e.w, 0);
  let r = rnd() * total;
  for (const e of entries) {
    r -= e.w;
    if (r < 0) return e;
  }
  return entries[entries.length - 1];
}

// 상자를 연다. 팁이 모자라면 null. 결과: { box, kind, item?, tier, level?, isNew?, line?, xp?, big?, refund? }
export function openBox(boxId, rnd = Math.random) {
  const box = BOXES.find((b) => b.id === boxId);
  const save = getSave();
  if (!box || save.tips < box.cost) return null;
  save.tips -= box.cost;
  let result;

  if (box.id === 'tool') {
    const tier = Number(pickWeighted(Object.entries(TOOL_ODDS).map(([t, w]) => ({ t, w })), rnd).t);
    const pool = TOOLS.filter((t) => t.tier === tier);
    const tool = pool[Math.floor(rnd() * pool.length)];
    save.tools ??= {};
    const before = save.tools[tool.id] ?? 0;
    const level = Math.min(TOOL_MAX_LEVEL, before + 1);
    save.tools[tool.id] = level;
    // 빈 칸이면 바로 장착
    save.equipped ??= {};
    if (!save.equipped[tool.slot]) save.equipped[tool.slot] = tool.id;
    result = { kind: 'tool', item: tool, tier, level, isNew: before === 0, maxed: before >= TOOL_MAX_LEVEL };
    // 이미 최대 레벨이면 팁 절반을 돌려준다
    if (result.maxed) save.tips += Math.floor(box.cost / 2);
  } else if (box.id === 'recipe') {
    const roll = pickWeighted(RECIPE_XP, rnd);
    const line = save.lines[Math.floor(rnd() * save.lines.length)];
    save.lineXp ??= {};
    save.lineXp[line] = (save.lineXp[line] ?? 0) + roll.xp;
    result = { kind: 'recipe', line, xp: roll.xp, big: Boolean(roll.big), tier: roll.big ? 4 : roll.xp > 30 ? 2 : 1 };
  } else {
    save.cosmetics ??= [];
    const left = [...HATS, ...FLOORS].filter((c) => !save.cosmetics.includes(c.id));
    if (left.length === 0) {
      save.tips += box.cost; // 다 모았으면 돌려준다
      result = { kind: 'style', refund: box.cost, tier: 1 };
    } else {
      const item = pickWeighted(left.map((c) => ({ ...c, w: STYLE_ODDS[c.tier] })), rnd);
      save.cosmetics.push(item.id);
      result = { kind: 'style', item: cosmeticById(item.id), tier: item.tier, isNew: true, hat: HATS.some((h) => h.id === item.id) };
    }
  }
  writeSave();
  return { box, ...result };
}
