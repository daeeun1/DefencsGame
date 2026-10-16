// 게임 전체에서 함께 쓰는 크기, 배치, 색상 값.
// 화면은 세로 720 x 1280을 기준으로 그린다.
// 휴대폰 화면이 이보다 길면 세로 길이만 늘어나고, 늘어난 만큼 판이 가운데로 온다.

export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1280;

// 주방 판: 바깥 한 줄은 회전 레일, 안쪽 칸은 요리사를 놓는 자리.
export const TILE = 100;
export const BOARD_COLS = 6; // 레일 포함 가로 칸 수
export const BOARD_ROWS = 9; // 레일 포함 세로 칸 수
export const BOARD_X = (GAME_WIDTH - BOARD_COLS * TILE) / 2; // 판 왼쪽 x

// 게임 화면 배치: 위 정보줄 → 레일 게이지 → 판 → 정보 줄 → 큰 명령 버튼 3개.
// 휴대폰 화면이 길수록(1280 → 1560) 정보줄과 버튼이 넉넉해진다. 판(900)은 크기가 그대로다.
export function gameLayout(screenHeight) {
  const t = Math.min(1, Math.max(0, (screenHeight - GAME_HEIGHT) / 280));
  const lerp = (a, b) => Math.round(a + (b - a) * t);
  const hud = { y: 10, h: lerp(92, 120) };
  const gauge = { y: hud.y + hud.h + lerp(8, 12), h: lerp(32, 44) };
  const boardY = gauge.y + gauge.h + lerp(12, 18);
  const info = { y: boardY + BOARD_ROWS * TILE + lerp(10, 16), h: lerp(66, 84) };
  const panel = { y: info.y + info.h + lerp(8, 14), h: 0 };
  panel.h = screenHeight - panel.y - 10;

  // 아주 긴 화면이면 버튼 영역은 170까지만 키우고, 남는 높이만큼 전체를 가운데로 내린다
  const maxPanel = 170;
  if (panel.h > maxPanel) {
    const shift = Math.floor((panel.h - maxPanel) / 2);
    for (const part of [hud, gauge, info, panel]) part.y += shift;
    panel.h = maxPanel;
    return { hud, gauge, boardY: boardY + shift, info, panel };
  }
  return { hud, gauge, boardY, info, panel };
}

export const COLORS = {
  background: 0x2b1d14, // 주방 바닥 (진한 갈색)
  rail: 0x5d6672, // 회전 레일 (스테인리스)
  railStripe: 0x727c89, // 레일 안쪽 판
  railSlat: 0x66707c, // 레일 컨베이어 마디
  panel: 0x3a414c, // 게임 화면 정보줄, 명령 패널 (철판 색)
  panelDark: 0x2b3038,
  outline: 0x14171c, // 게임 화면 테두리
  hud: 0x3d2a1e, // 정보 표시줄 배경
  button: 0xe85d3a, // 주요 버튼 (토마토색)
  buttonDisabled: 0x7a6a5e,
  text: '#fff8ec',
  textDark: '#3d2a1e',
  gold: '#ffd54f',
  danger: '#ff6b6b',
};

// 갈무리(Galmuri): 무료 한글 도트 글꼴 (SIL Open Font License 1.1, https://galmuri.quiple.dev)
// 글꼴에 없는 글자(이모지 등)는 기기 기본 글꼴로 나온다
export const FONT = '"Galmuri11", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

// 유닛(요리) 그림으로 쓰는 이모지 글꼴.
// 안드로이드(갤럭시 등)는 기기 기본 이모지를 쓰도록 이름을 따로 적지 않는다.
// ("Noto Color Emoji"를 적으면 갤럭시에서 오래된 이모지 글꼴이 골라져 최신 이모지가 X로 나올 수 있다)
export const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Samsung Color Emoji", sans-serif';
