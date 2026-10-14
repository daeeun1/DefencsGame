// 🍽️ 세트 메뉴: 서로 다른 레시피 줄의 유닛이 상하좌우로 붙어 있으면 세트가 된다.
// 세트가 되면 두 유닛 모두 효과를 받는다. 같은 세트는 한 유닛에 한 번만 적용된다.
//
// effect 종류
//   damage       공격력 +비율
//   attackSpeed  공격 속도 +비율
//   range        사거리 +픽셀
//   weakness     약점 공격 피해 배율 (기본 1.5 대신)
//   slow         모든 공격에 붙는 약한 감속 { factor, duration }
//   gold         이 유닛이 주문을 처리하면 추가 골드

export const SETS = [
  { id: 'burger', lines: ['cut', 'grill'], emoji: '🍔', name: '버거 세트', desc: '공격력 +20%', effect: { damage: 0.2 } },
  { id: 'brunch', lines: ['cut', 'chill'], emoji: '🥞', name: '브런치 세트', desc: '공격 속도 +20%', effect: { attackSpeed: 0.2 } },
  { id: 'soup', lines: ['cut', 'boil'], emoji: '🥖', name: '수프와 바게트', desc: '사거리 +30', effect: { range: 30 } },
  { id: 'stew', lines: ['grill', 'boil'], emoji: '🥘', name: '고기 전골', desc: '약점 피해 1.5배 → 1.8배', effect: { weakness: 1.8 } },
  {
    id: 'sweetsalty',
    lines: ['grill', 'chill'],
    emoji: '🍯',
    name: '단짠 세트',
    desc: '모든 공격에 살짝 감속',
    effect: { slow: { factor: 0.85, duration: 1 } },
  },
  { id: 'course', lines: ['chill', 'boil'], emoji: '🍵', name: '코스 요리', desc: '주문을 처리하면 골드 +1', effect: { gold: 1 } },
];

// 4줄이 2 x 2 네모로 모이면 풀코스: 네 유닛 모두 공격력 +30%
export const FULL_COURSE = { emoji: '🍽️', name: '풀코스', desc: '2×2에 4줄이 모이면 공격력 +30%', effect: { damage: 0.3 } };

// 두 레시피 줄로 만들어지는 세트 (없으면 undefined)
export function setFor(lineA, lineB) {
  return SETS.find((s) => s.lines.includes(lineA) && s.lines.includes(lineB) && lineA !== lineB);
}
