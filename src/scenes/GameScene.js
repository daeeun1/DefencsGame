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
import {
  TOTAL_WAVES,
  WAVE_DURATION,
  RAIL_LIMIT,
  RAIL_WARNING,
  START_GOLD,
  SPAWN_SPREAD,
  TAP_DAMAGE,
  ordersInWave,
  orderMixForWave,
} from '../data/balance.js';
import { createButton } from '../ui.js';
import Rail from '../objects/Rail.js';
import Order from '../objects/Order.js';

// 실제 게임이 진행되는 장면.
// 2단계: 주문이 레일을 돌고, 웨이브가 진행되고, 주문이 너무 쌓이면 패배한다.
// 요리사는 3단계에서 붙인다. 그 전까지는 주문을 손가락으로 탭해서 처리할 수 있다(임시).
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.screenHeight = this.scale.height; // 휴대폰마다 다른 실제 화면 높이
    this.boardY = boardTop(this.screenHeight);

    // 한 판의 상태. 다시 하기를 누르면 create()가 다시 실행되어 처음 값으로 돌아간다.
    this.wave = 0;
    this.waveTimeLeft = 0;
    this.waveElapsed = 0;
    this.spawnQueue = []; // 이번 웨이브에 아직 안 나온 주문들 { at: 나올 시각(초), type }
    this.orders = [];
    this.gold = START_GOLD;
    this.isOver = false;

    this.rail = new Rail(this.boardY);

    this.drawBoard();
    this.createHud();
    this.drawControls();

    this.input.on('pointerdown', (pointer) => this.handleTap(pointer));

    this.startWave(1);
  }

  // 매 프레임 실행된다. delta는 지난 프레임부터 흐른 시간(밀리초).
  update(time, delta) {
    if (this.isOver) return;
    const dt = delta / 1000;

    // 1) 웨이브 시간 진행
    this.waveTimeLeft -= dt;
    this.waveElapsed += dt;

    // 2) 나올 시간이 된 주문을 레일에 올린다
    while (this.spawnQueue.length > 0 && this.spawnQueue[0].at <= this.waveElapsed) {
      this.spawnOrder(this.spawnQueue.shift().type);
    }

    // 3) 모든 주문을 앞으로 이동
    for (const order of this.orders) order.step(dt);

    // 4) 패배 / 다음 웨이브 / 클리어 판정
    if (this.orders.length >= RAIL_LIMIT) {
      this.endGame(false);
    } else if (this.waveTimeLeft <= 0) {
      if (this.wave >= TOTAL_WAVES) this.endGame(true);
      else this.startWave(this.wave + 1);
    }

    this.updateHud();
  }

  // ───────── 웨이브와 주문 ─────────

  startWave(wave) {
    this.wave = wave;
    this.waveTimeLeft = WAVE_DURATION;
    this.waveElapsed = 0;

    // 이번 웨이브에 나올 주문들을 미리 정해 두고, SPAWN_SPREAD초 동안 고르게 나눠서 내보낸다
    const count = ordersInWave(wave);
    const mix = orderMixForWave(wave);
    this.spawnQueue = [];
    for (let i = 0; i < count; i++) {
      this.spawnQueue.push({ at: (SPAWN_SPREAD * i) / count, type: pickWeighted(mix) });
    }

    this.showBanner(`웨이브 ${wave}`);
  }

  spawnOrder(typeKey) {
    const order = new Order(this, this.rail, typeKey, this.wave);
    this.orderLayer.add(order);
    this.orders.push(order);
  }

  // 주문을 처리했을 때: 골드를 받고 레일에서 사라진다
  completeOrder(order) {
    this.gold += order.type.reward;
    this.orders = this.orders.filter((o) => o !== order);
    this.floatText(order.x, order.y - 30, `+${order.type.reward}`, COLORS.gold);

    this.tweens.add({
      targets: order,
      scale: 1.4,
      alpha: 0,
      duration: 180,
      onComplete: () => order.destroy(),
    });
  }

  // 임시: 손가락으로 탭한 곳에서 가장 가까운 주문에 피해를 준다.
  // 정확히 누르지 않아도 되게 반경 60 안이면 맞은 것으로 친다.
  handleTap(pointer) {
    if (this.isOver) return;
    let target = null;
    let best = 60;
    for (const order of this.orders) {
      const d = Phaser.Math.Distance.Between(pointer.worldX, pointer.worldY, order.x, order.y);
      if (d < best) {
        best = d;
        target = order;
      }
    }
    if (target && target.takeDamage(TAP_DAMAGE)) this.completeOrder(target);
  }

  // ───────── 게임 끝 ─────────

  endGame(cleared) {
    this.isOver = true;
    this.updateHud();

    const centerX = GAME_WIDTH / 2;
    const centerY = this.screenHeight / 2;

    this.add.rectangle(0, 0, GAME_WIDTH, this.screenHeight, 0x000000, 0.7).setOrigin(0).setDepth(10);

    const title = cleared ? '🎉 영업 성공!' : '😵 가게가 망했어요...';
    const detail = cleared
      ? `${TOTAL_WAVES}웨이브를 모두 버텼어요`
      : `${this.wave}웨이브에서 레일에 주문이 ${RAIL_LIMIT}개 쌓였어요`;

    this.add
      .text(centerX, centerY - 160, title, { fontFamily: FONT, fontSize: '60px', fontStyle: 'bold', color: COLORS.text })
      .setOrigin(0.5)
      .setDepth(11);
    this.add
      .text(centerX, centerY - 80, detail, { fontFamily: FONT, fontSize: '28px', color: COLORS.gold })
      .setOrigin(0.5)
      .setDepth(11);

    createButton(this, centerX, centerY + 40, 360, 100, '다시 하기', () => this.scene.restart()).setDepth(11);
    createButton(this, centerX, centerY + 160, 360, 100, '처음으로', () => this.scene.start('Title')).setDepth(11);
  }

  // ───────── 화면 그리기 ─────────

  // 화면 위쪽 정보 표시줄: 웨이브, 남은 시간, 레일 위 주문 수, 골드
  createHud() {
    this.add.rectangle(0, 0, GAME_WIDTH, HUD_HEIGHT, COLORS.hud).setOrigin(0);

    const labels = ['웨이브', '남은 시간', '레일 주문', '골드'];
    const columnWidth = GAME_WIDTH / labels.length;

    this.hudValues = labels.map((label, i) => {
      const x = columnWidth * i + columnWidth / 2;
      this.add.text(x, 38, label, { fontFamily: FONT, fontSize: '22px', color: '#b9a48f' }).setOrigin(0.5);
      return this.add
        .text(x, 78, '', { fontFamily: FONT, fontSize: '34px', fontStyle: 'bold', color: COLORS.text })
        .setOrigin(0.5);
    });
    this.hudValues[3].setColor(COLORS.gold);
    this.updateHud();
  }

  updateHud() {
    const [wave, time, orders, gold] = this.hudValues;
    wave.setText(`${this.wave} / ${TOTAL_WAVES}`);
    time.setText(`${Math.max(0, Math.ceil(this.waveTimeLeft))}`);
    orders.setText(`${this.orders.length} / ${RAIL_LIMIT}`);
    orders.setColor(this.orders.length >= RAIL_WARNING ? COLORS.danger : COLORS.text);
    gold.setText(`${this.gold}`);
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
          g.fillStyle(COLORS.railStripe, 1);
          g.fillRect(x + 8, y + 8, TILE - 16, TILE - 16);
          this.drawArrow(g, x + TILE / 2, y + TILE / 2, this.railDirection(col, row));
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

    // 주문은 판 위, 안내 문구보다 아래에 그린다
    this.orderLayer = this.add.layer();
  }

  // 판의 가장 바깥 줄이면 레일
  isRail(col, row) {
    return col === 0 || row === 0 || col === BOARD_COLS - 1 || row === BOARD_ROWS - 1;
  }

  // 레일 칸에서 주문이 움직이는 방향 (각도, 라디안). 시계 방향으로 돈다.
  railDirection(col, row) {
    const lastCol = BOARD_COLS - 1;
    const lastRow = BOARD_ROWS - 1;
    if (row === 0 && col < lastCol) return 0; // 위쪽 줄: 오른쪽으로
    if (col === lastCol && row < lastRow) return Math.PI / 2; // 오른쪽 줄: 아래로
    if (row === lastRow && col > 0) return Math.PI; // 아래쪽 줄: 왼쪽으로
    return -Math.PI / 2; // 왼쪽 줄: 위로
  }

  // 레일 위 진행 방향 표시(›)
  drawArrow(g, cx, cy, angle) {
    const size = 14;
    const point = (dx, dy) => ({
      x: cx + dx * Math.cos(angle) - dy * Math.sin(angle),
      y: cy + dx * Math.sin(angle) + dy * Math.cos(angle),
    });
    const a = point(-size / 2, -size);
    const b = point(size / 2, 0);
    const c = point(-size / 2, size);
    g.lineStyle(5, COLORS.rail, 1);
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);
    g.lineTo(c.x, c.y);
    g.strokePath();
  }

  // 화면 아래 버튼들. 지금은 모양만 있고, 3~4단계에서 기능을 연결한다.
  drawControls() {
    const y = this.screenHeight - CONTROLS_HEIGHT / 2;
    createButton(this, 250, y, 380, 120, '🎲 요리사 뽑기', () => {}, { enabled: false });
    createButton(this, 560, y, 220, 120, '⬆ 강화', () => {}, { enabled: false });

    this.add
      .text(GAME_WIDTH / 2, y - 90, '(임시) 주문을 탭하면 처리돼요', { fontFamily: FONT, fontSize: '22px', color: '#b9a48f' })
      .setOrigin(0.5);

    // 정보 표시줄 바로 아래 작은 버튼: 첫 화면으로 돌아가기
    const back = this.add
      .text(BOARD_X, HUD_HEIGHT + 4, '← 처음으로', { fontFamily: FONT, fontSize: '20px', color: '#b9a48f' })
      .setInteractive({ useHandCursor: true });
    back.on('pointerup', () => this.scene.start('Title'));
  }

  // 판 가운데에 잠깐 나타났다 사라지는 큰 글씨 (예: "웨이브 3")
  showBanner(message) {
    const text = this.add
      .text(GAME_WIDTH / 2, this.boardY + (BOARD_ROWS * TILE) / 2, message, {
        fontFamily: FONT,
        fontSize: '64px',
        fontStyle: 'bold',
        color: COLORS.textDark,
      })
      .setOrigin(0.5)
      .setDepth(5);
    this.tweens.add({ targets: text, alpha: 0, delay: 700, duration: 500, onComplete: () => text.destroy() });
  }

  // 위로 떠오르며 사라지는 작은 글씨 (예: 골드 "+2")
  floatText(x, y, message, color) {
    const text = this.add
      .text(x, y, message, { fontFamily: FONT, fontSize: '28px', fontStyle: 'bold', color })
      .setOrigin(0.5)
      .setDepth(6);
    this.tweens.add({ targets: text, y: y - 50, alpha: 0, duration: 700, onComplete: () => text.destroy() });
  }
}

// { salad: 3, ramen: 1 } 같은 비율표에서 하나를 무작위로 고른다
function pickWeighted(weights) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = Math.random() * total;
  for (const [key, w] of entries) {
    r -= w;
    if (r < 0) return key;
  }
  return entries[entries.length - 1][0];
}
