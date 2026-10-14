import Phaser from 'phaser';
import { GAME_WIDTH, TILE, BOARD_COLS, BOARD_ROWS, BOARD_X, gameLayout, COLORS, FONT, EMOJI_FONT } from '../config.js';
import {
  TOTAL_WAVES,
  WAVE_DURATION,
  RAIL_LIMIT,
  START_GOLD,
  SPAWN_SPREAD,
  SUMMON_ODDS,
  MAX_MERGE_TIER,
  BOSS_WAVES,
  BOSS_PATIENCE,
  BOSS_WAVE_ORDER_RATIO,
  UPGRADE_DAMAGE_PER_LEVEL,
  ordersInWave,
  orderMixForWave,
  summonCost,
  sellPrice,
  upgradeCost,
} from '../data/balance.js';
import {
  METHODS,
  TIERS,
  WEAKNESS_MULTIPLIER,
  RECIPES,
  HEAD_CHEF_CHANCE,
  LINES,
  chefById,
  chefsOfTier,
  nextInLine,
} from '../data/chefs.js';
import { ORDER_TYPES } from '../data/orders.js';
import { SETS, FULL_COURSE, setFor } from '../data/sets.js';
import { createButton, createCommandButton } from '../ui.js';
import { sfx, playMusic, stopMusic, isOn, toggle } from '../audio.js';
import {
  EGGS,
  EGG_TOTAL,
  findEgg,
  eggCount,
  isChristmas,
  isSeollal,
  isLateNight,
  PET_LINES,
  CRITIC_REVIEWS,
} from '../eastereggs.js';
import { ORDER_COLORS, burst, revealEffect, ring, shake, flash, vibrate, confetti } from '../effects.js';
import Rail from '../objects/Rail.js';
import Order from '../objects/Order.js';
import Chef from '../objects/Chef.js';
import Projectile from '../objects/Projectile.js';
import UpgradePanel from '../panels/UpgradePanel.js';
import RecipePanel from '../panels/RecipePanel.js';
import { KITCHENS, kitchenById } from '../data/kitchens.js';
import { getSave, writeSave, totalStars, shopLevel, codexLevel, discover } from '../save.js';
import {
  SHOP_ITEMS,
  STAR_RULES,
  TIPS_PER_ORDER,
  TIPS_PER_STAR,
  RECIPE_UNLOCK_STARS,
  CODEX_DAMAGE_PER_LEVEL,
  runScore,
} from '../data/progress.js';
import { submitScore } from '../cloud.js';
import { todaysSpecial, DAILY_TIP_BONUS } from '../data/daily.js';

// 가게 강화 효과 = 레벨 × 한 단계당 효과
function shopBonus(id) {
  return shopLevel(id) * SHOP_ITEMS.find((item) => item.id === id).per;
}

// 배속 버튼을 누를 때마다 이 순서로 바뀐다
const SPEEDS = [1, 2, 3];

