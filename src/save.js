// 영구 성장 기록 저장.
// 휴대폰 브라우저(앱으로 포장한 뒤에는 앱) 안에 저장되어, 게임을 껐다 켜도 남는다.

import { LEGACY_IDS, STARTER_LINES, chefById } from './data/chefs.js';
import { lineLevelOf, lineXpForLevel } from './data/progress.js';

const KEY = 'kitchen-defense-save-v1';

function defaultSave() {
  return {
    tips: 0, // 🪙 팁 (가게 강화에 쓰는 재화)
    stages: {}, // 🗺️ 스테이지별 최고 별 { 'bakery-3': 2 }
    lines: [...STARTER_LINES], // 📖 모은 레시피 줄
    deck: [...STARTER_LINES], // 판에 가져가는 4줄
    lineXp: {}, // 줄별 경험치 { cut: 120 }
    seen: [], // 한 번 본 안내 { 'combos', ... }
    shop: {}, // 가게 강화 레벨 { startGold: 1 }
    codex: {}, // (예전) 유닛별 도감 레벨. 줄 레벨로 옮긴다
    discovered: [], // 한 번이라도 만난 요리사 id 목록
    runs: 0, // 플레이한 판 수
    settings: { sfx: true, music: true, vibration: true }, // 효과음, 배경음악, 진동
  };
}

let cache = null;
const writeListeners = []; // 저장할 때마다 부르는 함수들 (클라우드 저장)

// 저장된 기록을 불러온다 (처음 한 번만 실제로 읽고, 그 뒤로는 기억해 둔 값을 쓴다)
export function getSave() {
  if (!cache) {
    try {
      const raw = localStorage.getItem(KEY);
      cache = raw ? { ...defaultSave(), ...JSON.parse(raw) } : defaultSave();
      migrateLegacyIds(cache);
    } catch {
      cache = defaultSave(); // 저장소를 못 쓰는 환경이면 이번 실행 동안만 기억한다
    }
  }
  return cache;
}

// 예전 요리사 id로 저장된 도감 기록을 새 레시피 유닛 id로 옮긴다
function migrateLegacyIds(save) {
  for (const [oldId, newId] of Object.entries(LEGACY_IDS)) {
    if (save.codex[oldId] !== undefined) {
      save.codex[newId] = Math.max(save.codex[newId] ?? 0, save.codex[oldId]);
      delete save.codex[oldId];
    }
  }
  save.discovered = [...new Set(save.discovered.map((id) => LEGACY_IDS[id] ?? id))];

  // 예전 유닛별 도감 레벨 → 레시피 줄 레벨 (그 줄에서 가장 높은 도감 레벨만큼)
  if (!save.codexMoved) {
    save.lineXp ??= {};
    for (const [id, level] of Object.entries(save.codex ?? {})) {
      const line = chefById(id)?.method;
      if (!line || !level) continue;
      save.lineXp[line] = Math.max(save.lineXp[line] ?? 0, lineXpForLevel(level));
    }
    save.codexMoved = true;
  }
}

// 지금 기록을 저장한다 (휴대폰에 저장하고, 클라우드에도 올리도록 알린다)
export function writeSave() {
  getSave().updatedAt = Date.now(); // 클라우드 기록과 어느 쪽이 최신인지 비교할 때 쓴다
  writeLocal();
  for (const fn of writeListeners) fn();
}

function writeLocal() {
  try {
    localStorage.setItem(KEY, JSON.stringify(getSave()));
  } catch {
    // 저장 실패(사생활 보호 모드 등)는 조용히 넘어간다
  }
}

export function onSaveWritten(fn) {
  writeListeners.push(fn);
}

// 클라우드에서 받아 온 기록으로 통째로 바꾼다
export function replaceSave(data) {
  cache = { ...defaultSave(), ...data };
  migrateLegacyIds(cache);
  writeLocal();
}

// 모든 스테이지의 최고 별을 더한 값
export function totalStars() {
  return Object.values(getSave().stages ?? {}).reduce((sum, n) => sum + n, 0);
}

export function shopLevel(id) {
  return getSave().shop[id] ?? 0;
}

// 레시피 줄 레벨 (경험치로 계산)
export function lineLevel(line) {
  return lineLevelOf(getSave().lineXp?.[line] ?? 0).level;
}

export function isDiscovered(id) {
  return getSave().discovered.includes(id);
}

// 요리사를 도감에 등록한다. 처음 만난 요리사면 true
export function discover(id) {
  const save = getSave();
  if (save.discovered.includes(id)) return false;
  save.discovered.push(id);
  writeSave();
  return true;
}
