// 판 끝 보상과 영구 성장 숫자.

// ───────── 판 끝 보상 ─────────

// 팁: 배부르게 한 손님 1명당 1팁 + 별 1개당 15팁 (판 종류마다 배율이 붙는다)
export const TIPS_PER_ORDER = 1;
export const TIPS_PER_STAR = 15;

// ───────── 🏪 가게 강화 ─────────

export const SHOP_ITEMS = [
  { id: 'startGold', emoji: '💰', name: '넉넉한 금고', per: 20, max: 5, baseCost: 100, effect: (v) => `시작 골드 +${v}` },
  { id: 'summonDiscount', emoji: '🎲', name: '단골 시장', per: 1, max: 5, baseCost: 150, effect: (v) => `뽑기 비용 -${v}` },
  { id: 'railCapacity', emoji: '🪑', name: '넓은 식당', per: 5, max: 4, baseCost: 200, effect: (v) => `식당 자리 +${v}` },
  { id: 'patience', emoji: '☕', name: '웰컴 커피', per: 5, max: 3, baseCost: 250, effect: (v) => `보스 인내심 +${v}초` },
];

// 다음 레벨로 올리는 비용
export function shopCost(item, level) {
  return item.baseCost * (level + 1);
}

// ───────── 📖 레시피 줄 레벨 ─────────
// 판을 끝낼 때 덱에 넣은 줄마다 경험치를 받는다. 경험치가 차면 그 줄이 영구히 강해진다 (요리 양 +6%씩).

export const LINE_MAX_LEVEL = 20;
export const LINE_DAMAGE_PER_LEVEL = 0.06;

// 레벨 level에서 다음 레벨로 가는 데 필요한 경험치
export function lineXpNeeded(level) {
  return 50 + level * 30;
}

// 경험치 합계 → { level, xp(이번 레벨에서 모은 양), need(다음 레벨까지 필요한 양) }
export function lineLevelOf(totalXp = 0) {
  let level = 0;
  let xp = totalXp;
  while (level < LINE_MAX_LEVEL && xp >= lineXpNeeded(level)) {
    xp -= lineXpNeeded(level);
    level += 1;
  }
  return { level, xp, need: level < LINE_MAX_LEVEL ? lineXpNeeded(level) : 0 };
}

// 이 레벨이 되려면 필요한 경험치 합계
export function lineXpForLevel(level) {
  let sum = 0;
  for (let i = 0; i < level; i++) sum += lineXpNeeded(i);
  return sum;
}

// 한 판에서 덱의 줄마다 받는 경험치: 배부르게 한 손님 절반 + 클리어하면 20
export function runLineXp(monstersFed, cleared) {
  return Math.round(monstersFed / 2) + (cleared ? 20 : 0);
}

// ───────── 🏆 랭킹 점수 ─────────

// 한 판의 점수 = 도달 웨이브 × 100 + 배부르게 한 손님 × 5 + 별 × 1000
// (예전 미슐랭 등급 칸 grade는 늘 1: 저장할 때 100000을 더한다)
// (Firestore 보안 규칙 firestore.rules에서도 같은 계산으로 점수를 검사한다)
export const SCORE_RULE = { wave: 100, order: 5, star: 1000, grade: 100000 };

export function runScore({ grade = 1, wave, orders, stars }) {
  return grade * SCORE_RULE.grade + wave * SCORE_RULE.wave + orders * SCORE_RULE.order + stars * SCORE_RULE.star;
}
