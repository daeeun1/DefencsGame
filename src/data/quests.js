import { getSave, writeSave } from '../save.js';
import { todayKey } from './daily.js';

// 📋 오늘의 주문서: 매일(한국 시간) 퀘스트 3개. 다 하면 팁을 받는다.
// 같은 날에는 모든 플레이어가 같은 퀘스트를 받는다.
//
// event: 게임에서 이 일이 일어날 때마다 진행된다 (GameScene.quest(event, 양))
// max: true면 "한 번에 얼마나"를 센다 (예: 한 판에 몇 웨이브까지)

export const QUEST_COUNT = 3;
export const QUEST_REWARD = 50; // 퀘스트 하나 팁
export const QUEST_BONUS = 100; // 3개를 다 하면 추가 팁

export const QUESTS = [
  { id: 'summon', emoji: '🎲', text: '뽑기 40번 하기', event: 'summon', target: 40 },
  { id: 'merge', emoji: '🔄', text: '요리 20번 합치기', event: 'merge', target: 20 },
  { id: 'set', emoji: '🍱', text: '합작 요리 15번 던지기', event: 'set', target: 15 },
  { id: 'legend', emoji: '🌟', text: '전설 요리 만들기', event: 'legend', target: 1 },
  { id: 'serve', emoji: '😋', text: '손님 300명 배부르게 하기', event: 'serve', target: 300 },
  { id: 'boss', emoji: '🦉', text: '보스 손님 2명 배부르게 하기', event: 'boss', target: 2 },
  { id: 'card', emoji: '📜', text: '레시피 카드 5장 고르기', event: 'card', target: 5 },
  { id: 'daily', emoji: '🏆', text: '오늘의 도전 1번 하기', event: 'daily', target: 1 },
  { id: 'chop', emoji: '🔪', text: '톡 눌러 칼질 100번 돕기', event: 'chop', target: 100 },
];

// 날짜 글자로 만드는 간단한 해시
function hash(text) {
  let h = 2166136261;
  for (const ch of text) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// 오늘의 퀘스트 기록 (날짜가 바뀌면 새로 뽑는다)
function record() {
  const save = getSave();
  const today = todayKey();
  const known = (id) => QUESTS.some((q) => q.id === id);
  if (save.quests?.date !== today || !save.quests.ids.every(known)) {
    const pool = [...QUESTS];
    let h = hash(`quest-${today}`);
    const ids = [];
    while (ids.length < QUEST_COUNT) {
      ids.push(pool.splice(h % pool.length, 1)[0].id);
      h = Math.imul(h ^ (h >>> 13), 2654435761) >>> 0;
    }
    save.quests = { date: today, ids, progress: {}, claimed: [], bonus: false };
  }
  return save.quests;
}

// 오늘의 퀘스트 목록: { ...퀘스트, progress, done, claimed }
export function todaysQuests() {
  const r = record();
  return r.ids.map((id) => {
    const q = QUESTS.find((x) => x.id === id);
    const progress = Math.min(q.target, r.progress[id] ?? 0);
    return { ...q, progress, done: progress >= q.target, claimed: r.claimed.includes(id) };
  });
}

// 게임에서 일이 일어났을 때 진행. 이번에 새로 다 한 퀘스트 목록을 돌려준다
export function addQuestProgress(event, amount = 1) {
  const r = record();
  const finished = [];
  for (const q of todaysQuests()) {
    if (q.event !== event || q.done) continue;
    r.progress[q.id] = q.max ? Math.max(r.progress[q.id] ?? 0, amount) : (r.progress[q.id] ?? 0) + amount;
    if (r.progress[q.id] >= q.target) finished.push(q);
  }
  if (finished.length > 0) writeSave(); // 다 했을 때만 바로 저장 (나머지는 판이 끝날 때 저장된다)
  return finished;
}

// 보상 받기. 받은 팁을 돌려준다 (못 받으면 0)
export function claimQuest(id) {
  const q = todaysQuests().find((x) => x.id === id);
  if (!q || !q.done || q.claimed) return 0;
  const save = getSave();
  record().claimed.push(id);
  save.tips += QUEST_REWARD;
  writeSave();
  return QUEST_REWARD;
}

export function canClaimBonus() {
  const r = record();
  return !r.bonus && todaysQuests().every((q) => q.claimed);
}

export function claimBonus() {
  if (!canClaimBonus()) return 0;
  record().bonus = true;
  getSave().tips += QUEST_BONUS;
  writeSave();
  return QUEST_BONUS;
}

// 받을 수 있는 보상이 있는지 (첫 화면 버튼 강조용)
export function hasQuestReward() {
  return todaysQuests().some((q) => q.done && !q.claimed) || canClaimBonus();
}
