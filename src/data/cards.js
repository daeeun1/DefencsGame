// 📜 레시피 카드: 5웨이브마다 3장 중 1장을 골라 이번 판을 강하게 만든다.
// 같은 카드를 여러 번 고르면 효과가 쌓인다.
//
// fx: 고르면 이번 판의 카드 효과(GameScene.cardFx)에 더해지는 값
//   lineSpeed{줄}  그 줄 공격 속도 +비율     lineDamage{줄}  그 줄 공격력 +비율
//   damage         모든 유닛 공격력 +비율    slowTime        감속 시간 +비율
//   setPower       세트 메뉴 효과 +비율      weakness        약점 피해 배율 +값
//   freeSummons    무료 뽑기 횟수            mergeJump       합성할 때 한 단계 더 올라갈 확률
//   luck           희귀·영웅 확률 배율(곱)    upgradeSale     강화 비용 배율(곱)
//   railLimit      레일 한도 +값             interest        웨이브마다 가진 골드의 이 비율만큼 이자 (최대 30)
// now(scene): 고르는 즉시 일어나는 일

export const CARD_WAVES = [6, 11, 16, 21, 26]; // 이 웨이브가 시작될 때 카드를 고른다

export const CARDS = [
  { id: 'bread_speed', emoji: '🍞', name: '바삭한 빵칼', desc: '🍞 빵 줄 공격 속도 +30%', fx: { lineSpeed: { cut: 0.3 } } },
  { id: 'meat_power', emoji: '🍖', name: '숯불 직화', desc: '🍖 고기 줄 공격력 +40%', fx: { lineDamage: { grill: 0.4 } } },
  {
    id: 'dessert_chill',
    emoji: '🍰',
    name: '얼음 크림',
    desc: '🍰 디저트 줄 공격력 +40%, 감속 시간 +50%',
    fx: { lineDamage: { chill: 0.4 }, slowTime: 0.5 },
  },
  { id: 'soup_dot', emoji: '🍲', name: '진한 국물', desc: '🍲 국물 줄 공격력·지속 피해 +50%', fx: { lineDamage: { boil: 0.5 } } },
  { id: 'all_power', emoji: '🔥', name: '센 불', desc: '모든 유닛 공격력 +15%', fx: { damage: 0.15 } },
  { id: 'free_summon', emoji: '🎲', name: '인력소 쿠폰', desc: '뽑기 3번 무료', fx: { freeSummons: 3 } },
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
  { id: 'merge_jump', emoji: '🔀', name: '비법 소스', desc: '합성할 때 15% 확률로 한 단계 더', fx: { mergeJump: 0.15 } },
  { id: 'set_power', emoji: '🍱', name: '세트 할인', desc: '세트 메뉴 효과 +50%', fx: { setPower: 0.5 } },
  { id: 'weakness', emoji: '🎯', name: '손님 취향 저격', desc: '약점 피해 +0.3배', fx: { weakness: 0.3 } },
  { id: 'upgrade_sale', emoji: '⬆️', name: '장비 세일', desc: '강화 비용 30% 할인', fx: { upgradeSale: 0.7 } },
  { id: 'luck', emoji: '🍀', name: '행운의 앞치마', desc: '뽑기에서 희귀·영웅 확률 2배', fx: { luck: 2 } },
  { id: 'rail', emoji: '🛤️', name: '긴 레일', desc: '레일 한도 +10', fx: { railLimit: 10 } },
  { id: 'interest', emoji: '🏦', name: '적금', desc: '웨이브마다 가진 골드의 10% 이자 (최대 30)', fx: { interest: 0.1 } },
  {
    id: 'promote',
    emoji: '🧑‍🍳',
    name: '특별 교육',
    desc: '판 위 일반 유닛 2개가 다음 단계로',
    now: (scene) => `${scene.promoteRandomUnits(2)}개 승급!`,
  },
];

// 곱하는 효과 (나머지는 더한다)
const MULTIPLY = ['luck', 'upgradeSale'];

export function emptyCardFx() {
  return { lineSpeed: {}, lineDamage: {}, luck: 1, upgradeSale: 1 };
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
