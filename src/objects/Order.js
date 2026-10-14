import Phaser from 'phaser';
import { ORDER_TYPES, showsWeakness } from '../data/orders.js';
import { BASE_SPEED, orderHp, orderReward } from '../data/balance.js';
import { METHODS } from '../data/chefs.js';
import { EMOJI_FONT } from '../config.js';

const BAR_HEIGHT = 8;
const COOKING_METHODS = ['cut', 'grill', 'boil', 'chill'];

const SLOW_TINT = 0x9fd8ff; // 감속 중일 때 파란빛
const DOT_TINT = 0xffb37a; // 지속 피해 중일 때 주황빛
const GOLDEN_TINT = 0xffd54f; // 🥚 황금 주문

// 레일 위를 도는 주문 하나 (VIP 손님도 이 클래스를 쓴다).
// 이모지 그림과 체력 막대로 이루어져 있다.
export default class Order extends Phaser.GameObjects.Container {
  // options.golden: 🥚 황금 주문 (빠르고, 한 바퀴만 돌고 사라지며, 잡으면 골드를 많이 준다)
  constructor(scene, rail, typeKey, wave, startDistance = 0, options = {}) {
    super(scene, 0, 0);

    this.rail = rail;
    this.typeKey = typeKey;
    this.type = ORDER_TYPES[typeKey];
    this.isBoss = Boolean(this.type.boss);
    this.maxHp = this.isBoss ? this.type.hp : orderHp(this.type.hp, wave); // 보스는 고정 체력
    this.hp = this.maxHp;
    this.reward = this.isBoss ? this.type.reward : orderReward(this.type.reward, wave);
    this.distance = 0; // 레일 출발점에서 얼마나 왔는지 (클수록 앞서 있음)
    this.dead = false;

    this.golden = Boolean(options.golden);
    if (this.golden) {
      this.maxHp = Math.round(this.maxHp * 0.6);
      this.hp = this.maxHp;
      this.reward = 100;
      this.startDistance = startDistance; // 여기서 한 바퀴를 돌면 사라진다
    }

    // 약한 레시피 줄. 까다로운 주문은 나올 때마다 무작위로 정해진다.
    this.weakness = this.type.weakness === 'random' ? Phaser.Utils.Array.GetRandom(COOKING_METHODS) : this.type.weakness;

    // 상태 효과
    this.slow = null; // { factor, timeLeft }
    this.dot = null; // { dps, timeLeft }
    this.haste = null; // { factor, timeLeft } 재벌 3세의 "빨리빨리!"

    const size = this.type.size ?? 56;
    this.barWidth = this.isBoss ? 120 : 64;
    const barY = size * 0.7;

    // 16 x 16 도트 그림을 크기에 맞게 키운다 (보통 4배 = 64)
    this.icon = scene.add.image(0, 0, `order_${typeKey}`).setScale(Math.round(size / 14));

    // 체력 막대: 회색 바탕 위에 초록색(보스는 빨간색)이 줄어든다
    this.barBack = scene.add.rectangle(0, barY, this.barWidth, BAR_HEIGHT + (this.isBoss ? 4 : 0), 0x000000, 0.5);
    this.barFill = scene.add
      .rectangle(-this.barWidth / 2, barY, this.barWidth, BAR_HEIGHT + (this.isBoss ? 4 : 0), this.isBoss ? 0xff5a5a : 0x6ddc6d)
      .setOrigin(0, 0.5);
    this.add([this.icon, this.barBack, this.barFill]);

    // 약점 표시 (까다로운 주문, 미식 대왕): 머리 위 작은 동그라미 안에 약한 레시피 줄 이모지
    if (showsWeakness(this.type)) {
      const badgeY = -size * 0.65;
      this.badgeCircle = scene.add.circle(size * 0.45, badgeY, 20, 0xfff8ec).setStrokeStyle(3, 0x3d2a1e);
      this.badge = scene.add.text(size * 0.45, badgeY, '', { fontFamily: EMOJI_FONT, fontSize: '24px' }).setOrigin(0.5);
      this.add([this.badgeCircle, this.badge]);
      this.updateBadge();
    }

    this.moveTo(startDistance);
    scene.add.existing(this);
  }

  // 매 프레임 호출: 상태 효과 시간을 줄이고, 레일을 따라 앞으로 이동한다.
  // moveScale: 이동 속도 배율 (디저트 마녀의 레일 정지 중이면 0)
  // 이번 프레임에 지속 피해로 받을 피해량을 돌려준다.
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

  // 지속 피해를 건다. 겹치지 않고, 더 센 쪽으로 새로 건다.
  applyDot(dps, duration) {
    if (!this.dot || dps >= this.dot.dps) this.dot = { dps, timeLeft: duration };
  }

  // 빨라지게 한다 (보스가 아닌 주문만)
  applyHaste(factor, duration) {
    if (this.isBoss) return;
    this.haste = { factor, timeLeft: duration };
  }

  // 피해를 받는다. 체력이 0이 되면 true를 돌려준다.
  takeDamage(amount) {
    if (this.dead) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.barFill.width = this.barWidth * (this.hp / this.maxHp);

    if (this.hp === 0) {
      this.dead = true;
      return true;
    }
    this.updateWeaknessCycle();
    return false;
  }

  // 미식 대왕: 체력이 줄어든 만큼 약점이 다음 조리법으로 바뀐다
  updateWeaknessCycle() {
    const cycle = this.type.weaknessCycle;
    if (!cycle) return;
    const lost = 1 - this.hp / this.maxHp;
    const next = cycle[Math.min(cycle.length - 1, Math.floor(lost * cycle.length))];
    if (next !== this.weakness) {
      this.weakness = next;
      this.updateBadge();
      this.emit('weaknessChanged', next);
    }
  }

  updateBadge() {
    if (this.badge) this.badge.setText(METHODS[this.weakness].emoji);
  }

  updateTint() {
    if (this.slow) this.icon.setTint(SLOW_TINT);
    else if (this.dot) this.icon.setTint(DOT_TINT);
    else if (this.golden) this.icon.setTint(GOLDEN_TINT);
    else this.icon.clearTint();
  }
}
