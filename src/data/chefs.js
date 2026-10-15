// 유닛(레시피 단계) 데이터.
// 유닛의 능력치는 "레시피 줄 기본값 × 등급 배율"로 정해진다.
// 숫자를 바꾸고 싶으면 METHODS의 기본값이나 TIERS의 배율을 고치면 된다.

// 등급: 일반(1) → 희귀(2) → 영웅(3) → 전설(4) → 신화(5)
export const TIERS = {
  1: { name: '일반', color: 0xb8b8b8, damage: 1 },
  2: { name: '희귀', color: 0x4a90e2, damage: 2.6 },
  3: { name: '영웅', color: 0x9b59b6, damage: 6.5 },
  4: { name: '전설', color: 0xf39c12, damage: 16 },
  5: { name: '신화', color: 0xe74c3c, damage: 40 },
};

// 레시피 줄(공격 방식)별 기본 능력치 (일반 등급 기준)
// 요리는 칼질을 chops번 하면 완성되어 손님에게 던진다. 칼질 한 번에 걸리는 시간 = interval / chops
// 키(cut, grill, boil, chill)는 주문의 약점과 맞춰 보는 이름이다.
// damage: 한 번 공격할 때 피해
// interval: 요리 하나를 만들어 던지는 데 걸리는 시간(초). 작을수록 빠르다
// range: 공격 사거리(화면 픽셀). 한 칸이 100
export const METHODS = {
  cut: {
    name: '빵',
    emoji: '🍞',
    role: '빠른 단일 공격',
    damage: 10,
    interval: 0.55,
    range: 230,
  },
  grill: {
    name: '고기',
    emoji: '🍖',
    role: '범위 공격',
    damage: 12,
    interval: 1.3,
    range: 210,
    splash: 70, // 맞은 곳 주변 이 반경 안의 주문도 피해를 입는다
  },
  boil: {
    name: '국물',
    emoji: '🍲',
    role: '지속 피해',
    damage: 4,
    interval: 1.0,
    range: 220,
    dot: { dps: 6, duration: 3 }, // 맞은 주문이 3초 동안 초당 6씩 피해를 입는다
  },
  chill: {
    name: '디저트',
    emoji: '🍰',
    role: '감속',
    damage: 5,
    interval: 0.9,
    range: 230,
    slow: { factor: 0.6, duration: 1.5 }, // 1.5초 동안 속도가 60%로 느려진다
  },
  // 요리의 신 전용: 상대의 약점을 골라 공격하고, 범위·지속 피해·감속을 모두 준다
  all: {
    name: '모든 요리',
    emoji: '🌟',
    role: '항상 약점 공격 + 범위·지속 피해·감속',
    damage: 10,
    interval: 0.5,
    range: 270,
    splash: 80,
    dot: { dps: 6, duration: 3 },
    slow: { factor: 0.6, duration: 1.5 },
  },
  // ── 모아서 여는 새 레시피 줄 ──
  noodle: {
    name: '면',
    emoji: '🍜',
    role: '줄줄이 관통',
    damage: 9,
    interval: 1.1,
    range: 220,
    pierce: { count: 3, radius: 150 }, // 맞은 손님 근처의 손님 2마리까지 같이 먹는다
  },
  sea: {
    name: '해산물',
    emoji: '🦐',
    role: '멀리 있는 배고픈 손님부터',
    damage: 30,
    interval: 1.8,
    range: 420,
    hungriest: true, // 사거리 안에서 가장 배고픈(배고픔이 가장 많이 남은) 손님을 노린다
  },
  drink: {
    name: '음료',
    emoji: '🧋',
    role: '옆 요리 칼질 속도 증가',
    damage: 4,
    interval: 1.0,
    range: 220,
    cheer: { attackSpeed: 0.15 }, // 바로 옆 칸(대각선 포함) 요리의 칼질 속도 +15%
  },
  fry: {
    name: '튀김',
    emoji: '🍤',
    role: '먹이면 골드',
    damage: 8,
    interval: 1.0,
    range: 220,
    goldPerHit: 1, // 손님에게 맞을 때마다 골드
  },
  buff: {
    name: '지휘',
    emoji: '🛎️',
    role: '주변 요리 공격 속도 증가',
    damage: 0,
    interval: 0,
    range: 150, // 바로 옆 칸(대각선 포함)까지
    buff: { attackSpeed: 0.35 }, // 공격 속도 +35%
  },
};

