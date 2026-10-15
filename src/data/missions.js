// 🎯 판 안 미션: 한 판 동안 미션이 하나씩 나오고, 깨면 바로 보상을 받고 다음 미션이 나온다.
// event: GameScene.quest(event)로 세는 일 (뽑기, 합치기 …), target: 목표
// need: 이 기능이 열려 있어야 나오는 미션 (combos 등)
// reward: gold(골드, 웨이브가 오를수록 조금 더), free(무료 뽑기), upgrade(가장 싼 줄 무료 강화)

export const MISSIONS = [
  { id: 'summon', emoji: '🎲', text: '재료 뽑기 10번', event: 'summon', target: 10, reward: { gold: 30 } },
  { id: 'merge', emoji: '🔄', text: '요리 합치기 5번', event: 'merge', target: 5, reward: { free: 2 } },
  { id: 'serve', emoji: '😋', text: '손님 40명 배부르게', event: 'serve', target: 40, reward: { gold: 50 } },
  { id: 'chop', emoji: '🔪', text: '톡 칼질 돕기 15번', event: 'chop', target: 15, reward: { gold: 40 } },
  { id: 'upgrade', emoji: '⬆️', text: '줄 강화 2번', event: 'upgrade', target: 2, reward: { gold: 60 } },
  { id: 'hero', emoji: '🟣', text: '영웅 요리 만들기', event: 'hero', target: 1, reward: { upgrade: 1 } },
  { id: 'hidden', emoji: '🍳', text: '히든 요리 만들기', event: 'hidden', target: 1, reward: { gold: 120 } },
  { id: 'combo', emoji: '🍱', text: '합작 요리 5번 던지기', event: 'set', target: 5, reward: { free: 3 }, need: 'combos' },
  { id: 'swap', emoji: '🔀', text: '요리 바꾸기 2번', event: 'swap', target: 2, reward: { free: 2 } },
  { id: 'legend', emoji: '🌟', text: '전설 요리 만들기', event: 'legend', target: 1, reward: { gold: 150 } },
];

// 보상을 글로
export function rewardText(reward, wave) {
  if (reward.gold) return `🪙 ${missionGold(reward.gold, wave)}`;
  if (reward.free) return `🎲 무료 ${reward.free}번`;
  return `⬆️ 무료 강화`;
}

// 골드 보상: 웨이브가 오를수록 커진다
export function missionGold(gold, wave) {
  return Math.round(gold * (1 + wave / 15));
}
