// 주문(적) 종류.
// hp: 1웨이브 기준 체력 (웨이브가 오를수록 커진다)
// speed: 레일 위 이동 속도 배율 (1 = 보통)
// weakness: 약한 조리법 (3단계에서 요리사가 생기면 사용)
// reward: 처리했을 때 받는 골드

export const ORDER_TYPES = {
  salad: { name: '샐러드', emoji: '🥗', hp: 30, speed: 1.0, weakness: 'cut', reward: 2 },
  steak: { name: '스테이크', emoji: '🥩', hp: 55, speed: 0.75, weakness: 'grill', reward: 3 },
  ramen: { name: '라면', emoji: '🍜', hp: 25, speed: 1.45, weakness: 'boil', reward: 2 },
  bingsu: { name: '빙수', emoji: '🍧', hp: 20, speed: 1.1, weakness: 'chill', reward: 2 },
};
