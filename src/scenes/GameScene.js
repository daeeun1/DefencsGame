import Phaser from 'phaser';
import {
  GAME_WIDTH,
  TILE,
  BOARD_COLS,
  BOARD_ROWS,
  BOARD_X,
  HUD_HEIGHT,
  CONTROLS_HEIGHT,
  boardTop,
  COLORS,
  FONT,
} from '../config.js';
import { createButton } from '../ui.js';

// 실제 게임이 진행되는 장면.
// 1단계에서는 화면 배치만 그린다. 레일 위 주문, 요리사, 버튼 기능은 다음 단계에서 붙인다.
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.screenHeight = this.scale.height; // 휴대폰마다 다른 실제 화면 높이
    this.boardY = boardTop(this.screenHeight);

    this.drawHud();
    this.drawBoard();
    this.drawControls();
  }

  // 화면 위쪽 정보 표시줄: 웨이브, 남은 시간, 레일 위 주문 수, 골드
  drawHud() {
    this.add.rectangle(0, 0, GAME_WIDTH, HUD_HEIGHT, COLORS.hud).setOrigin(0);

    const items = [
      { label: '웨이브', value: '1 / 30' },
      { label: '남은 시간', value: '15' },
      { label: '레일 주문', value: '0 / 60' },
      { label: '골드', value: '100', color: COLORS.gold },
    ];
    const columnWidth = GAME_WIDTH / items.length;

    items.forEach((item, i) => {
      const x = columnWidth * i + columnWidth / 2;
      this.add
        .text(x, 38, item.label, { fontFamily: FONT, fontSize: '22px', color: '#b9a48f' })
        .setOrigin(0.5);
      this.add
        .text(x, 78, item.value, {
          fontFamily: FONT,
          fontSize: '34px',
          fontStyle: 'bold',
          color: item.color ?? COLORS.text,
        })
        .setOrigin(0.5);
    });
  }

  // 주방 판: 바깥 한 줄은 회전 레일, 안쪽은 요리사 자리(체크무늬)
  drawBoard() {
    const g = this.add.graphics();

    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        const x = BOARD_X + col * TILE;
        const y = this.boardY + row * TILE;

        if (this.isRail(col, row)) {
          g.fillStyle(COLORS.rail, 1);
          g.fillRect(x, y, TILE, TILE);
          // 레일 줄무늬: 컨베이어 벨트 느낌
          g.fillStyle(COLORS.railStripe, 1);
          g.fillRect(x + 8, y + 8, TILE - 16, TILE - 16);
        } else {
          const checker = (col + row) % 2 === 0;
          g.fillStyle(checker ? COLORS.floorTile : COLORS.floorTileAlt, 1);
          g.fillRect(x, y, TILE, TILE);
        }
      }
    }

    // 판 테두리
    g.lineStyle(6, 0x1c120c, 1);
    g.strokeRect(BOARD_X, this.boardY, BOARD_COLS * TILE, BOARD_ROWS * TILE);
  }

  // 판의 가장 바깥 줄이면 레일
  isRail(col, row) {
    return col === 0 || row === 0 || col === BOARD_COLS - 1 || row === BOARD_ROWS - 1;
  }

  // 화면 아래 버튼들. 지금은 모양만 있고, 3~4단계에서 기능을 연결한다.
  drawControls() {
    const y = this.screenHeight - CONTROLS_HEIGHT / 2;
    createButton(this, 250, y, 380, 120, '🎲 요리사 뽑기', () => {}, { enabled: false });
    createButton(this, 560, y, 220, 120, '⬆ 강화', () => {}, { enabled: false });

    // 정보 표시줄 바로 아래 작은 버튼: 첫 화면으로 돌아가기
    const back = this.add
      .text(BOARD_X, HUD_HEIGHT + 4, '← 처음으로', { fontFamily: FONT, fontSize: '20px', color: '#b9a48f' })
      .setInteractive({ useHandCursor: true });
    back.on('pointerup', () => this.scene.start('Title'));
  }
}
