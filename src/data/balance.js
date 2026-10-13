// 한 판의 규칙과 밸런스 숫자. 플레이해 보면서 여기 값을 고친다.

export const TOTAL_WAVES = 30; // 이 웨이브까지 버티면 클리어
export const WAVE_DURATION = 15; // 웨이브 하나의 길이 (초)
export const RAIL_LIMIT = 60; // 레일 위 주문이 이만큼 쌓이면 패배
export const RAIL_WARNING = 45; // 이 이상이면 주문 수가 빨간색으로 표시
export const START_GOLD = 100;

export const BASE_SPEED = 130; // 주문의 기본 이동 속도 (화면 픽셀/초)
export const HP_GROWTH = 1.15; // 웨이브마다 주문 체력이 몇 배씩 커지는지

// 웨이브마다 나오는 주문 수
export function ordersInWave(wave) {
  return 8 + Math.floor(wave / 2);
}

// 주문들이 웨이브 시작 후 몇 초 동안 나눠서 나오는지
export const SPAWN_SPREAD = 8;

// 웨이브마다 나올 수 있는 주문 종류와 비율
export function orderMixForWave(wave) {
  if (wave <= 2) return { salad: 1 };
  if (wave <= 4) return { salad: 3, ramen: 1 };
  if (wave <= 6) return { salad: 3, ramen: 2, steak: 1 };
  if (wave <= 10) return { salad: 3, ramen: 2, steak: 2, bingsu: 2 };
  if (wave <= 14) return { salad: 3, ramen: 2, steak: 2, bingsu: 2, bento: 1, rush: 1 };
  return { salad: 3, ramen: 2, steak: 2, bingsu: 2, bento: 1, rush: 1, picky: 1 };
}

// ───────── VIP 손님 (보스) ─────────

// 보스가 나오는 웨이브와 보스 종류
export const BOSS_WAVES = { 10: 'critic', 20: 'chaebol', 30: 'king' };

// 보스 웨이브의 제한 시간(인내심, 초). 이 안에 보스를 처리하지 못하면 패배
export const BOSS_PATIENCE = 45;

// 보스 웨이브에는 일반 주문도 섞여 나오는데, 평소보다 이 비율만큼만 나온다
export const BOSS_WAVE_ORDER_RATIO = 0.5;

// 해당 웨이브의 주문 체력
export function orderHp(baseHp, wave) {
  return Math.round(baseHp * HP_GROWTH ** (wave - 1));
}

// 주문을 처리했을 때 받는 골드: 기본 보상 + 5웨이브마다 1씩 추가
export function orderReward(baseReward, wave) {
  return baseReward + Math.floor((wave - 1) / 5);
}

// ───────── 요리사 뽑기 ─────────

// 뽑기 비용: 처음 20골드, 뽑을 때마다 2골드씩 오른다
export const SUMMON_BASE_COST = 20;
export const SUMMON_COST_STEP = 2;

export function summonCost(summonCount) {
  return SUMMON_BASE_COST + SUMMON_COST_STEP * summonCount;
}

// 뽑기 등급 확률 (합이 100). 전설과 신화는 뽑기로 나오지 않는다.
export const SUMMON_ODDS = { 1: 90, 2: 9, 3: 1 };

// ───────── 합성 ─────────

// 이 등급까지만 합성할 수 있다 (영웅 2개 → 전설). 전설 → 신화는 레시피로만.
export const MAX_MERGE_TIER = 3;

// ───────── 강화 ─────────

// 강화 1번마다 해당 등급 요리사의 공격력 +20%
export const UPGRADE_DAMAGE_PER_LEVEL = 0.2;

// 강화 비용: 등급별 기본 비용 × (현재 레벨 + 1)
export const UPGRADE_BASE_COST = { 1: 20, 2: 40, 3: 80, 4: 150 };

export function upgradeCost(tier, level) {
  return UPGRADE_BASE_COST[tier] * (level + 1);
}
