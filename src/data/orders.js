// 주문(적) 종류.
// hp: 1웨이브 기준 체력 (웨이브가 오를수록 커진다)
// speed: 레일 위 이동 속도 배율 (1 = 보통)
// weakness: 약한 조리법 (이 조리법으로 공격받으면 피해 1.5배)
// reward: 처리했을 때 받는 골드 (웨이브가 오르면 조금씩 늘어난다)
// slowResist: 감속에 덜 걸리는 정도 (0.5면 감속 효과가 절반)
// size: 그림 크기 (기본 56)

export const ORDER_TYPES = {
  // ── 기본 주문 ──
  salad: { name: '샐러드', emoji: '🥗', hp: 30, speed: 1.0, weakness: 'cut', reward: 2 },
  steak: { name: '스테이크', emoji: '🥩', hp: 55, speed: 0.75, weakness: 'grill', reward: 3 },
  ramen: { name: '라면', emoji: '🍜', hp: 25, speed: 1.45, weakness: 'boil', reward: 2 },
  bingsu: { name: '빙수', emoji: '🍧', hp: 20, speed: 1.1, weakness: 'chill', reward: 2, slowResist: 0.5 },

  // ── 특수 주문 ──
  // 단체 도시락: 처리하면 주먹밥 3개로 나뉜다
  bento: { name: '단체 도시락', emoji: '🍱', hp: 45, speed: 0.85, weakness: 'boil', reward: 3, splitInto: { type: 'onigiri', count: 3 } },
  onigiri: { name: '주먹밥', emoji: '🍙', hp: 12, speed: 1.2, weakness: 'cut', reward: 1, size: 40 },
  // 급한 배달: 아주 빠르다
  rush: { name: '급한 배달', emoji: '🛵', hp: 18, speed: 2.2, weakness: 'chill', reward: 3 },
  // 까다로운 주문: 머리 위에 표시된 조리법만 제대로 통한다 (나머지는 피해 절반). 조리법은 나올 때마다 무작위
  picky: { name: '까다로운 주문', emoji: '🧂', hp: 40, speed: 1.0, weakness: 'random', reward: 4, picky: true },

  // ── 🥚 이스터 에그 주문 ──
  gg: { name: 'GG', emoji: '🎮', hp: 30, speed: 1.0, weakness: 'cut', reward: 5 },
  tteokguk: { name: '떡국', emoji: '🥣', hp: 35, speed: 0.9, weakness: 'boil', reward: 3 },

  // ── VIP 손님 (보스) ──
  critic: {
    name: '깐깐한 음식 평론가',
    emoji: '🧐',
    hp: 1100, // 보스 체력은 웨이브에 따라 커지지 않는 고정값
    speed: 0.6,
    weakness: 'cut',
    reward: 60,
    slowResist: 0.5,
    size: 84,
    boss: true,
  },
  chaebol: {
    name: '재벌 3세',
    emoji: '🤵',
    hp: 2000,
    speed: 0.6,
    weakness: 'grill',
    reward: 120,
    slowResist: 0.5,
    size: 84,
    boss: true,
    // 4초마다 "빨리빨리!": 주변 220 안의 주문이 2.5초 동안 1.6배 빨라진다
    rush: { every: 4, radius: 220, factor: 1.6, duration: 2.5 },
  },
  king: {
    name: '미식 대왕',
    emoji: '👑',
    hp: 4500,
    speed: 0.55,
    weakness: 'cut',
    reward: 0,
    slowResist: 0.5,
    size: 92,
    boss: true,
    // 체력이 1/4씩 줄 때마다 약점 조리법이 이 순서로 바뀐다
    weaknessCycle: ['cut', 'grill', 'boil', 'chill'],
  },
};

// 약점 표시를 머리 위에 보여 주는 주문인지
export function showsWeakness(type) {
  return Boolean(type.picky || type.weaknessCycle);
}
