// 🔓 판 안 기능은 계정 기준으로 하나씩 열린다.
// 여정에서 처음으로 그 웨이브에 도착하면 열리고, 한 번 열린 기능은 다음 판부터 계속 열려 있다.
// (그래서 "다음 동네부터 출발"해도 순서가 꼬이지 않는다)
// 처음부터 열린 것: 뽑기, 합치기, 톡 칼질

import { bestWave } from './towns.js';

export const UNLOCKS = [
  { id: 'boss', wave: 10, tip: '👑 큰 손님이 왔다!\n보스는 오래 버텨요. 다 먹여야 다음 웨이브로' },
  { id: 'recipes', wave: 11, tip: '📖 레시피대로 모으면 신화 요리!\n오른쪽 위 📖를 눌러 조합표를 봐요' },
  { id: 'upgrade', wave: 16, tip: '⬆️ 종류별 강화가 열렸어요!\n빵을 한꺼번에 세게!' },
  { id: 'sell', wave: 21, tip: '💰 팔기가 열렸어요!\n필요 없는 요리는 골드로' },
  { id: 'swap', wave: 31, tip: '🔀 요리 바꾸기가 열렸어요!\n모자란 재료를 바꿔 봐' },
  { id: 'missions', wave: 41, tip: '🎯 판 안 미션이 열렸어요!\n깨면 바로 보상' },
];

// 이 웨이브까지 와 봤으면 열린 기능 { recipes: true, ... }
export function featuresAtReach(reach) {
  return Object.fromEntries(UNLOCKS.map((u) => [u.id, reach >= u.wave]));
}

// 지금 계정에서 열린 기능 (가장 멀리 간 웨이브 기준)
export function accountFeatures() {
  return featuresAtReach(bestWave());
}

// 모든 기능이 열린 판 (오늘의 도전)
export const ALL_FEATURES = featuresAtReach(Infinity);
