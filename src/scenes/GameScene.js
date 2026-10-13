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
  SUMMON_ODDS,
  MAX_MERGE_TIER,
  UPGRADE_DAMAGE_PER_LEVEL,
  ordersInWave,
  orderMixForWave,
  summonCost,
  upgradeCost,
} from '../data/balance.js';
import { METHODS, TIERS, WEAKNESS_MULTIPLIER, chefsOfTier } from '../data/chefs.js';
import { ORDER_TYPES } from '../data/orders.js';
import { createButton } from '../ui.js';
import Rail from '../objects/Rail.js';
import Order from '../objects/Order.js';
import Chef from '../objects/Chef.js';
import Projectile from '../objects/Projectile.js';
import UpgradePanel from '../panels/UpgradePanel.js';

// 손가락이 이만큼 움직여야 "끌기"로 본다 (그보다 적으면 "누르기")
const DRAG_THRESHOLD = 12;

// 요리사가 서는 안쪽 칸 수 (레일 한 줄을 뺀 나머지)
const INNER_COLS = BOARD_COLS - 2;
const INNER_ROWS = BOARD_ROWS - 2;

// 실제 게임이 진행되는 장면.
// 주문이 레일을 돌고, 요리사를 뽑아 주문을 처리하고, 주문이 너무 쌓이면 패배한다.
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
    this.chefs = [];
    this.projectiles = [];
    this.gold = START_GOLD;
    this.summonCount = 0; // 지금까지 뽑은 횟수 (뽑기 비용 계산용)
    this.upgradeLevels = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }; // 등급별 강화 레벨
    this.selectedChef = null;
    this.drag = null; // 끌고 있는 요리사 정보 { chef, startX, startY, moved }
    this.isOver = false;

    this.rail = new Rail(this.boardY);
    this.slots = this.createSlots();

    this.drawBoard();
    this.createLayers();
    this.createHud();
    this.createControls();

    this.upgradePanel = new UpgradePanel(this, {
      levels: this.upgradeLevels,
      getGold: () => this.gold,
      onUpgrade: (tier) => this.upgrade(tier),
    });

    this.input.on('pointerdown', (pointer) => this.onPointerDown(pointer));
    this.input.on('pointermove', (pointer) => this.onPointerMove(pointer));
    this.input.on('pointerup', (pointer) => this.onPointerUp(pointer));

    this.startWave(1);
  }

  // 매 프레임 실행된다. delta는 지난 프레임부터 흐른 시간(밀리초).
  update(time, delta) {
    if (this.isOver) return;
    const dt = Math.min(delta, 100) / 1000; // 탭 전환 등으로 시간이 크게 튀는 것 방지

    // 1) 웨이브 시간 진행
    this.waveTimeLeft -= dt;
    this.waveElapsed += dt;

    // 2) 나올 시간이 된 주문을 레일에 올린다
    while (this.spawnQueue.length > 0 && this.spawnQueue[0].at <= this.waveElapsed) {
      this.spawnOrder(this.spawnQueue.shift().type);
    }

    // 3) 주문 이동 + 지속 피해
    for (const order of [...this.orders]) {
      const dotDamage = order.step(dt);
      if (dotDamage > 0) this.damageOrder(order, dotDamage);
    }

    // 4) 요리사 공격, 투사체 이동
    const dragging = this.drag && this.drag.moved ? this.drag.chef : null;
    for (const chef of this.chefs) {
      if (chef === dragging) continue; // 끌려가는 중에는 공격하지 않는다
      chef.step(dt, this.orders, (c, target) => this.attack(c, target));
    }
    for (const p of this.projectiles) p.step(dt);
    this.projectiles = this.projectiles.filter((p) => !p.done);

    // 5) 패배 / 다음 웨이브 / 클리어 판정
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

  damageOrder(order, amount) {
    if (order.takeDamage(amount)) this.completeOrder(order);
  }

  // 주문을 처리했을 때: 골드를 받고 레일에서 사라진다
  completeOrder(order) {
    this.gold += order.reward;
    this.orders = this.orders.filter((o) => o !== order);
    this.floatText(order.x, order.y - 30, `+${order.reward}`, COLORS.gold);

    this.tweens.add({
      targets: order,
      scale: 1.4,
      alpha: 0,
      duration: 180,
      onComplete: () => order.destroy(),
    });
  }

  // ───────── 요리사 ─────────

  // 요리사가 설 수 있는 칸 목록 (안쪽 4 x 7칸)
  createSlots() {
    const slots = [];
    for (let row = 0; row < INNER_ROWS; row++) {
      for (let col = 0; col < INNER_COLS; col++) {
        slots.push({
          col,
          row,
          x: BOARD_X + (col + 1.5) * TILE,
          y: this.boardY + (row + 1.5) * TILE,
          chef: null,
        });
      }
    }
    return slots;
  }

  emptySlots() {
    return this.slots.filter((s) => !s.chef);
  }

  // 요리사 뽑기: 골드를 내고 무작위 등급, 무작위 요리사를 빈 칸에 놓는다
  summon() {
    const cost = summonCost(this.summonCount);
    const empty = this.emptySlots();
    if (this.isOver || this.gold < cost || empty.length === 0) return;

    this.gold -= cost;
    this.summonCount += 1;

    const tier = Number(pickWeighted(SUMMON_ODDS));
    const data = Phaser.Utils.Array.GetRandom(chefsOfTier(tier));
    const slot = Phaser.Utils.Array.GetRandom(empty);

    this.addChef(data, slot);

    this.floatText(slot.x, slot.y - 50, data.name, colorToHex(TIERS[tier].color), 24);
    if (tier >= 2) this.showBanner(`✨ ${TIERS[tier].name}! ${data.name}`, colorToHex(TIERS[tier].color), 44);
    this.updateHud();
  }

  // 요리사가 공격: 목표를 향해 투사체를 날린다
  attack(chef, target) {
    const projectile = new Projectile(this, chef, target, (pos) => this.resolveHit(chef.stats, target, pos));
    this.projectileLayer.add(projectile);
    this.projectiles.push(projectile);
  }

  // 투사체가 닿았을 때 조리법에 맞는 효과를 준다
  resolveHit(stats, target, pos) {
    if (stats.splash) {
      // 굽기: 닿은 곳 주변 주문 모두에게 피해
      for (const order of [...this.orders]) {
        if (Phaser.Math.Distance.Between(pos.x, pos.y, order.x, order.y) <= stats.splash) {
          this.damageOrder(order, this.damageAgainst(stats, order));
        }
      }
      this.explosion(pos.x, pos.y, stats.splash);
      return;
    }

    if (target.dead) return;
    const bonus = target.type.weakness === stats.method ? WEAKNESS_MULTIPLIER : 1;
    if (stats.dot) target.applyDot(stats.dot.dps * bonus * this.upgradeMultiplier(stats.tier), stats.dot.duration); // 끓이기
    if (stats.slow) target.applySlow(stats.slow.factor, stats.slow.duration); // 차갑게
    this.damageOrder(target, this.damageAgainst(stats, target));
  }

  // 요리사가 이 주문에 주는 피해: 기본 공격력 × 강화 배율 × 약점이면 1.5배
  damageAgainst(stats, order) {
    const bonus = order.type.weakness === stats.method ? WEAKNESS_MULTIPLIER : 1;
    return stats.damage * this.upgradeMultiplier(stats.tier) * bonus;
  }

  // 등급별 강화로 올라간 공격력 배율 (Lv.3이면 1.6배)
  upgradeMultiplier(tier) {
    return 1 + this.upgradeLevels[tier] * UPGRADE_DAMAGE_PER_LEVEL;
  }

  upgrade(tier) {
    const cost = upgradeCost(tier, this.upgradeLevels[tier]);
    if (this.isOver || this.gold < cost) return;
    this.gold -= cost;
    this.upgradeLevels[tier] += 1;
    if (this.selectedChef) this.selectChef(this.selectedChef); // 정보창의 공격력 숫자 갱신
    this.updateHud();
  }

  // 총괄 주방장 주변(대각선 포함 바로 옆 칸) 요리사의 공격 속도를 올린다
  updateBuffs() {
    for (const chef of this.chefs) {
      let bonus = 0;
      for (const other of this.chefs) {
        const buff = other.stats.buff;
        if (!buff || other === chef) continue;
        const near = Math.abs(other.slot.col - chef.slot.col) <= 1 && Math.abs(other.slot.row - chef.slot.row) <= 1;
        if (near) bonus = Math.max(bonus, buff.attackSpeed);
      }
      chef.attackSpeed = 1 + bonus;
    }
  }

  // ───────── 누르기와 끌기 ─────────
  // 요리사를 짧게 누르면 선택, 끌어서 놓으면 이동 / 자리 바꾸기 / 합성

  slotAt(x, y) {
    return this.slots.find((s) => Math.abs(x - s.x) <= TILE / 2 && Math.abs(y - s.y) <= TILE / 2);
  }

  onPointerDown(pointer) {
    if (this.isOver || this.upgradePanel.isOpen) return;
    const slot = this.slotAt(pointer.worldX, pointer.worldY);
    if (slot && slot.chef) {
      this.drag = { chef: slot.chef, startX: pointer.worldX, startY: pointer.worldY, moved: false };
    } else if (pointer.worldY < this.screenHeight - CONTROLS_HEIGHT) {
      this.selectChef(null); // 빈 곳을 누르면 선택 해제
    }
  }

  onPointerMove(pointer) {
    const drag = this.drag;
    if (!drag || this.isOver) return;

    if (!drag.moved) {
      const d = Phaser.Math.Distance.Between(drag.startX, drag.startY, pointer.worldX, pointer.worldY);
      if (d < DRAG_THRESHOLD) return;
      drag.moved = true;
      this.selectChef(null);
      drag.chef.setDepth(1);
      this.chefLayer.bringToTop(drag.chef);
      this.showMergeTargets(drag.chef);
    }
    drag.chef.setPosition(pointer.worldX, pointer.worldY);
  }

  onPointerUp(pointer) {
    const drag = this.drag;
    if (!drag) return;
    this.drag = null;
    this.mergeHints.clear();

    if (this.isOver) return;
    if (!drag.moved) {
      this.selectChef(drag.chef); // 그냥 누른 것: 선택
      return;
    }

    const chef = drag.chef;
    const target = this.slotAt(pointer.worldX, pointer.worldY);
    if (!target || target === chef.slot) {
      this.placeChef(chef, chef.slot); // 판 밖이나 제자리: 원래 칸으로 돌아간다
    } else if (!target.chef) {
      this.placeChef(chef, target); // 빈 칸: 이동
    } else if (this.canMerge(chef, target.chef)) {
      this.merge(chef, target.chef); // 같은 요리사: 합성
    } else {
      // 다른 요리사: 자리 바꾸기
      const other = target.chef;
      const from = chef.slot;
      this.placeChef(other, from);
      this.placeChef(chef, target);
    }
    this.updateBuffs();
  }

  // 요리사를 칸에 놓는다 (부드럽게 미끄러지며 이동)
  placeChef(chef, slot) {
    if (chef.slot.chef === chef) chef.slot.chef = null;
    chef.slot = slot;
    slot.chef = chef;
    chef.setDepth(0);
    this.tweens.add({ targets: chef, x: slot.x, y: slot.y, duration: 120, ease: 'Quad.Out' });
  }

  // 같은 요리사이고, 합성할 수 있는 등급이면 합성 가능
  canMerge(a, b) {
    return a !== b && a.stats.id === b.stats.id && a.stats.tier <= MAX_MERGE_TIER;
  }

  // 끄는 동안 합성할 수 있는 칸을 초록색으로 표시
  showMergeTargets(chef) {
    this.mergeHints.clear();
    this.mergeHints.lineStyle(6, 0x6ddc6d, 1);
    for (const other of this.chefs) {
      if (this.canMerge(chef, other)) {
        this.mergeHints.strokeRoundedRect(other.slot.x - TILE / 2 + 4, other.slot.y - TILE / 2 + 4, TILE - 8, TILE - 8, 12);
      }
    }
  }

  // 합성: 두 요리사가 사라지고, 놓은 칸에 한 등급 위 무작위 요리사가 생긴다
  merge(dragged, target) {
    const slot = target.slot;
    const tier = target.stats.tier + 1;
    this.removeChef(dragged);
    this.removeChef(target);

    const data = Phaser.Utils.Array.GetRandom(chefsOfTier(tier));
    this.addChef(data, slot);

    const color = colorToHex(TIERS[tier].color);
    this.floatText(slot.x, slot.y - 50, data.name, color, 24);
    if (tier >= 3) this.showBanner(`🔀 ${TIERS[tier].name}! ${data.name}`, color, 44);
    this.updateHud();
  }

  addChef(data, slot) {
    const chef = new Chef(this, data, slot);
    slot.chef = chef;
    this.chefLayer.add(chef);
    this.chefs.push(chef);
    this.updateBuffs();
    return chef;
  }

  removeChef(chef) {
    if (chef.slot.chef === chef) chef.slot.chef = null;
    this.chefs = this.chefs.filter((c) => c !== chef);
    if (this.selectedChef === chef) this.selectChef(null);
    chef.destroy();
  }

  selectChef(chef) {
    this.selectedChef = chef;
    this.rangeCircle.clear();

    if (!chef) {
      this.infoText.setText('요리사를 누르면 정보가 보여요\n같은 요리사끼리 끌어다 놓으면 합성!');
      return;
    }

    const s = chef.stats;
    const method = METHODS[s.method];
    this.rangeCircle.fillStyle(0xffffff, 0.15);
    this.rangeCircle.lineStyle(3, 0xffffff, 0.6);
    this.rangeCircle.fillCircle(chef.x, chef.y, s.range);
    this.rangeCircle.strokeCircle(chef.x, chef.y, s.range);

    const strongAgainst = Object.values(ORDER_TYPES)
      .filter((o) => o.weakness === s.method)
      .map((o) => o.emoji + o.name)
      .join(', ');
    const detail =
      s.method === 'buff'
        ? `주변 요리사 공격 속도 +${Math.round(s.buff.attackSpeed * 100)}%`
        : `공격력 ${Math.round(s.damage * this.upgradeMultiplier(s.tier))} · ${method.role}${strongAgainst ? ` · ${strongAgainst}에 강함` : ''}`;
    this.infoText.setText(`[${TIERS[s.tier].name}] ${method.emoji} ${s.name}\n${detail}`);
  }

  // ───────── 게임 끝 ─────────

  endGame(cleared) {
    this.isOver = true;
    this.upgradePanel.close();
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

  // 그리는 순서(아래 → 위): 판 → 사거리 표시 → 요리사 → 주문 → 투사체 → 효과
  createLayers() {
    this.rangeCircle = this.add.graphics();
    this.mergeHints = this.add.graphics();
    this.chefLayer = this.add.layer();
    this.orderLayer = this.add.layer();
    this.projectileLayer = this.add.layer();
    this.effectLayer = this.add.layer();
  }

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
  }

  updateHud() {
    const [wave, time, orders, gold] = this.hudValues;
    wave.setText(`${this.wave} / ${TOTAL_WAVES}`);
    time.setText(`${Math.max(0, Math.ceil(this.waveTimeLeft))}`);
    orders.setText(`${this.orders.length} / ${RAIL_LIMIT}`);
    orders.setColor(this.orders.length >= RAIL_WARNING ? COLORS.danger : COLORS.text);
    gold.setText(`${this.gold}`);

    const cost = summonCost(this.summonCount);
    const full = this.emptySlots().length === 0;
    this.summonButton.setLabel(full ? '🎲 자리가 없어요' : `🎲 요리사 뽑기\n${cost}골드`);
    this.summonButton.setEnabled(!this.isOver && !full && this.gold >= cost);

    if (this.upgradePanel.isOpen) this.upgradePanel.refresh();
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

  // 화면 아래: 선택한 요리사 정보, 뽑기 버튼, 강화 버튼
  createControls() {
    const y = this.screenHeight - CONTROLS_HEIGHT / 2;
    this.summonButton = createButton(this, 250, y, 380, 120, '', () => this.summon(), { fontSize: 30 });
    createButton(this, 560, y, 220, 120, '⬆ 강화', () => this.upgradePanel.open());

    this.infoText = this.add
      .text(GAME_WIDTH / 2, y - 105, '', {
        fontFamily: FONT,
        fontSize: '22px',
        color: COLORS.text,
        align: 'center',
        lineSpacing: 6,
      })
      .setOrigin(0.5);
    this.selectChef(null);

    // 정보 표시줄 바로 아래 작은 버튼: 첫 화면으로 돌아가기
    const back = this.add
      .text(BOARD_X, HUD_HEIGHT + 4, '← 처음으로', { fontFamily: FONT, fontSize: '20px', color: '#b9a48f' })
      .setInteractive({ useHandCursor: true });
    back.on('pointerup', () => this.scene.start('Title'));
  }

  // 판 가운데에 잠깐 나타났다 사라지는 큰 글씨 (예: "웨이브 3")
  showBanner(message, color = COLORS.textDark, fontSize = 64) {
    const text = this.add
      .text(GAME_WIDTH / 2, this.boardY + (BOARD_ROWS * TILE) / 2, message, {
        fontFamily: FONT,
        fontSize: `${fontSize}px`,
        fontStyle: 'bold',
        color,
        stroke: '#3d2a1e',
        strokeThickness: color === COLORS.textDark ? 0 : 6,
      })
      .setOrigin(0.5)
      .setDepth(5);
    this.tweens.add({ targets: text, alpha: 0, delay: 700, duration: 500, onComplete: () => text.destroy() });
  }

  // 위로 떠오르며 사라지는 작은 글씨 (예: 골드 "+2")
  floatText(x, y, message, color, fontSize = 28) {
    const text = this.add
      .text(x, y, message, {
        fontFamily: FONT,
        fontSize: `${fontSize}px`,
        fontStyle: 'bold',
        color,
        stroke: '#3d2a1e',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.effectLayer.add(text);
    this.tweens.add({ targets: text, y: y - 50, alpha: 0, duration: 700, onComplete: () => text.destroy() });
  }

  // 굽기 공격이 터지는 효과
  explosion(x, y, radius) {
    const circle = this.add.circle(x, y, radius, 0xff7a1a, 0.35);
    this.effectLayer.add(circle);
    circle.setScale(0.3);
    this.tweens.add({ targets: circle, scale: 1, alpha: 0, duration: 250, onComplete: () => circle.destroy() });
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

// 0xff8800 같은 숫자 색을 '#ff8800' 글자 색으로 바꾼다
function colorToHex(color) {
  return `#${color.toString(16).padStart(6, '0')}`;
}