// 약점 공격이면 받는 피해 배율
export const WEAKNESS_MULTIPLIER = 1.5;

// 요리 하나를 완성하는 칼질 횟수 (줄마다 다르다)
export const CHOPS = { cut: 3, grill: 2, boil: 4, chill: 3, noodle: 3, sea: 2, drink: 3, fry: 3, all: 2 };

// 레시피 줄 8개. 처음에는 4줄을 갖고 시작하고, 동네를 열 때마다 새 줄을 얻는다.
// 한 판에는 덱으로 고른 4줄만 나온다. 같은 것 2개를 합치면 같은 줄의 다음 단계가 된다.
export const ALL_LINES = ['cut', 'grill', 'chill', 'boil', 'noodle', 'sea', 'drink', 'fry'];
export const STARTER_LINES = ['cut', 'grill', 'chill', 'boil']; // 빵, 고기, 디저트, 국물
export const LINES = ALL_LINES; // 레시피 줄인지 확인할 때 쓴다
export const DECK_SIZE = 4;

// 유닛 목록 (줄마다 일반 → 희귀 → 영웅 → 전설)
export const CHEFS = [
  // 🍞 빵 줄: 빠른 단일 공격
  chef('flour', '밀가루', '🌾', 1, 'cut'),
  chef('dough', '바게트', '🥖', 2, 'cut'),
  chef('bread_loaf', '식빵 굽기', '🍞', 3, 'cut', { interval: 0.45 }),
  chef('sandwich', '샌드위치', '🥪', 4, 'cut', { interval: 0.4, range: 260 }),
  // 🍖 고기 줄: 범위 공격
  chef('chicken_prep', '고기 손질', '🥩', 1, 'grill'),
  chef('firewood', '꼬치 끼우기', '🍢', 2, 'grill'),
  chef('drumstick', '닭다리 굽기', '🍗', 3, 'grill', { splash: 85 }),
  chef('whole_bbq', '통바비큐', '🍖', 4, 'grill', { splash: 100 }),
  // 🍰 디저트 줄: 감속
  chef('egg', '달걀', '🥚', 1, 'chill'),
  chef('whipped_cream', '크림 휘핑', '🥛', 2, 'chill', { slow: { factor: 0.5, duration: 1.7 } }),
  chef('strawberry', '딸기 올리기', '🍓', 3, 'chill', { slow: { factor: 0.4, duration: 2 } }),
  chef('cake', '케이크', '🍰', 4, 'chill', { slow: { factor: 0.35, duration: 2.2 }, range: 260 }),
  // 🍲 국물 줄: 지속 피해
  chef('veggie_prep', '재료 손질', '🧅', 1, 'boil'),
  chef('broth', '사골 육수', '🦴', 2, 'boil'),
  chef('spice', '양념 풀기', '🌶️', 3, 'boil'),
  chef('hotpot', '전골', '🍲', 4, 'boil', { range: 260 }),
  // 🍜 면 줄: 줄줄이 관통
  chef('noodle_dough', '반죽', '🥣', 1, 'noodle'),
  chef('noodle_pull', '면 뽑기', '🥢', 2, 'noodle'),
  chef('spaghetti', '스파게티', '🍝', 3, 'noodle', { pierce: { count: 4, radius: 170 } }),
  chef('ramen', '라멘', '🍜', 4, 'noodle', { pierce: { count: 5, radius: 200 }, range: 260 }),
  // 🦐 해산물 줄: 멀리, 가장 배고픈 손님부터
  chef('shrimp_prep', '새우 손질', '🦐', 1, 'sea'),
  chef('squid', '오징어', '🦑', 2, 'sea'),
  chef('crab', '꽃게', '🦀', 3, 'sea'),
  chef('lobster', '랍스터', '🦞', 4, 'sea', { range: 520 }),
  // 🧋 음료 줄: 옆 요리 칼질 속도 증가
  chef('ice_cup', '얼음', '🧊', 1, 'drink'),
  chef('coffee', '커피', '☕', 2, 'drink', { cheer: { attackSpeed: 0.2 } }),
  chef('latte', '라테', '🥤', 3, 'drink', { cheer: { attackSpeed: 0.27 } }),
  chef('bubble_tea', '버블티', '🧋', 4, 'drink', { cheer: { attackSpeed: 0.35 } }),
  // 🍤 튀김 줄: 먹이면 골드
  chef('potato_prep', '감자 손질', '🥔', 1, 'fry'),
  chef('fries', '감자튀김', '🍟', 2, 'fry'),
  chef('shrimp_fry', '새우튀김', '🍤', 3, 'fry', { goldPerHit: 2 }),
  chef('fry_platter', '튀김 모듬', '🧆', 4, 'fry', { goldPerHit: 3 }),
  // 🛎️ 특별: 영웅 2개를 합칠 때 가끔 나온다
  chef('head_chef', '총괄 주방장', '🛎️', 4, 'buff', { special: true }),
  // 신화 (레시피로만 만들 수 있다)
  chef('cooking_god', '요리의 신', '🌟', 5, 'all', { range: 270 }),
  chef('dessert_witch', '시간을 멈추는 디저트 마녀', '🧁', 5, 'chill', {
    range: 270,
    slow: { factor: 0.3, duration: 2.5 },
    freeze: { every: 12, duration: 2.5 }, // 12초마다 레일 전체를 2.5초 동안 멈춘다
    ability: '12초마다 레일 전체 2.5초 정지',
  }),
];

