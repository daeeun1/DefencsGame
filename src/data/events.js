// 🎉 2주 이벤트: 2주마다 기존 판을 살짝 비튼 이벤트 스테이지가 열린다.
// 특별한 날(할로윈, 크리스마스)에는 그날의 이벤트가 먼저 나온다.
// 이벤트 스테이지는 지금 열린 가장 먼 동네 난이도로 나오고, 이벤트 기간에 처음 깨면 보너스 팁을 준다.
//
// add: 원래 손님에 더해 나오는 이벤트 손님 { 손님: 비율 }
// rule: 특별 규칙 (rules.js의 mergeRules 형식)
// bossEvery: 이 웨이브마다 보스 (보스 러시)

import { todayKey } from './daily.js';

export const EVENT_DAYS = 14; // 이벤트 하나가 열려 있는 날 수
export const EVENT_BONUS = 300; // 이벤트 기간에 처음 깨면 받는 팁

// 날짜가 정해진 이벤트 (월-일, 끝 날 포함)
const DATED = [
  {
    id: 'halloween',
    emoji: '🎃',
    name: '할로윈 호박 축제',
    desc: '호박 유령과 꼬마 유령이 사탕 대신 요리를 달래요',
    from: '10-15',
    to: '10-31',
    add: { pumpkin: 3, ghost: 2 },
    rule: { tips: 1.5 },
  },
  {
    id: 'christmas',
    emoji: '🎄',
    name: '크리스마스 파티',
    desc: '눈사람 대장이 친구들을 데리고 파티에 왔어요',
    from: '12-18',
    to: '12-31',
    add: { penguin: 2, seal: 1 },
    boss: 'snowman',
    rule: { tips: 1.5, startGold: 60 },
  },
];

// 2주마다 돌아가며 열리는 이벤트
const ROTATION = [
  {
    id: 'boss_rush',
    emoji: '👑',
    name: '보스 러시',
    desc: '5웨이브마다 보스 손님이 와요. 대신 팁 2배!',
    bossEvery: 5,
    rule: { tips: 2, bossHp: 0.6 },
  },
  {
    id: 'big_appetite',
    emoji: '🍖',
    name: '대식가 주간',
    desc: '손님이 엄청 배고파요. 대신 손님마다 골드 +2',
    rule: { orderHp: 1.5, orderReward: 2 },
  },
  {
    id: 'rush_week',
    emoji: '💨',
    name: '번개 배달 주간',
    desc: '모든 손님이 빨라요. 대신 시작 골드 +100',
    rule: { orderSpeed: 1.3, startGold: 100 },
  },
  {
    id: 'lucky_week',
    emoji: '🍀',
    name: '행운 주간',
    desc: '뽑기에서 희귀·영웅이 잘 나오지만 식당이 좁아요',
    rule: { summonOdds: { 1: 75, 2: 21, 3: 4 }, railLimit: -10 },
  },
];

// 오늘 열린 이벤트 { ...이벤트, key(이번 기간 이름), endsIn(남은 날) }
export function currentEvent(date = new Date()) {
  const today = todayKey(date); // '2026-10-15'
  const md = today.slice(5);
  const year = today.slice(0, 4);
  for (const event of DATED) {
    if (md >= event.from && md <= event.to) {
      const end = Date.parse(`${year}-${event.to}T00:00:00Z`);
      const endsIn = Math.round((end - Date.parse(`${today}T00:00:00Z`)) / 86400000) + 1;
      return { ...event, key: `${event.id}-${year}`, endsIn };
    }
  }
  const day = Math.floor(Date.parse(`${today}T00:00:00Z`) / 86400000);
  const period = Math.floor(day / EVENT_DAYS);
  const event = ROTATION[period % ROTATION.length];
  return { ...event, key: `${event.id}-${period}`, endsIn: EVENT_DAYS - (day % EVENT_DAYS) };
}
