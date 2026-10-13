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
  return { salad: 3, ramen: 2, steak: 2, bingsu: 2 };
}

// 해당 웨이브의 주문 체력
export function orderHp(baseHp, wave) {
  return Math.round(baseHp * HP_GROWTH ** (wave - 1));
}

// 임시: 주문을 손가락으로 탭했을 때 주는 피해 (3단계에서 요리사가 생기면 삭제)
export const TAP_DAMAGE = 12;
