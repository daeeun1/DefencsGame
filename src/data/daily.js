import { KITCHENS } from './kitchens.js';
import { getSave, writeSave } from '../save.js';

// 🏆 오늘의 도전: 날짜(한국 시간)마다 주방 하나와 특선 메뉴(특별 규칙) 하나가 정해진다.
// 같은 날에는 모든 플레이어가 같은 규칙, 같은 운(뽑기·손님·카드 순서)으로 하고, 일일 랭킹에서 겨룬다.
// 하루에 DAILY_TRIES번만 도전할 수 있다.
//
// rule에 넣을 수 있는 값 (없으면 평소와 같다)
//   lineDamage   레시피 줄별 공격력 배율 { cut: 2, grill: 0.5 }
//   summonOdds   뽑기 등급 확률
//   summonCost   뽑기 비용 배율
//   orderSpeed   손님 이동 속도 배율
//   orderReward  손님 하나 배부를 때 추가 골드
//   orderHp      손님 배고픔 배율 (보스 포함)
//   setPower     합작 요리 배율
//   tips         판 끝 팁 배율 (특선 기본 보너스에 곱한다)

export const DAILY_TIP_BONUS = 1.5; // 오늘의 도전은 팁을 1.5배 더 준다
export const DAILY_TRIES = 3; // 하루 도전 횟수

export const DAILY_RULES = [
  { id: 'bread', emoji: '🍞', name: '빵의 날', desc: '🍞 빵 줄 요리 양 2배, 🍖 고기 줄 절반', rule: { lineDamage: { cut: 2, grill: 0.5 } } },
  { id: 'meat', emoji: '🍖', name: '고기 축제', desc: '🍖 고기 줄 요리 양 2배, 🍰 디저트 줄 절반', rule: { lineDamage: { grill: 2, chill: 0.5 } } },
  { id: 'dessert', emoji: '🍰', name: '디저트 데이', desc: '🍰 디저트 줄 요리 양 2배, 🍲 국물 줄 절반', rule: { lineDamage: { chill: 2, boil: 0.5 } } },
  { id: 'soup', emoji: '🍲', name: '국물 요일', desc: '🍲 국물 줄 요리 양 2배, 🍞 빵 줄 절반', rule: { lineDamage: { boil: 2, cut: 0.5 } } },
  { id: 'lucky', emoji: '🍀', name: '행운의 날', desc: '뽑기에서 희귀·영웅이 2배 잘 나와요', rule: { summonOdds: { 1: 80, 2: 18, 3: 2 } } },
  { id: 'sale', emoji: '💸', name: '할인 데이', desc: '뽑기 비용 30% 할인', rule: { summonCost: 0.7 } },
  { id: 'rush', emoji: '🏃', name: '급한 손님', desc: '손님이 25% 빨라지지만 하나에 골드 +1', rule: { orderSpeed: 1.25, orderReward: 1 } },
  { id: 'combo', emoji: '🍱', name: '합작 데이', desc: '합작 요리가 2배', rule: { setPower: 2 } },
  { id: 'spicy', emoji: '🌶️', name: '매운맛 도전', desc: '손님 배고픔 20% 증가, 대신 팁 2배', rule: { orderHp: 1.2, tips: 2 } },
];

// 한국 시간 기준 날짜 '2026-10-14'
export function todayKey(date = new Date()) {
  return new Date(date.getTime() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

// 날짜 글자로 만드는 간단한 해시 (같은 날짜면 항상 같은 숫자)
function hash(text) {
  let h = 2166136261;
  for (const ch of text) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// 오늘의 도전: { date, kitchen, special(DAILY_RULES 항목), boardId(랭킹 이름), seed(같은 운을 만드는 숫자) }
// 규칙은 9일 동안 9가지가 한 번씩 돌아가며 나온다 (이틀 연속 같은 규칙이 없다). 주방은 날짜 해시로 정한다.
export function todaysSpecial(date = new Date()) {
  const key = todayKey(date);
  const day = Math.floor(Date.parse(`${key}T00:00:00Z`) / 86400000); // 1970-01-01부터 며칠째인지
  return {
    date: key,
    kitchen: KITCHENS[hash(key) % KITCHENS.length],
    special: DAILY_RULES[(day * 4 + 2) % DAILY_RULES.length],
    boardId: `daily_${key.replaceAll('-', '')}`,
    seed: hash(`cookcook-${key}`),
  };
}

// ───────── 같은 운 ─────────

// 씨앗(seed) 숫자가 같으면 항상 같은 순서로 나오는 무작위 값 (0 이상 1 미만). mulberry32
export function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ───────── 하루 도전 횟수 ─────────

export function triesLeft() {
  const record = getSave().daily;
  const used = record?.date === todayKey() ? record.tries : 0;
  return Math.max(0, DAILY_TRIES - used);
}

// 도전 한 번 쓰기. 남은 횟수가 없으면 false
export function useTry() {
  if (triesLeft() <= 0) return false;
  const save = getSave();
  const today = todayKey();
  save.daily = { date: today, tries: (save.daily?.date === today ? save.daily.tries : 0) + 1 };
  writeSave();
  return true;
}
