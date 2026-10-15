// 🍱 합작 요리: 서로 다른 레시피 줄의 요리가 상하좌우로 붙어 있으면, 둘이 같이 합작 요리를 만든다.
// 두 요리가 요리를 던질 때마다 합작 게이지가 차고, 다 차면 두 칸 사이에서 합작 요리를 크게 던진다.
// 합작 요리는 두 요리를 합친 만큼 배를 채우고(× COMBO_POWER), 두 줄의 능력(범위, 지속, 감속 …)을 함께 가진다.
// 조합마다 특별한 맛(extra)이 하나씩 더 있다.
//
// extra 종류
//   power     배를 더 채운다 (배율)
//   chain     옆 손님에게 몇 번 더 튄다
//   dot       뜨거움(지속) 배율
//   splash    주변 반경
//   slow      강한 감속 { factor, duration }
//   gold      먹이면 골드

export const COMBO_CHARGE = 10; // 두 요리가 합쳐서 이만큼 던지면 합작 요리 하나
export const COMBO_POWER = 1.5; // 합작 요리는 두 요리를 합친 양 × 1.5

export const SETS = [
  { id: 'burger', lines: ['cut', 'grill'], emoji: '🍔', name: '버거', desc: '배를 1.5배 더 채움', extra: { power: 1.5 } },
  { id: 'brunch', lines: ['cut', 'chill'], emoji: '🥞', name: '팬케이크', desc: '옆 손님 2명에게 튀김', extra: { chain: 2 } },
  { id: 'soup', lines: ['cut', 'boil'], emoji: '🥫', name: '수프와 빵', desc: '뜨거움 3배', extra: { dot: 3 } },
  { id: 'stew', lines: ['grill', 'boil'], emoji: '🥘', name: '고기 전골', desc: '넓게 펑!', extra: { splash: 130 } },
  { id: 'sweetsalty', lines: ['grill', 'chill'], emoji: '🍯', name: '꿀갈비', desc: '손님이 오래 멈칫', extra: { slow: { factor: 0.35, duration: 2.5 } } },
  { id: 'course', lines: ['chill', 'boil'], emoji: '🍵', name: '디저트 코스', desc: '먹이면 골드 +5', extra: { gold: 5 } },
  { id: 'ramen_set', lines: ['noodle', 'boil'], emoji: '🍲', name: '얼큰 라면', desc: '뜨거움 3배', extra: { dot: 3 } },
  { id: 'jjajang', lines: ['noodle', 'grill'], emoji: '🥟', name: '짜장 탕수육', desc: '넓게 펑!', extra: { splash: 130 } },
  { id: 'sushi', lines: ['sea', 'cut'], emoji: '🍣', name: '초밥', desc: '배를 1.5배 더 채움', extra: { power: 1.5 } },
  { id: 'seafood_pot', lines: ['sea', 'boil'], emoji: '🦀', name: '해물탕', desc: '옆 손님 2명에게 튀김', extra: { chain: 2 } },
  { id: 'brunch_coffee', lines: ['drink', 'cut'], emoji: '🥐', name: '모닝 세트', desc: '먹이면 골드 +5', extra: { gold: 5 } },
  { id: 'float', lines: ['drink', 'chill'], emoji: '🍨', name: '아이스크림 플로트', desc: '손님이 오래 멈칫', extra: { slow: { factor: 0.35, duration: 2.5 } } },
  { id: 'chimaek', lines: ['fry', 'drink'], emoji: '🍻', name: '치킨과 콜라', desc: '먹이면 골드 +5', extra: { gold: 5 } },
  { id: 'tempura_udon', lines: ['fry', 'noodle'], emoji: '🍛', name: '튀김 우동', desc: '옆 손님 2명에게 튀김', extra: { chain: 2 } },
];

// 이름 있는 조합이 아닌 두 줄이 붙으면: 도시락 (특별한 맛 없이 합작 요리만)
export const LUNCHBOX = { id: 'lunchbox', emoji: '🍱', name: '도시락', desc: '두 요리를 합친 맛', extra: {} };

// 두 레시피 줄로 만들어지는 합작 요리 (같은 줄이면 undefined)
export function setFor(lineA, lineB) {
  if (!lineA || !lineB || lineA === lineB) return undefined;
  return SETS.find((s) => s.lines.includes(lineA) && s.lines.includes(lineB)) ?? LUNCHBOX;
}
