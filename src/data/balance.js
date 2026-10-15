// 한 판의 규칙과 밸런스 숫자. 플레이해 보면서 여기 값을 고친다.

export const TOTAL_WAVES = 30; // 이 웨이브까지 버티면 클리어
export const WAVE_DURATION = 15; // 웨이브 하나의 길이 (초)
export const RAIL_LIMIT = 60; // 레일 위 손님이 이만큼 쌓이면 식당이 망한다
export const START_GOLD = 120; // 처음에 8번쯤 뽑을 수 있는 골드

export const BASE_SPEED = 130; // 손님의 기본 이동 속도 (화면 픽셀/초)
export const HP_GROWTH = 1.17; // 웨이브마다 손님 배고픔이 몇 배씩 커지는지

// 웨이브마다 나오는 손님 수
export function monstersInWave(wave) {
  return 8 + Math.floor(wave / 2);
}

// 손님들이 웨이브 시작 후 몇 초 동안 나눠서 나오는지
export const SPAWN_SPREAD = 8;

// 웨이브마다 나올 수 있는 손님 종류와 비율 (무한 모드, 오늘의 도전)
export function monsterMixForWave(wave) {
  if (wave <= 2) return { mouse: 1 };
  if (wave <= 4) return { mouse: 3, cat: 1 };
  if (wave <= 6) return { mouse: 3, cat: 2, dog: 1 };
  if (wave <= 10) return { mouse: 3, cat: 2, dog: 2, bear: 1, rabbit: 1 };
  if (wave <= 14) return { mouse: 3, cat: 2, dog: 2, bear: 1, rabbit: 1, hen: 1 };
  return { mouse: 3, cat: 2, dog: 2, bear: 1, rabbit: 2, hen: 1, fox: 1 };
}

// ───────── 보스 손님 ─────────

// 보스가 나오는 웨이브와 보스 종류 (무한 모드, 오늘의 도전)
export const BOSS_WAVES = { 10: 'owl', 20: 'pig', 30: 'dragon' };

// 보스 웨이브의 제한 시간(인내심, 초). 이 안에 보스 배를 채우지 못하면 패배
export const BOSS_PATIENCE = 45;

// 보스 웨이브에는 보통 손님도 섞여 나오는데, 평소보다 이 비율만큼만 나온다
export const BOSS_WAVE_ORDER_RATIO = 0.5;

// 해당 웨이브의 손님 배고픔
export function monsterHp(baseHp, wave) {
  return Math.round(baseHp * HP_GROWTH ** (wave - 1));
}

// 손님 배를 채웠을 때 받는 골드: 기본 보상 + 5웨이브마다 1씩 추가
export function monsterReward(baseReward, wave) {
  return baseReward + Math.floor((wave - 1) / 5);
}

// ───────── 재료 뽑기 ─────────

// 뽑기 비용: 처음 10골드, 뽑을 때마다 1골드씩 오른다 (뽑으면 일반 재료가 나온다)
export const SUMMON_BASE_COST = 10;
export const SUMMON_COST_STEP = 1;

export function summonCost(summonCount) {
  return SUMMON_BASE_COST + SUMMON_COST_STEP * summonCount;
}

// 판매 가격: 지금 뽑기 비용의 절반 × 그 유닛에 들어간 일반 유닛 수 (희귀 2개, 영웅 4개, 전설 8개)
export function sellPrice(currentSummonCost, tier) {
  return Math.floor(currentSummonCost / 2) * 2 ** (tier - 1);
}

// 뽑기 등급 확률 (합이 100). 전설과 신화는 뽑기로 나오지 않는다.
export const SUMMON_ODDS = { 1: 90, 2: 9, 3: 1 };

// ───────── 합성 ─────────

// 같은 유닛 2개를 합치면 같은 줄의 다음 단계가 된다.
// 이 등급까지만 합성할 수 있다 (영웅 2개 → 전설). 전설 → 신화는 레시피로만.
export const MAX_MERGE_TIER = 3;

// ───────── 🔪 톡 눌러 칼질 돕기 ─────────

// 요리를 톡 누르면 칼질을 한 번 대신 해 준다. 손 힘을 하나 쓴다.
export const HAND_POWER_MAX = 10;
export const HAND_POWER_REGEN = 1.5; // 1초마다 다시 차는 손 힘
