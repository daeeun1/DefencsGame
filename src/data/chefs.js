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
    emoji: '🥤',
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
  chef('veggie_prep', '재료 손질', '🥕', 1, 'boil'),
  chef('broth', '어묵 국물', '🍥', 2, 'boil'),
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
  chef('lobster', '참치', '🐟', 4, 'sea', { range: 520 }),
  // 🥤 음료 줄: 옆 요리 칼질 속도 증가
  chef('ice_cup', '빙수 얼음', '🍧', 1, 'drink'),
  chef('coffee', '커피', '☕', 2, 'drink', { cheer: { attackSpeed: 0.2 } }),
  chef('latte', '녹차 라테', '🍵', 3, 'drink', { cheer: { attackSpeed: 0.27 } }),
  chef('bubble_tea', '버블티', '🥤', 4, 'drink', { cheer: { attackSpeed: 0.35 } }),
  // 🍤 튀김 줄: 먹이면 골드
  chef('potato_prep', '감자 손질', '🥔', 1, 'fry'),
  chef('fries', '감자튀김', '🍟', 2, 'fry'),
  chef('shrimp_fry', '새우튀김', '🍤', 3, 'fry', { goldPerHit: 2 }),
  chef('fry_platter', '튀김 만두', '🥟', 4, 'fry', { goldPerHit: 3 }),
  // 🛎️ 특별: 영웅 2개를 합칠 때 가끔 나온다
  chef('head_chef', '총괄 주방장', '🛎️', 4, 'buff', { special: true }),
];

// 🥚 비밀 유닛: 뽑기에서 아주 낮은 확률로만 나온다. 합성할 수 없다.
CHEFS.push(
  chef('dishwasher', '설거지 담당', '🍽️', 1, 'buff', {
    hidden: true,
    buff: { attackSpeed: 0.1 },
    ability: '공격은 못 하지만 옆 유닛 공격 속도 +10%',
  }),
);

// 영웅 2개를 합칠 때 같은 줄 전설 대신 총괄 주방장이 나올 확률
export const HEAD_CHEF_CHANCE = 0.15;


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

// ───────── 📖 신화 요리 (조합표대로 만든다) ─────────
// 판 위에 정해진 재료 요리가 모두 있으면 만들 수 있다. 재료는 사라지고 그 자리에 신화 요리가 생긴다.
// 신화 하나에 요리 종류 2개. 8줄이 동그랗게 이어지게 짝지었다 (줄마다 신화 2개에 들어간다):
//   빵 → 디저트 → 튀김 → 음료 → 국물 → 면 → 해산물 → 고기 → (다시 빵)
// 힘(요리 양 배율) = 재료 등급 배율의 합 × MYTHIC_BONUS. 그래서 만들면 항상 조금 이득이다.
// 어려움: ★ 영웅 2개 / ★★ 전설 1 + 영웅 1 / ★★★ 재료 3개

export const MYTHIC_BONUS = 1.3;

// 등급 이름과 색
export function rankOf(data) {
  return TIERS[data.tier];
}

// 신화 하나: 재료 id 목록으로 힘을 계산한다
function mythic(id, name, emoji, method, stars, ingredients, ability, extra = {}) {
  const power = ingredients.reduce((sum, ing) => sum + TIERS[chefById(ing).tier].damage, 0) * MYTHIC_BONUS;
  const base = METHODS[method];
  const stats = chef(id, name, emoji, 5, method, extra);
  stats.damage = Math.round(base.damage * power);
  if (base.dot && !extra.dot) stats.dot = { dps: base.dot.dps * power, duration: base.dot.duration };
  return { ...stats, mythic: true, stars, ingredients, ability };
}

const MYTHICS = [
  mythic('burger', '산더미 버거', '🍔', 'cut', 1, ['bread_loaf', 'drumstick'], '주변 3명도 같이 냠!', { pierce: { count: 4, radius: 170 } }),
  mythic('crown_cupcake', '왕관 케이크', '🎂', 'chill', 1, ['bread_loaf', 'strawberry'], '이걸로 배부른 손님은 골드 +50%', { goldBonus: 0.5 }),
  mythic('cloud_cake', '구름 케이크', '🍰', 'chill', 2, ['cake', 'shrimp_fry'], '3번에 1번, 손님이 1초 꾸벅 멈춤', {
    stun: { every: 3, duration: 1 },
    slow: { factor: 0.4, duration: 2 },
  }),
  mythic('rainbow_juice', '무지개 주스', '🍹', 'drink', 2, ['fry_platter', 'latte'], '옆 요리 칼질 +50%', { cheer: { attackSpeed: 0.5 } }),
  mythic('forest_tea', '숲속 보약차', '🌿', 'boil', 1, ['latte', 'spice'], '레일 위 모든 손님이 15% 느려짐', { railSlow: 0.15 }),
  mythic('endless_noodle', '끝없는 국수', '🍜', 'noodle', 2, ['ramen', 'spice'], '줄줄이 8명까지 관통', { pierce: { count: 8, radius: 240 } }),
  mythic('seafood_hotpot', '해물 전골', '🍲', 'sea', 3, ['lobster', 'ramen', 'spaghetti'], '모든 손님이 좋아함 (항상 2배)', { alwaysLiked: true }),
  mythic('royal_dosirak', '산해진미 도시락', '🍱', 'grill', 3, ['whole_bbq', 'lobster', 'drumstick'], '보스에게 3배', { bossBonus: 3, splash: 120 }),
];
CHEFS.push(...MYTHICS);

// 신화 조합표 (판 위에 재료가 모두 있으면 만들 수 있다)
export const RECIPES = MYTHICS.map((m) => ({ result: m.id, ingredients: m.ingredients, stars: m.stars }));

// 그 요리가 재료로 들어가는 신화 목록
export function mythicsUsing(id) {
  return MYTHICS.filter((m) => m.ingredients.includes(id));
}

// 이 덱(4줄)으로 만들 수 있는 신화인지
export function recipeFitsDeck(recipe, deck) {
  return recipe.ingredients.every((id) => deck.includes(chefById(id).method));
}
