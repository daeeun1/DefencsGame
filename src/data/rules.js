// 특별 규칙 합치기.
// 오늘의 도전, 이벤트처럼 한 판에 특별 규칙이 붙을 때 GameScene의 this.mod로 합쳐진다.
//   orderHp     손님 배고픔 배율 (보스 포함)     bossHp     보스 배고픔 배율
//   orderSpeed  손님 이동 속도 배율               railLimit  식당 자리 (+/-)
//   startGold   시작 골드 (+/-)                   patience   보스 인내심 초 (+/-)
//   summonCost  뽑기 비용 배율                    upgradeCost 종류별 강화 비용 배율
//   tips        판 끝 팁 배율                     orderReward 손님 하나 배부를 때 추가 골드

// 여러 규칙을 하나로 합친다: 배율은 곱하고, 더하기 값은 더하고, 나머지는 뒤의 것으로
const MULTIPLY = ['orderHp', 'bossHp', 'orderSpeed', 'summonCost', 'upgradeCost', 'tips'];
const ADD = ['railLimit', 'startGold', 'patience', 'orderReward'];

export function mergeRules(rules) {
  const merged = {};
  for (const rule of rules) {
    for (const [key, value] of Object.entries(rule)) {
      if (MULTIPLY.includes(key)) merged[key] = (merged[key] ?? 1) * value;
      else if (ADD.includes(key)) merged[key] = (merged[key] ?? 0) + value;
      else merged[key] = value;
    }
  }
  return merged;
}
