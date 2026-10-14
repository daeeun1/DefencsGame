// 🏅 미슐랭 등급 (난이도 사다리).
// 등급을 하나 깨면 다음 등급이 열린다. 등급이 오를수록 아래 규칙이 하나씩 쌓인다.
// 규칙 값은 오늘의 특선 규칙과 같은 이름을 쓴다 (GameScene의 this.mod로 합쳐진다)
//   orderHp     주문 체력 배율 (VIP 손님 포함)     bossHp     VIP 손님 체력 배율
//   orderSpeed  주문 이동 속도 배율                 railLimit  레일 한도 (+/-)
//   startGold   시작 골드 (+/-)                     patience   VIP 인내심 초 (+/-)
//   specialsEarly  특수 주문이 이만큼 웨이브 일찍 나온다

export const MAX_GRADE = 10;

export const GRADES = [
  { level: 1, name: '견습', desc: '기본 규칙', rule: {} },
  { level: 2, name: '초보', desc: '주문 체력 +15%', rule: { orderHp: 1.15 } },
  { level: 3, name: '수습', desc: '레일 한도 -10', rule: { railLimit: -10 } },
  { level: 4, name: '정식', desc: 'VIP 손님 체력 +30%', rule: { bossHp: 1.3 } },
  { level: 5, name: '숙련', desc: '주문 속도 +10%', rule: { orderSpeed: 1.1 } },
  { level: 6, name: '부주방장', desc: '시작 골드 -40', rule: { startGold: -40 } },
  { level: 7, name: '주방장', desc: '주문 체력 +20% 더', rule: { orderHp: 1.2 } },
  { level: 8, name: '수석', desc: 'VIP 인내심 -10초', rule: { patience: -10 } },
  { level: 9, name: '명인', desc: '특수 주문이 더 일찍, 더 많이', rule: { specialsEarly: 6 } },
  { level: 10, name: '전설의 셰프', desc: '주문 체력 +25%, 속도 +10% 더', rule: { orderHp: 1.25, orderSpeed: 1.1 } },
];

// 등급이 하나 오를 때마다 팁 +10%
export const GRADE_TIP_BONUS = 0.1;

// 이 등급까지 쌓인 규칙 목록
export function gradeRules(level) {
  return GRADES.filter((g) => g.level <= level && g.level > 1);
}

// 여러 규칙을 하나로 합친다: 배율은 곱하고, 더하기 값은 더하고, 나머지는 뒤의 것으로
const MULTIPLY = ['orderHp', 'bossHp', 'orderSpeed', 'summonCost', 'setPower', 'tips'];
const ADD = ['railLimit', 'startGold', 'patience', 'specialsEarly', 'orderReward'];

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
