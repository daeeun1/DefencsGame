import { TILE, BOARD_COLS, BOARD_ROWS, BOARD_X } from '../config.js';

// 회전 레일의 경로.
// 레일 칸들의 가운데를 잇는 사각형 고리이고, 왼쪽 위에서 시작해 시계 방향으로 돈다.
// "출발점에서 얼마나 왔는지(거리)"를 넣으면 화면 좌표를 돌려준다.
export default class Rail {
  constructor(boardY) {
    const left = BOARD_X + TILE / 2;
    const right = BOARD_X + (BOARD_COLS - 0.5) * TILE;
    const top = boardY + TILE / 2;
    const bottom = boardY + (BOARD_ROWS - 0.5) * TILE;

    // 모서리 4개 (시계 방향)
    this.corners = [
      { x: left, y: top },
      { x: right, y: top },
      { x: right, y: bottom },
      { x: left, y: bottom },
    ];

    // 각 변의 길이와 전체 둘레
    this.segments = this.corners.map((from, i) => {
      const to = this.corners[(i + 1) % 4];
      return { from, to, length: Math.hypot(to.x - from.x, to.y - from.y) };
    });
    this.length = this.segments.reduce((sum, s) => sum + s.length, 0);
  }

  // 출발점에서 distance만큼 간 곳의 좌표. 한 바퀴를 넘으면 다시 처음부터 돈다.
  positionAt(distance) {
    let d = distance % this.length;
    for (const s of this.segments) {
      if (d <= s.length) {
        const t = d / s.length;
        return {
          x: s.from.x + (s.to.x - s.from.x) * t,
          y: s.from.y + (s.to.y - s.from.y) * t,
        };
      }
      d -= s.length;
    }
    return { ...this.corners[0] };
  }
}
