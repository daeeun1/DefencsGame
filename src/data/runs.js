// 한 판의 설정 (run). 어떤 판이든 GameScene은 이 설정대로 진행한다.
//   kind        'journey'(여정: 한 판으로 쭉) / 'daily'(오늘의 도전) / 'event'(이벤트)
//   title       시작할 때 보여 주는 이름
//   totalWaves  이 웨이브까지 버티면 클리어 (무한 모드는 Infinity)
//   bossAt(w)   그 웨이브에 나오는 보스 (없으면 undefined)
//   mix(wave)   그 웨이브에 나오는 손님 비율
//   hp, bossHp  손님, 보스 배고픔 배율 (함수면 웨이브마다 다르다)
//   hpWave      손님 배고픔을 계산할 때 쓰는 웨이브 (여정은 hp 함수가 다 계산하므로 1)
//   railLimit   식당 자리 (손님이 이만큼 쌓이면 망한다)
//   gimmick     주방 사고 (없으면 null)
//   floor       판 바닥 색 두 가지
//   cardWaves   레시피 카드를 고르는 웨이브
//   features    이번 판에 쓰는 기능 { combos, cards, mythic }
//   tipBonus    판 끝 팁 배율
//   rule        특별 규칙 (오늘의 도전 등, rules.js의 mergeRules 형식)
//   board       랭킹 이름 (없으면 랭킹에 안 올린다)

import { TOWNS, STAGES_PER_TOWN, TOWN_WAVES, hasFeature, townsOpen, townOfWave, bestWave } from './towns.js';
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

// ───────── 🗺️ 여정: 한 판으로 쭉 ─────────
// 웨이브 1~10 빵집 골목, 11~20 마을 시장 … 51~60 화산 바비큐, 61부터는 끝없이.
// 10웨이브마다 그 동네 보스. 동네가 바뀌면 손님과 판 바닥이 바뀐다.
// startTown: 출발할 동네 (보스를 이긴 동네의 다음 동네부터 고를 수 있다)

export const JOURNEY = {
  hpBase: 1.0, // 손님 배고픔 배율 (1웨이브)
  hpGrowth: 1.15, // 웨이브마다 배고픔이 몇 배씩 커지는지
  bossBase: 0.6, // 보스 배고픔 배율
  bossGrowth: 1.45, // 동네(보스)마다 보스 배고픔이 몇 배씩 커지는지
  railLimit: 40,
};

const BOSSES = ['owl', 'pig', 'lion', 'octopus', 'snowman', 'dragon'];

// 동네 5, 6의 주방 사고: 웨이브마다 돌아가며
const TOWN_GIMMICKS = { 4: ['sushi_bar', 'chinese', 'blackout'], 5: ['chinese', 'blackout', 'sushi_bar'] };

export function journeyRun(deck = STARTER_LINES, startTown = 0) {
  const startWave = startTown * TOWN_WAVES + 1;
  const best = bestWave();
  const reach = (wave) => Math.max(best, wave); // 한 번이라도 가 본 웨이브면 기능이 열려 있다
  return {
    kind: 'journey',
    startTown,
    startWave,
    title: startTown > 0 ? `${TOWNS[startTown].emoji} ${TOWNS[startTown].name}부터 출발!` : '🗺️ 여정 출발!',
    totalWaves: Infinity,
    bossAt: (wave) => (wave % TOWN_WAVES === 0 ? BOSSES[(wave / TOWN_WAVES - 1) % BOSSES.length] : undefined),
    mix: (wave) => journeyMix(wave),
    hp: (wave) => JOURNEY.hpBase * JOURNEY.hpGrowth ** (wave - 1),
    hpWave: 1,
    bossHp: (wave) => JOURNEY.bossBase * JOURNEY.bossGrowth ** Math.floor((wave - 1) / TOWN_WAVES) * (wave > 60 ? 1.5 : 1),
    railLimit: JOURNEY.railLimit,
    gimmickAt: (wave) => {
      const list = TOWN_GIMMICKS[townOfWave(wave)];
      return list ? GIMMICKS[list[wave % list.length]] : null;
    },
    floorAt: (wave) => TOWNS[townOfWave(wave)].floor,
    floor: TOWNS[startTown].floor,
    gimmick: null,
    // 레시피 카드: 21웨이브부터 5웨이브마다 (21, 26, 31 …)
    cardAt: (wave) => reach(wave) >= 21 && wave >= 21 && wave % 5 === 1,
    cardWaves: [],
    featuresAt: (wave) => ({ combos: reach(wave) >= 11, cards: reach(wave) >= 21, mythic: reach(wave) >= 31 }),
    features: { combos: reach(startWave) >= 11, cards: reach(startWave) >= 21, mythic: reach(startWave) >= 31 },
    tipBonus: 0.5,
    tipAt: (wave) => 0.5 + 0.1 * townOfWave(wave),
    deck,
    rule: {},
    board: 'endless',
    count: (wave) => 7 + Math.floor(((wave - 1) % TOWN_WAVES) / 2) + townOfWave(wave) + Math.floor(Math.max(0, wave - 60) / 10),
  };
}

// 여정의 손님 비율: 그 동네 손님 중 나올 차례가 된 손님 (from = 동네 안에서 몇 번째 웨이브부터)
function journeyMix(wave) {
  if (wave <= 2) return { mouse: 1 };
  const town = TOWNS[townOfWave(wave)];
  const local = ((wave - 1) % TOWN_WAVES) + 1;
  const mix = {};
  for (const [key, { w, from }] of Object.entries(town.mix)) if (local >= from) mix[key] = w;
  return mix;
}

// 중간에서 출발할 때 받는 출발 꾸러미: 골드와 희귀·영웅 요리 (동네가 뒤일수록 많이)
export function startKit(startTown) {
  return {
    gold: startTown * 180,
    rare: Math.min(8, startTown * 2),
    hero: Math.min(4, Math.max(0, startTown - 1)),
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
