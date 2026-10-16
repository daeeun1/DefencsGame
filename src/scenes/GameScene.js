import Phaser from 'phaser';
import { GAME_WIDTH, TILE, BOARD_COLS, BOARD_ROWS, BOARD_X, gameLayout, COLORS, FONT, EMOJI_FONT } from '../config.js';
import { WAVE_DURATION, START_GOLD, SPAWN_SPREAD, SUMMON_ODDS, MAX_MERGE_TIER, BOSS_PATIENCE, BOSS_WAVE_ORDER_RATIO, HAND_POWER_MAX, HAND_POWER_REGEN, LINE_UPGRADE_MAX, LINE_UPGRADE_BONUS, SWAP_MAX_TIER, summonCost, sellPrice, lineUpgradeCost, swapCost } from '../data/balance.js';
import { METHODS, TIERS, RECIPES, HEAD_CHEF_CHANCE, LINES, STARTER_LINES, chefById, chefsOfTier, nextInLine, rankOf, mythicsUsing, recipeFitsDeck } from '../data/chefs.js';
import { UNLOCKS } from '../data/unlocks.js';
import { MONSTERS, LIKE_MULTIPLIER, PICKY_MULTIPLIER, MONSTER_COLORS } from '../data/monsters.js';
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
import { burst, revealEffect, ring, shake, flash, vibrate, confetti } from '../effects.js';
import Rail from '../objects/Rail.js';
import Monster from '../objects/Monster.js';
import Chef from '../objects/Chef.js';
import Projectile from '../objects/Projectile.js';
import RecipePanel from '../panels/RecipePanel.js';
import UpgradePanel from '../panels/UpgradePanel.js';
import { getSave, writeSave, lineLevel, discover, isDiscovered } from '../save.js';
import { TIPS_PER_ORDER, TIPS_PER_STAR, LINE_DAMAGE_PER_LEVEL, runScore, runLineXp, lineLevelOf } from '../data/progress.js';
import { submitScore } from '../cloud.js';
import { seededRandom, triesLeft } from '../data/daily.js';
import { mergeRules } from '../data/rules.js';
import { journeyRun, startKit } from '../data/runs.js';
import { EVENT_BONUS } from '../data/events.js';
import { MISSIONS, rewardText, missionGold } from '../data/missions.js';
import { equippedEffects, worn } from '../data/items.js';
import { TOWNS, STAR_LINES, townsOpen, townOfWave, FEATURE_TOWN } from '../data/towns.js';
import { addQuestProgress } from '../data/quests.js';

// 배속 버튼을 누를 때마다 이 순서로 바뀐다
const SPEEDS = [1, 2, 3];

// 🎯 미션 하나를 할 수 있는 웨이브 수
const MISSION_WAVES = 3;

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
const OFF_DECK_HP = 0.7; // 덱에 없는 요리를 좋아하는 손님의 배고픔 배율