// 🥚 이스터 에그 확률
const DISHWASHER_CHANCE = 0.001; // 뽑기에서 설거지 담당이 나올 확률 (0.1%)
const GOLDEN_ORDER_CHANCE = 0.02; // 웨이브마다 황금 주문이 나올 확률 (2%)
const GG_CHANCE = 0.01; // 1웨이브에 GG 주문이 나올 확률 (1%)
const PET_HOLD_MS = 800; // 요리사를 이만큼 꾹 누르면 쓰다듬기

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

  // data.kitchen: 고른 주방 id (주방 선택 화면에서 넘어온다)
  create(data) {
    // 🍽️ 오늘의 특선이면 오늘 정해진 주방과 특별 규칙으로 한다
    this.daily = data?.daily ? todaysSpecial() : null;
    this.mod = this.daily?.special.rule ?? {}; // 특별 규칙 (평소에는 비어 있다)
    this.kitchen = this.daily ? this.daily.kitchen : kitchenById(data?.kitchen ?? this.registry.get('kitchen'));
    if (!this.daily) this.registry.set('kitchen', this.kitchen.id);
    this.screenHeight = this.scale.height; // 휴대폰마다 다른 실제 화면 높이
    this.layout = gameLayout(this.screenHeight);
    this.boardY = this.layout.boardY;

    // 한 판의 상태. 다시 하기를 누르면 create()가 다시 실행되어 처음 값으로 돌아간다.
    this.wave = 0;
    this.waveTimeLeft = 0;
    this.waveElapsed = 0;
    this.spawnQueue = []; // 이번 웨이브에 아직 안 나온 주문들 { at: 나올 시각(초), type }
    this.orders = [];
    this.boss = null; // 지금 레일 위에 있는 VIP 손님
    this.bossRushTimer = 0; // 재벌 3세 "빨리빨리!" 타이머
    this.chefs = [];
    this.projectiles = [];
    this.freezeTimeLeft = 0; // 디저트 마녀가 레일을 멈춘 남은 시간
    this.gimmickTimer = 0; // 주방 기믹이 다음에 발동할 때까지 쌓이는 시간
    this.rushTimeLeft = 0; // 회전초밥집: 레일이 빨라진 남은 시간
    this.fires = []; // 불난 중식당: 불붙은 칸들 { slot, timeLeft, icon }
    this.blackout = null; // 정전된 레스토랑: { slots, timeLeft }
    // 가게 강화(영구 성장) 효과를 이번 판에 적용
    this.gold = START_GOLD + shopBonus('startGold');
    this.railLimit = RAIL_LIMIT + shopBonus('railCapacity');
    this.bossPatience = BOSS_PATIENCE + shopBonus('patience');
    this.ordersServed = 0; // 이번 판에 처리한 주문 수 (팁 계산용)
    this.bossesDefeated = 0; // 이번 판에 만족시킨 VIP 손님 수 (= 별)
    this.summonCount = 0; // 지금까지 뽑은 횟수 (뽑기 비용 계산용)
    this.upgradeLevels = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }; // 등급별 강화 레벨
    this.selectedChef = null;
    this.drag = null; // 끌고 있는 요리사 정보 { chef, startX, startY, moved }
    this.isOver = false;
    this.paused = false;
    this.time.paused = false;
    this.gameSpeed = this.registry.get('gameSpeed') ?? 1; // 다시 하기를 눌러도 배속 유지

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

    this.recipePanel = new RecipePanel(this, {
      hasChef: (id) => this.chefs.some((c) => c.stats.id === id),
      isUnlocked: (recipe) => this.isRecipeUnlocked(recipe),
      onCraft: (recipe) => this.craft(recipe),
    });

    this.input.on('pointerdown', (pointer) => this.onPointerDown(pointer));
    this.input.on('pointermove', (pointer) => this.onPointerMove(pointer));
    this.input.on('pointerup', (pointer) => this.onPointerUp(pointer));

    // 🥚 이스터 에그 상태
    this.potTaps = { chef: null, count: 0, since: 0 }; // 끓이기 요리사 연타
    this.summonStreak = { id: null, count: 0 }; // 같은 요리사 연속 뽑기
    this.ramenUsed = false; // RAMEN 입력은 한 판에 한 번
    this.typed = '';
    this.input.keyboard?.on('keydown', (event) => this.onKey(event));

    // 다른 앱으로 넘어가거나 화면이 꺼지면 자동으로 일시 정지
    const onHidden = () => this.setPaused(true);
    this.game.events.on('hidden', onHidden);
    this.events.once('shutdown', () => this.game.events.off('hidden', onHidden));
    this.seollal = isSeollal();
    this.lateNight = isLateNight();

    playMusic('game');
    this.startWave(1);
    this.specialDayGreeting();
  }

  // ───────── 🥚 이스터 에그 ─────────

  // 이스터 에그를 처음 찾으면 화면 위쪽에 알림
  eggFound(id) {
    if (!findEgg(id)) return;
    const toast = this.add
      .text(GAME_WIDTH / 2, this.layout.gauge.y + 70, `🥚 비밀 발견! ${EGGS[id]} (${eggCount()}/${EGG_TOTAL})`, {
        fontFamily: FONT,
        fontSize: '24px',
        fontStyle: 'bold',
        color: COLORS.gold,
        backgroundColor: '#2b1d14',
        padding: { x: 16, y: 10 },
      })
      .setOrigin(0.5)
      .setDepth(15);
    sfx.star(2);
    this.tweens.add({ targets: toast, alpha: 0, delay: 2200, duration: 500, onComplete: () => toast.destroy() });
  }

  // 특별한 날 인사 (크리스마스, 설날, 새벽 3시)
  specialDayGreeting() {
    const greetings = [];
    if (isChristmas()) greetings.push('🎅 메리 크리스마스! 요리들이 산타 모자를 썼어요');
    if (this.seollal) greetings.push('🧧 새해 복 많이 받으세요! 떡국 주문이 들어와요');
    if (greetings.length > 0) this.eggFound('holiday');
    if (this.lateNight) {
      greetings.push('🌙 야식 타임! 라면 주문이 몰려와요');
      this.eggFound('midnight');
    }
    greetings.forEach((message, i) => {
      this.time.delayedCall(1800 + i * 1800, () => this.showBanner(message, COLORS.gold, 28));
    });
  }

  // 키보드로 RAMEN을 입력하면 황금 라면이 나온다 (컴퓨터에서)
  onKey(event) {
    if (this.isOver || this.ramenUsed || !event.key || event.key.length !== 1) return;
    this.typed = (this.typed + event.key.toUpperCase()).slice(-5);
    if (this.typed === 'RAMEN') {
      this.ramenUsed = true;
      this.spawnOrder('ramen', 0, { golden: true });
      this.showBanner('🍜 황금 라면 주문!', COLORS.gold, 48);
      this.eggFound('ramen');
    }
  }

  // 끓이기 요리사를 3초 안에 10번 누르면 냄비가 넘친다
  countPotTap(chef) {
    if (chef.stats.method !== 'boil') return;
    const now = this.time.now;
    const taps = this.potTaps;
    if (taps.chef !== chef || now - taps.since > 3000) {
      this.potTaps = { chef, count: 1, since: now };
      return;
    }
    taps.count += 1;
    if (taps.count >= 10) {
      this.potTaps = { chef: null, count: 0, since: 0 };
      this.potOverflow(chef);
    }
  }

  potOverflow(chef) {
    this.showBanner('♨️ 냄비가 넘쳤다!', COLORS.text, 52);
    sfx.fire();
    for (let i = 0; i < 40; i++) {
      const puff = this.add
        .circle(chef.x + Phaser.Math.Between(-60, 60), chef.y, Phaser.Math.Between(30, 70), 0xfff8ec, 0.7)
        .setDepth(8);
      this.tweens.add({
        targets: puff,
        x: Phaser.Math.Between(0, GAME_WIDTH),
        y: Phaser.Math.Between(0, this.screenHeight),
        scale: 2.5,
        alpha: 0,
        duration: Phaser.Math.Between(1200, 2200),
        delay: i * 25,
        onComplete: () => puff.destroy(),
      });
    }
    this.eggFound('pot');
  }

  // 요리사를 꾹 누르면: 볼이 빨개지고 한마디 한다
  petChef(chef) {
    const lines = PET_LINES[chef.stats.method] ?? PET_LINES.buff;
    const line = Phaser.Utils.Array.GetRandom(lines);
    const bubble = this.add
      .text(chef.x, chef.y - 70, `💕 ${line}`, {
        fontFamily: FONT,
        fontSize: '20px',
        color: COLORS.textDark,
        backgroundColor: '#fff8ec',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5)
      .setDepth(9);
    bubble.x = Phaser.Math.Clamp(bubble.x, bubble.width / 2 + 10, GAME_WIDTH - bubble.width / 2 - 10);
    chef.sprite.setTint(0xffb3b3);
    this.tweens.add({ targets: bubble, y: bubble.y - 20, alpha: 0, delay: 1300, duration: 400, onComplete: () => bubble.destroy() });
    this.time.delayedCall(900, () => chef.sprite?.clearTint());
    this.eggFound('pet');
  }

  // 매 프레임 실행된다. delta는 지난 프레임부터 흐른 시간(밀리초).
  // 배속이면 한 프레임에 게임 시간을 여러 번 진행한다 (2배속이면 2번)
  update(time, delta) {
    if (this.paused) return;
    const dt = Math.min(delta, 100) / 1000; // 탭 전환 등으로 시간이 크게 튀는 것 방지
    for (let i = 0; i < this.gameSpeed && !this.isOver; i++) this.tick(dt);
    this.updateHud();
  }

  // 게임 시간을 dt초만큼 진행한다
  tick(dt) {
    // 1) 웨이브 시간 진행
    this.waveTimeLeft -= dt;
    this.waveElapsed += dt;

    // 2) 나올 시간이 된 주문을 레일에 올린다
    while (this.spawnQueue.length > 0 && this.spawnQueue[0].at <= this.waveElapsed) {
      const next = this.spawnQueue.shift();
      this.spawnOrder(next.type, 0, next.options);
    }
    if (this.boss) this.bossAbility(dt);

    // 3) 주문 이동 + 지속 피해. 레일이 멈춰 있으면 일반 주문은 서 있고, 보스는 절반 속도
    this.updateGimmick(dt);
    this.freezeTimeLeft = Math.max(0, this.freezeTimeLeft - dt);
    const frozen = this.freezeTimeLeft > 0;
    this.freezeOverlay.setVisible(frozen);
    const rush = this.rushTimeLeft > 0 ? this.kitchen.gimmick.factor : 1;
    for (const order of [...this.orders]) {
      const moveScale = (frozen ? (order.isBoss ? 0.5 : 0) : 1) * rush * (this.mod.orderSpeed ?? 1);
      const dotDamage = order.step(dt, moveScale);
      if (order.golden && order.distance - order.startDistance >= this.rail.length) {
        this.escapeOrder(order); // 🥚 황금 주문은 한 바퀴 돌면 사라진다
        continue;
      }
      if (dotDamage > 0) this.damageOrder(order, dotDamage);
    }

    // 4) 요리사 공격, 투사체 이동
    const dragging = this.drag && this.drag.moved ? this.drag.chef : null;
    for (const chef of this.chefs) {
      if (chef === dragging) continue; // 끌려가는 중에는 공격하지 않는다
      const burning = this.fires.some((f) => f.slot === chef.slot);
      chef.setAlpha(burning ? 0.45 : 1);
      if (burning) continue; // 불붙은 칸의 요리사는 쉰다
      chef.rangeScale = this.blackout?.slots.includes(chef.slot) ? this.kitchen.gimmick.rangeFactor : 1;
      chef.step(dt, this.orders, (c, target) => this.attack(c, target));
      if (chef.stats.freeze) this.freezeAbility(chef, dt);
    }
    for (const p of this.projectiles) p.step(dt);
    this.projectiles = this.projectiles.filter((p) => !p.done);

    // 5) 패배 / 다음 웨이브 / 클리어 판정
    if (this.isOver) return; // 보스를 처치해서 이번 프레임에 클리어했을 수 있다
    if (this.orders.length >= this.railLimit) {
      this.endGame('rail');
    } else if (this.waveTimeLeft <= 0) {
      if (this.boss) this.endGame('boss'); // 인내심이 다 떨어졌다
      else if (this.wave >= TOTAL_WAVES) this.endGame('clear');
      else this.startWave(this.wave + 1);
    }
  }

  // ───────── 웨이브와 주문 ─────────

  startWave(wave) {
    this.wave = wave;
    this.waveElapsed = 0;
    const bossKey = BOSS_WAVES[wave];

    // 이번 웨이브에 나올 주문들을 미리 정해 두고, SPAWN_SPREAD초 동안 고르게 나눠서 내보낸다
    let count = ordersInWave(wave);
    if (bossKey) count = Math.round(count * BOSS_WAVE_ORDER_RATIO);
    const mix = { ...orderMixForWave(wave) };
    if (this.seollal) mix.tteokguk = 2; // 🥚 설날에는 떡국 주문
    if (this.lateNight) mix.ramen = (mix.ramen ?? 1) * 3; // 🥚 새벽 3시에는 라면이 3배
    this.spawnQueue = [];
    for (let i = 0; i < count; i++) {
      this.spawnQueue.push({ at: (SPAWN_SPREAD * i) / count, type: pickWeighted(mix) });
    }
    // 🥚 아주 가끔: 황금 주문, 첫 웨이브의 GG 주문
    if (wave > 1 && Math.random() < GOLDEN_ORDER_CHANCE) {
      this.spawnQueue.push({ at: Math.random() * SPAWN_SPREAD, type: 'salad', options: { golden: true } });
    }
    if (wave === 1 && Math.random() < GG_CHANCE) this.spawnQueue.push({ at: 0.5, type: 'gg' });
    this.spawnQueue.sort((a, b) => a.at - b.at);

    if (bossKey) {
      // 보스 웨이브: 제한 시간이 인내심으로 바뀌고, 보스가 맨 먼저 나온다
      this.waveTimeLeft = this.bossPatience;
      this.spawnQueue.unshift({ at: 0, type: bossKey });
      this.showBanner(`⚠ VIP 손님 등장!\n${ORDER_TYPES[bossKey].emoji} ${ORDER_TYPES[bossKey].name}`, COLORS.danger, 44);
    } else {
      this.waveTimeLeft = WAVE_DURATION;
      if (wave > 1) sfx.wave();
      if (wave === 1 && this.daily) {
        const sp = this.daily.special;
        this.showBanner(`🍽️ 오늘의 특선\n${sp.emoji} ${sp.name}`, COLORS.gold, 44);
        this.log(`🍽️ ${sp.name}: ${sp.desc}`, COLORS.gold);
      } else if (wave === 1) this.showBanner(`${this.kitchen.emoji} ${this.kitchen.name}\n${this.kitchen.desc}`, COLORS.textDark, 40);
      else this.showBanner(`웨이브 ${wave}`);
    }
  }

  // 주문을 레일에 올린다. startDistance: 레일 위 어디서 시작할지 (도시락이 나뉠 때 사용)
  spawnOrder(typeKey, startDistance = 0, options = {}) {
    const order = new Order(this, this.rail, typeKey, this.wave, startDistance, options);
    // 🍽️ 오늘의 특선 규칙: 주문 체력, 추가 골드
    if (this.mod.orderHp) {
      order.maxHp = Math.round(order.maxHp * this.mod.orderHp);
      order.hp = order.maxHp;
    }
    if (this.mod.orderReward && !order.isBoss) order.reward += this.mod.orderReward;
    if (typeKey === 'gg') this.eggFound('gg');
    if (order.golden && typeKey !== 'ramen') this.showBanner('✨ 황금 주문이다!', COLORS.gold, 44);
    this.orderLayer.add(order);
    this.orders.push(order);
    if (this.boss) this.orderLayer.bringToTop(this.boss); // 보스는 항상 다른 주문 위에 보이게

    if (order.isBoss) {
      this.boss = order;
      shake(this, 0.01, 400);
      vibrate([80, 40, 80]);
      sfx.bossAppear();
      playMusic('boss');
      this.bossRushTimer = 0;
      order.on('weaknessChanged', (method) => {
        this.floatText(order.x, order.y - 70, `약점 변경! ${METHODS[method].emoji}`, COLORS.danger, 30);
      });
    }
    return order;
  }

  // 보스의 특수 능력
  bossAbility(dt) {
    const rush = this.boss.type.rush;
    if (!rush) return;
    // 재벌 3세: 일정 시간마다 주변 주문을 빠르게 만든다
    this.bossRushTimer += dt;
    if (this.bossRushTimer < rush.every) return;
    this.bossRushTimer = 0;
    for (const order of this.orders) {
      if (Phaser.Math.Distance.Between(this.boss.x, this.boss.y, order.x, order.y) <= rush.radius) {
        order.applyHaste(rush.factor, rush.duration);
      }
    }
    this.floatText(this.boss.x, this.boss.y - 70, '💸 빨리빨리!', COLORS.gold, 30);
  }

  // 황금 주문을 놓쳤을 때
  escapeOrder(order) {
    this.orders = this.orders.filter((o) => o !== order);
    this.floatText(order.x, order.y - 30, '✨ 놓쳤다...', COLORS.gold, 24);
    this.tweens.add({ targets: order, alpha: 0, y: order.y - 40, duration: 400, onComplete: () => order.destroy() });
  }

  // source: 피해를 준 유닛 (지속 피해처럼 모르면 null)
  damageOrder(order, amount, source = null) {
    if (order.takeDamage(amount)) this.completeOrder(order, source);
  }

  // 주문을 처리했을 때: 골드를 받고 레일에서 사라진다
  completeOrder(order, source = null) {
    this.gold += order.reward;
    // 🍵 코스 요리 세트: 처리한 유닛이 세트 중이면 추가 골드
    const extra = source?.active ? source.bonus.gold : 0;
    if (extra > 0) {
      this.gold += extra;
      this.floatText(order.x + 34, order.y - 50, `🍵+${extra}`, COLORS.gold, 20);
    }
    this.ordersServed += 1;
    this.orders = this.orders.filter((o) => o !== order);
    if (order.reward > 0) this.floatText(order.x, order.y - 30, `+${order.reward}`, COLORS.gold);
    sfx.serve();
    burst(this, this.effectLayer, order.x, order.y, ORDER_COLORS[order.typeKey] ?? [0xfff8ec], order.isBoss ? 30 : 7, order.isBoss ? 2 : 1);

    // 단체 도시락: 그 자리에서 주먹밥 여러 개로 나뉜다
    const split = order.type.splitInto;
    if (split) {
      for (let i = 0; i < split.count; i++) this.spawnOrder(split.type, order.distance - i * 30);
    }

    if (order === this.boss) this.bossDefeated(order);
    if (order.golden) {
      this.showBanner(`✨ 황금 주문 성공! +${order.reward}`, COLORS.gold, 44);
      if (order.typeKey !== 'ramen') this.eggFound('golden');
    }
    if (order.typeKey === 'gg') this.floatText(order.x, order.y - 60, 'gg wp', COLORS.text, 32);

    this.tweens.add({
      targets: order,
      scale: 1.4,
      alpha: 0,
      duration: 180,
      onComplete: () => order.destroy(),
    });
  }

  // VIP 손님을 처리했을 때: 마지막 보스면 클리어, 아니면 바로 다음 웨이브
  bossDefeated(boss) {
    this.boss = null;
    this.bossesDefeated += 1;
    this.showBanner(`🎉 ${boss.type.name} 만족!`, COLORS.gold, 44);
    flash(this, 0xffd54f);
    vibrate([60, 30, 60]);
    sfx.bossDefeat();
    playMusic('game');
    if (this.wave >= TOTAL_WAVES) {
      this.endGame('clear');
    } else {
      this.waveTimeLeft = Math.min(this.waveTimeLeft, 1); // 1초 뒤 다음 웨이브
    }
  }

  // ───────── 주방 기믹 ─────────

  updateGimmick(dt) {
    // 진행 중인 효과의 남은 시간 줄이기
    this.rushTimeLeft = Math.max(0, this.rushTimeLeft - dt);
    this.rushOverlay.setVisible(this.rushTimeLeft > 0);
    for (const fire of this.fires) fire.timeLeft -= dt;
    for (const fire of this.fires.filter((f) => f.timeLeft <= 0)) fire.icon.destroy();
    this.fires = this.fires.filter((f) => f.timeLeft > 0);
    if (this.blackout) {
      this.blackout.timeLeft -= dt;
      if (this.blackout.timeLeft <= 0) {
        this.blackout = null;
        this.darkOverlay.clear();
      }
    }

    // 일정 시간마다 기믹 발동
    const gimmick = this.kitchen.gimmick;
    if (!gimmick) return;
    this.gimmickTimer += dt;
    if (this.gimmickTimer < gimmick.every) return;
    this.gimmickTimer = 0;

    if (gimmick.type === 'rush') {
      this.rushTimeLeft = gimmick.duration;
      this.showBanner('🍣 레일 가속!', COLORS.danger, 48);
      sfx.rush();
    } else if (gimmick.type === 'fire') {
      this.startFire(gimmick.duration);
    } else if (gimmick.type === 'blackout') {
      this.startBlackout(gimmick.duration);
    }
  }

  // 불난 중식당: 요리사가 있는 칸 중 하나에 불을 붙인다 (없으면 아무 칸)
  startFire(duration) {
    const burning = this.fires.map((f) => f.slot);
    const withChef = this.slots.filter((s) => s.chef && !burning.includes(s));
    const candidates = withChef.length > 0 ? withChef : this.slots.filter((s) => !burning.includes(s));
    const slot = Phaser.Utils.Array.GetRandom(candidates);
    if (!slot) return;
    // 굽기 요리사(🔥)와 헷갈리지 않게: 칸 전체를 빨갛게 칠하고, 구석에 작은 불꽃을 둔다
    const glow = this.add.rectangle(0, 0, TILE, TILE, 0xff3b1f, 0.45);
    const flame = this.add.text(TILE / 2 - 18, -TILE / 2 + 18, '🔥', { fontFamily: FONT, fontSize: '30px' }).setOrigin(0.5);
    const icon = this.add.container(slot.x, slot.y, [glow, flame]);
    this.effectLayer.add(icon);
    this.tweens.add({ targets: glow, alpha: 0.2, duration: 350, yoyo: true, repeat: -1 });
    this.fires.push({ slot, timeLeft: duration, icon });
    sfx.fire();
  }

  // 정전된 레스토랑: 판의 위/아래/왼쪽/오른쪽 절반 중 하나가 어두워진다
  startBlackout(duration) {
    const half = Phaser.Utils.Array.GetRandom(['top', 'bottom', 'left', 'right']);
    const slots = this.slots.filter((s) => {
      if (half === 'top') return s.row < INNER_ROWS / 2;
      if (half === 'bottom') return s.row >= INNER_ROWS / 2;
      if (half === 'left') return s.col < INNER_COLS / 2;
      return s.col >= INNER_COLS / 2;
    });
    this.blackout = { slots, timeLeft: duration };
    this.darkOverlay.clear();
    this.darkOverlay.fillStyle(0x000000, 0.55);
    for (const s of slots) this.darkOverlay.fillRect(s.x - TILE / 2, s.y - TILE / 2, TILE, TILE);
    this.showBanner('💡 정전!', '#c4bfd6', 52);
    sfx.blackout();
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
    const cost = this.currentSummonCost();
    const empty = this.emptySlots();
    if (this.isOver || this.gold < cost || empty.length === 0) return;

    this.gold -= cost;
    this.summonCount += 1;

    const tier = Number(pickWeighted(this.mod.summonOdds ?? SUMMON_ODDS));
    let data = Phaser.Utils.Array.GetRandom(chefsOfTier(tier));
    if (Math.random() < DISHWASHER_CHANCE) data = chefById('dishwasher'); // 🥚 0.1%
    const slot = Phaser.Utils.Array.GetRandom(empty);

    this.addChef(data, slot);
    revealEffect(this, this.effectLayer, slot.x, slot.y, tier, TIERS[tier].color);
    sfx.summon(tier);

    this.floatText(slot.x, slot.y - 50, data.name, colorToHex(TIERS[tier].color), 24);
    this.log(`[뽑기] ${TIERS[tier].name} ${data.emoji} ${data.name}`, colorToHex(TIERS[tier].color));
    if (tier >= 2) this.showBanner(`✨ ${TIERS[tier].name}! ${data.name}`, colorToHex(TIERS[tier].color), 44);
    if (data.hidden) {
      this.showBanner('🧽 설거지 담당이 왔어요!', COLORS.gold, 44);
      this.eggFound('dishwasher');
    }

    // 🥚 같은 요리사를 5번 연속 뽑으면 "오늘은 ○○의 날!"
    const streak = this.summonStreak;
    streak.count = streak.id === data.id ? streak.count + 1 : 1;
    streak.id = data.id;
    if (streak.count === 5) {
      this.showBanner(`🎉 오늘은 ${data.name}의 날!`, COLORS.gold, 40);
      confetti(this, GAME_WIDTH, this.screenHeight);
      this.eggFound('streak');
    }
    this.updateHud();
  }

  // 요리사가 공격: 목표를 향해 투사체를 날린다
  attack(chef, target) {
    sfx.attack(chef.stats.method);
    const projectile = new Projectile(this, chef, target, (pos) => this.resolveHit(chef, target, pos));
    this.projectileLayer.add(projectile);
    this.projectiles.push(projectile);
  }

  // 투사체가 닿았을 때 레시피 줄에 맞는 효과를 준다
  resolveHit(chef, target, pos) {
    const stats = chef.stats;
    // 지속 피해와 감속은 목표에게 먼저 건다 (국물, 디저트, 요리의 신, 🍯 단짠 세트)
    if (!target.dead) {
      const bonus = this.weaknessMultiplier(stats, target, chef);
      if (stats.dot) target.applyDot(stats.dot.dps * bonus * this.powerMultiplier(stats, chef), stats.dot.duration);
      if (stats.slow) target.applySlow(stats.slow.factor, stats.slow.duration);
      if (chef.bonus.slow) target.applySlow(chef.bonus.slow.factor, chef.bonus.slow.duration);
    }

    if (stats.splash) {
      // 범위 공격(고기, 요리의 신): 닿은 곳 주변 주문 모두에게 피해
      for (const order of [...this.orders]) {
        if (Phaser.Math.Distance.Between(pos.x, pos.y, order.x, order.y) <= stats.splash) {
          this.damageOrder(order, this.damageAgainst(stats, order, chef), chef);
        }
      }
      this.explosion(pos.x, pos.y, stats.splash, stats.method === 'all' ? 0xffd54f : 0xff7a1a);
    } else if (!target.dead) {
      this.damageOrder(target, this.damageAgainst(stats, target, chef), chef);
    }
  }

  // 디저트 마녀: 일정 시간마다 레일 전체를 멈춘다
  freezeAbility(chef, dt) {
    const freeze = chef.stats.freeze;
    chef.freezeTimer += dt;
    if (chef.freezeTimer < freeze.every) return;
    chef.freezeTimer = 0;
    this.freezeTimeLeft = Math.max(this.freezeTimeLeft, freeze.duration);
    this.showBanner('⏳ 시간 정지!', '#9fd8ff', 52);
    flash(this, 0x9fd8ff);
    shake(this, 0.004, 200);
    sfx.freeze();
  }

  // 유닛이 이 주문에 주는 피해: 기본 공격력 × 강화·세트 배율 × 약점이면 1.5배
  damageAgainst(stats, order, chef = null) {
    return stats.damage * this.powerMultiplier(stats, chef) * this.weaknessMultiplier(stats, order, chef);
  }

  // 공격력 배율: 이번 판의 등급별 강화 × 도감 레벨(영구) × 세트 메뉴
  powerMultiplier(stats, chef = null) {
    const setBonus = 1 + (chef ? chef.bonus.damage : 0);
    const daily = this.mod.lineDamage?.[stats.method] ?? 1; // 🍽️ 오늘의 특선: 줄별 공격력
    return this.upgradeMultiplier(stats.tier) * (1 + codexLevel(stats.id) * CODEX_DAMAGE_PER_LEVEL) * setBonus * daily;
  }

  // 뽑기 비용: 기본 비용에서 가게 강화(단골 인력소)만큼 할인
  currentSummonCost() {
    const cost = summonCost(this.summonCount) - shopBonus('summonDiscount');
    return Math.max(1, Math.round(cost * (this.mod.summonCost ?? 1))); // 🍽️ 할인 데이
  }

  // 약점이면 1.5배 (🥘 고기 전골 세트면 1.8배). 까다로운 주문은 약점이 아닌 줄이면 절반.
  weaknessMultiplier(stats, order, chef = null) {
    const weak = chef?.bonus.weakness || WEAKNESS_MULTIPLIER;
    if (stats.method === 'all') return weak; // 요리의 신은 항상 약점으로 공격
    if (order.weakness === stats.method) return weak;
    if (order.type.picky) return 0.5;
    return 1;
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
    sfx.upgrade();
    if (this.selectedChef) this.selectChef(this.selectedChef); // 정보창의 공격력 숫자 갱신
    this.updateHud();
  }

  // ───────── 신화 레시피 ─────────

  // 재료 요리사를 모두 갖췄으면, 레시피에 쓸 요리사들을 돌려준다 (없으면 null)
  findIngredients(recipe) {
    const used = [];
    for (const id of recipe.ingredients) {
      const chef = this.chefs.find((c) => c.stats.id === id && !used.includes(c));
      if (!chef) return null;
      used.push(chef);
    }
    return used;
  }

  // 별을 충분히 모아서 레시피가 열려 있는지
  isRecipeUnlocked(recipe) {
    return totalStars() >= RECIPE_UNLOCK_STARS[recipe.result];
  }

  canCraftAny() {
    return RECIPES.some((r) => this.isRecipeUnlocked(r) && this.findIngredients(r));
  }

  // 신화 만들기: 재료 요리사들이 사라지고, 첫 번째 재료가 있던 칸에 신화 요리사가 생긴다
  craft(recipe) {
    const ingredients = this.findIngredients(recipe);
    if (this.isOver || !ingredients || !this.isRecipeUnlocked(recipe)) return;

    const slot = ingredients[0].slot;
    for (const chef of ingredients) this.removeChef(chef);
    const data = chefById(recipe.result);
    this.addChef(data, slot);
    flash(this, 0xffd54f);
    revealEffect(this, this.effectLayer, slot.x, slot.y, 5, TIERS[5].color);
    sfx.mythic();

    this.recipePanel.close();
    this.showBanner(`🌈 신화 탄생!\n${data.emoji} ${data.name}`, colorToHex(TIERS[5].color), 44);
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
    this.updateSets();
  }

  // ───────── 🍽️ 세트 메뉴 ─────────

  // 상하좌우로 붙은 다른 줄 유닛끼리 세트를 찾고, 유닛마다 세트 효과를 다시 계산한다
  updateSets() {
    const at = (col, row) => this.slots.find((s) => s.col === col && s.row === row)?.chef;
    const lineOf = (chef) => (chef && LINES.includes(chef.stats.method) ? chef.stats.method : null);
    const links = []; // { a, b, set }
    for (const chef of this.chefs) {
      chef.sets = new Set();
      // 오른쪽, 아래쪽 이웃만 보면 모든 쌍을 한 번씩 본다
      for (const [dc, dr] of [[1, 0], [0, 1]]) {
        const other = at(chef.slot.col + dc, chef.slot.row + dr);
        const set = lineOf(chef) && lineOf(other) && setFor(lineOf(chef), lineOf(other));
        if (set) links.push({ a: chef, b: other, set });
      }
    }
    for (const { a, b, set } of links) {
      a.sets.add(set.id);
      b.sets.add(set.id);
    }

    // 🍽️ 풀코스: 2 x 2 네모 안에 4줄이 모두 있으면
    const fullCourses = [];
    for (let row = 0; row < INNER_ROWS - 1; row++) {
      for (let col = 0; col < INNER_COLS - 1; col++) {
        const block = [at(col, row), at(col + 1, row), at(col, row + 1), at(col + 1, row + 1)];
        if (new Set(block.map(lineOf).filter(Boolean)).size === LINES.length) fullCourses.push({ col, row, block });
      }
    }
    for (const chef of this.chefs) chef.fullCourse = false;
    for (const course of fullCourses) for (const chef of course.block) chef.fullCourse = true;

    // 유닛마다 효과 합치기
    for (const chef of this.chefs) {
      const bonus = { damage: 0, attackSpeed: 0, range: 0, weakness: 0, slow: null, gold: 0 };
      const p = this.mod.setPower ?? 1; // 🍽️ 세트 데이면 효과 2배
      for (const set of SETS.filter((s) => chef.sets.has(s.id))) {
        const e = set.effect;
        bonus.damage += (e.damage ?? 0) * p;
        bonus.attackSpeed += (e.attackSpeed ?? 0) * p;
        bonus.range += (e.range ?? 0) * p;
        if (e.weakness) bonus.weakness = Math.max(bonus.weakness, WEAKNESS_MULTIPLIER + (e.weakness - WEAKNESS_MULTIPLIER) * p);
        if (e.slow) bonus.slow = { factor: Math.max(0.3, 1 - (1 - e.slow.factor) * p), duration: e.slow.duration };
        bonus.gold += (e.gold ?? 0) * p;
      }
      if (chef.fullCourse) bonus.damage += FULL_COURSE.effect.damage * p;
      chef.bonus = bonus;
      chef.attackSpeed += bonus.attackSpeed;
      chef.rangeBonus = bonus.range;
    }

    this.drawSetLinks(links, fullCourses);

    // 새로 생긴 세트 알림
    const active = new Set(links.map((l) => l.set.id));
    for (const set of SETS) {
      if (active.has(set.id) && !this.activeSets?.has(set.id)) {
        this.log(`[세트] ${set.emoji} ${set.name} 완성! ${set.desc}`, COLORS.gold);
      }
    }
    if (fullCourses.length > (this.fullCourseCount ?? 0)) {
      this.showBanner(`${FULL_COURSE.emoji} 풀코스 완성!\n공격력 +30%`, COLORS.gold, 44);
      sfx.star(2);
    }
    this.activeSets = active;
    this.fullCourseCount = fullCourses.length;
    if (this.selectedChef) this.updateCard();
  }

  // 붙어 있는 세트 사이에 금색 연결선과 세트 이모지를 그린다
  drawSetLinks(links, fullCourses) {
    this.setLinkGraphics.clear();
    this.setBadges.removeAll(true);
    this.setLinkGraphics.lineStyle(6, 0xffd54f, 0.55);
    for (const { a, b, set } of links) {
      const [ax, ay, bx, by] = [a.slot.x, a.slot.y + 26, b.slot.x, b.slot.y + 26];
      this.setLinkGraphics.lineBetween(ax, ay, bx, by);
      // 이모지를 가리지 않게: 가로로 붙은 쌍은 두 소환진 사이, 세로로 붙은 쌍은 오른쪽 옆
      const horizontal = ay === by;
      const mx = horizontal ? (ax + bx) / 2 : ax + 40;
      const my = horizontal ? ay + 8 : (ay + by) / 2 - 6;
      this.setBadges.add(this.add.circle(mx, my, 16, 0x14171c, 0.85).setStrokeStyle(3, 0xffd54f));
      this.setBadges.add(this.add.text(mx, my, set.emoji, { fontFamily: EMOJI_FONT, fontSize: '19px' }).setOrigin(0.5));
    }
    // 🍽️ 풀코스: 2 x 2 칸을 금색 테두리로 감싸고, 왼쪽 위 모서리에 표시
    for (const { col, row } of fullCourses) {
      const x = BOARD_X + (col + 1) * TILE;
      const y = this.boardY + (row + 1) * TILE;
      this.setLinkGraphics.lineStyle(5, 0xffd54f, 0.9);
      this.setLinkGraphics.strokeRoundedRect(x + 4, y + 4, TILE * 2 - 8, TILE * 2 - 8, 16);
      this.setBadges.add(this.add.circle(x + 14, y + 14, 17, 0xe85d3a, 0.95).setStrokeStyle(3, 0xffd54f));
      this.setBadges.add(this.add.text(x + 14, y + 14, FULL_COURSE.emoji, { fontFamily: EMOJI_FONT, fontSize: '20px' }).setOrigin(0.5));
      this.setLinkGraphics.lineStyle(6, 0xffd54f, 0.55);
    }
  }

  // ───────── 누르기와 끌기 ─────────
  // 요리사를 짧게 누르면 선택, 끌어서 놓으면 이동 / 자리 바꾸기 / 합성

  slotAt(x, y) {
    return this.slots.find((s) => Math.abs(x - s.x) <= TILE / 2 && Math.abs(y - s.y) <= TILE / 2);
  }

  onPointerDown(pointer) {
    if (this.isOver || this.paused || this.upgradePanel.isOpen || this.recipePanel.isOpen) return;
    const slot = this.slotAt(pointer.worldX, pointer.worldY);
    if (slot && slot.chef) {
      const drag = { chef: slot.chef, startX: pointer.worldX, startY: pointer.worldY, moved: false, petted: false };
      this.drag = drag;
      // 🥚 움직이지 않고 꾹 누르고 있으면 쓰다듬기
      this.time.delayedCall(PET_HOLD_MS, () => {
        if (this.drag === drag && !drag.moved && !this.isOver) {
          drag.petted = true;
          this.petChef(drag.chef);
        }
      });
    } else if (pointer.worldY < this.layout.log.y) {
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
      if (drag.petted) return; // 쓰다듬은 것은 선택하지 않는다
      this.selectChef(drag.chef); // 그냥 누른 것: 선택
      this.countPotTap(drag.chef);
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

  // 같은 유닛이고, 합성할 수 있는 등급이면 합성 가능 (비밀·특별 유닛은 합성할 수 없다)
  canMerge(a, b) {
    const s = a.stats;
    return a !== b && s.id === b.stats.id && s.tier <= MAX_MERGE_TIER && !s.hidden && !s.special;
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

  // 합성: 두 유닛이 사라지고, 놓은 칸에 같은 레시피 줄의 다음 단계가 생긴다.
  // 영웅 2개를 합치면 가끔(15%) 전설 대신 총괄 주방장이 나온다.
  merge(dragged, target) {
    const slot = target.slot;
    const tier = target.stats.tier + 1;
    const surprise = tier === 4 && Math.random() < HEAD_CHEF_CHANCE;
    const data = surprise ? chefById('head_chef') : nextInLine(target.stats);
    this.removeChef(dragged);
    this.removeChef(target);

    this.addChef(data, slot);
    ring(this, this.effectLayer, slot.x, slot.y, 0xfff8ec, 70);
    revealEffect(this, this.effectLayer, slot.x, slot.y, tier, TIERS[tier].color);
    vibrate(30);
    sfx.merge(tier);

    const color = colorToHex(TIERS[tier].color);
    this.floatText(slot.x, slot.y - 50, data.name, color, 24);
    this.log(`[합성] ${TIERS[tier].name} ${data.emoji} ${data.name} 완성!`, color);
    if (surprise) this.showBanner(`🛎️ 깜짝 등장!\n${data.name}`, color, 44);
    else if (tier >= 3) this.showBanner(`🔀 ${TIERS[tier].name}! ${data.emoji} ${data.name}`, color, 44);
    this.updateHud();
  }

  // 🔄 자동 합성: 판 위에서 합칠 수 있는 쌍을 한 번씩 모두 합친다 (새로 생긴 것끼리는 다음에 누를 때)
  autoMerge() {
    if (this.isOver) return;
    const dragging = this.drag?.chef;
    const pending = this.chefs.filter((c) => c !== dragging);
    const pairs = [];
    while (pending.length > 0) {
      const a = pending.shift();
      const index = pending.findIndex((b) => this.canMerge(a, b));
      if (index >= 0) pairs.push([a, pending.splice(index, 1)[0]]);
    }
    if (pairs.length === 0) {
      this.log('🔄 합칠 수 있는 쌍이 없어요', '#b9a48f');
      return;
    }
    // 둘 중 판 위쪽(왼쪽)에 있는 칸으로 모은다
    for (const [a, b] of pairs) {
      const order = (c) => c.slot.row * 10 + c.slot.col;
      const [from, to] = order(a) < order(b) ? [b, a] : [a, b];
      this.merge(from, to);
    }
    if (pairs.length > 1) this.log(`[자동 합성] ${pairs.length}쌍을 합쳤어요`, COLORS.gold);
  }

  // 💰 판매: 고른 유닛을 팔고 골드를 받는다 (신화는 팔 수 없다)
  sellSelected() {
    const chef = this.selectedChef;
    if (this.isOver || !chef || !this.canSell(chef)) return;
    const price = this.sellPriceOf(chef);
    this.gold += price;
    const { x, y } = chef;
    this.removeChef(chef);
    this.updateBuffs();
    burst(this, this.effectLayer, x, y, [0xffd54f, 0xfff8ec], 10);
    this.floatText(x, y - 30, `+${price}`, COLORS.gold);
    this.log(`[판매] ${chef.stats.emoji} ${chef.stats.name} → 🪙 +${price}`, COLORS.gold);
    sfx.coin();
    this.updateHud();
  }

  canSell(chef) {
    return chef.stats.tier < 5;
  }

  sellPriceOf(chef) {
    return sellPrice(this.currentSummonCost(), chef.stats.tier);
  }

  addChef(data, slot) {
    if (discover(data.id)) this.floatText(slot.x, slot.y + 45, '📖 도감 등록!', COLORS.gold, 20);
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
    this.selectRing.clear();
    this.updateCard();
    if (!chef) return;

    // 사거리: 옅은 원 + 금색 점선 테두리, 발밑에는 금색 고리
    const range = (chef.stats.range + chef.rangeBonus) * chef.rangeScale;
    this.rangeCircle.fillStyle(0xffd54f, 0.08);
    this.rangeCircle.fillCircle(chef.x, chef.y, range);
    this.rangeCircle.lineStyle(4, 0xffd54f, 0.8);
    const dashes = Math.round(range / 9);
    for (let i = 0; i < dashes; i++) {
      const start = (i / dashes) * Math.PI * 2;
      this.rangeCircle.beginPath();
      this.rangeCircle.arc(chef.x, chef.y, range, start, start + (Math.PI * 2) / dashes / 2);
      this.rangeCircle.strokePath();
    }
    this.selectRing.lineStyle(6, 0xffd54f, 1);
    this.selectRing.strokeEllipse(chef.x, chef.y + 26, 112, 50);
  }

  // 아래 패널 왼쪽 카드: 고른 유닛의 정보
  updateCard() {
    const chef = this.selectedChef;
    const card = this.card;
    card.icon.clear();
    if (!chef) {
      card.emoji.setText('');
      card.tier.setText('').setVisible(false);
      card.name.setText('');
      card.role.setText('');
      card.stats.setText('');
      card.help.setVisible(true);
      return;
    }
    card.help.setVisible(false);

    const s = chef.stats;
    const method = METHODS[s.method];
    const tierColor = TIERS[s.tier].color;
    card.icon.fillStyle(0x14171c, 1);
    card.icon.fillRoundedRect(card.iconX, card.iconY, card.iconSize, card.iconSize, 14);
    card.icon.lineStyle(5, tierColor, 1);
    card.icon.strokeRoundedRect(card.iconX, card.iconY, card.iconSize, card.iconSize, 14);
    card.emoji.setText(s.emoji);
    card.tier.setText(TIERS[s.tier].name).setBackgroundColor(colorToHex(tierColor)).setVisible(true);
    card.name.setText(s.name);
    // 짧은 화면: 등급 표시 오른쪽에 이름을 붙인다
    if (card.compact) card.name.setPosition(card.tier.x + card.tier.width + 8, card.tier.y + 3);
    const line = LINES.includes(s.method) ? `${method.emoji} ${method.name} 줄 · ` : '';
    card.role.setText(`${line}${s.ability ?? method.role}`);

    const lines = [];
    if (s.method === 'buff') {
      lines.push(`주변 공격 속도 +${Math.round(s.buff.attackSpeed * 100)}%`);
    } else {
      const power = Math.round(s.damage * this.powerMultiplier(s, chef));
      lines.push(card.compact ? `공격력 ${power} · ${s.interval}초마다` : `공격력  ${power}`);
      if (!card.compact) lines.push(`공격 간격  ${s.interval}초`);
      const strong = Object.values(ORDER_TYPES).filter((o) => !o.boss && o.weakness === s.method);
      if (s.method === 'all') lines.push('모든 주문에 강함');
      else if (strong.length > 0) lines.push(`강함  ${strong.map((o) => o.emoji).join(' ')}`);
    }
    const sets = SETS.filter((set) => chef.sets?.has(set.id)).map((set) => set.emoji);
    if (chef.fullCourse) sets.push(FULL_COURSE.emoji);
    if (sets.length > 0) lines.push(`세트  ${sets.join(' ')}`);
    card.stats.setText(lines.join('\n'));
  }

  // ───────── 게임 끝 ─────────

  // reason: 'clear'(클리어) / 'rail'(주문이 너무 쌓임) / 'boss'(VIP 손님 인내심 초과)
  endGame(reason) {
    const cleared = reason === 'clear';
    this.endReason = reason;
    this.isOver = true;
    this.setPaused(false);
    this.upgradePanel.close();
    this.recipePanel.close();
    this.updateHud();

    const rewards = this.giveRewards();
    stopMusic();
    if (cleared) {
      confetti(this, GAME_WIDTH, this.screenHeight);
      vibrate([60, 40, 60, 40, 120]);
      sfx.win();
    } else {
      shake(this, 0.015, 500);
      vibrate(250);
      sfx.lose();
    }

    const centerX = GAME_WIDTH / 2;
    const centerY = this.screenHeight / 2;
    const depth = 11;
    const text = (y, message, size, color, bold = false) =>
      this.add
        .text(centerX, y, message, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: bold ? 'bold' : '', color, align: 'center' })
        .setOrigin(0.5)
        .setDepth(depth);

    this.add.rectangle(0, 0, GAME_WIDTH, this.screenHeight, 0x000000, 0.75).setOrigin(0).setDepth(10);

    const details = {
      clear: `${ORDER_TYPES.king.name}까지 만족시켰어요!`,
      rail: `${this.wave}웨이브에서 레일에 주문이 ${this.railLimit}개 쌓였어요`,
      boss: `${this.boss ? this.boss.type.name : 'VIP 손님'}이(가) 화가 나서 떠났어요`,
    };
    text(centerY - 360, cleared ? '🎉 영업 성공!' : '😵 가게가 망했어요...', 58, COLORS.text, true);
    // 🥚 평론가에게 지면 혹평 리뷰가 나온다
    if (reason === 'boss' && this.boss?.typeKey === 'critic') {
      text(centerY - 290, `🧐 "${Phaser.Utils.Array.GetRandom(CRITIC_REVIEWS)}"`, 22, '#ff8a8a').setWordWrapWidth(GAME_WIDTH - 80);
      this.eggFound('critic');
    } else {
      text(centerY - 290, details[reason], 26, '#d8c8b4');
    }

    // 별 3개: 받은 별은 ⭐, 못 받은 별은 흐리게
    for (let i = 0; i < 3; i++) {
      const star = text(centerY - 190, '⭐', 84, COLORS.text).setX(centerX + (i - 1) * 110);
      if (i >= rewards.stars) star.setAlpha(0.2);
      else {
        star.setScale(0);
        this.tweens.add({
          targets: star,
          scale: 1,
          delay: 600 + i * 250,
          duration: 300,
          ease: 'Back.Out',
          onStart: () => sfx.star(i),
        });
      }
    }
    text(
      centerY - 95,
      STAR_RULES.map((rule, i) => `${i < rewards.stars ? '✅' : '⬜'} ${rule}`).join('\n'),
      24,
      COLORS.text,
    ).setLineSpacing(6);

    let y = centerY + 10;
    const tipRate = this.tipRate();
    const bonus = tipRate !== 1 ? ` · ×${Math.round(tipRate * 100) / 100}` : '';
    text(y, `🪙 팁 +${rewards.tips}  (주문 ${this.ordersServed}개 · 별 ${rewards.stars}개${bonus})`, 26, COLORS.gold, true);
    if (rewards.newBest) text((y += 42), '🏆 새 최고 기록!', 26, COLORS.gold, true);
    for (const message of rewards.unlocked) text((y += 40), `🔓 ${message}`, 22, '#ff8a8a', true);

    // 🏆 랭킹: 점수를 보여 주고, 클라우드에 올린 뒤 순위를 알려 준다
    const result = { wave: this.wave, stars: rewards.stars, orders: this.ordersServed };
    result.score = runScore(result);
    text((y += 46), `🏆 점수 ${result.score}`, 28, COLORS.gold, true);
    const rankText = text((y += 38), '랭킹에 올리는 중...', 22, '#b9c2cf');
    submitScore(this.daily ? this.daily.boardId : this.kitchen.id, result).then((res) => {
      if (!rankText.active) return; // 그사이 화면을 나갔다
      if (res.status === 'offline') rankText.setText('📴 오프라인이라 랭킹에 올리지 못했어요');
      else if (res.status === 'new') rankText.setText(`🎉 ${this.daily ? '오늘의 ' : ''}랭킹 ${res.rank}위! (내 최고 기록)`).setColor(COLORS.gold);
      else rankText.setText(`내 최고 ${res.best}점 · ${res.rank}위`);
    });

    // 버튼은 알림 줄 수에 맞춰 그 아래에 놓는다
    const buttonY = Math.max(centerY + 230, y + 100);
    createButton(this, centerX, buttonY, 360, 100, '다시 하기', () => this.restartRun()).setDepth(depth);
    if (this.daily) createButton(this, centerX, buttonY + 115, 360, 100, '처음으로', () => this.scene.start('Title')).setDepth(depth);
    else createButton(this, centerX, buttonY + 115, 360, 100, '주방 선택', () => this.scene.start('KitchenSelect')).setDepth(depth);
  }

  // 같은 판을 처음부터 다시 (오늘의 특선이면 특선으로)
  restartRun() {
    this.scene.restart(this.daily ? { daily: true } : { kitchen: this.kitchen.id });
  }

  // 팁 배율: 주방 보너스 × (오늘의 특선 보너스 × 특선 규칙)
  tipRate() {
    return this.kitchen.tipBonus * (this.daily ? DAILY_TIP_BONUS * (this.mod.tips ?? 1) : 1);
  }

  // 판 끝 보상: 별과 팁을 계산해서 저장한다.
  // 오늘의 특선은 팁만 받고, 주방 최고 별(해금 진행)에는 들어가지 않는다.
  giveRewards() {
    const save = getSave();
    const stars = Math.min(3, this.bossesDefeated);
    const tips = Math.round((this.ordersServed * TIPS_PER_ORDER + stars * TIPS_PER_STAR) * this.tipRate());

    const starsBefore = totalStars();
    const best = save.bestStars[this.kitchen.id] ?? 0;
    const newBest = !this.daily && stars > best;
    if (newBest) save.bestStars[this.kitchen.id] = stars;
    save.tips += tips;
    save.runs += 1;
    writeSave();

    // 이번 판으로 새로 열린 신화 레시피
    const starsAfter = totalStars();
    const unlocked = RECIPES.filter((r) => {
      const need = RECIPE_UNLOCK_STARS[r.result];
      return starsBefore < need && starsAfter >= need;
    }).map((r) => `신화 레시피 해금: ${chefById(r.result).name}`);
    // 이번 판으로 새로 열린 주방
    for (const k of KITCHENS) {
      if (starsBefore < k.unlockStars && starsAfter >= k.unlockStars) unlocked.push(`새 주방 해금: ${k.emoji} ${k.name}`);
    }

    return { stars, tips, newBest, unlocked };
  }


  // ───────── 화면 그리기 ─────────

  // 그리는 순서(아래 → 위): 판 → 사거리 표시 → 유닛 → 주문 → 투사체 → 효과
  createLayers() {
    this.rangeCircle = this.add.graphics();
    this.mergeHints = this.add.graphics();
    this.setLinkGraphics = this.add.graphics(); // 세트 메뉴 연결선 (유닛 발밑)
    this.chefLayer = this.add.layer();
    this.setBadges = this.add.container(0, 0); // 세트 이모지 표시
    this.selectRing = this.add.graphics(); // 고른 유닛 발밑의 금색 고리
    this.orderLayer = this.add.layer();
    this.projectileLayer = this.add.layer();
    this.effectLayer = this.add.layer();

    // 정전된 칸을 덮는 어두운 막 (요리사보다 위)
    this.darkOverlay = this.add.graphics();

    // 회전초밥집 레일 가속 중에 레일 위에 덮는 붉은 막
    this.rushOverlay = this.add.graphics().setVisible(false);
    this.rushOverlay.fillStyle(0xff5a5a, 0.25);
    this.drawRailShape(this.rushOverlay);

    // 레일이 멈췄을 때 레일 위에 덮는 하늘색 얼음막
    this.freezeOverlay = this.add.graphics().setVisible(false);
    this.freezeOverlay.fillStyle(0x9fd8ff, 0.35);
    this.drawRailShape(this.freezeOverlay);
  }

  // 레일 모양(판 테두리 한 줄)을 채워 그린다
  drawRailShape(g) {
    g.fillRect(BOARD_X, this.boardY, BOARD_COLS * TILE, TILE);
    g.fillRect(BOARD_X, this.boardY + (BOARD_ROWS - 1) * TILE, BOARD_COLS * TILE, TILE);
    g.fillRect(BOARD_X, this.boardY + TILE, TILE, (BOARD_ROWS - 2) * TILE);
    g.fillRect(BOARD_X + (BOARD_COLS - 1) * TILE, this.boardY + TILE, TILE, (BOARD_ROWS - 2) * TILE);
  }

  // ───────── 위쪽: 정보줄과 레일 게이지 ─────────

  // 정보줄: 웨이브 / 남은 시간(동그라미 타이머) / 골드 / 일시 정지 버튼
  createHud() {
    const { hud, gauge } = this.layout;
    const g = this.add.graphics();
    g.fillStyle(COLORS.panel, 1);
    g.fillRoundedRect(12, hud.y, GAME_WIDTH - 24, hud.h, 18);
    g.lineStyle(6, COLORS.outline, 1);
    g.strokeRoundedRect(12, hud.y, GAME_WIDTH - 24, hud.h, 18);
    const cy = hud.y + hud.h / 2;

    // 웨이브
    this.add.text(38, cy - hud.h * 0.22, '웨이브', { fontFamily: FONT, fontSize: '20px', color: '#9aa4b2' }).setOrigin(0, 0.5);
    this.hudWave = this.add
      .text(38, cy + hud.h * 0.14, '', { fontFamily: FONT, fontSize: `${Math.round(hud.h * 0.38)}px`, fontStyle: 'bold', color: COLORS.text })
      .setOrigin(0, 0.5);
    this.hudWaveTotal = this.add
      .text(0, cy + hud.h * 0.2, `/${TOTAL_WAVES}`, { fontFamily: FONT, fontSize: '22px', color: '#9aa4b2' })
      .setOrigin(0, 0.5);

    // 남은 시간: 동그라미가 줄어든다. VIP 손님이 오면 빨간 "인내심"
    this.timerX = 250;
    this.timerY = cy;
    this.timerRadius = Math.round(hud.h * 0.34);
    this.timerRing = this.add.graphics();
    this.hudTime = this.add
      .text(this.timerX, cy, '', { fontFamily: FONT, fontSize: `${Math.round(hud.h * 0.3)}px`, fontStyle: 'bold', color: COLORS.text })
      .setOrigin(0.5);

    // 골드
    this.add.text(352, cy, '🪙', { fontFamily: EMOJI_FONT, fontSize: `${Math.round(hud.h * 0.34)}px` }).setOrigin(0.5);
    this.hudGold = this.add
      .text(388, cy + 2, '', { fontFamily: FONT, fontSize: `${Math.round(hud.h * 0.36)}px`, fontStyle: 'bold', color: COLORS.gold })
      .setOrigin(0, 0.5);

    // 일시 정지 버튼
    const size = hud.h - 26;
    const px = GAME_WIDTH - 26 - size / 2;
    const pauseBox = this.add.graphics();
    pauseBox.fillStyle(COLORS.button, 1);
    pauseBox.fillRoundedRect(-size / 2, -size / 2, size, size, 14);
    pauseBox.lineStyle(5, COLORS.outline, 1);
    pauseBox.strokeRoundedRect(-size / 2, -size / 2, size, size, 14);
    pauseBox.fillStyle(0xfff8ec, 1);
    pauseBox.fillRect(-size * 0.2, -size * 0.27, size * 0.14, size * 0.54);
    pauseBox.fillRect(size * 0.06, -size * 0.27, size * 0.14, size * 0.54);
    const pauseButton = this.add.container(px, cy, [pauseBox]).setSize(size, size).setInteractive({ useHandCursor: true });
    pauseButton.on('pointerdown', () => pauseButton.setScale(0.92));
    pauseButton.on('pointerout', () => pauseButton.setScale(1));
    pauseButton.on('pointerup', () => {
      pauseButton.setScale(1);
      if (this.isOver) return;
      sfx.click();
      this.setPaused(true);
    });

    // 레일 게이지: 레일 위 주문이 한도에 가까울수록 초록 → 노랑 → 빨강
    const gg = this.add.graphics();
    gg.fillStyle(COLORS.outline, 1);
    gg.fillRoundedRect(12, gauge.y, GAME_WIDTH - 24, gauge.h, 14);
    this.gaugeFill = this.add.graphics();
    this.gaugeText = this.add
      .text(GAME_WIDTH / 2, gauge.y + gauge.h / 2, '', {
        fontFamily: FONT,
        fontSize: `${Math.round(gauge.h * 0.52)}px`,
        fontStyle: 'bold',
        color: COLORS.text,
        stroke: '#14171c',
        strokeThickness: 4,
      })
      .setOrigin(0.5);
    this.hudCache = {};
  }

  updateHud() {
    const cache = this.hudCache;
    this.hudWave.setText(`${this.wave}`);
    this.hudWaveTotal.setX(this.hudWave.x + this.hudWave.width + 4);
    this.hudGold.setText(`${this.gold}`);

    // 동그라미 타이머 (보스가 있으면 인내심, 빨간색)
    const total = this.boss ? this.bossPatience : WAVE_DURATION;
    const left = Math.max(0, this.waveTimeLeft);
    const ratio = Math.round((left / total) * 60) / 60;
    const timerKey = `${ratio}|${Boolean(this.boss)}`;
    if (cache.timer !== timerKey) {
      cache.timer = timerKey;
      const ring = this.timerRing;
      ring.clear();
      ring.fillStyle(COLORS.panelDark, 1);
      ring.fillCircle(this.timerX, this.timerY, this.timerRadius);
      ring.lineStyle(8, this.boss ? 0xff5a5a : 0xffd54f, 1);
      ring.beginPath();
      ring.arc(this.timerX, this.timerY, this.timerRadius - 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
      ring.strokePath();
    }
    this.hudTime.setText(`${Math.ceil(left)}`);
    this.hudTime.setColor(this.boss ? COLORS.danger : COLORS.text);

    // 레일 게이지
    const count = this.orders.length;
    if (cache.orders !== count) {
      cache.orders = count;
      const { gauge } = this.layout;
      const fill = Math.min(1, count / this.railLimit);
      const color = fill >= 0.75 ? 0xe8564a : fill >= 0.5 ? 0xffd54f : 0x6dc04a;
      this.gaugeFill.clear();
      if (count > 0) {
        this.gaugeFill.fillStyle(color, 1);
        this.gaugeFill.fillRoundedRect(18, gauge.y + 6, Math.max(20, (GAME_WIDTH - 36) * fill), gauge.h - 12, 10);
      }
      this.gaugeText.setText(`레일 주문 ${count} / ${this.railLimit}`);
    }

    // 명령 버튼
    const cost = this.currentSummonCost();
    const full = this.emptySlots().length === 0;
    this.summonButton.setSub(full ? '자리 없음' : `${cost}골드`);
    this.summonButton.setEnabled(!this.isOver && !full && this.gold >= cost);

    const selected = this.selectedChef;
    if (!selected) this.sellButton.setSub('고르세요').setEnabled(false);
    else if (!this.canSell(selected)) this.sellButton.setSub('신화는 안 돼요').setEnabled(false);
    else this.sellButton.setSub(`+${this.sellPriceOf(selected)}`).setEnabled(!this.isOver);

    if (this.upgradePanel.isOpen) this.upgradePanel.refresh();
    if (this.recipePanel.isOpen) this.recipePanel.refresh();

    // 만들 수 있는 신화 레시피가 있으면 레시피 버튼에 금색 테두리 + 반짝임
    const ready = !this.isOver && this.canCraftAny();
    if (ready !== this.recipeReady) {
      this.recipeReady = ready;
      this.recipeButton.setLit(ready).setSub(ready ? '만들 수 있어요!' : '');
      this.recipeBlink.paused = !ready;
      if (!ready) this.recipeButton.setAlpha(1);
    }
  }

  // ───────── 가운데: 판 ─────────

  // 주방 판: 바깥 한 줄은 스테인리스 회전 레일, 안쪽은 조리대 타일과 빈 소환진
  drawBoard() {
    // 화면 전체 바닥: 어두운 업소용 주방 타일
    const floor = this.add.graphics();
    const size = 48;
    for (let y = 0; y < this.screenHeight; y += size) {
      for (let x = 0; x < GAME_WIDTH; x += size) {
        floor.fillStyle((x / size + y / size) % 2 ? 0x262b33 : 0x22262d, 1);
        floor.fillRect(x, y, size, size);
      }
    }

    const g = this.add.graphics();
    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        const x = BOARD_X + col * TILE;
        const y = this.boardY + row * TILE;

        if (this.isRail(col, row)) {
          g.fillStyle(COLORS.rail, 1);
          g.fillRect(x, y, TILE, TILE);
          g.fillStyle(COLORS.railStripe, 1);
          g.fillRect(x + 6, y + 6, TILE - 12, TILE - 12);
          // 컨베이어 마디: 주문이 가는 방향과 수직으로 놓인 줄무늬
          g.fillStyle(COLORS.railSlat, 1);
          const horizontal = row === 0 || row === BOARD_ROWS - 1;
          for (let k = 0; k < 4; k++) {
            if (horizontal) g.fillRect(x + 10 + k * 26, y + 10, 8, TILE - 20);
            else g.fillRect(x + 10, y + 10 + k * 26, TILE - 20, 8);
          }
          this.drawArrow(g, x + TILE / 2, y + TILE / 2, this.railDirection(col, row));
        } else {
          const checker = (col + row) % 2 === 0;
          g.fillStyle(this.kitchen.floor[checker ? 0 : 1], 1);
          g.fillRect(x, y, TILE, TILE);
        }
      }
    }
    // 판 테두리
    g.lineStyle(8, COLORS.outline, 1);
    g.strokeRoundedRect(BOARD_X - 4, this.boardY - 4, BOARD_COLS * TILE + 8, BOARD_ROWS * TILE + 8, 10);

    // 빈 소환진: 점선 타원
    const pads = this.add.graphics();
    pads.lineStyle(4, 0x786e5f, 0.5);
    for (const slot of this.slots) {
      const dashes = 14;
      for (let i = 0; i < dashes; i++) {
        const a = (i / dashes) * Math.PI * 2;
        const b = a + (Math.PI * 2) / dashes / 2;
        pads.beginPath();
        pads.moveTo(slot.x + Math.cos(a) * 44, slot.y + 26 + Math.sin(a) * 20);
        pads.lineTo(slot.x + Math.cos(b) * 44, slot.y + 26 + Math.sin(b) * 20);
        pads.strokePath();
      }
    }
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
    const size = 12;
    const point = (dx, dy) => ({
      x: cx + dx * Math.cos(angle) - dy * Math.sin(angle),
      y: cy + dx * Math.sin(angle) + dy * Math.cos(angle),
    });
    const a = point(-size / 2, -size);
    const b = point(size / 2, 0);
    const c = point(-size / 2, size);
    g.lineStyle(5, 0x4f5762, 1);
    g.beginPath();
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);
    g.lineTo(c.x, c.y);
    g.strokePath();
  }

  // ───────── 아래: 알림 한 줄과 명령 패널 ─────────

  createControls() {
    const { log, panel } = this.layout;

    // 알림 한 줄: 뽑기, 합성, 판매 결과가 여기에 나온다
    const logBox = this.add.graphics();
    logBox.fillStyle(COLORS.outline, 0.9);
    logBox.fillRoundedRect(12, log.y, GAME_WIDTH - 24, log.h, 12);
    this.logText = this.add
      .text(30, log.y + log.h / 2, '', { fontFamily: FONT, fontSize: `${Math.min(24, Math.round(log.h * 0.5))}px`, color: COLORS.text })
      .setOrigin(0, 0.5);
    this.log('💬 같은 것끼리 끌어다 놓으면 다음 단계로 합성!', '#b9a48f');

    // 패널 바탕
    const box = this.add.graphics();
    box.fillStyle(COLORS.panel, 1);
    box.fillRoundedRect(12, panel.y, GAME_WIDTH - 24, panel.h, 18);
    box.lineStyle(6, COLORS.outline, 1);
    box.strokeRoundedRect(12, panel.y, GAME_WIDTH - 24, panel.h, 18);

    this.createCard(26, panel.y + 14, 300, panel.h - 28);

    // 명령 버튼 3 x 2
    const left = 340;
    const gap = 10;
    const width = (GAME_WIDTH - 26 - left - gap * 2) / 3;
    const height = Math.min(124, (panel.h - 28 - gap - 6) / 2);
    const top = panel.y + (panel.h - (height * 2 + gap + 6)) / 2;
    const at = (col, row) => [left + col * (width + gap) + width / 2, top + row * (height + gap) + height / 2];
    const make = (col, row, look, onClick) => createCommandButton(this, ...at(col, row), width, height, look, onClick);

    this.summonButton = make(0, 0, { emoji: '🎲', label: '뽑기', color: 0xe85d3a }, () => this.summon());
    make(1, 0, { emoji: '⬆️', label: '강화', color: 0x3f7fd0 }, () => this.upgradePanel.open());
    this.sellButton = make(2, 0, { emoji: '💰', label: '판매', color: 0x7d8594 }, () => this.sellSelected());
    this.recipeButton = make(0, 1, { emoji: '📜', label: '레시피', color: 0x8e4fc0 }, () => {
      if (!this.isOver) this.recipePanel.open();
    });
    this.speedButton = make(1, 1, { emoji: '⏩', label: '', color: 0x3f9a4a }, () => this.toggleSpeed());
    make(2, 1, { emoji: '🔄', label: '자동 합성', color: 0xc77d2e }, () => this.autoMerge());
    this.updateSpeedButton();

    this.recipeReady = false;
    this.recipeBlink = this.tweens.add({ targets: this.recipeButton, alpha: 0.55, duration: 450, yoyo: true, repeat: -1, paused: true });

    this.createPauseMenu();
    this.selectChef(null);
  }

  // 패널 왼쪽 카드: 고른 유닛의 그림, 등급, 이름, 능력치
  createCard(x, y, width, height) {
    const bg = this.add.graphics();
    bg.fillStyle(COLORS.panelDark, 1);
    bg.fillRoundedRect(x, y, width, height, 14);

    const compact = height < 200; // 화면이 짧으면 능력치를 줄여서 보여 준다
    const iconSize = compact ? Math.min(64, height - 70) : Math.min(104, Math.round(height * 0.36));
    const iconX = x + 12;
    const iconY = y + 12;
    const textX = iconX + iconSize + 14;
    const card = {
      compact,
      iconX,
      iconY,
      iconSize,
      icon: this.add.graphics(),
      emoji: this.add
        .text(iconX + iconSize / 2, iconY + iconSize / 2, '', { fontFamily: EMOJI_FONT, fontSize: `${Math.round(iconSize * 0.6)}px` })
        .setOrigin(0.5),
      tier: this.add.text(textX, iconY + 2, '', {
        fontFamily: FONT,
        fontSize: '18px',
        fontStyle: 'bold',
        color: COLORS.text,
        padding: { x: 10, y: 4 },
      }),
      name: this.add.text(textX, iconY + (compact ? 30 : 38), '', {
        fontFamily: FONT,
        fontSize: compact ? '19px' : '24px',
        fontStyle: 'bold',
        color: COLORS.text,
        wordWrap: compact ? undefined : { width: x + width - textX - 8, useAdvancedWrap: true },
      }),
      role: this.add.text(compact ? textX : iconX, compact ? iconY + 36 : iconY + iconSize + 12, '', {
        fontFamily: FONT,
        fontSize: '17px',
        color: '#b9c2cf',
        wordWrap: { width: compact ? x + width - textX - 8 : width - 24, useAdvancedWrap: true },
      }),
      stats: this.add.text(iconX, compact ? iconY + iconSize + 10 : iconY + iconSize + 44, '', {
        fontFamily: FONT,
        fontSize: compact ? '17px' : '20px',
        color: COLORS.text,
        lineSpacing: compact ? 3 : 8,
      }),
      help: this.add
        .text(x + width / 2, y + height / 2, '유닛을 누르면 정보가 보여요\n\n같은 것끼리 겹치면 → 합성\n다른 줄끼리 붙이면 → 세트', {
          fontFamily: FONT,
          fontSize: compact ? '17px' : '21px',
          color: '#9aa4b2',
          align: 'center',
          lineSpacing: 4,
        })
        .setOrigin(0.5),
    };
    this.card = card;
  }

  // 알림 한 줄 바꾸기
  log(message, color = COLORS.text) {
    if (!this.logText) return;
    this.logText.setText(message).setColor(color);
    this.logText.setAlpha(0.4);
    this.tweens.add({ targets: this.logText, alpha: 1, duration: 200 });
  }

  // ───────── 일시 정지 ─────────

  createPauseMenu() {
    const centerX = GAME_WIDTH / 2;
    const centerY = this.screenHeight / 2;
    const shade = this.add.rectangle(0, 0, GAME_WIDTH, this.screenHeight, 0x000000, 0.7).setOrigin(0).setInteractive();
    const box = this.add.graphics();
    box.fillStyle(COLORS.panel, 1);
    box.fillRoundedRect(centerX - 260, centerY - 330, 520, 660, 24);
    box.lineStyle(6, COLORS.outline, 1);
    box.strokeRoundedRect(centerX - 260, centerY - 330, 520, 660, 24);
    const title = this.add
      .text(centerX, centerY - 250, '⏸ 일시 정지', { fontFamily: FONT, fontSize: '48px', fontStyle: 'bold', color: COLORS.text })
      .setOrigin(0.5);

    const resume = createButton(this, centerX, centerY - 120, 400, 100, '▶ 계속하기', () => this.setPaused(false), {
      color: 0x3f9a4a,
    });
    const restart = createButton(this, centerX, centerY + 5, 400, 100, '🔄 다시 하기', () =>
      this.restartRun(),
    );
    const home = createButton(this, centerX, centerY + 130, 400, 100, '🏠 처음으로', () => this.scene.start('Title'), {
      color: 0x7d8594,
    });

    // 소리 한 번에 켜고 끄기 (효과음 + 음악)
    const soundLabel = () => (isOn('sfx') || isOn('music') ? '🔊 소리 켬' : '🔇 소리 끔');
    const sound = this.add
      .text(centerX, centerY + 250, soundLabel(), {
        fontFamily: FONT,
        fontSize: '28px',
        color: COLORS.text,
        backgroundColor: '#2b3038',
        padding: { x: 20, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    sound.on('pointerup', () => {
      const on = !(isOn('sfx') || isOn('music'));
      if (isOn('sfx') !== on) toggle('sfx');
      if (isOn('music') !== on) toggle('music');
      sound.setText(soundLabel());
    });

    this.pauseMenu = this.add.container(0, 0, [shade, box, title, resume, restart, home, sound]).setDepth(30).setVisible(false);
  }

  // 일시 정지 켜고 끄기: 게임 시간, 움직임(트윈), 예약된 일이 모두 멈춘다
  setPaused(value) {
    if (!this.pauseMenu || this.paused === value) return;
    if (value && this.isOver) return;
    this.paused = value;
    this.pauseMenu.setVisible(value);
    this.time.paused = value;
    if (value) {
      this.tweens.pauseAll();
      this.drag = null;
      this.mergeHints.clear();
      for (const chef of this.chefs) chef.setPosition(chef.slot.x, chef.slot.y);
    } else {
      this.tweens.resumeAll();
    }
  }

  // 배속 바꾸기: 1 → 2 → 3 → 1
  toggleSpeed() {
    const next = SPEEDS[(SPEEDS.indexOf(this.gameSpeed) + 1) % SPEEDS.length];
    this.gameSpeed = next;
    this.registry.set('gameSpeed', next);
    this.updateSpeedButton();
  }

  updateSpeedButton() {
    this.speedButton.setLabel(`${this.gameSpeed}배속`);
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
  explosion(x, y, radius, color = 0xff7a1a) {
    const circle = this.add.circle(x, y, radius, color, 0.35);
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
