// 🗺️ 동네 지도: 동네 6개 × 스테이지 10개.
// 스테이지를 깨면 다음 스테이지가 열리고, 동네 마지막(10번) 스테이지에서 보스 손님 배를 채우면 다음 동네가 열린다.
// 새 동네가 열릴 때마다 기능이나 레시피 줄이 하나씩 늘어난다 (opens, newLine).
//
// mix: 이 동네에 나오는 손님과 비율. from: 이 스테이지부터 나온다
// hp: 이 동네 손님 배고픔 배율 (스테이지가 오를수록 조금씩 더 커진다)
// waves: 스테이지 하나의 웨이브 수 (보스 스테이지는 2웨이브 더 길고, 마지막 웨이브에 보스가 나온다)
// bossHp: 보스 배고픔 배율
// gimmicks: 스테이지 번호 → 주방 사고 (data/kitchens.js의 기믹)

import { getSave } from '../save.js';

export const STAGES_PER_TOWN = 10;

// 별 기준: 스테이지 동안 레일에 가장 많이 쌓였던 손님 수 / 식당 자리
export const STAR_LINES = { three: 0.35, two: 0.65 };

export const TOWNS = [
  {
    id: 'bakery',
    emoji: '🥐',
    name: '빵집 골목',
    desc: '처음 문을 연 작은 빵집. 생쥐와 강아지가 단골이에요',
    color: 0xf3e3c3,
    floor: [0xf3e3c3, 0xe8d3ab],
    mix: { mouse: { w: 3, from: 1 }, dog: { w: 2, from: 3 } },
    hp: 1.5,
    waves: 8,
    boss: 'owl',
    bossHp: 0.9,
    opens: '뽑기와 합치기',
  },
  {
    id: 'market',
    emoji: '🧺',
    name: '마을 시장',
    desc: '시장 사람들이 몰려와요. 고양이는 빠르고 곰은 배가 커요',
    color: 0xf6d9c8,
    floor: [0xf6d9c8, 0xebc1a8],
    mix: { mouse: { w: 2, from: 1 }, dog: { w: 2, from: 1 }, cat: { w: 3, from: 1 }, bear: { w: 1, from: 4 } },
    hp: 3.6,
    waves: 10,
    boss: 'pig',
    bossHp: 1.47,
    opens: '🍱 합작 요리, 🏪 가게',
  },
  {
    id: 'forest',
    emoji: '🌳',
    name: '숲속 카페',
    desc: '토끼는 아주 빠르고, 암탉은 병아리를 데려와요',
    color: 0xd9ecc8,
    floor: [0xd9ecc8, 0xc4dfae],
    mix: {
      mouse: { w: 1, from: 1 },
      cat: { w: 2, from: 1 },
      bear: { w: 1, from: 1 },
      rabbit: { w: 2, from: 1 },
      hen: { w: 1, from: 3 },
      panda: { w: 2, from: 5 },
    },
    hp: 4.4,
    waves: 12,
    boss: 'lion',
    bossHp: 2.0,
    opens: '📜 레시피 카드, 🍜 면 줄',
    newLine: 'noodle',
  },
  {
    id: 'beach',
    emoji: '🏖️',
    name: '바닷가 횟집',
    desc: '여우는 입맛이 까다롭고, 갈매기는 날쌔요',
    color: 0xe6f0f2,
    floor: [0xe6f0f2, 0xcfe0e4],
    mix: {
      dog: { w: 2, from: 1 },
      cat: { w: 1, from: 1 },
      rabbit: { w: 1, from: 1 },
      hen: { w: 1, from: 1 },
      fox: { w: 2, from: 1 },
      seagull: { w: 2, from: 3 },
      panda: { w: 1, from: 5 },
    },
    hp: 5.2,
    waves: 12,
    boss: 'octopus',
    bossHp: 1.65,
    opens: '🍽️ 풀코스 요리, 🦐 해산물 줄',
    newLine: 'sea',
  },
  {
    id: 'snow',
    emoji: '🏔️',
    name: '눈산 오두막',
    desc: '추운 오두막 주방에 사고가 자꾸 나요 (불, 정전, 빠른 레일)',
    color: 0xe4e8f2,
    floor: [0xe4e8f2, 0xcfd6e6],
    mix: {
      bear: { w: 2, from: 1 },
      rabbit: { w: 1, from: 1 },
      fox: { w: 1, from: 1 },
      seagull: { w: 1, from: 1 },
      penguin: { w: 3, from: 1 },
      seal: { w: 2, from: 3 },
    },
    hp: 6.0,
    waves: 14,
    boss: 'snowman',
    bossHp: 2.1,
    opens: '🔥 주방 사고, 🧋 음료 줄',
    newLine: 'drink',
    gimmicks: { 2: 'sushi_bar', 3: 'chinese', 5: 'blackout', 6: 'sushi_bar', 7: 'chinese', 8: 'blackout', 9: 'chinese' },
  },
  {
    id: 'volcano',
    emoji: '🌋',
    name: '화산 바비큐',
    desc: '뜨거운 화산 옆 바비큐 집. 미식 드래곤이 기다려요',
    color: 0xf2d4c4,
    floor: [0xf2d4c4, 0xe6b9a2],
    mix: {
      dog: { w: 1, from: 1 },
      panda: { w: 1, from: 1 },
      fox: { w: 1, from: 1 },
      seal: { w: 1, from: 1 },
      penguin: { w: 1, from: 1 },
      lizard: { w: 3, from: 1 },
      boar: { w: 2, from: 3 },
      raccoon: { w: 2, from: 5 },
    },
    hp: 7.8,
    waves: 15,
    boss: 'dragon',
    bossHp: 1.95,
    opens: '♾️ 무한 모드, 🍤 튀김 줄',
    newLine: 'fry',
    gimmicks: { 1: 'chinese', 3: 'sushi_bar', 4: 'chinese', 6: 'blackout', 7: 'chinese', 8: 'sushi_bar', 9: 'blackout' },
  },
];

