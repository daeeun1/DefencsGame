// 📜 레시피 카드: 정해진 웨이브마다 3장 중 1장을 골라 이번 판을 강하게 만든다.
// 같은 카드를 여러 번 고르면 효과가 쌓인다. 줄 카드(line)는 그 줄이 덱에 있을 때만 나온다.
//
// fx: 고르면 이번 판의 카드 효과(GameScene.cardFx)에 더해지는 값
//   lineSpeed{줄}  그 줄 칼질 속도 +비율     lineDamage{줄}  그 줄 요리 양 +비율
//   damage         모든 요리 양 +비율        speed           모든 칼질 속도 +비율
//   slowTime       감속 시간 +비율           setPower        합작 요리 +비율
//   weakness       좋아하는 요리 배율 +값    freeSummons     무료 뽑기 횟수
//   mergeJump      합칠 때 한 단계 더 올라갈 확률
//   luck           희귀·영웅 확률 배율(곱)    hand            손 힘 최대 +값
//   railLimit      식당 자리 +값             interest        웨이브마다 가진 골드의 이 비율만큼 이자 (최대 30)
// now(scene): 고르는 즉시 일어나는 일

export const CARD_WAVES = [6, 11, 16, 21, 26]; // 이 웨이브가 시작될 때 카드를 고른다 (무한 모드, 오늘의 도전)

export const CARDS = [
  { id: 'bread_speed', line: 'cut', emoji: '🍞', name: '바삭한 빵칼', desc: '🍞 빵 줄 칼질 속도 +30%', fx: { lineSpeed: { cut: 0.3 } } },
  { id: 'meat_power', line: 'grill', emoji: '🍖', name: '숯불 직화', desc: '🍖 고기 줄 요리 양 +40%', fx: { lineDamage: { grill: 0.4 } } },
  {
    id: 'dessert_chill',
    line: 'chill',
    emoji: '🍰',
    name: '얼음 크림',
    desc: '🍰 디저트 줄 요리 양 +40%, 멈칫 시간 +50%',
    fx: { lineDamage: { chill: 0.4 }, slowTime: 0.5 },
  },
  { id: 'soup_dot', line: 'boil', emoji: '🍲', name: '진한 국물', desc: '🍲 국물 줄 요리 양·뜨거움 +50%', fx: { lineDamage: { boil: 0.5 } } },
  { id: 'noodle_power', line: 'noodle', emoji: '🍜', name: '수타면', desc: '🍜 면 줄 요리 양 +40%', fx: { lineDamage: { noodle: 0.4 } } },
  { id: 'sea_speed', line: 'sea', emoji: '🦐', name: '싱싱한 어시장', desc: '🦐 해산물 줄 칼질 속도 +35%', fx: { lineSpeed: { sea: 0.35 } } },
  { id: 'drink_power', line: 'drink', emoji: '🧋', name: '샷 추가', desc: '🧋 음료 줄 칼질 속도 +40%', fx: { lineSpeed: { drink: 0.4 } } },
  { id: 'fry_power', line: 'fry', emoji: '🍤', name: '새 기름', desc: '🍤 튀김 줄 요리 양 +50%', fx: { lineDamage: { fry: 0.5 } } },
  { id: 'all_power', emoji: '🔥', name: '센 불', desc: '모든 요리 양 +15%', fx: { damage: 0.15 } },
  { id: 'sharp_knife', emoji: '🔪', name: '잘 드는 칼', desc: '모든 칼질 속도 +15%', fx: { speed: 0.15 } },
  { id: 'free_summon', emoji: '🎲', name: '시장 쿠폰', desc: '뽑기 3번 무료', fx: { freeSummons: 3 } },
  {
    id: 'gold',
    emoji: '💰',
    name: '단골 손님',
    desc: '지금 골드 +(웨이브 × 10)',
    now: (scene) => {
      const gold = scene.wave * 10;
      scene.gold += gold;
      return `🪙 +${gold}`;
    },
  },
  { id: 'merge_jump', emoji: '🔀', name: '비법 소스', desc: '합칠 때 15% 확률로 한 단계 더', fx: { mergeJump: 0.15 } },
  { id: 'set_power', emoji: '🍱', name: '찰떡 호흡', desc: '합작 요리 양 +50%', fx: { setPower: 0.5 } },
  { id: 'weakness', emoji: '🎯', name: '손님 취향 저격', desc: '좋아하는 요리 효과 +0.4배', fx: { weakness: 0.4 } },
  { id: 'hand', emoji: '💪', name: '팔 힘 운동', desc: '손 힘 최대 +5', fx: { hand: 5 } },
  { id: 'luck', emoji: '🍀', name: '행운의 앞치마', desc: '뽑기에서 희귀·영웅 확률 2배', fx: { luck: 2 } },
  { id: 'rail', emoji: '🪑', name: '의자 추가', desc: '식당 자리 +10', fx: { railLimit: 10 } },
  { id: 'interest', emoji: '🏦', name: '적금', desc: '웨이브마다 가진 골드의 10% 이자 (최대 30)', fx: { interest: 0.1 } },
  {
    id: 'promote',
    emoji: '🧑‍🍳',
    name: '특별 교육',
    desc: '판 위 일반 요리 2개가 다음 단계로',
    now: (scene) => `${scene.promoteRandomUnits(2)}개 승급!`,
  },
];

// 이번 판 덱에서 나올 수 있는 카드
export function cardsForDeck(lines) {
  return CARDS.filter((card) => !card.line || lines.includes(card.line));
}

// 곱하는 효과 (나머지는 더한다)
const MULTIPLY = ['luck'];

export function emptyCardFx() {
  return { lineSpeed: {}, lineDamage: {}, luck: 1 };
}

// 카드 효과를 지금까지의 효과에 더한다
export function addCardFx(total, fx = {}) {
  for (const [key, value] of Object.entries(fx)) {
    if (typeof value === 'object') {
      for (const [line, v] of Object.entries(value)) total[key][line] = (total[key][line] ?? 0) + v;
    } else if (MULTIPLY.includes(key)) total[key] = (total[key] ?? 1) * value;
    else total[key] = (total[key] ?? 0) + value;
  }
  return total;
}
