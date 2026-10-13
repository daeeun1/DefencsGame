// 요리사(유닛) 데이터.
// 요리사의 능력치는 "조리법 기본값 × 등급 배율"로 정해진다.
// 숫자를 바꾸고 싶으면 METHODS의 기본값이나 TIERS의 배율을 고치면 된다.

// 등급: 일반(1) → 희귀(2) → 영웅(3) → 전설(4) → 신화(5)
export const TIERS = {
  1: { name: '일반', color: 0xb8b8b8, damage: 1 },
  2: { name: '희귀', color: 0x4a90e2, damage: 2.6 },
  3: { name: '영웅', color: 0x9b59b6, damage: 6.5 },
  4: { name: '전설', color: 0xf39c12, damage: 16 },
  5: { name: '신화', color: 0xe74c3c, damage: 40 },
};

// 조리법(역할)별 기본 능력치 (일반 등급 기준)
// damage: 한 번 공격할 때 피해
// interval: 공격 간격(초). 작을수록 빠르다
// range: 공격 사거리(화면 픽셀). 한 칸이 100
export const METHODS = {
  cut: {
    name: '썰기',
    emoji: '🔪',
    role: '빠른 단일 공격',
    damage: 10,
    interval: 0.55,
    range: 230,
  },
  grill: {
    name: '굽기',
    emoji: '🔥',
    role: '범위 공격',
    damage: 12,
    interval: 1.3,
    range: 210,
    splash: 70, // 맞은 곳 주변 이 반경 안의 주문도 피해를 입는다
  },
  boil: {
    name: '끓이기',
    emoji: '🍲',
    role: '지속 피해',
    damage: 4,
    interval: 1.0,
    range: 220,
    dot: { dps: 6, duration: 3 }, // 맞은 주문이 3초 동안 초당 6씩 피해를 입는다
  },
  chill: {
    name: '차갑게',
    emoji: '❄️',
    role: '감속',
    damage: 5,
    interval: 0.9,
    range: 230,
    slow: { factor: 0.6, duration: 1.5 }, // 1.5초 동안 속도가 60%로 느려진다
  },
  buff: {
    name: '지휘',
    emoji: '📣',
    role: '주변 요리사 공격 속도 증가',
    damage: 0,
    interval: 0,
    range: 150, // 바로 옆 칸(대각선 포함)까지
    buff: { attackSpeed: 0.35 }, // 공격 속도 +35%
  },
};

// 약점 조리법으로 공격하면 받는 피해 배율
export const WEAKNESS_MULTIPLIER = 1.5;

// 요리사 목록
export const CHEFS = [
  // 일반
  chef('apprentice_cutter', '견습 칼잡이', 1, 'cut'),
  chef('grill_parttimer', '불판 알바', 1, 'grill'),
  chef('pot_keeper', '냄비 당번', 1, 'boil'),
  chef('icecream_parttimer', '아이스크림 알바', 1, 'chill'),
  // 희귀
  chef('sashimi_cook', '회 뜨는 요리사', 2, 'cut'),
  chef('bbq_master', '바비큐 장인', 2, 'grill'),
  chef('gukbap_grandma', '국밥 할머니', 2, 'boil'),
  chef('bingsu_master', '빙수 장인', 2, 'chill', { slow: { factor: 0.5, duration: 1.7 } }),
  // 영웅
  chef('dual_knife_chef', '쌍칼 일식 셰프', 3, 'cut', { interval: 0.45 }),
  chef('wok_master', '화염 웍 마스터', 3, 'grill', { splash: 85 }),
  chef('malatang_chef', '마라탕 셰프', 3, 'boil'),
  chef('nitrogen_chef', '액체질소 분자요리사', 3, 'chill', { slow: { factor: 0.4, duration: 2 } }),
  // 전설
  chef('sushi_legend', '전설의 스시 장인', 4, 'cut', { interval: 0.4, range: 260 }),
  chef('hellfire_grill', '지옥불 그릴 마스터', 4, 'grill', { splash: 100 }),
  chef('head_chef', '총괄 주방장', 4, 'buff'),
];

export function chefsOfTier(tier) {
  return CHEFS.filter((c) => c.tier === tier);
}

// 요리사 하나의 능력치를 만든다: 조리법 기본값 × 등급 배율, 그리고 개별로 바꾼 값(extra)
function chef(id, name, tier, method, extra = {}) {
  const base = METHODS[method];
  const mult = TIERS[tier].damage;
  const stats = {
    id,
    name,
    tier,
    method,
    damage: Math.round(base.damage * mult),
    interval: base.interval,
    range: base.range + (tier - 1) * 10,
    splash: base.splash,
    dot: base.dot && { dps: base.dot.dps * mult, duration: base.dot.duration },
    slow: base.slow,
    buff: base.buff,
  };
  return { ...stats, ...extra };
}
