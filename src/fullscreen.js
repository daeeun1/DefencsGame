import { getSave, writeSave } from './save.js';

// ⛶ 전체 화면: 브라우저 주소창과 아래 버튼줄을 숨겨 게임을 크게 보여 준다.
// 브라우저 규칙상 사용자가 화면을 누른 순간에만 켤 수 있다. (아이폰 사파리는 지원하지 않는다)

export function canFullscreen() {
  return Boolean(document.documentElement.requestFullscreen) && !isStandalone();
}

// 홈 화면에 추가해서 앱처럼 연 경우 (이미 주소창이 없다)
function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.matchMedia?.('(display-mode: fullscreen)').matches;
}

export function isFullscreen() {
  return Boolean(document.fullscreenElement);
}

export function toggleFullscreen() {
  const settings = getSave().settings;
  if (isFullscreen()) {
    settings.fullscreen = false;
    document.exitFullscreen?.().catch(() => {});
  } else {
    settings.fullscreen = true;
    enterFullscreen();
  }
  writeSave();
}

function enterFullscreen() {
  document.documentElement.requestFullscreen?.({ navigationUI: 'hide' }).catch(() => {});
}

// 처음 화면을 누를 때 자동으로 전체 화면 (설정에서 끄면 하지 않는다)
export function autoFullscreen() {
  if (!canFullscreen()) return;
  const once = () => {
    if (getSave().settings.fullscreen !== false && !isFullscreen()) enterFullscreen();
  };
  document.addEventListener('pointerup', once, { once: true });
}
