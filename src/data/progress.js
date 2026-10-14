// 판 끝 보상과 영구 성장 숫자.

// ───────── 판 끝 보상 ─────────

// 별: 보스를 처치할 때마다 1개 (최대 3개)
export const STAR_RULES = ['🧐 평론가 만족', '🤵 재벌 3세 만족', '👑 미식 대왕 만족'];

// 팁: 처리한 주문 1개당 1팁 + 별 1개당 50팁
export const TIPS_PER_ORDER = 1;
export const TIPS_PER_STAR = 50;

// 신화 레시피를 쓰려면 필요한 별 개수 (모든 주방의 최고 별 합계)
export const RECIPE_UNLOCK_STARS = { cooking_god: 1, dessert_witch: 2 };

// ───────── 🏪 가게 강화 ─────────

export const SHOP_ITEMS = [
  { id: 'startGold', emoji: '💰', name: '넉넉한 금고', per: 20, max: 5, baseCost: 100, effect: (v) => `시작 골드 +${v}` },
  { id: 'summonDiscount', emoji: '🎲', name: '단골 인력소', per: 1, max: 5, baseCost: 150, effect: (v) => `뽑기 비용 -${v}` },
  { id: 'railCapacity', emoji: '🛤️', name: '긴 레일', per: 5, max: 4, baseCost: 200, effect: (v) => `레일 수용량 +${v}` },
  { id: 'patience', emoji: '☕', name: '웰컴 커피', per: 5, max: 3, baseCost: 250, effect: (v) => `VIP 인내심 +${v}초` },
];

// 다음 레벨로 올리는 비용
export function shopCost(item, level) {
  return item.baseCost * (level + 1);
}

// ───────── 📖 요리사 도감 ─────────

export const CODEX_DAMAGE_PER_LEVEL = 0.1; // 레벨 1마다 그 요리사 공격력 +10%
export const CODEX_MAX_LEVEL = 5;
export const CODEX_BASE_COST = { 1: 50, 2: 100, 3: 200, 4: 400, 5: 800 };

export function codexCost(tier, level) {
  return CODEX_BASE_COST[tier] * (level + 1);
}

// ───────── 🏆 랭킹 점수 ─────────

// 한 판의 점수 = 도달 웨이브 × 100 + 처리한 주문 × 5 + 별 × 1000
// 랭킹 순서는 미슐랭 등급이 먼저: 저장할 때는 등급 × 100000을 더한다 (점수는 13500을 넘지 않는다)
// (Firestore 보안 규칙 firestore.rules에서도 같은 계산으로 점수를 검사한다)
export const SCORE_RULE = { wave: 100, order: 5, star: 1000, grade: 100000 };

export function runScore({ grade = 1, wave, orders, stars }) {
  return grade * SCORE_RULE.grade + wave * SCORE_RULE.wave + orders * SCORE_RULE.order + stars * SCORE_RULE.star;
}