export function stageId(town, stage) {
  return `${TOWNS[town].id}-${stage}`;
}

// 스테이지 최고 별 (안 깼으면 0)
export function stageStars(town, stage) {
  return getSave().stages?.[stageId(town, stage)] ?? 0;
}

// 이 스테이지를 할 수 있는지: 첫 스테이지이거나 바로 앞 스테이지를 깼으면
export function isStageOpen(town, stage) {
  if (town === 0 && stage === 1) return true;
  if (stage === 1) return stageStars(town - 1, STAGES_PER_TOWN) > 0;
  return stageStars(town, stage - 1) > 0;
}

// 열린 동네 수 (1~6). 동네 마지막 스테이지를 깨면 다음 동네가 열린다
export function townsOpen() {
  let open = 1;
  while (open < TOWNS.length && stageStars(open - 1, STAGES_PER_TOWN) > 0) open += 1;
  return open;
}

// 동네 6 보스까지 깼는지 (♾️ 무한 모드)
export function allTownsCleared() {
  return stageStars(TOWNS.length - 1, STAGES_PER_TOWN) > 0;
}

// 다음에 할 스테이지 (안 깬 첫 스테이지, 다 깼으면 마지막)
export function nextStage() {
  for (let town = 0; town < TOWNS.length; town++) {
    for (let stage = 1; stage <= STAGES_PER_TOWN; stage++) {
      if (stageStars(town, stage) === 0) return { town, stage };
    }
  }
  return { town: TOWNS.length - 1, stage: STAGES_PER_TOWN };
}

// 동네 하나에서 모은 별
export function townStars(town) {
  let sum = 0;
  for (let stage = 1; stage <= STAGES_PER_TOWN; stage++) sum += stageStars(town, stage);
  return sum;
}

// ───────── 동네가 열리면 쓸 수 있는 기능 ─────────
// 기능 이름 → 몇 번째 동네(1부터)가 열려야 쓸 수 있는지
export const FEATURE_TOWN = {
  daily: 2, // 🏆 오늘의 도전, 📋 주문서, 랭킹 (동네 1을 깨면)
  combos: 2, // 🍱 합작 요리
  shop: 2, // 🏪 가게
  cards: 3, // 📜 레시피 카드
  deck: 3, // 덱 고르기 (새 줄이 생기면)
  mythic: 4, // 🍽️ 풀코스 요리
};

export function hasFeature(name) {
  return townsOpen() >= FEATURE_TOWN[name];
}