// 🥚 비밀 유닛: 뽑기에서 아주 낮은 확률로만 나온다. 합성할 수 없다.
CHEFS.push(
  chef('dishwasher', '설거지 담당', '🧽', 1, 'buff', {
    hidden: true,
    buff: { attackSpeed: 0.1 },
    ability: '공격은 못 하지만 옆 유닛 공격 속도 +10%',
  }),
);

// 영웅 2개를 합칠 때 같은 줄 전설 대신 총괄 주방장이 나올 확률
export const HEAD_CHEF_CHANCE = 0.15;

// 신화 레시피: 판 위에 재료가 모두 있으면 만들 수 있다. 재료는 사라진다.
export const RECIPES = [
  { result: 'cooking_god', ingredients: ['sandwich', 'whole_bbq', 'head_chef'] },
  { result: 'dessert_witch', ingredients: ['cake', 'hotpot', 'head_chef'] },
];

// 예전 요리사 id → 새 레시피 유닛 id (저장된 도감 기록을 옮길 때 쓴다)
export const LEGACY_IDS = {
  apprentice_cutter: 'flour',
  grill_parttimer: 'chicken_prep',
  pot_keeper: 'veggie_prep',
  icecream_parttimer: 'egg',
  sashimi_cook: 'dough',
  bbq_master: 'firewood',
  gukbap_grandma: 'broth',
  bingsu_master: 'whipped_cream',
  dual_knife_chef: 'bread_loaf',
  wok_master: 'drumstick',
  malatang_chef: 'spice',
  nitrogen_chef: 'strawberry',
  sushi_legend: 'sandwich',
  hellfire_grill: 'whole_bbq',
};

export function chefById(id) {
  return CHEFS.find((c) => c.id === id);
}

// 뽑기에 나오는 유닛: 그 등급의 덱 줄 유닛 (비밀, 특별 유닛은 빼고)
export function chefsOfTier(tier, lines = STARTER_LINES) {
  return CHEFS.filter((c) => c.tier === tier && lines.includes(c.method) && !c.hidden && !c.special);
}

// 그 줄의 유닛 목록 (일반 → 전설)
export function chefsOfLine(line) {
  return CHEFS.filter((c) => c.method === line && !c.special && !c.hidden && c.tier <= 4).sort((a, b) => a.tier - b.tier);
}

// 같은 줄의 다음 단계 (없으면 undefined)
export function nextInLine(data) {
  return CHEFS.find((c) => c.method === data.method && c.tier === data.tier + 1 && !c.special && !c.hidden);
}

// 유닛 하나의 능력치를 만든다: 조리법 기본값 × 등급 배율, 그리고 개별로 바꾼 값(extra)
function chef(id, name, emoji, tier, method, extra = {}) {
  const base = METHODS[method];
  const mult = TIERS[tier].damage;
  const stats = {
    id,
    name,
    emoji,
    tier,
    method,
    damage: Math.round(base.damage * mult),
    interval: base.interval,
    range: base.range + (tier - 1) * 10,
    splash: base.splash,
    dot: base.dot && { dps: base.dot.dps * mult, duration: base.dot.duration },
    slow: base.slow,
    buff: base.buff,
    pierce: base.pierce,
    hungriest: base.hungriest,
    cheer: base.cheer,
    goldPerHit: base.goldPerHit,
    chops: CHOPS[method] ?? 3,
  };
  return { ...stats, ...extra };
}