// 실제 게임이 진행되는 장면.
// 주문이 레일을 돌고, 요리사를 뽑아 주문을 처리하고, 주문이 너무 쌓이면 패배한다.
export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  // data.run: 이번 판의 설정 (data/runs.js). 없으면 동네 1-1
  create(data) {
    // data.resume: 저장해 둔 여정 이어 하기, data.startTown: 여정 출발 동네
    const resume = data?.resume ? getSave().journey : null;
    this.run = data?.run ?? journeyRun(resume?.deck ?? getSave().deck, resume?.startTown ?? data?.startTown ?? 0);
    this.daily = this.run.daily ?? null; // 🏆 오늘의 도전이면 오늘의 정보 (같은 운을 만드는 씨앗)
    // 이번 판의 특별 규칙 (오늘의 도전 규칙 등)
    this.mod = mergeRules([this.run.rule ?? {}]);
    this.screenHeight = this.scale.height; // 휴대폰마다 다른 실제 화면 높이
    this.layout = gameLayout(this.screenHeight);
    this.boardY = this.layout.boardY;

    // 한 판의 상태. 다시 하기를 누르면 create()가 다시 실행되어 처음 값으로 돌아간다.
    this.wave = 0;
    this.waveTimeLeft = 0;
    this.waveElapsed = 0;
    this.spawnQueue = []; // 이번 웨이브에 아직 안 나온 주문들 { at: 나올 시각(초), type }
    this.monsters = [];
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
    // 🔪 장착한 주방 도구 효과 (오늘의 도전은 모두 같은 조건이라 도구를 쓰지 않는다)
    this.gear = this.run.kind === 'daily' ? equippedEffects.empty() : equippedEffects();
    // 🎨 꾸미기: 모자, 바닥, 레일, 던지기 꼬리, 배부름 효과
    this.hat = worn('hat')?.emoji ?? null;
    this.trail = worn('trail')?.emojis ?? null;
    this.trailCount = 0;
    this.feedPop = worn('feed')?.emojis ?? null;
    const rail = worn('rail')?.rail;
    this.railColors = rail ? { rail: rail[0], stripe: rail[1], slat: rail[2] } : { rail: COLORS.rail, stripe: COLORS.railStripe, slat: COLORS.railSlat };
    this.gold = START_GOLD + (this.mod.startGold ?? 0) + this.gear.startGold;
    this.railLimit = this.run.railLimit + (this.mod.railLimit ?? 0);
    this.peakMonsters = 0; // 이번 판에 레일에 가장 많이 쌓였던 손님 수 (별 계산)
    this.bossPatience = BOSS_PATIENCE + (this.mod.patience ?? 0);
    this.monstersFed = 0; // 이번 판에 처리한 주문 수 (팁 계산용)
    this.bossesDefeated = 0; // 이번 판에 만족시킨 VIP 손님 수 (= 별)
    this.summonCount = 0; // 지금까지 뽑은 횟수 (뽑기 비용 계산용)
    this.deck = this.run.deck ?? STARTER_LINES; // 이번 판에 나오는 레시피 4줄
    this.hand = HAND_POWER_MAX + this.gear.hand; // 🔪 손 힘: 요리를 톡 눌러 칼질을 도울 때 하나씩 쓴다
    this.lineUpgrades = Object.fromEntries(this.deck.map((l) => [l, 0])); // ⬆️ 줄별 강화 레벨 (이번 판)
    this.swapCount = 0; // 🔀 바꾸기 한 횟수 (값이 오른다)
    // 이번 판에 쓸 수 있는 기능 (계정 기준으로 하나씩 열린다: data/unlocks.js)
    this.features = this.run.featuresAt(resume?.wave ?? this.run.startWave ?? 1);
    this.selectedChef = null;
    this.drag = null; // 끌고 있는 요리사 정보 { chef, startX, startY, moved }
    this.isOver = false;
    this.endReason = null;
    this.paused = false;
    this.tutorial = null; // 👆 튜토리얼 진행 (동네 1-1)
    this.mission = null; // 🎯 지금 미션 { def, count }
    this.missionsDone = 0;
    this.unlockedThisRun = [];
    this.lineLevels = null; // 레시피 줄 레벨 (처음 쓸 때 계산)
    this.freeSummons = 0; // 🎲 무료 뽑기 (미션 보상)
    this.railSlow = 0; // 🍵 레일 위 모든 손님이 느려지는 정도 (숲속 보약차)
    // 무작위 값들. 종류별로 따로 둔다 (🏆 오늘의 도전에서는 날짜로 정해진 값이 나오게 바꾼다)
    this.rng = { summon: Math.random, wave: Math.random, cards: Math.random, merge: Math.random };
    if (this.daily) {
      // 🏆 오늘의 도전: 모두 같은 운. 몇 번째 뽑기·카드·합성인지가 같으면 같은 결과가 나온다
      const seed = this.daily.seed;
      this.rng = { summon: seededRandom(seed + 1), wave: Math.random, cards: seededRandom(seed + 3), merge: seededRandom(seed + 4) };
    }
    // 🌱 첫 판: 처음 1~2분 동안 운을 조금 도와준다 (같은 재료가 연달아 나와 1분 안에 영웅까지)
    this.firstRun = this.run.kind === 'journey' && !resume && (this.run.startTown ?? 0) === 0 && !(getSave().seen ?? []).includes('tutorial');
    this.firstFed = false;
    this.time.paused = false;
    this.gameSpeed = this.registry.get('gameSpeed') ?? 1; // 다시 하기를 눌러도 배속 유지

    this.rail = new Rail(this.boardY);
    this.slots = this.createSlots();

    this.drawBoard();
    this.createLayers();
    this.createHud();
    this.createControls();

    this.upgradePanel = new UpgradePanel(this, {
      deck: this.deck,
      levels: this.lineUpgrades,
      getGold: () => this.gold,
      getCost: (line) => this.upgradeCostOf(line),
      onUpgrade: (line) => this.upgradeLine(line),
    });

    this.recipePanel = new RecipePanel(this, {
      deck: this.deck,
      hasChef: (id) => this.chefs.some((c) => c.stats.id === id),
      onCraft: (recipe) => this.craft(recipe),
    });
    this.applyFeatures();

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
    this.town = -1; // 지금 동네 (여정)
    this.townPeak = 0; // 이번 동네에서 가장 많이 쌓인 손님 (동네 별)
    if (resume) this.restoreJourney(resume);
    else if (this.run.startTown > 0) this.giveStartKit();
    this.startWave(resume?.wave ?? this.run.startWave ?? 1);
    if (this.daily) this.quest('daily');
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
    if (this.seollal) greetings.push('🎍 새해 복 많이 받으세요! 호랑이 손님이 떡국 먹으러 와요');
    if (greetings.length > 0) this.eggFound('holiday');
    if (this.lateNight) {
      greetings.push('🌙 야식 타임! 고양이 손님이 몰려와요');
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
      this.spawnMonster('cat', 0, { golden: true, ramen: true });
      this.showBanner('🍜 라면 먹으러 온 황금 고양이!', COLORS.gold, 40);
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
    // 📖 신화 조합표가 열려 있으면 게임이 느려진다
    const slow = this.recipePanel?.isOpen ? 0.3 : 1;
    for (let i = 0; i < this.gameSpeed && !this.isOver; i++) this.tick(dt * slow);
    this.updateHud();
    this.updateTutorial();
  }

  // 게임 시간을 dt초만큼 진행한다
  tick(dt) {
    // 1) 웨이브 시간 진행
    this.waveTimeLeft -= dt;
    this.waveElapsed += dt;

    // 2) 나올 시간이 된 주문을 레일에 올린다
    while (this.spawnQueue.length > 0 && this.spawnQueue[0].at <= this.waveElapsed) {
      const next = this.spawnQueue.shift();
      this.spawnMonster(next.type, 0, next.options);
    }
    if (this.boss) this.bossAbility(dt);

    // 3) 주문 이동 + 지속 피해. 레일이 멈춰 있으면 일반 주문은 서 있고, 보스는 절반 속도
    this.updateGimmick(dt);
    this.freezeTimeLeft = Math.max(0, this.freezeTimeLeft - dt);
    const frozen = this.freezeTimeLeft > 0;
    this.freezeOverlay.setVisible(frozen);
    const rush = this.rushTimeLeft > 0 ? this.gimmick.factor : 1;
    const tea = 1 - this.railSlow; // 🌿 숲속 보약차: 레일 위 모든 손님이 느려진다
    for (const monster of [...this.monsters]) {
      const moveScale = (frozen ? (monster.isBoss ? 0.5 : 0) : 1) * rush * tea * (this.mod.orderSpeed ?? 1);
      const dotDamage = monster.step(dt, moveScale);
      if (monster.golden && monster.distance - monster.startDistance >= this.rail.length) {
        this.escapeMonster(monster); // 🥚 황금 주문은 한 바퀴 돌면 사라진다
        continue;
      }
      if (dotDamage > 0) this.damageMonster(monster, dotDamage);
    }

    // 4) 요리 칼질과 던지기, 날아가는 요리 이동
    this.hand = Math.min(this.handMax(), this.hand + HAND_POWER_REGEN * dt);
    const dragging = this.drag && this.drag.moved ? this.drag.chef : null;
    for (const chef of this.chefs) {
      if (chef === dragging) continue; // 끌려가는 중에는 공격하지 않는다
      const burning = this.fires.some((f) => f.slot === chef.slot);
      chef.setAlpha(burning ? 0.45 : 1);
      if (burning) continue; // 불붙은 칸의 요리사는 쉰다
      chef.rangeScale = this.blackout?.slots.includes(chef.slot) ? this.blackout.rangeFactor : 1;
      chef.step(dt, this.monsters, (c, target) => this.throwDish(c, target));
      if (chef.stats.freeze) this.freezeAbility(chef, dt);
    }
    for (const p of this.projectiles) p.step(dt);
    this.projectiles = this.projectiles.filter((p) => !p.done);

    // 5) 패배 / 다음 웨이브 / 클리어 판정
    if (this.isOver) return; // 보스를 처치해서 이번 프레임에 클리어했을 수 있다
    this.peakMonsters = Math.max(this.peakMonsters, this.monsters.length);
    this.townPeak = Math.max(this.townPeak, this.monsters.length);
    if (this.monsters.length >= this.railLimit) {
      this.endGame('rail');
    } else if (this.waveTimeLeft <= 0) {
      if (this.boss) this.endGame('boss'); // 인내심이 다 떨어졌다
      else if (this.wave >= this.run.totalWaves) this.endGame('clear');
      else this.startWave(this.wave + 1);
    }
  }

  // ───────── 웨이브와 주문 ─────────

  startWave(wave) {
    this.wave = wave;
    this.waveElapsed = 0;
    // 🏆 오늘의 도전: 웨이브마다 나오는 주문도 모두 같게 (웨이브 번호로 씨앗을 정한다)
    if (this.daily) this.rng.wave = seededRandom(this.daily.seed + 1000 + wave);
    // 🗺️ 여정: 웨이브에 따라 기능, 주방 사고, 동네가 바뀐다
    this.updateFeatures(wave);
    this.gimmick = this.run.gimmickAt ? this.run.gimmickAt(wave) : this.run.gimmick;
    if (this.run.kind === 'journey') this.enterTown(wave);
    this.checkMissionTime();
    const bossKey = this.run.bossAt(wave);

    // 이번 웨이브에 나올 주문들을 미리 정해 두고, SPAWN_SPREAD초 동안 고르게 나눠서 내보낸다
    let count = this.run.count(wave);
    if (bossKey) count = Math.round(count * BOSS_WAVE_ORDER_RATIO);
    const mix = { ...this.run.mix(wave) };
    if (this.seollal) mix.tiger = 2; // 🥚 설날에는 호랑이 손님
    if (this.lateNight) mix.cat = (mix.cat ?? 1) * 3; // 🥚 새벽 3시에는 야식 먹는 고양이가 3배
    this.spawnQueue = [];
    for (let i = 0; i < count; i++) {
      this.spawnQueue.push({ at: (SPAWN_SPREAD * i) / count, type: pickWeighted(mix, this.rng.wave) });
    }
    // 🥚 아주 가끔: 황금 주문, 첫 웨이브의 GG 주문
    if (wave > 1 && this.rng.wave() < GOLDEN_ORDER_CHANCE) {
      this.spawnQueue.push({ at: this.rng.wave() * SPAWN_SPREAD, type: 'mouse', options: { golden: true } });
    }
    if (wave === 1 && Math.random() < GG_CHANCE) this.spawnQueue.push({ at: 0.5, type: 'gg' });
    this.spawnQueue.sort((a, b) => a.at - b.at);

    if (bossKey) {
      // 보스 웨이브: 제한 시간이 인내심으로 바뀌고, 보스가 맨 먼저 나온다
      this.waveTimeLeft = this.bossPatience;
      this.spawnQueue.unshift({ at: 0, type: bossKey });
      this.showBanner(`⚠ 보스 손님 등장!\n${MONSTERS[bossKey].emoji} ${MONSTERS[bossKey].name}`, COLORS.danger, 44);
    } else {
      this.waveTimeLeft = WAVE_DURATION;
      if (wave > 1) sfx.wave();
      if (wave === (this.run.startWave ?? 1) && !this.resumed) {
        this.showBanner(this.run.title, COLORS.textDark, 40);
        if (this.daily) this.log(`🍽️ ${this.daily.special.name}: ${this.daily.special.desc}`, COLORS.gold);
        this.firstTimeTips();
      }
      else this.showBanner(`웨이브 ${wave}`);
    }
  }

  // 손님을 레일에 올린다. startDistance: 레일 위 어디서 시작할지 (암탉이 병아리로 나뉠 때 사용)
  spawnMonster(typeKey, startDistance = 0, options = {}) {
    const monster = new Monster(this, this.rail, typeKey, this.run.hpWave ?? this.wave, startDistance, { ...options, lines: this.deck });
    // 🍽️ 특별 규칙: 손님 배고픔, 추가 골드
    const value = (v) => (typeof v === 'function' ? v(this.wave) : v);
    const runHp = monster.isBoss ? value(this.run.bossHp) : value(this.run.hp);
    // 덱에 없는 요리를 좋아하는 손님은 배고픔이 조금 덜하다 (한 판 동안 덱을 못 바꾸니 뒤 동네에서 벽이 생기지 않게)
    const offDeck = !monster.isBoss && monster.likes && !this.deck.includes(monster.likes) ? OFF_DECK_HP : 1;
    const hpScale = runHp * offDeck * (this.mod.orderHp ?? 1) * (monster.isBoss ? this.mod.bossHp ?? 1 : 1);
    if (hpScale !== 1) {
      monster.maxHp = Math.round(monster.maxHp * hpScale);
      monster.hp = monster.maxHp;
    }
    if (this.mod.orderReward && !monster.isBoss) monster.reward += this.mod.orderReward;
    if (typeKey === 'gg') this.eggFound('gg');
    monster.ramen = Boolean(options.ramen);
    if (monster.golden && !options.ramen) this.showBanner('✨ 황금 손님이다!', COLORS.gold, 44);
    this.monsterLayer.add(monster);
    this.monsters.push(monster);
    if (this.boss) this.monsterLayer.bringToTop(this.boss); // 보스는 항상 다른 손님 위에 보이게

    if (monster.isBoss) {
      this.boss = monster;
      shake(this, 0.01, 400);
      vibrate([80, 40, 80]);
      sfx.bossAppear();
      playMusic('boss');
      this.bossTimer = 0;
      monster.on('likesChanged', (line) => {
        this.floatText(monster.x, monster.y - 80, `이번엔 ${METHODS[line].emoji} 먹고 싶어!`, COLORS.danger, 26);
      });
    }
    return monster;
  }

  // 보스 손님의 특수 능력 (일정 시간마다 한 번)
  bossAbility(dt) {
    const boss = this.boss;
    const type = boss.type;
    const power = type.rush ?? type.snack ?? type.ink ?? type.blizzard;
    if (!power) return;
    this.bossTimer += dt;
    if (this.bossTimer < power.every) return;
    this.bossTimer = 0;
    const say = (text, color = COLORS.gold) => this.floatText(boss.x, boss.y - 80, text, color, 28);

    if (type.rush) {
      // 돼지 부자: 주변 손님을 빠르게 만든다
      for (const monster of this.monsters) {
        if (Phaser.Math.Distance.Between(boss.x, boss.y, monster.x, monster.y) <= type.rush.radius) {
          monster.applyHaste(type.rush.factor, type.rush.duration);
        }
      }
      say('💸 빨리빨리!');
    } else if (type.snack) {
      // 사자 왕: 간식을 먹어 배가 조금 꺼진다
      boss.heal(boss.maxHp * type.snack.heal);
      say('🍖 간식 꿀꺽! 배가 꺼졌다', COLORS.danger);
    } else if (type.ink) {
      // 문어 선장: 먹물로 판 절반이 어두워진다
      this.startBlackout(type.ink.duration, type.ink.rangeFactor, '🐙 먹물 발사!');
    } else if (type.blizzard) {
      // 눈사람 대장: 요리 하나가 얼어서 쉰다
      this.startFire(type.blizzard.duration, 'ice');
      say('❄️ 눈보라!', '#9fd8ff');
    }
  }

  // 황금 손님을 놓쳤을 때
  escapeMonster(monster) {
    this.monsters = this.monsters.filter((o) => o !== monster);
    this.floatText(monster.x, monster.y - 30, '✨ 놓쳤다...', COLORS.gold, 24);
    this.tweens.add({ targets: monster, alpha: 0, y: monster.y - 40, duration: 400, onComplete: () => monster.destroy() });
  }

  // source: 요리를 준 요리 유닛 (뜨거운 국물처럼 모르면 null)
  damageMonster(monster, amount, source = null) {
    if (monster.takeDamage(amount)) this.feedMonster(monster, source);
  }

  // 손님 배가 꽉 찼을 때: 팁(골드)을 남기고 레일에서 떠난다
  feedMonster(monster, source = null) {
    // 🎂 왕관 케이크로 배부른 손님은 골드를 더 남긴다
    if (source?.stats?.goldBonus) monster.reward = Math.round(monster.reward * (1 + source.stats.goldBonus));
    this.gold += monster.reward;
    this.monstersFed += 1;
    this.quest('serve');
    this.monsters = this.monsters.filter((o) => o !== monster);
    if (monster.reward > 0) this.floatText(monster.x, monster.y - 30, `+${monster.reward}`, COLORS.gold);
    this.reaction(monster, '😋', 1);
    if (this.firstRun && !this.firstFed) {
      // 🌱 첫 손님 배부름: 크게 알려 준다
      this.firstFed = true;
      this.floatText(monster.x, monster.y - 80, '😋 첫 손님 배부름!', COLORS.gold, 34);
      burst(this, this.effectLayer, monster.x, monster.y, [0xffd54f, 0xfff8ec, 0xff8fb1], 24, 1.5);
    }
    if (this.feedPop) this.popEmojis(monster.x, monster.y, this.feedPop, monster.isBoss ? 10 : 4);
    sfx.serve();
    burst(this, this.effectLayer, monster.x, monster.y, MONSTER_COLORS[monster.typeKey] ?? [0xfff8ec], monster.isBoss ? 30 : 7, monster.isBoss ? 2 : 1);

    // 암탉: 그 자리에서 병아리 여러 마리가 나온다
    const split = monster.type.splitInto;
    if (split) {
      for (let i = 0; i < split.count; i++) this.spawnMonster(split.type, monster.distance - i * 30);
    }

    if (monster === this.boss) this.bossDefeated(monster);
    if (monster.golden) {
      this.showBanner(`✨ 황금 손님 배부름! +${monster.reward}`, COLORS.gold, 44);
      if (!monster.ramen) this.eggFound('golden');
    }
    if (monster.typeKey === 'gg') this.floatText(monster.x, monster.y - 60, 'gg wp', COLORS.text, 32);

    // 배를 두드리며 통통 튀어 떠난다
    this.tweens.add({
      targets: monster,
      y: monster.y - 30,
      scale: 1.3,
      alpha: 0,
      duration: 260,
      ease: 'Quad.Out',
      onComplete: () => monster.destroy(),
    });
  }

  // 🎨 배부름 효과: 이모지가 사방으로 튀었다 사라진다
  popEmojis(x, y, emojis, count) {
    for (let i = 0; i < count; i++) {
      const e = this.add.text(x, y, emojis[i % emojis.length], { fontFamily: EMOJI_FONT, fontSize: '26px' }).setOrigin(0.5);
      this.effectLayer.add(e);
      const angle = Math.random() * Math.PI * 2;
      const dist = Phaser.Math.Between(40, 80);
      this.tweens.add({
        targets: e,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist - 20,
        scale: 1.3,
        alpha: 0,
        duration: 600,
        ease: 'Quad.Out',
        onComplete: () => e.destroy(),
      });
    }
  }

  // 🎨 던지기 꼬리: 날아가는 요리 뒤에 작은 이모지를 남긴다 (너무 많아지지 않게 수를 제한)
  dropTrail(x, y) {
    if (!this.trail || (this.trailCount ?? 0) > 50) return;
    this.trailCount = (this.trailCount ?? 0) + 1;
    const e = this.add.text(x, y, this.trail[Math.floor(Math.random() * this.trail.length)], { fontFamily: EMOJI_FONT, fontSize: '18px' }).setOrigin(0.5);
    this.effectLayer.add(e);
    this.tweens.add({
      targets: e,
      alpha: 0,
      scale: 0.4,
      duration: 350,
      onComplete: () => {
        e.destroy();
        this.trailCount -= 1;
      },
    });
  }

  // 손님 반응 말풍선 (냠, 맛있다! …). 너무 많이 뜨지 않게 손님마다 잠깐 쉰다
  reaction(monster, text, size = 0.8) {
    const now = this.time.now;
    if (size < 1 && now - (monster.lastReaction ?? 0) < 700) return;
    monster.lastReaction = now;
    const label = this.add
      .text(monster.x - 30, monster.y - monster.size * 0.7, text, {
        fontFamily: FONT,
        fontSize: `${Math.round(22 * size + 6)}px`,
        fontStyle: 'bold',
        color: COLORS.textDark,
        backgroundColor: '#fff8ec',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5);
    this.effectLayer.add(label);
    this.tweens.add({ targets: label, y: label.y - 26, alpha: 0, delay: 250, duration: 450, onComplete: () => label.destroy() });
  }

  // 보스 손님 배를 채웠을 때: 마지막 보스면 클리어, 아니면 바로 다음 웨이브
  bossDefeated(boss) {
    this.quest('boss');
    if (this.run.kind === 'journey') this.townCleared(boss);
    this.boss = null;
    this.bossesDefeated += 1;
    this.showBanner(`🎉 ${boss.type.name} 배부름!`, COLORS.gold, 44);
    flash(this, 0xffd54f);
    vibrate([60, 30, 60]);
    sfx.bossDefeat();
    playMusic('game');
    if (this.wave >= this.run.totalWaves) {
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
    const gimmick = this.gimmick;
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
      this.startBlackout(gimmick.duration, gimmick.rangeFactor);
    }
  }

  // 불난 주방: 요리가 있는 칸 중 하나에 불을 붙인다 (없으면 아무 칸). kind 'ice'면 얼음 (눈사람 대장)
  startFire(duration, kind = 'fire') {
    const burning = this.fires.map((f) => f.slot);
    const withChef = this.slots.filter((s) => s.chef && !burning.includes(s));
    const candidates = withChef.length > 0 ? withChef : this.slots.filter((s) => !burning.includes(s));
    const slot = Phaser.Utils.Array.GetRandom(candidates);
    if (!slot) return;
    // 칸 전체를 빨갛게(얼음은 하늘색) 칠하고, 구석에 작은 불꽃(눈송이)을 둔다
    const ice = kind === 'ice';
    const glow = this.add.rectangle(0, 0, TILE, TILE, ice ? 0x9fd8ff : 0xff3b1f, 0.45);
    const flame = this.add.text(TILE / 2 - 18, -TILE / 2 + 18, ice ? '❄️' : '🔥', { fontFamily: EMOJI_FONT, fontSize: '30px' }).setOrigin(0.5);
    const icon = this.add.container(slot.x, slot.y, [glow, flame]);
    this.effectLayer.add(icon);
    this.tweens.add({ targets: glow, alpha: 0.2, duration: 350, yoyo: true, repeat: -1 });
    this.fires.push({ slot, timeLeft: duration, icon });
    if (ice) sfx.freeze();
    else sfx.fire();
  }

  // 정전(먹물): 판의 위/아래/왼쪽/오른쪽 절반 중 하나가 어두워져 그쪽 요리 사거리가 rangeFactor배가 된다
  startBlackout(duration, rangeFactor = 0.6, message = '💡 정전!') {
    const half = Phaser.Utils.Array.GetRandom(['top', 'bottom', 'left', 'right']);
    const slots = this.slots.filter((s) => {
      if (half === 'top') return s.row < INNER_ROWS / 2;
      if (half === 'bottom') return s.row >= INNER_ROWS / 2;
      if (half === 'left') return s.col < INNER_COLS / 2;
      return s.col >= INNER_COLS / 2;
    });
    this.blackout = { slots, timeLeft: duration, rangeFactor };
    this.darkOverlay.clear();
    this.darkOverlay.fillStyle(0x000000, 0.55);
    for (const s of slots) this.darkOverlay.fillRect(s.x - TILE / 2, s.y - TILE / 2, TILE, TILE);
    this.showBanner(message, '#c4bfd6', 52);
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
    return this.slots.filter((s) => !s.chef && !s.reserved); // reserved: 신화가 나올 자리
  }

  // 요리사 뽑기: 골드를 내고 무작위 등급, 무작위 요리사를 빈 칸에 놓는다
  summon() {
    const cost = this.currentSummonCost();
    const empty = this.emptySlots();
    if (this.isOver || this.gold < cost || empty.length === 0) return;

    this.gold -= cost;
    this.summonCount += 1;
    this.quest('summon');
    this.tutorialEvent('summon');
    if (this.freeSummons > 0) this.freeSummons -= 1; // 🎲 무료 뽑기

    const rnd = this.rng.summon;
    let tier = Number(pickWeighted(this.summonOdds(), rnd));
    let data = pick(chefsOfTier(tier, this.deck), rnd);
    // 🌱 첫 판의 첫 4번은 같은 재료: 겹치고, 또 겹쳐서 영웅까지
    if (this.firstRun && this.summonCount <= 4) {
      tier = 1;
      data = chefsOfTier(1, this.deck)[0];
    }
    if (rnd() < DISHWASHER_CHANCE) data = chefById('dishwasher'); // 🥚 0.1%
    const slot = pick(empty, rnd);

    this.addChef(data, slot);
    revealEffect(this, this.effectLayer, slot.x, slot.y, tier, TIERS[tier].color);
    sfx.summon(tier);

    this.floatText(slot.x, slot.y - 50, data.name, colorToHex(TIERS[tier].color), 24);
    this.log(`[뽑기] ${TIERS[tier].name} ${data.emoji} ${data.name}`, colorToHex(TIERS[tier].color));
    if (tier >= 2) this.showBanner(`✨ ${TIERS[tier].name}! ${data.name}`, colorToHex(TIERS[tier].color), 44);
    if (data.hidden) {
      this.showBanner('🍽️ 설거지 담당이 왔어요!', COLORS.gold, 44);
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

  // 요리가 완성되면 손님에게 던진다
  throwDish(chef, target) {
    sfx.attack(chef.stats.method);
    this.launch(chef, target, (pos) => this.resolveHit(chef, target, pos));
  }

  // 날아가는 요리 하나를 만든다. from: { x, y, stats } (요리 유닛)
  launch(from, target, onHit, options = {}) {
    const dish = new Projectile(this, from, target, onHit, options);
    this.projectileLayer.add(dish);
    this.projectiles.push(dish);
  }

  // 요리가 손님에게 닿았을 때 레시피 줄에 맞는 효과를 준다
  resolveHit(chef, target, pos) {
    const stats = chef.stats;
    this.applyEffects(stats, chef, target);

    if (stats.splash) {
      // 범위(고기, 요리의 신): 닿은 곳 주변 손님 모두가 먹는다
      for (const monster of [...this.monsters]) {
        if (Phaser.Math.Distance.Between(pos.x, pos.y, monster.x, monster.y) <= stats.splash) this.feed(monster, stats, chef);
      }
      this.explosion(pos.x, pos.y, stats.splash, stats.method === 'all' ? 0xffd54f : 0xff7a1a);
    } else if (stats.pierce) {
      // 관통(면): 맞은 손님과 그 근처 손님 몇 명이 줄줄이 먹는다
      for (const monster of this.nearby(pos, stats.pierce.radius, stats.pierce.count, target)) this.feed(monster, stats, chef);
    } else if (!target.dead) {
      this.feed(target, stats, chef);
    }
  }

  // 뜨거운 국물(지속)과 감속은 목표에게 먼저 건다
  applyEffects(stats, chef, target, scale = 1) {
    if (target.dead) return;
    const like = this.likeMultiplier(stats.method, target, stats);
    if (stats.dot) target.applyDot(stats.dot.dps * like * this.powerMultiplier(stats) * scale, stats.dot.duration);
    if (stats.slow) target.applySlow(stats.slow.factor, stats.slow.duration);
    // 🍰 구름 케이크: 몇 번에 한 번 손님이 꾸벅 멈춘다 (보스는 절반만)
    if (stats.stun && chef) {
      chef.stunCount = (chef.stunCount ?? 0) + 1;
      if (chef.stunCount % stats.stun.every === 0) {
        target.applySlow(0, stats.stun.duration * (target.isBoss ? 0.5 : 1));
        this.reaction(target, '💤');
      }
    }
  }

  // 손님 한 명이 요리를 먹는다: 배가 차고, 좋아하는 요리면 반응한다. 튀김은 골드도 준다
  feed(monster, stats, chef = null, scale = 1) {
    if (monster.dead) return;
    const like = this.likeMultiplier(stats.method, monster, stats);
    if (like > 1) this.reaction(monster, Phaser.Utils.Array.GetRandom(['맛있다!', '냠냠!', '최고야!']));
    else if (like < 1 && this.time.now - (this.lastDislike ?? -1e9) > 2500) {
      // 까다로운 손님의 "이건 별로..."는 화면이 어지럽지 않게 가끔만
      this.lastDislike = this.time.now;
      this.reaction(monster, '이건 별로...');
    }
    if (stats.goldPerHit) {
      this.gold += stats.goldPerHit;
      if (Math.random() < 0.3) this.floatText(monster.x + 30, monster.y - 40, `🍤+${stats.goldPerHit}`, COLORS.gold, 18);
    }
    const boss = monster.isBoss && stats.bossBonus ? stats.bossBonus : 1; // 🍱 산해진미 도시락
    this.damageMonster(monster, stats.damage * this.powerMultiplier(stats) * like * scale * boss, chef);
  }

  // pos 근처의 손님을 가까운 순서로 count명까지 (first를 맨 앞에)
  nearby(pos, radius, count, first = null) {
    const list = this.monsters
      .filter((m) => !m.dead && m !== first && Phaser.Math.Distance.Between(pos.x, pos.y, m.x, m.y) <= radius)
      .sort((a, b) => Phaser.Math.Distance.Between(pos.x, pos.y, a.x, a.y) - Phaser.Math.Distance.Between(pos.x, pos.y, b.x, b.y));
    if (first && !first.dead) list.unshift(first);
    return list.slice(0, count);
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

  // 요리 양 배율: 줄 레벨(영구) × 특별 규칙 × 도구 × 종류별 강화
  powerMultiplier(stats) {
    const daily = this.mod.lineDamage?.[stats.method] ?? 1; // 🍽️ 오늘의 도전: 줄별 요리 양
    const gear = 1 + this.gear.damage + (this.gear.lineDamage[stats.method] ?? 0); // 🍳 냄비
    const upgrade = 1 + (this.lineUpgrades[stats.method] ?? this.avgUpgrade()) * LINE_UPGRADE_BONUS; // ⬆️ 종류별 강화
    return (1 + this.levelOf(stats.method) * LINE_DAMAGE_PER_LEVEL) * daily * gear * upgrade;
  }

  // 총괄 주방장 같은 특별 요리는 종류별 강화의 평균
  avgUpgrade() {
    const levels = Object.values(this.lineUpgrades);
    return levels.reduce((sum, n) => sum + n, 0) / levels.length;
  }

  // ⬆️ 종류별 강화: 골드를 내고 그 줄 요리 양을 올린다
  upgradeLine(line) {
    const level = this.lineUpgrades[line];
    const cost = this.upgradeCostOf(line);
    if (this.isOver || level >= LINE_UPGRADE_MAX || this.gold < cost) return;
    this.gold -= cost;
    this.lineUpgrades[line] = level + 1;
    this.quest('upgrade');
    sfx.upgrade();
    for (const chef of this.chefs) {
      if (chef.stats.method !== line) continue;
      chef.setUpgrade(level + 1);
      ring(this, this.effectLayer, chef.x, chef.y, 0x3f7fd0, 50);
    }
    this.log(`[강화] ${METHODS[line].emoji} ${METHODS[line].name} 강화 Lv.${level + 1}! 요리 양 +${Math.round((level + 1) * LINE_UPGRADE_BONUS * 100)}%`, '#9fd0ff');
    if (this.selectedChef) this.updateCard();
    this.updateHud();
  }

  // 종류별 강화 비용 (⬆️ 강화 세일 규칙이면 할인)
  upgradeCostOf(line) {
    return Math.round(lineUpgradeCost(this.lineUpgrades[line]) * (this.mod.upgradeCost ?? 1));
  }

  // 🔀 바꾸기: 고른 요리를 같은 등급, 다른 줄의 요리로 무작위로 바꾼다 (영웅까지)
  canSwap(chef) {
    const s = chef.stats;
    return s.tier <= SWAP_MAX_TIER && this.deck.includes(s.method) && !s.hidden && !s.special;
  }

  swapSelected() {
    const chef = this.selectedChef;
    const cost = swapCost(this.swapCount);
    if (this.isOver || !chef || !this.canSwap(chef) || this.gold < cost) return;
    const options = chefsOfTier(chef.stats.tier, this.deck).filter((c) => c.method !== chef.stats.method);
    if (options.length === 0) return;
    const data = pick(options, this.rng.merge);
    this.gold -= cost;
    this.swapCount += 1;
    this.quest('swap');
    const slot = chef.slot;
    this.removeChef(chef);
    const fresh = this.addChef(data, slot);
    this.selectChef(fresh);
    ring(this, this.effectLayer, slot.x, slot.y, 0xc77dff, 60);
    sfx.merge(1);
    this.floatText(slot.x, slot.y - 50, `🔀 ${data.name}`, '#d9a8ff', 24);
    this.updateHud();
  }

  // 레시피 줄 레벨 (판을 시작할 때 정해진다). 요리의 신 같은 특별 요리는 덱 줄 레벨의 평균
  levelOf(line) {
    if (!this.lineLevels) {
      this.lineLevels = Object.fromEntries(this.deck.map((l) => [l, this.run.kind === 'daily' ? 0 : lineLevel(l)]));
    }
    if (line in this.lineLevels) return this.lineLevels[line];
    const levels = Object.values(this.lineLevels);
    return levels.reduce((sum, n) => sum + n, 0) / levels.length;
  }

  // 뽑기 비용: 기본 비용에서 가게 강화(단골 시장)만큼 할인
  currentSummonCost() {
    if (this.freeSummons > 0) return 0; // 🎲 무료 뽑기
    const cost = summonCost(this.summonCount) - this.gear.summonDiscount;
    return Math.max(1, Math.round(cost * (this.mod.summonCost ?? 1))); // 🍽️ 할인 데이
  }

  // 좋아하는 요리면 2배 (🎯 카드면 더). 까다로운 손님은 좋아하는 요리가 아니면 절반.
  likeMultiplier(method, monster, stats = null) {
    const like = LIKE_MULTIPLIER;
    if (method === 'all' || stats?.alwaysLiked) return like; // 🍲 해물 전골: 모든 손님이 좋아한다
    if (monster.likes === method) return like;
    if (monster.type.picky) return PICKY_MULTIPLIER;
    return 1;
  }

  // 손 힘 최대 (💪 카드면 더)
  handMax() {
    return HAND_POWER_MAX + this.gear.hand;
  }

  // 뽑기 등급 확률 (🍀 행운의 앞치마 카드면 희귀·영웅이 더 잘 나온다)
  summonOdds() {
    // 🌱 첫 판 처음 5웨이브는 희귀·영웅이 잘 나온다 (반짝이는 걸 많이 보게)
    if (this.firstRun && this.wave <= 5) return { 1: 78, 2: 19, 3: 3 };
    const odds = { ...(this.mod.summonOdds ?? SUMMON_ODDS) };
    return odds;
  }

  // ───────── 🎯 판 안 미션 ─────────

  // 웨이브가 넘어갈 때: 시간이 다 된 미션은 다음 미션으로
  checkMissionTime() {
    if (!this.mission || this.wave <= this.mission.until) return;
    this.log(`⌛ 미션 시간 끝: ${this.mission.def.text}`, '#b9a48f');
    this.nextMission();
  }

  // 다음 미션을 고른다 (방금 한 미션과 다른 것, 열린 기능만)
  nextMission() {
    const last = this.mission?.def.id;
    const pool = MISSIONS.filter(
      (m) =>
        m.id !== last &&
        (!m.need || this.features[m.need]) &&
        !(m.id === 'legend' && this.wave < 12) &&
        !(m.id === 'hero' && this.wave < 4),
    );
    const def = pool[Math.floor(this.rng.cards() * pool.length)];
    this.mission = { def, count: 0, until: this.wave + MISSION_WAVES }; // MISSION_WAVES웨이브 안에 못 하면 다음 미션
    this.drawMission();
  }

  drawMission() {
    const m = this.mission;
    if (!m || !this.missionText) return;
    this.missionText.setText(`🎯 ${m.def.emoji} ${m.def.text} ${Math.min(m.count, m.def.target)}/${m.def.target}`);
    // 게이지 왼쪽 글자와 겹치지 않게 줄인다
    const max = GAME_WIDTH - 60 - this.gaugeText.width - 20;
    this.missionText.setScale(Math.min(1, max / this.missionText.width));
  }

  missionProgress(event, amount) {
    const m = this.mission;
    if (!m || this.isOver || m.def.event !== event) return;
    m.count += amount;
    if (m.count < m.def.target) return this.drawMission();
    // 미션 완료: 보상
    const reward = m.def.reward;
    let text = rewardText(reward, this.wave);
    if (reward.gold) this.gold += missionGold(reward.gold, this.wave);
    if (reward.free) this.freeSummons += reward.free;
    if (reward.upgrade) {
      const line = this.deck.filter((l) => this.lineUpgrades[l] < LINE_UPGRADE_MAX).sort((a, b) => this.lineUpgrades[a] - this.lineUpgrades[b])[0];
      if (line) {
        this.gold += this.upgradeCostOf(line);
        this.upgradeLine(line);
        text = `⬆️ ${METHODS[line].emoji} 무료 강화`;
      }
    }
    this.missionsDone = (this.missionsDone ?? 0) + 1;
    sfx.coin();
    this.showBanner(`🎯 미션 성공!\n${m.def.emoji} ${m.def.text} → ${text}`, COLORS.gold, 32);
    this.mission = null;
    this.time.delayedCall(1200, () => !this.isOver && this.nextMission());
  }

  // ───────── 📋 오늘의 주문서 ─────────

  // 퀘스트 진행. 다 하면 화면 위에 알림
  quest(event, amount = 1) {
    this.missionProgress(event, amount);
    for (const q of addQuestProgress(event, amount)) {
      const toast = this.add
        .text(GAME_WIDTH / 2, this.layout.gauge.y + 70, `📋 주문서 완료! ${q.emoji} ${q.text}`, {
          fontFamily: FONT,
          fontSize: '24px',
          fontStyle: 'bold',
          color: COLORS.gold,
          backgroundColor: '#2b1d14',
          padding: { x: 16, y: 10 },
        })
        .setOrigin(0.5)
        .setDepth(15);
      sfx.coin();
      this.tweens.add({ targets: toast, alpha: 0, delay: 2200, duration: 500, onComplete: () => toast.destroy() });
    }
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

  // 📖 신화 조합표가 열려 있고, 이 덱으로 만들 수 있는 신화인지
  isRecipeUnlocked(recipe) {
    return this.features.recipes && recipeFitsDeck(recipe, this.deck);
  }

  // 지금 만들 수 있는 신화 수 (📖 버튼 배지)
  craftableCount() {
    return RECIPES.filter((r) => this.isRecipeUnlocked(r) && this.findIngredients(r)).length;
  }

  // 신화 만들기: 재료 요리들이 가운데 냄비로 날아가 쏙 들어가고, 펑! 하고 신화 요리가 나온다.
  // 신화는 첫 번째 재료가 있던 칸에 생긴다.
  craft(recipe) {
    const ingredients = this.findIngredients(recipe);
    if (this.isOver || this.crafting || !ingredients || !this.isRecipeUnlocked(recipe)) return;
    this.recipePanel.close();
    this.selectChef(null);

    const slot = ingredients[0].slot;
    const data = chefById(recipe.result);
    const first = !isDiscovered(data.id);
    const pot = { x: BOARD_X + (BOARD_COLS * TILE) / 2, y: this.boardY + (BOARD_ROWS * TILE) / 2 };
    // 재료 요리는 판에서 빼고, 모양만 남겨서 냄비로 날려 보낸다
    const flyers = ingredients.map((chef) => {
      const ghost = this.add.text(chef.x, chef.y, chef.stats.emoji, { fontFamily: EMOJI_FONT, fontSize: '56px' }).setOrigin(0.5).setDepth(16);
      this.removeChef(chef);
      return ghost;
    });
    this.updateBuffs();
    this.crafting = true;
    slot.reserved = true; // 연출 동안 다른 요리가 이 칸에 오지 않게
    const potText = this.add.text(pot.x, pot.y + 30, '🍲', { fontFamily: EMOJI_FONT, fontSize: '96px' }).setOrigin(0.5).setDepth(15).setScale(0);
    this.tweens.add({ targets: potText, scale: 1, duration: 250, ease: 'Back.Out' });
    sfx.merge(3);
    flyers.forEach((ghost, i) => {
      this.tweens.add({
        targets: ghost,
        x: pot.x,
        y: pot.y,
        scale: 0.4,
        angle: 360,
        delay: 250 + i * 120,
        duration: 450,
        ease: 'Cubic.In',
        onComplete: () => {
          ghost.destroy();
          this.tweens.add({ targets: potText, scaleX: 1.15, scaleY: 0.85, duration: 80, yoyo: true });
        },
      });
    });
    const popAt = 250 + (flyers.length - 1) * 120 + 450 + 250;
    this.tweens.add({ targets: potText, angle: { from: -8, to: 8 }, duration: 70, yoyo: true, repeat: 3, delay: popAt - 300 });
    this.time.delayedCall(popAt, () => {
      potText.destroy();
      this.crafting = false;
      if (this.isOver) return;
      const rank = rankOf(data);
      flash(this, 0xffd54f);
      burst(this, this.effectLayer, pot.x, pot.y, [0xffd54f, 0xe74c3c, 0xfff8ec], 30, 2);
      this.floatText(pot.x, pot.y - 40, '펑!', COLORS.gold, 64);
      sfx.mythic();
      // 신화 요리가 냄비에서 튀어나와 자리로 날아간다
      slot.reserved = false;
      const chef = this.addChef(data, slot);
      chef.setPosition(pot.x, pot.y).setDepth(5);
      this.tweens.add({ targets: chef, x: slot.x, y: slot.y, duration: 380, ease: 'Quad.Out', onComplete: () => chef.setDepth(0) });
      revealEffect(this, this.effectLayer, slot.x, slot.y, 5, rank.color);
      this.updateHud();
      this.showBanner(`📖 신화 완성!\n${data.emoji} ${data.name}`, colorToHex(rank.color), 44);
      this.quest('mythic');
      if (first) this.log(`[신화] ${data.emoji} ${data.name}: ${data.ability}`, colorToHex(rank.color));
    });
  }

  // ───────── 🔓 기능 열기 ─────────

  // 웨이브가 바뀔 때: 새로 열린 기능이 있으면 한 줄 안내와 함께 연다
  updateFeatures(wave) {
    const next = this.run.featuresAt(wave);
    const opened = UNLOCKS.filter((u) => next[u.id] && !this.features[u.id]);
    this.features = next;
    if (opened.length === 0 || !this.upgradeButton) return;
    this.applyFeatures();
    const save = getSave();
    save.seen ??= [];
    opened.forEach((u, i) => {
      if (!save.seen.includes(u.id)) save.seen.push(u.id);
      this.time.delayedCall(800 + i * 3400, () => !this.isOver && this.showTip(`🔓 ${u.tip}`));
    });
    writeSave();
  }

  // 열린 기능에 맞게 버튼을 보이거나 잠근다
  applyFeatures() {
    const f = this.features;
    this.upgradeButton.setEnabled(f.upgrade);
    this.bookButton.setVisible(f.recipes);
    this.missionText.setVisible(f.missions);
    if (f.missions && !this.mission) this.nextMission();
    for (const chef of this.chefs) chef.setRecipeDot(this.isRecipeIngredient(chef.stats.id));
    this.updateCard();
  }

  // 이 요리가 이번 덱으로 만들 수 있는 신화의 재료인지 (📖 점)
  isRecipeIngredient(id) {
    return this.features.recipes && mythicsUsing(id).some((m) => recipeFitsDeck(m, this.deck));
  }

  // 칼질 속도: 총괄 주방장·음료 줄이 바로 옆 칸(대각선 포함) 요리를 빠르게 하고, 카드 효과를 더한다
  updateBuffs() {
    for (const chef of this.chefs) {
      let lead = 0; // 🛎️ 총괄 주방장 (가장 센 것 하나)
      let cheer = 0; // 🥤 음료 줄 (가장 센 것 하나)
      for (const other of this.chefs) {
        if (other === chef) continue;
        const near = Math.abs(other.slot.col - chef.slot.col) <= 1 && Math.abs(other.slot.row - chef.slot.row) <= 1;
        if (!near) continue;
        if (other.stats.buff) lead = Math.max(lead, other.stats.buff.attackSpeed);
        if (other.stats.cheer) cheer = Math.max(cheer, other.stats.cheer.attackSpeed);
      }
      const gear = this.gear.speed + (this.gear.lineSpeed[chef.stats.method] ?? 0); // 🔪 칼
      chef.attackSpeed = 1 + lead + cheer + gear;
    }
    this.railSlow = Math.max(0, ...this.chefs.map((c) => c.stats.railSlow ?? 0));
    this.updateSets();
  }

  // 칼질 속도가 바뀌면 정보 줄을 다시 그린다
  updateSets() {
    if (this.selectedChef) this.updateCard();
  }

  // ───────── 누르기와 끌기 ─────────
  // 요리사를 짧게 누르면 선택, 끌어서 놓으면 이동 / 자리 바꾸기 / 합성

  slotAt(x, y) {
    return this.slots.find((s) => Math.abs(x - s.x) <= TILE / 2 && Math.abs(y - s.y) <= TILE / 2);
  }

  onPointerDown(pointer) {
    if (this.isOver || this.paused || this.recipePanel.isOpen || this.upgradePanel.isOpen) return;
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
    } else if (pointer.worldY < this.layout.info.y) {
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
      this.selectChef(drag.chef); // 그냥 누른 것: 선택 + 칼질 돕기
      this.helpChop(drag.chef);
      this.countPotTap(drag.chef);
      return;
    }

    const chef = drag.chef;
    const target = this.slotAt(pointer.worldX, pointer.worldY);
    if (!target || target === chef.slot || target.reserved) {
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

  // 🔪 톡 눌러 칼질 돕기: 손 힘을 하나 쓰고 칼질을 한 번 대신 해 준다
  helpChop(chef) {
    if (this.hand < 1) {
      this.floatText(chef.x, chef.y - 60, '손이 아파요 💦 잠깐 쉬어요', '#9fd8ff', 20);
      return;
    }
    if (!chef.helpChop()) return;
    this.hand -= 1;
    this.quest('chop');
    this.tutorialEvent('chop');
    sfx.chop();
    burst(this, this.effectLayer, chef.x + 20, chef.y, [0xfff8ec, 0xffd54f], 3, 0.5);
  }

  // 요리를 칸에 놓는다 (부드럽게 미끄러지며 이동)
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
    const rnd = this.rng.merge;
    const surprise = tier === 4 && rnd() < HEAD_CHEF_CHANCE;
    let data = surprise ? chefById('head_chef') : nextInLine(target.stats);
    // 🔀 비법 소스 카드: 가끔 한 단계 더 (전설까지)
    this.removeChef(dragged);
    this.removeChef(target);

    this.addChef(data, slot);
    this.quest('merge');
    this.tutorialEvent('merge');
    if (data.tier === 4) this.quest('legend');
    if (data.tier === 3) this.quest('hero');
    ring(this, this.effectLayer, slot.x, slot.y, 0xfff8ec, 70);
    revealEffect(this, this.effectLayer, slot.x, slot.y, data.tier, TIERS[data.tier].color);
    vibrate(30);
    sfx.merge(data.tier);

    const color = colorToHex(TIERS[data.tier].color);
    this.floatText(slot.x, slot.y - 50, data.name, color, 24);
    this.log(`[합성] ${TIERS[data.tier].name} ${data.emoji} ${data.name} 완성!`, color);
    if (this.firstRun && data.tier === 3 && !this.firstHero) {
      // 🌱 첫 영웅: 크게 축하
      this.firstHero = true;
      confetti(this, GAME_WIDTH, this.screenHeight);
      flash(this, 0xffd54f);
      this.showBanner(`🎉 영웅 요리 탄생!\n${data.emoji} ${data.name}`, color, 48);
    } else if (this.firstRun && data.tier === 2 && this.summonCount <= 4) this.showBanner(`✨ 희귀! ${data.emoji} ${data.name}`, color, 44);
    else if (surprise) this.showBanner(`🛎️ 깜짝 등장!\n${data.name}`, color, 44);
    else if (data.tier >= 3) this.showBanner(`🔀 ${TIERS[data.tier].name}! ${data.emoji} ${data.name}`, color, 44);
    this.updateHud();
  }

  // 지금 합칠 수 있는 쌍의 수 (자동 합치기 버튼에 표시)
  countMergePairs() {
    const counts = {};
    for (const chef of this.chefs) {
      if (chef.stats.tier <= MAX_MERGE_TIER && !chef.stats.hidden && !chef.stats.special) counts[chef.stats.id] = (counts[chef.stats.id] ?? 0) + 1;
    }
    return Object.values(counts).reduce((sum, n) => sum + Math.floor(n / 2), 0);
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
      const rank = (c) => c.slot.row * 10 + c.slot.col;
      const [from, to] = rank(a) < rank(b) ? [b, a] : [a, b];
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
    this.log(`[판매] ${chef.stats.emoji} ${chef.stats.name} → 💰 +${price}`, COLORS.gold);
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
    chef.setUpgrade(this.lineUpgrades[data.method] ?? 0);
    chef.setRecipeDot(this.isRecipeIngredient(data.id)); // 📖 신화 재료
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

  // 정보 줄: 고른 유닛의 정보 (없으면 마지막 알림)
  updateCard() {
    const chef = this.selectedChef;
    const info = this.info;
    const showing = Boolean(chef);
    this.logText.setVisible(!showing);
    for (const part of [info.emoji, info.title, info.detail]) part.setVisible(showing);
    this.sellButton.setVisible(showing && this.features.sell); // 💰 W21부터
    this.swapButton.setVisible(showing && this.features.swap); // 🔀 W31부터
    if (!chef) {
      if (this.lastLog) this.logText.setText(this.lastLog.message).setColor(this.lastLog.color);
      this.fitLog();
      return;
    }

    const s = chef.stats;
    const method = METHODS[s.method];
    info.emoji.setText(s.emoji);
    const rank = rankOf(s);
    const line = LINES.includes(s.method) ? ` ${method.emoji}` : '';
    info.title.setText(`${rank.name} ${s.name}${line}`);
    info.title.setColor(colorToHex(rank.color === 0xb8b8b8 ? 0xfff8ec : rank.color));

    // 짧게: 요리 양 · 던지는 시간 · 좋아하는 손님 · 능력
    const parts = [];
    if (s.method === 'buff') {
      parts.push(`옆 칼질 +${Math.round(s.buff.attackSpeed * 100)}%`);
    } else {
      parts.push(`양 ${Math.round(s.damage * this.powerMultiplier(s))}`);
      parts.push(`${(s.interval / chef.attackSpeed).toFixed(1)}초`);
      if (s.method === 'all') parts.push('모두 좋아함');
      else {
        const fans = Object.entries(MONSTERS)
          .filter(([key, m]) => !m.boss && m.likes === s.method && !['gg', 'tiger', 'pumpkin'].includes(key))
          .map(([, m]) => m);
        if (fans.length > 0) parts.push(`좋아함 ${fans.slice(0, 3).map((m) => m.emoji).join('')}`);
      }
    }
    if (s.ability) parts.push(s.ability);
    info.detail.setText(parts.join(' · '));
    // 판매·바꾸기 버튼과 겹치지 않게 너무 길면 줄인다 (버튼이 안 열렸으면 넓게 쓴다)
    const buttons = [this.sellButton, this.swapButton].filter((b) => b.visible);
    const right = buttons.length ? Math.min(...buttons.map((b) => b.x - b.width / 2)) - 12 : GAME_WIDTH - 32;
    const maxWidth = right - 96;
    const fit = (text, size, min) => {
      text.setFontSize(size);
      if (text.width > maxWidth) text.setFontSize(Math.max(min, Math.floor((size * maxWidth) / text.width)));
    };
    fit(info.title, 28, 20);
    fit(info.detail, 22, 17);
    this.updateHud();
  }

  // ───────── 게임 끝 ─────────

  // reason: 'clear'(클리어) / 'rail'(주문이 너무 쌓임) / 'boss'(VIP 손님 인내심 초과)
  endGame(reason) {
    const cleared = reason === 'clear';
    this.endReason = reason;
    this.isOver = true;
    this.setPaused(false);
    if (this.tutorial) {
      this.tutorial.box?.destroy();
      this.tutorial.finger?.destroy();
      this.tutorial = null;
    }
    this.recipePanel.close();
    this.upgradePanel.close();
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
      clear: '모든 손님이 배불러요!',
      rail: `${this.wave}웨이브에서 배고픈 손님이 ${this.railLimit}명 쌓였어요`,
      boss: `${this.boss ? this.boss.type.name : '보스 손님'}이(가) 배고파서 화를 냈어요`,
    };
    const headline = this.run.kind === 'journey' ? `🏁 웨이브 ${this.wave}까지 왔어요!` : cleared ? '🎉 영업 성공!' : '😵 식당이 망했어요...';
    text(centerY - 360, headline, this.run.kind === 'journey' ? 46 : 58, COLORS.text, true);
    // 🥚 부엉이 평론가에게 지면 혹평 리뷰가 나온다
    if (reason === 'boss' && this.boss?.typeKey === 'owl') {
      text(centerY - 290, `🦉 "${Phaser.Utils.Array.GetRandom(CRITIC_REVIEWS)}"`, 22, '#ff8a8a').setWordWrapWidth(GAME_WIDTH - 80);
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
    text(centerY - 95, this.starRules(rewards.stars).join('\n'), 24, COLORS.text).setLineSpacing(6);

    let y = centerY + 10;
    const tipRate = this.tipRate();
    const bonus = tipRate !== 1 ? ` · ×${Math.round(tipRate * 100) / 100}` : '';
    text(y, `💰 팁 +${rewards.tips}  (손님 ${this.monstersFed}명 · 별 ${rewards.stars}개${bonus})`, 26, COLORS.gold, true);
    if (rewards.xp > 0) {
      const ups = rewards.levelUps.length > 0 ? `  ⬆️ ${rewards.levelUps.join(' ')}` : '';
      text((y += 40), `📖 줄 경험치 +${rewards.xp}${ups}`, 22, rewards.levelUps.length > 0 ? COLORS.gold : '#d8c8b4', rewards.levelUps.length > 0);
    }
    if (rewards.newBest) text((y += 42), '🏆 새 최고 기록!', 26, COLORS.gold, true);
    for (const message of rewards.unlocked) text((y += 40), `🔓 ${message}`, 22, '#ff8a8a', true);

    // 🏆 랭킹 (오늘의 도전, 무한 모드): 점수를 보여 주고, 클라우드에 올린 뒤 순위를 알려 준다
    if (this.run.board) {
      const result = { grade: 1, wave: this.wave, stars: rewards.stars, orders: this.monstersFed };
      result.score = runScore(result);
      text((y += 46), `🏆 점수 ${result.score % 100000}`, 28, COLORS.gold, true);
      const rankText = text((y += 38), '랭킹에 올리는 중...', 22, '#b9c2cf');
      submitScore(this.run.board, result).then((res) => {
        if (!rankText.active) return; // 그사이 화면을 나갔다
        if (res.status === 'offline') rankText.setText('📴 오프라인이라 랭킹에 올리지 못했어요');
        else if (res.status === 'new') rankText.setText(`🎉 랭킹 ${res.rank}위! (내 최고 기록)`).setColor(COLORS.gold);
        else rankText.setText(`내 최고 ${res.best}점 · ${res.rank}위`);
      });
    }

    // 버튼은 알림 줄 수에 맞춰 그 아래에 놓는다
    const buttonY = Math.max(centerY + 230, y + 100);
    const button = (dy, label, onClick, options) => createButton(this, centerX, buttonY + dy, 380, 96, label, onClick, options).setDepth(depth);
    if (this.daily) {
      const left = triesLeft();
      const retry = button(0, `다시 도전 (남은 ${left}번)`, () => this.restartRun(), { fontSize: 30 });
      if (left <= 0) retry.setLabel('오늘 도전 끝! 내일 또 만나요').setEnabled(false);
      button(110, '처음으로', () => this.scene.start('Title'), { color: 0x7d8594 });
    } else if (this.run.kind === 'journey') {
      button(0, '🗺️ 다시 출발', () => this.scene.start('Journey'), { fontSize: 30, color: 0x3f9a4a });
      button(110, '처음으로', () => this.scene.start('Title'), { color: 0x7d8594 });
    } else {
      button(0, '🔄 다시 하기', () => this.restartRun(), { fontSize: 30 });
      button(110, '처음으로', () => this.scene.start('Title'), { color: 0x7d8594 });
    }
  }

  // 별 받는 조건
  starRules(stars) {
    const mark = (i) => (i < stars ? '✅' : '⬜');
    return [0, 1, 2].map((i) => `${mark(i)} 보스 손님 ${i + 1}명 배부르게`);
  }

  // 같은 판을 처음부터 다시
  restartRun() {
    if (this.daily) return this.scene.start('Title', { startDaily: true }); // 도전 횟수 확인은 첫 화면에서
    if (this.run.kind === 'journey') return this.scene.start('Journey');
    this.scene.restart({ run: this.run });
  }

  // 팁 배율: 판 종류 보너스 × 특별 규칙
  tipRate() {
    const base = this.run.tipAt ? this.run.tipAt(this.wave) : this.run.tipBonus;
    return base * (this.mod.tips ?? 1) * (1 + this.gear.tips);
  }

  // 판 끝 보상: 별과 팁을 계산해서 저장한다
  giveRewards() {
    const save = getSave();
    const stars = Math.min(3, this.bossesDefeated);
    const tips = Math.round((this.monstersFed * TIPS_PER_ORDER + this.bossesDefeated * TIPS_PER_STAR * 2) * this.tipRate());
    const unlocked = [...(this.unlockedThisRun ?? [])];
    let newBest = false;
    if (this.run.kind === 'journey') {
      // 🗺️ 가장 멀리 간 웨이브. 판이 끝났으니 중간 저장은 지운다
      newBest = this.wave > (save.bestWave ?? 0);
      save.bestWave = Math.max(save.bestWave ?? 0, this.wave);
      save.journey = null;
    }
    // 🎉 이벤트 기간에 처음 깨면 보너스 팁
    let bonusTips = 0;
    if (this.run.kind === 'event' && this.endReason === 'clear') {
      save.events ??= {};
      if (!save.events[this.run.event.key]) {
        save.events[this.run.event.key] = true;
        bonusTips = EVENT_BONUS;
        unlocked.push(`${this.run.event.emoji} 이벤트 첫 클리어 보너스 💰+${EVENT_BONUS}`);
      }
    }

    // 📖 덱의 줄마다 경험치 (오늘의 도전은 모두 같은 조건이라 주지 않는다)
    const xp = this.daily ? 0 : runLineXp(this.monstersFed, this.endReason === 'clear');
    const levelUps = [];
    if (xp > 0) {
      save.lineXp ??= {};
      for (const line of this.deck) {
        const before = lineLevelOf(save.lineXp[line] ?? 0).level;
        save.lineXp[line] = (save.lineXp[line] ?? 0) + xp;
        const after = lineLevelOf(save.lineXp[line]).level;
        if (after > before) levelUps.push(`${METHODS[line].emoji}Lv.${after}`);
      }
    }
    save.tips += tips + bonusTips;
    save.runs += 1;
    writeSave();
    return { stars, tips, newBest, unlocked, xp, levelUps };
  }

  // 처음 열린 기능은 그 기능을 처음 쓰는 판에서 한 번 알려 준다
  firstTimeTips() {
    const save = getSave();
    save.seen ??= [];
    const tips = [];
    if (this.run.kind === 'journey' && this.run.startTown === 0 && !save.seen.includes('tutorial')) {
      save.seen.push('tutorial');
      this.startTutorial();
    }
    // 🔓 이미 열려 있던 기능: 신화 조합표만 한 번 알려 주고, 나머지는 조용히 본 것으로
    for (const u of UNLOCKS) {
      if (!this.features[u.id] || save.seen.includes(u.id)) continue;
      if (u.id === 'recipes') tips.push([u.id, `🔓 ${u.tip}`]);
      else save.seen.push(u.id);
    }
    if (this.gimmick && !save.seen.includes('gimmick')) tips.push(['gimmick', '🔥 주방 사고가 나요!\n불, 정전, 빠른 레일을 조심하세요']);
    tips.forEach(([id, message], i) => {
      save.seen.push(id);
      this.time.delayedCall(1500 + i * 2600, () => this.showTip(message));
    });
    if (tips.length > 0) writeSave();
  }

  // ───────── 👆 튜토리얼 (동네 1-1) ─────────
  // 손가락이 버튼이나 요리를 가리키며 하나씩 알려 준다. 해 보면 다음 단계로 넘어간다.

  startTutorial() {
    this.tutorial = { step: -1, box: null, finger: null, count: 0 };
    this.nextTutorialStep();
  }

  // 튜토리얼 단계마다: 안내 글, 손가락 위치, 다음으로 넘어가는 일(event)과 횟수
  tutorialSteps() {
    return [
      { text: '🎲 재료 뽑기를 2번 눌러 보세요!', event: 'summon', times: 2, point: () => this.summonButton },
      { text: '똑같은 재료다! 👆 끌어서 겹쳐 봐요', event: 'merge', times: 1, point: () => this.findPair() ?? this.mergeButton },
      { text: '✨ 희귀 요리! 한 번 더 뽑아 볼까요? (2번)', event: 'summon', times: 2, point: () => this.summonButton },
      { text: '또 똑같은 재료! 겹쳐요', event: 'merge', times: 1, point: () => this.findPair() ?? this.mergeButton },
      { text: '희귀 두 개를 겹치면…?', event: 'merge', times: 1, point: () => this.findPair() ?? this.mergeButton },
      { text: '요리를 톡톡 누르면 칼질을 도와줘요 🔪\n(빨리 던져요!)', event: 'chop', times: 3, point: () => this.chefs.find((c) => c.stats.tier === 3) ?? this.chefs[0] },
      { text: '🎯 목표: 웨이브 10의 보스를 막아라!\n손님이 40명 쌓이면 식당이 망해요', event: null, times: 0, point: () => null },
    ];
  }

  // 판 위에서 합칠 수 있는 요리 하나 (없으면 null)
  findPair() {
    return this.chefs.find((a) => this.chefs.some((b) => this.canMerge(a, b))) ?? null;
  }

  nextTutorialStep() {
    const tut = this.tutorial;
    tut.box?.destroy();
    tut.finger?.destroy();
    tut.step += 1;
    tut.count = 0;
    const step = this.tutorialSteps()[tut.step];
    if (!step) {
      this.tutorial = null;
      return;
    }
    // 안내 상자는 판 맨 아래 레일 줄에 (요리를 가리지 않게)
    tut.box = this.add
      .text(GAME_WIDTH / 2, this.boardY + (BOARD_ROWS - 0.5) * TILE, step.text, {
        fontFamily: FONT,
        fontSize: '25px',
        fontStyle: 'bold',
        color: COLORS.textDark,
        backgroundColor: '#fff8ec',
        align: 'center',
        padding: { x: 20, y: 14 },
        lineSpacing: 8,
      })
      .setOrigin(0.5)
      .setDepth(14);
    tut.finger = this.add.text(0, 0, '👆', { fontFamily: EMOJI_FONT, fontSize: '64px' }).setOrigin(0.3, 0).setDepth(14).setVisible(false);
    this.tweens.add({ targets: tut.finger, scale: 0.85, duration: 380, yoyo: true, repeat: -1 });
    if (!step.event) this.time.delayedCall(4500, () => this.tutorial === tut && this.nextTutorialStep());
  }

  // 매 프레임: 손가락이 가리킬 곳을 따라간다
  updateTutorial() {
    const tut = this.tutorial;
    if (!tut) return;
    const target = this.tutorialSteps()[tut.step]?.point();
    tut.finger.setVisible(Boolean(target?.active));
    if (target?.active) tut.finger.setPosition(target.x, target.y + 10);
  }

  // 게임에서 일이 일어났을 때 (뽑기, 합치기, 칼질 돕기)
  tutorialEvent(event) {
    const tut = this.tutorial;
    if (!tut) return;
    const step = this.tutorialSteps()[tut.step];
    if (step?.event !== event) return;
    tut.count += 1;
    if (tut.count >= step.times) this.nextTutorialStep();
  }

  // 판 가운데 위쪽에 잠깐 나오는 큰 안내 상자
  showTip(message, duration = 3200) {
    const tip = this.add
      .text(GAME_WIDTH / 2, this.boardY + 230, message, {
        fontFamily: FONT,
        fontSize: '26px',
        fontStyle: 'bold',
        color: COLORS.textDark,
        backgroundColor: '#fff8ec',
        align: 'center',
        padding: { x: 22, y: 16 },
        lineSpacing: 8,
      })
      .setOrigin(0.5)
      .setDepth(14);
    tip.setScale(0.6);
    this.tweens.add({ targets: tip, scale: 1, duration: 200, ease: 'Back.Out' });
    this.tweens.add({ targets: tip, alpha: 0, delay: duration, duration: 400, onComplete: () => tip.destroy() });
    return tip;
  }

  // ───────── 화면 그리기 ─────────

  // 그리는 순서(아래 → 위): 판 → 사거리 표시 → 유닛 → 주문 → 투사체 → 효과
  createLayers() {
    this.rangeCircle = this.add.graphics();
    this.mergeHints = this.add.graphics();
    this.chefLayer = this.add.layer();
    this.selectRing = this.add.graphics(); // 고른 유닛 발밑의 금색 고리
    this.monsterLayer = this.add.layer();
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
    const labels = { daily: '🏆 도전', journey: '🗺️ 여정', event: `${this.run.event?.emoji} 이벤트` };
    this.hudLabel = this.add.text(38, cy - hud.h * 0.22, labels[this.run.kind], { fontFamily: FONT, fontSize: '22px', color: '#9aa4b2' }).setOrigin(0, 0.5);
    this.hudWave = this.add
      .text(38, cy + hud.h * 0.14, '', { fontFamily: FONT, fontSize: `${Math.round(hud.h * 0.38)}px`, fontStyle: 'bold', color: COLORS.text })
      .setOrigin(0, 0.5);
    this.hudWaveTotal = this.add
      .text(0, cy + hud.h * 0.2, Number.isFinite(this.run.totalWaves) ? `/${this.run.totalWaves}` : '', { fontFamily: FONT, fontSize: '22px', color: '#9aa4b2' })
      .setOrigin(0, 0.5);

    // 남은 시간: 동그라미가 줄어든다. VIP 손님이 오면 빨간 "인내심"
    this.timerX = 184;
    this.timerY = cy;
    this.timerRadius = Math.round(hud.h * 0.34);
    this.timerRing = this.add.graphics();
    this.hudTime = this.add
      .text(this.timerX, cy, '', { fontFamily: FONT, fontSize: `${Math.round(hud.h * 0.3)}px`, fontStyle: 'bold', color: COLORS.text })
      .setOrigin(0.5);

    // 골드
    this.add.text(254, cy, '💰', { fontFamily: EMOJI_FONT, fontSize: `${Math.round(hud.h * 0.34)}px` }).setOrigin(0.5);
    this.hudGold = this.add
      .text(280, cy + 2, '', { fontFamily: FONT, fontSize: `${Math.round(hud.h * 0.36)}px`, fontStyle: 'bold', color: COLORS.gold })
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

    // 배속 버튼 (일시 정지 왼쪽): 누를 때마다 1 → 2 → 3배속
    const speedBox = this.add.graphics();
    speedBox.fillStyle(0x3f9a4a, 1);
    speedBox.fillRoundedRect(-size / 2, -size / 2, size, size, 14);
    speedBox.lineStyle(5, COLORS.outline, 1);
    speedBox.strokeRoundedRect(-size / 2, -size / 2, size, size, 14);
    this.speedLabel = this.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: `${Math.round(size * 0.3)}px`, fontStyle: 'bold', color: COLORS.text, align: 'center' })
      .setOrigin(0.5);
    const speedButton = this.add
      .container(px - size - 12, cy, [speedBox, this.speedLabel])
      .setSize(size, size)
      .setInteractive({ useHandCursor: true });
    speedButton.on('pointerdown', () => speedButton.setScale(0.92));
    speedButton.on('pointerout', () => speedButton.setScale(1));
    speedButton.on('pointerup', () => {
      speedButton.setScale(1);
      sfx.click();
      this.toggleSpeed();
    });

    // 📖 신화 조합표 버튼 (배속 왼쪽): 만들 수 있는 신화가 있으면 반짝이고 숫자 배지
    const bookBox = this.add.graphics();
    bookBox.fillStyle(0xc0392b, 1);
    bookBox.fillRoundedRect(-size / 2, -size / 2, size, size, 14);
    bookBox.lineStyle(5, COLORS.outline, 1);
    bookBox.strokeRoundedRect(-size / 2, -size / 2, size, size, 14);
    const bookIcon = this.add.text(0, 0, '📖', { fontFamily: EMOJI_FONT, fontSize: `${Math.round(size * 0.5)}px` }).setOrigin(0.5);
    this.bookBadge = this.add.circle(size / 2 - 4, -size / 2 + 4, 15, 0xffd54f).setStrokeStyle(3, COLORS.outline).setVisible(false);
    this.bookBadgeText = this.add
      .text(size / 2 - 4, -size / 2 + 4, '', { fontFamily: FONT, fontSize: '20px', fontStyle: 'bold', color: '#14171c' })
      .setOrigin(0.5)
      .setVisible(false);
    this.bookButton = this.add
      .container(px - (size + 10) * 2, cy, [bookBox, bookIcon, this.bookBadge, this.bookBadgeText])
      .setSize(size, size)
      .setInteractive({ useHandCursor: true });
    this.bookButton.on('pointerup', () => {
      if (this.isOver || this.crafting) return;
      if (this.recipePanel.isOpen) this.recipePanel.close();
      else this.recipePanel.open();
    });
    this.goldMaxWidth = this.bookButton.x - size / 2 - 10 - this.hudGold.x; // 골드 숫자가 📖 버튼을 덮지 않게
    this.bookBlink = this.tweens.add({ targets: this.bookButton, scale: 1.12, duration: 380, yoyo: true, repeat: -1, paused: true });

    // 레일 게이지: 레일 위 주문이 한도에 가까울수록 초록 → 노랑 → 빨강
    const gg = this.add.graphics();
    gg.fillStyle(COLORS.outline, 1);
    gg.fillRoundedRect(12, gauge.y, GAME_WIDTH - 24, gauge.h, 14);
    this.gaugeFill = this.add.graphics();
    this.gaugeText = this.add
      .text(30, gauge.y + gauge.h / 2, '', {
        fontFamily: FONT,
        fontSize: `${Math.round(gauge.h * 0.52)}px`,
        fontStyle: 'bold',
        color: COLORS.text,
        stroke: '#14171c',
        strokeThickness: 4,
      })
      .setOrigin(0, 0.5);
    // 🎯 판 안 미션 (게이지 오른쪽)
    this.missionText = this.add
      .text(GAME_WIDTH - 30, gauge.y + gauge.h / 2, '', {
        fontFamily: FONT,
        fontSize: `${Math.round(gauge.h * 0.46)}px`,
        fontStyle: 'bold',
        color: COLORS.gold,
        stroke: '#14171c',
        strokeThickness: 4,
      })
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true });
    this.missionText.on('pointerup', () => this.mission && this.log(`🎯 미션: ${this.mission.def.text} → ${rewardText(this.mission.def.reward, this.wave)}`, COLORS.gold));
    this.hudCache = {};
  }

  updateHud() {
    const cache = this.hudCache;
    this.hudWave.setText(`${this.wave}`);
    this.hudWaveTotal.setX(this.hudWave.x + this.hudWave.width + 4);
    if (this.hudGold.text !== `${this.gold}`) {
      this.hudGold.setText(`${this.gold}`).setScale(1);
      if (this.hudGold.width > this.goldMaxWidth) this.hudGold.setScale(this.goldMaxWidth / this.hudGold.width);
    }

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
    const count = this.monsters.length;
    if (cache.monsters !== count) {
      cache.monsters = count;
      const { gauge } = this.layout;
      const fill = Math.min(1, count / this.railLimit);
      const color = fill >= 0.75 ? 0xe8564a : fill >= 0.5 ? 0xffd54f : 0x6dc04a;
      this.gaugeFill.clear();
      if (count > 0) {
        this.gaugeFill.fillStyle(color, 1);
        this.gaugeFill.fillRoundedRect(18, gauge.y + 6, Math.max(20, (GAME_WIDTH - 36) * fill), gauge.h - 12, 10);
      }
      this.gaugeText.setText(`🍽️ 손님 ${count}/${this.railLimit}`);
    }

    // 명령 버튼
    const cost = this.currentSummonCost();
    const full = this.emptySlots().length === 0;
    this.summonButton.setSub(full ? '자리 없음' : `${cost}골드`);
    const pairs = this.countMergePairs();
    this.mergeButton.setSub(pairs > 0 ? `${pairs}쌍` : '');
    this.mergeButton.setLit(pairs > 0);
    const costs = this.deck.filter((l) => this.lineUpgrades[l] < LINE_UPGRADE_MAX).map((l) => this.upgradeCostOf(l));
    const cheapest = costs.length ? Math.min(...costs) : null;
    if (!this.features.upgrade) this.upgradeButton.setSub(`🔒 W${UNLOCKS.find((u) => u.id === 'upgrade').wave}`);
    else this.upgradeButton.setSub(cheapest === null ? 'MAX' : `${cheapest}골드부터`);
    this.summonButton.setEnabled(!this.isOver && !full && this.gold >= cost);

    if (this.selectedChef) {
      const chef = this.selectedChef;
      if (!this.canSell(chef)) this.sellButton.setLabel('판매 불가').setEnabled(false);
      else this.sellButton.setLabel(`💰 +${this.sellPriceOf(chef)}`).setEnabled(!this.isOver);
      const cost = swapCost(this.swapCount);
      if (!this.canSwap(chef)) this.swapButton.setLabel('🔀 불가').setEnabled(false);
      else this.swapButton.setLabel(`🔀 ${cost}`).setEnabled(!this.isOver && this.gold >= cost);
    }

    if (this.recipePanel.isOpen) this.recipePanel.refresh();
    if (this.upgradePanel.isOpen) this.upgradePanel.refresh();

    // 📖 만들 수 있는 신화가 생기면 버튼이 반짝이고 숫자 배지가 붙는다
    const ready = this.isOver || this.crafting ? 0 : this.craftableCount();
    if (ready !== this.bookReady) {
      if (ready > (this.bookReady ?? 0)) this.log('📖 신화를 만들 수 있어요! 오른쪽 위 📖를 눌러 보세요', COLORS.gold);
      this.bookReady = ready;
      this.bookBadge.setVisible(ready > 0);
      this.bookBadgeText.setText(`${ready}`).setVisible(ready > 0);
      this.bookBlink.paused = ready === 0;
      if (ready === 0) this.bookButton.setScale(1);
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
          g.fillStyle(this.railColors.rail, 1);
          g.fillRect(x, y, TILE, TILE);
          g.fillStyle(this.railColors.stripe, 1);
          g.fillRect(x + 6, y + 6, TILE - 12, TILE - 12);
          // 컨베이어 마디: 주문이 가는 방향과 수직으로 놓인 줄무늬
          g.fillStyle(this.railColors.slat, 1);
          const horizontal = row === 0 || row === BOARD_ROWS - 1;
          for (let k = 0; k < 4; k++) {
            if (horizontal) g.fillRect(x + 10 + k * 26, y + 10, 8, TILE - 20);
            else g.fillRect(x + 10, y + 10 + k * 26, TILE - 20, 8);
          }
          this.drawArrow(g, x + TILE / 2, y + TILE / 2, this.railDirection(col, row));
        }
      }
    }
    // 판 테두리
    g.lineStyle(8, COLORS.outline, 1);
    g.strokeRoundedRect(BOARD_X - 4, this.boardY - 4, BOARD_COLS * TILE + 8, BOARD_ROWS * TILE + 8, 10);

    // 빈 소환진: 점선 타원
    this.floorTiles = this.add.graphics(); // 판 안쪽 바닥 (여정에서 동네가 바뀌면 다시 칠한다)
    this.drawFloor(this.run.floor);
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

  // 판 안쪽 바닥 체크무늬 (🎨 꾸민 바닥이 있으면 그 색)
  drawFloor(colors) {
    const floor = worn('floor')?.colors ?? colors;
    const g = this.floorTiles;
    g.clear();
    for (let row = 1; row < BOARD_ROWS - 1; row++) {
      for (let col = 1; col < BOARD_COLS - 1; col++) {
        g.fillStyle(floor[(col + row) % 2 === 0 ? 0 : 1], 1);
        g.fillRect(BOARD_X + col * TILE, this.boardY + row * TILE, TILE, TILE);
      }
    }
  }

  // ───────── 🗺️ 여정 ─────────

  // 웨이브가 새 동네에 들어서면: 바닥, 이름, 동네 별 집계를 바꾸고, 그 동네 입구에서 중간 저장
  enterTown(wave) {
    const town = townOfWave(wave);
    if (town === this.town) return;
    const first = this.town === -1;
    this.town = town;
    this.townPeak = 0;
    const t = TOWNS[town];
    this.drawFloor(t.floor);
    this.hudLabel?.setText(`${t.emoji} 동네 ${town + 1}`);
    if (!first) {
      this.showBanner(`${t.emoji} ${t.name} 도착!`, COLORS.gold, 46);
      sfx.star(2);
    }
    if (wave > 1 && !this.resumed) this.saveJourney();
    this.resumed = false;
  }

  // 동네 보스를 이기면: 동네 별, 다음 동네 열기, 새 레시피 줄, 보너스 골드
  townCleared() {
    const save = getSave();
    const town = this.town;
    const peak = this.townPeak / this.railLimit;
    const stars = peak < STAR_LINES.three ? 3 : peak < STAR_LINES.two ? 2 : 1;
    save.townStars ??= {};
    const before = townsOpen();
    if (stars > (save.townStars[town] ?? 0)) save.townStars[town] = stars;
    save.bossBeaten = Math.max(save.bossBeaten ?? 0, this.wave);
    save.bestWave = Math.max(save.bestWave ?? 0, this.wave);
    const bonus = 100 + town * 60;
    this.gold += bonus;
    this.floatText(GAME_WIDTH / 2, this.boardY + 300, `🎁 보너스 골드 +${bonus}`, COLORS.gold, 30);
    this.log(`${TOWNS[town].emoji} 동네 ${town + 1} 클리어! ${'⭐'.repeat(stars)} · 골드 +${bonus}`, COLORS.gold);
    this.unlockedThisRun ??= [];
    const after = townsOpen();
    if (after > before) {
      const next = TOWNS[after - 1];
      this.unlockedThisRun.push(`새 동네: ${next.emoji} ${next.name} (다음 판부터 여기서 출발 가능)`);
      if (after === FEATURE_TOWN.daily) this.unlockedThisRun.push('🏆 오늘의 도전, 📋 주문서, 랭킹');
      if (next.newLine && !save.lines.includes(next.newLine)) {
        // 새 레시피 줄: 지금 줄들 중 가장 낮은 경험치의 80%를 갖고 시작한다
        const lowest = Math.min(...save.lines.map((l) => save.lineXp?.[l] ?? 0));
        save.lines.push(next.newLine);
        save.lineXp ??= {};
        save.lineXp[next.newLine] = Math.round(lowest * 0.8);
        this.unlockedThisRun.push(`새 레시피 줄: ${METHODS[next.newLine].emoji} ${METHODS[next.newLine].name} (덱에 넣어 보세요)`);
        this.showBanner(`📖 새 레시피 줄!\n${METHODS[next.newLine].emoji} ${METHODS[next.newLine].name}`, COLORS.gold, 40);
      }
    }
    writeSave();
  }

  // 중간 저장: 판 위 요리, 골드, 강화, 카드 (동네 입구마다)
  saveJourney() {
    const save = getSave();
    save.journey = {
      wave: this.wave,
      startTown: this.run.startTown,
      deck: this.deck,
      gold: this.gold,
      summonCount: this.summonCount,
      swapCount: this.swapCount,
      lineUpgrades: { ...this.lineUpgrades },
      freeSummons: this.freeSummons,
      chefs: this.chefs.map((c) => ({ id: c.stats.id, col: c.slot.col, row: c.slot.row })),
      fed: this.monstersFed,
      bosses: this.bossesDefeated,
    };
    writeSave();
  }

  // 이어 하기: 저장해 둔 판 상태로 되돌린다
  restoreJourney(snap) {
    this.resumed = true;
    this.gold = snap.gold;
    this.summonCount = snap.summonCount;
    this.swapCount = snap.swapCount;
    Object.assign(this.lineUpgrades, snap.lineUpgrades);
    this.monstersFed = snap.fed;
    this.bossesDefeated = snap.bosses;
    this.freeSummons = snap.freeSummons ?? 0;
    for (const { id, col, row } of snap.chefs) {
      const slot = this.slots.find((s) => s.col === col && s.row === row);
      const data = chefById(id);
      if (slot && data && !slot.chef) this.addChef(data, slot);
    }
    this.features = this.run.featuresAt(snap.wave);
    this.updateBuffs();
    this.showBanner(`▶ 이어 하기\n웨이브 ${snap.wave}`, COLORS.gold, 44);
  }

  // 중간 동네에서 출발: 골드와 희귀·영웅 요리를 받고 시작한다
  giveStartKit() {
    const kit = startKit(this.run.startTown);
    this.gold += kit.gold;
    const place = (tier, count) => {
      for (let i = 0; i < count; i++) {
        const empty = this.emptySlots();
        if (empty.length === 0) return;
        this.addChef(pick(chefsOfTier(tier, this.deck)), pick(empty));
      }
    };
    place(2, kit.rare);
    place(3, kit.hero);
    this.log(`🎒 출발 꾸러미: 골드 +${kit.gold}, 희귀 ${kit.rare}개, 영웅 ${kit.hero}개`, COLORS.gold);
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

  // ───────── 아래: 정보 줄과 큰 명령 버튼 ─────────

  createControls() {
    const { info, panel } = this.layout;

    // 정보 줄: 평소에는 알림(뽑기, 합성 결과), 유닛을 누르면 그 유닛의 정보와 판매 버튼
    const infoBox = this.add.graphics();
    infoBox.fillStyle(COLORS.outline, 0.9);
    infoBox.fillRoundedRect(12, info.y, GAME_WIDTH - 24, info.h, 14);
    const cy = info.y + info.h / 2;
    // 폰에서는 화면이 절반쯤으로 줄어 보이므로 글씨를 크게 (28px → 폰에서 약 15px)
    this.logText = this.add
      .text(32, cy, '', { fontFamily: FONT, fontSize: '28px', color: COLORS.text, wordWrap: { width: GAME_WIDTH - 64 }, lineSpacing: 2 })
      .setOrigin(0, 0.5);
    this.info = {
      emoji: this.add.text(54, cy, '', { fontFamily: EMOJI_FONT, fontSize: `${Math.round(info.h * 0.62)}px` }).setOrigin(0.5),
      title: this.add
        .text(96, cy - info.h * 0.22, '', { fontFamily: FONT, fontSize: '28px', fontStyle: 'bold', color: COLORS.text })
        .setOrigin(0, 0.5),
      detail: this.add
        .text(96, cy + info.h * 0.2, '', { fontFamily: FONT, fontSize: '22px', color: '#d6dde8' })
        .setOrigin(0, 0.5),
    };
    this.sellButton = createButton(this, GAME_WIDTH - 24 - 60, cy, 120, info.h - 16, '', () => this.sellSelected(), {
      fontSize: 24,
      color: 0xc99a2e,
    });
    this.swapButton = createButton(this, GAME_WIDTH - 24 - 120 - 8 - 55, cy, 110, info.h - 16, '', () => this.swapSelected(), {
      fontSize: 24,
      color: 0x8e4fc0,
    });
    this.log('💬 같은 요리를 겹치면 합치기, 톡 누르면 칼질 돕기!', '#b9a48f');

    // 큰 명령 버튼 3개: 뽑기(크게) / 자동 합치기 / 강화
    const gap = 12;
    const height = Math.min(150, panel.h);
    const top = panel.y + (panel.h - height) / 2;
    const left = 12;
    const total = GAME_WIDTH - 24 - gap * 2;
    const summonWidth = Math.round(total * 0.42);
    const mergeWidth = (total - summonWidth) / 2;
    const cyButtons = top + height / 2;
    this.summonButton = createCommandButton(
      this,
      left + summonWidth / 2,
      cyButtons,
      summonWidth,
      height,
      { emoji: '🎲', label: '재료 뽑기', color: 0xe85d3a },
      () => this.summon(),
    );
    this.mergeButton = createCommandButton(
      this,
      left + summonWidth + gap + mergeWidth / 2,
      cyButtons,
      mergeWidth,
      height,
      { emoji: '🔄', label: '자동 합치기', color: 0xc77d2e },
      () => this.autoMerge(),
    );
    this.upgradeButton = createCommandButton(
      this,
      left + summonWidth + gap * 2 + mergeWidth * 1.5,
      cyButtons,
      mergeWidth,
      height,
      { emoji: '⬆️', label: '종류별 강화', color: 0x3f7fd0 },
      () => this.upgradePanel.open(),
    );
    this.updateSpeedButton();

    this.createPauseMenu();
    this.selectChef(null);
  }

  // 알림 글씨가 정보 줄(두 줄까지)에 들어가게: 넘치면 조금씩 줄인다
  fitLog() {
    const maxHeight = this.layout.info.h - 8;
    for (let size = 28; size >= 20; size -= 2) {
      this.logText.setFontSize(size);
      if (this.logText.height <= maxHeight) return;
    }
  }

  // 알림 바꾸기 (유닛을 고르고 있는 동안에는 기억만 해 두었다가, 선택을 풀면 보여 준다)
  log(message, color = COLORS.text) {
    this.lastLog = { message, color };
    if (!this.logText || this.selectedChef) return;
    this.logText.setText(message).setColor(color);
    this.fitLog();
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
    box.fillRoundedRect(centerX - 260, centerY - 390, 520, 780, 24);
    box.lineStyle(6, COLORS.outline, 1);
    box.strokeRoundedRect(centerX - 260, centerY - 390, 520, 780, 24);
    const title = this.add
      .text(centerX, centerY - 310, '⏸ 일시 정지', { fontFamily: FONT, fontSize: '48px', fontStyle: 'bold', color: COLORS.text })
      .setOrigin(0.5);

    const resume = createButton(this, centerX, centerY - 190, 400, 100, '▶ 계속하기', () => this.setPaused(false), {
      color: 0x3f9a4a,
    });
    // 📖 신화 조합표 (게임은 다시 진행되면서 창이 열린다)
    const recipes = createButton(this, centerX, centerY - 70, 400, 100, '📖 신화 조합표', () => {
      this.setPaused(false);
      this.recipePanel.open();
    }, { color: 0x8e4fc0 });
    const restart = createButton(this, centerX, centerY + 50, 400, 100, '🔄 다시 하기', () =>
      this.restartRun(),
    );
    const home = createButton(this, centerX, centerY + 170, 400, 100, '🏠 처음으로', () => this.scene.start('Title'), {
      color: 0x7d8594,
    });

    // 소리 한 번에 켜고 끄기 (효과음 + 음악)
    const soundLabel = () => (isOn('sfx') || isOn('music') ? '🔊 소리 켬' : '🔇 소리 끔');
    const sound = this.add
      .text(centerX, centerY + 300, soundLabel(), {
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

    this.pauseMenu = this.add.container(0, 0, [shade, box, title, resume, recipes, restart, home, sound]).setDepth(30).setVisible(false);
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
    this.speedLabel.setText(`⏩\n${this.gameSpeed}x`);
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
function pickWeighted(weights, rnd = Math.random) {
  const entries = Object.entries(weights);
  const total = entries.reduce((sum, [, w]) => sum + w, 0);
  let r = rnd() * total;
  for (const [key, w] of entries) {
    r -= w;
    if (r < 0) return key;
  }
  return entries[entries.length - 1][0];
}

// 목록에서 하나를 무작위로 고른다 (rnd: 무작위 값을 주는 함수)
function pick(list, rnd = Math.random) {
  return list[Math.floor(rnd() * list.length)];
}

// 0xff8800 같은 숫자 색을 '#ff8800' 글자 색으로 바꾼다
function colorToHex(color) {
  return `#${color.toString(16).padStart(6, '0')}`;
}
