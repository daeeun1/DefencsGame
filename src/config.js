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

// 화면 위쪽 정보 표시줄과 아래쪽 버튼 영역 높이
export const HUD_HEIGHT = 120;
export const CONTROLS_HEIGHT = 200;

// 판 위쪽 y. 정보 표시줄과 버튼 영역 사이의 가운데에 놓는다.
export function boardTop(screenHeight) {
  const space = screenHeight - HUD_HEIGHT - CONTROLS_HEIGHT;
  return HUD_HEIGHT + (space - BOARD_ROWS * TILE) / 2;
}

export const COLORS = {
  background: 0x2b1d14, // 주방 바닥 (진한 갈색)
  rail: 0x5b6470, // 회전 레일 (금속 회색)
  railStripe: 0x7d8794, // 레일 줄무늬
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
