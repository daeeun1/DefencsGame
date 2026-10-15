// 한 판의 설정 (run). 어떤 판이든 GameScene은 이 설정대로 진행한다.
//   kind        'stage'(동네 스테이지) / 'daily'(오늘의 도전) / 'endless'(무한 모드) / 'event'(이벤트)
//   title       시작할 때 보여 주는 이름
//   totalWaves  이 웨이브까지 버티면 클리어 (무한 모드는 Infinity)
//   bossAt(w)   그 웨이브에 나오는 보스 (없으면 undefined)
//   mix(wave)   그 웨이브에 나오는 손님 비율
//   hp, bossHp  손님, 보스 배고픔 배율
//   railLimit   식당 자리 (손님이 이만큼 쌓이면 망한다)
//   gimmick     주방 사고 (없으면 null)
//   floor       판 바닥 색 두 가지
//   cardWaves   레시피 카드를 고르는 웨이브
//   features    이번 판에 쓰는 기능 { combos, cards, mythic }
//   tipBonus    판 끝 팁 배율
//   rule        특별 규칙 (오늘의 도전 등, rules.js의 mergeRules 형식)
//   board       랭킹 이름 (없으면 랭킹에 안 올린다)

import { TOWNS, STAGES_PER_TOWN, stageId, hasFeature, townsOpen } from './towns.js';
import { monsterMixForWave, RAIL_LIMIT } from './balance.js';
import { STARTER_LINES } from './chefs.js';
import { KITCHENS } from './kitchens.js';
import { todaysSpecial, DAILY_TIP_BONUS } from './daily.js';

// 주방 사고 (data/kitchens.js의 기믹) id → { type, every, duration, ... }
const GIMMICKS = Object.fromEntries(KITCHENS.filter((k) => k.gimmick).map((k) => [k.id, k.gimmick]));

// 지금 열린 기능
function features() {
  return { combos: hasFeature('combos'), cards: hasFeature('cards'), mythic: hasFeature('mythic') };
}

// 🗺️ 동네 스테이지. town: 0~5, stage: 1~10
export function stageRun(town, stage, deck = STARTER_LINES) {
  const t = TOWNS[town];
  const isBoss = stage === STAGES_PER_TOWN;
  const totalWaves = t.waves + (isBoss ? 2 : 0);
  const gimmickId = t.gimmicks?.[stage];
  return {
    kind: 'stage',
    town,
    stage,
    id: stageId(town, stage),
    title: `${t.emoji} ${t.name} ${stage}`,
    totalWaves,
    bossAt: (wave) => (isBoss && wave === totalWaves ? t.boss : undefined),
    mix: (wave) => townMix(t, stage, wave),
    hp: t.hp * (1 + 0.07 * (stage - 1)),
    bossHp: t.bossHp,
    railLimit: 40,
    gimmick: gimmickId ? GIMMICKS[gimmickId] : null,
    floor: t.floor,
    cardWaves: [4, 8, 12].filter((w) => w < totalWaves),
    features: features(),
    tipBonus: 1 + town * 0.25,
    deck,
    rule: {},
    // 웨이브마다 손님 수 (동네가 뒤로 갈수록 많아진다)
    count: (wave) => 7 + Math.floor(wave / 2) + town,
  };
}

// 스테이지에 나오는 손님 비율: 아직 나올 차례가 아닌 손님(from)을 빼고,
// 첫 두 웨이브는 가장 흔한 손님만 나온다
function townMix(town, stage, wave) {
  const mix = {};
  for (const [key, { w, from }] of Object.entries(town.mix)) if (stage >= from) mix[key] = w;
  if (wave <= 2) {
    const [first] = Object.entries(mix).sort((a, b) => b[1] - a[1]);
    return { [first[0]]: 1 };
  }
  return mix;
}

// 🏆 오늘의 도전: 모두 같은 운, 같은 덱(기본 4줄), 30웨이브 (끝까지 가기 어렵게: 몇 웨이브까지 가는지로 겨룬다)
export function dailyRun() {
  const daily = todaysSpecial();
  return {
    kind: 'daily',
    daily,
    title: `🏆 오늘의 도전\n${daily.special.emoji} ${daily.special.name}`,
    totalWaves: 30,
    bossAt: (wave) => ({ 10: 'owl', 20: 'pig', 30: 'dragon' })[wave],
    mix: (wave) => monsterMixForWave(wave),
    hp: 1.8,
    bossHp: 0.8,
    railLimit: RAIL_LIMIT - 10,
    gimmick: daily.kitchen.gimmick,
    floor: daily.kitchen.floor,
    cardWaves: [6, 11, 16, 21, 26],
    features: { combos: true, cards: true, mythic: false },
    tipBonus: DAILY_TIP_BONUS * 1.5,
    deck: STARTER_LINES,
    rule: daily.special.rule,
    board: daily.boardId,
    count: (wave) => 8 + Math.floor(wave / 2),
  };
}

// ♾️ 무한 모드: 끝없이 웨이브가 이어진다. 10웨이브마다 보스. 몇 웨이브까지 버티는지 랭킹
export function endlessRun(deck = STARTER_LINES) {
  const bosses = ['owl', 'pig', 'lion', 'octopus', 'snowman', 'dragon'];
  return {
    kind: 'endless',
    title: '♾️ 무한 모드',
    totalWaves: Infinity,
    bossAt: (wave) => (wave % 10 === 0 ? bosses[(wave / 10 - 1) % bosses.length] : undefined),
    mix: (wave) => monsterMixForWave(wave),
    hp: 1.3,
    bossHp: 0.6,
    // 보스는 한 바퀴(60웨이브)를 돌 때마다 2배 더 배고프다
    bossScale: (wave) => 2 ** Math.floor((wave - 1) / 60),
    railLimit: RAIL_LIMIT,
    gimmick: null,
    floor: [0xf2d4c4, 0xe6b9a2],
    cardWaves: [6, 11, 16, 21, 26, 31, 36, 41, 46, 51, 56],
    features: { combos: true, cards: true, mythic: true },
    tipBonus: 2,
    deck,
    rule: {},
    board: 'endless',
    count: (wave) => 8 + Math.floor(Math.min(wave, 60) / 2),
  };
}

// 🎉 이벤트 스테이지: 지금 열린 가장 먼 동네 난이도, 15웨이브, 마지막에 그 동네 보스
export function eventRun(event, deck = STARTER_LINES) {
  const town = Math.min(townsOpen(), TOWNS.length) - 1;
  const t = TOWNS[town];
  const totalWaves = 15;
  const bosses = ['owl', 'pig', 'lion', 'octopus', 'snowman', 'dragon'].slice(0, town + 1);
  const bossAt = event.bossEvery
    ? (wave) => (wave % event.bossEvery === 0 ? bosses[(wave / event.bossEvery - 1) % bosses.length] : undefined)
    : (wave) => (wave === totalWaves ? event.boss ?? t.boss : undefined);
  return {
    kind: 'event',
    event,
    title: `${event.emoji} ${event.name}`,
    totalWaves,
    bossAt,
    mix: (wave) => {
      const mix = { ...townMix(t, STAGES_PER_TOWN, wave) };
      if (wave > 2) for (const [key, w] of Object.entries(event.add ?? {})) mix[key] = w;
      return mix;
    },
    hp: t.hp,
    bossHp: t.bossHp,
    railLimit: 40,
    gimmick: null,
    floor: t.floor,
    cardWaves: [4, 8, 12],
    features: features(),
    tipBonus: 1.5 + town * 0.25,
    deck,
    rule: event.rule ?? {},
    count: (wave) => 7 + Math.floor(wave / 2) + town,
  };
}
