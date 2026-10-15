import Phaser from 'phaser';
import { MONSTERS } from '../data/monsters.js';
import { BASE_SPEED, monsterHp, monsterReward } from '../data/balance.js';
import { METHODS, STARTER_LINES } from '../data/chefs.js';
import { EMOJI_FONT } from '../config.js';

const BAR_HEIGHT = 8;

const SLOW_TINT = 0x9fd8ff; // 감속 중일 때 파란빛
const DOT_TINT = 0xffb37a; // 뜨거운 국물(지속)을 먹는 중일 때 주황빛
const GOLDEN_TINT = 0xffd54f; // 🥚 황금 손님

// 레일 위를 도는 배고픈 몬스터 손님 하나 (보스 손님도 이 클래스를 쓴다).
// 몬스터 이모지, 배부름 막대(요리를 먹을수록 차오른다), 좋아하는 요리 말풍선으로 이루어져 있다.
export default class Monster extends Phaser.GameObjects.Container {
  // options.golden: 🥚 황금 손님 (빠르고, 한 바퀴만 돌고 사라지며, 배를 채우면 골드를 많이 준다)
  // options.lines: 이번 판의 덱 (까다로운 손님이 좋아할 요리를 여기서 고른다)
  constructor(scene, rail, typeKey, wave, startDistance = 0, options = {}) {
    super(scene, 0, 0);

    this.rail = rail;
    this.typeKey = typeKey;
    this.type = MONSTERS[typeKey];
    this.isBoss = Boolean(this.type.boss);
    this.lines = options.lines ?? STARTER_LINES;
    this.maxHp = this.isBoss ? this.type.hp : monsterHp(this.type.hp, wave); // 보스는 고정
    this.hp = this.maxHp;
    this.reward = this.isBoss ? this.type.reward : monsterReward(this.type.reward, wave);
    this.distance = 0; // 레일 출발점에서 얼마나 왔는지 (클수록 앞서 있음)
    this.dead = false;

    this.golden = Boolean(options.golden);
    if (this.golden) {
      this.maxHp = Math.round(this.maxHp * 0.6);
      this.hp = this.maxHp;
      this.reward = 100;
      this.startDistance = startDistance; // 여기서 한 바퀴를 돌면 사라진다
    }

    // 좋아하는 요리 줄. 까다로운 손님은 나올 때마다 덱 안에서 무작위로 정해진다
    this.likes = this.type.likes === 'random' ? Phaser.Utils.Array.GetRandom(this.lines) : this.type.likes;
    if (this.type.likesCycle) this.likes = this.lines[0];

    // 상태 효과
    this.slow = null; // { factor, timeLeft }
    this.dot = null; // { dps, timeLeft }
    this.haste = null; // { factor, timeLeft } 돼지 부자의 "빨리빨리!"

    const size = this.type.size ?? 56;
    this.size = size;
    this.barWidth = this.isBoss ? 120 : 64;
    const barY = size * 0.66;

    // 발밑 그림자, 보스는 빨간 테두리 방석
    const base = this.isBoss
      ? scene.add.circle(0, 0, size * 0.62, 0x3d2a1e, 0.85).setStrokeStyle(5, 0xff5a5a)
      : scene.add.ellipse(0, size * 0.36, size * 0.9, size * 0.28, 0x000000, 0.28);
    this.icon = scene.add
      .text(0, this.isBoss ? 0 : -size * 0.04, this.type.emoji, { fontFamily: EMOJI_FONT, fontSize: `${Math.round(size * 0.86)}px` })
      .setOrigin(0.5);

    // 배부름 막대: 요리를 먹을수록 오른쪽으로 차오른다 (꽉 차면 팁을 남기고 떠난다)
    const h = BAR_HEIGHT + (this.isBoss ? 4 : 0);
    this.barBack = scene.add.rectangle(0, barY, this.barWidth + 4, h + 4, 0x14171c, 0.75);
    this.barFill = scene.add
      .rectangle(-this.barWidth / 2, barY, 0, h, this.isBoss ? 0xff8a3c : 0xffc94a)
      .setOrigin(0, 0.5);
    this.add([base, this.icon, this.barBack, this.barFill]);

    // 좋아하는 요리 말풍선 (머리 위 오른쪽)
    if (this.likes) {
      const bx = size * 0.42;
      const by = -size * 0.62;
      const r = this.isBoss ? 24 : 18;
      this.bubble = scene.add.circle(bx, by, r, 0xfff8ec).setStrokeStyle(3, 0x3d2a1e);
      this.bubbleTail = scene.add.triangle(bx - r * 0.55, by + r * 0.8, 0, 0, 10, 0, 0, 10, 0xfff8ec);
      this.badge = scene.add.text(bx, by, '', { fontFamily: EMOJI_FONT, fontSize: `${Math.round(r * 1.15)}px` }).setOrigin(0.5);
      this.add([this.bubbleTail, this.bubble, this.badge]);
      this.updateBadge();
    }

    // 몬스터는 걸을 때 통통 튄다
    scene.tweens.add({
      targets: this.icon,
      y: this.icon.y - 5,
      angle: { from: -4, to: 4 },
      duration: Phaser.Math.Between(220, 300),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    this.moveTo(startDistance);
    scene.add.existing(this);
  }

  // 매 프레임 호출: 상태 효과 시간을 줄이고, 레일을 따라 앞으로 이동한다.
  // moveScale: 이동 속도 배율 (레일이 멈춰 있으면 0)
  // 이번 프레임에 뜨거운 국물(지속)로 찰 배부름을 돌려준다.
  step(dt, moveScale = 1) {
    let speed = BASE_SPEED * this.type.speed * moveScale * (this.golden ? 1.7 : 1);
    if (this.slow) {
      speed *= this.slow.factor;
      this.slow.timeLeft -= dt;
      if (this.slow.timeLeft <= 0) this.slow = null;
    }
    if (this.haste) {
      speed *= this.haste.factor;
      this.haste.timeLeft -= dt;
      if (this.haste.timeLeft <= 0) this.haste = null;
    }
    this.moveTo(this.distance + speed * dt);

    let dotDamage = 0;
    if (this.dot) {
      dotDamage = this.dot.dps * dt;
      this.dot.timeLeft -= dt;
      if (this.dot.timeLeft <= 0) this.dot = null;
    }

    this.updateTint();
    return dotDamage;
  }

  moveTo(distance) {
    this.distance = distance;
    const { x, y } = this.rail.positionAt(distance);
    this.setPosition(x, y);
  }

  // 감속을 건다. 이미 더 강한 감속이 걸려 있으면 그쪽을 유지한다.
  applySlow(factor, duration) {
    // 감속 저항: 0.5면 "느려지는 정도"가 절반이 된다 (60% → 80%)
    const resist = this.type.slowResist ?? 0;
    const finalFactor = 1 - (1 - factor) * (1 - resist);
    if (!this.slow || finalFactor <= this.slow.factor) {
      this.slow = { factor: finalFactor, timeLeft: duration };
    } else {
      this.slow.timeLeft = Math.max(this.slow.timeLeft, duration);
    }
  }

  // 지속(뜨거운 국물)을 건다. 겹치지 않고, 더 센 쪽으로 새로 건다.
  applyDot(dps, duration) {
    if (!this.dot || dps >= this.dot.dps) this.dot = { dps, timeLeft: duration };
  }

  // 빨라지게 한다 (보스가 아닌 손님만)
  applyHaste(factor, duration) {
    if (this.isBoss) return;
    this.haste = { factor, timeLeft: duration };
  }

  // 요리를 먹는다. 배가 꽉 차면 true를 돌려준다.
  takeDamage(amount) {
    if (this.dead) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.drawBar();

    if (this.hp === 0) {
      this.dead = true;
      return true;
    }
    this.updateLikesCycle();
    return false;
  }

  // 배가 조금 꺼진다 (사자 왕의 간식)
  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.drawBar();
  }

  drawBar() {
    this.barFill.width = this.barWidth * (1 - this.hp / this.maxHp);
  }

  // 미식 드래곤: 배가 찬 만큼 좋아하는 요리가 덱의 다음 줄로 바뀐다
  updateLikesCycle() {
    if (!this.type.likesCycle) return;
    const full = 1 - this.hp / this.maxHp;
    const next = this.lines[Math.min(this.lines.length - 1, Math.floor(full * this.lines.length))];
    if (next !== this.likes) {
      this.likes = next;
      this.updateBadge();
      this.emit('likesChanged', next);
    }
  }

  updateBadge() {
    if (this.badge) this.badge.setText(METHODS[this.likes].emoji);
  }

  updateTint() {
    if (this.slow) this.icon.setTint(SLOW_TINT);
    else if (this.dot) this.icon.setTint(DOT_TINT);
    else if (this.golden) this.icon.setTint(GOLDEN_TINT);
    else this.icon.clearTint();
  }
}
