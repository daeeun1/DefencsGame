import Phaser from 'phaser';
import { FONT } from '../config.js';
import { ORDER_TYPES } from '../data/orders.js';
import { BASE_SPEED, orderHp, orderReward } from '../data/balance.js';

const BAR_WIDTH = 64;
const BAR_HEIGHT = 8;

const SLOW_TINT = 0x9fd8ff; // 감속 중일 때 파란빛
const DOT_TINT = 0xffb37a; // 지속 피해 중일 때 주황빛

// 레일 위를 도는 주문 하나.
// 이모지 그림과 체력 막대로 이루어져 있다.
export default class Order extends Phaser.GameObjects.Container {
  constructor(scene, rail, typeKey, wave) {
    super(scene, 0, 0);

    this.rail = rail;
    this.type = ORDER_TYPES[typeKey];
    this.maxHp = orderHp(this.type.hp, wave);
    this.hp = this.maxHp;
    this.reward = orderReward(this.type.reward, wave);
    this.distance = 0; // 레일 출발점에서 얼마나 왔는지 (클수록 앞서 있음)
    this.dead = false;

    // 상태 효과
    this.slow = null; // { factor, timeLeft }
    this.dot = null; // { dps, timeLeft }

    this.icon = scene.add.text(0, 0, this.type.emoji, { fontFamily: FONT, fontSize: '56px' }).setOrigin(0.5);

    // 체력 막대: 회색 바탕 위에 초록색이 줄어든다
    this.barBack = scene.add.rectangle(0, 40, BAR_WIDTH, BAR_HEIGHT, 0x000000, 0.5);
    this.barFill = scene.add.rectangle(-BAR_WIDTH / 2, 40, BAR_WIDTH, BAR_HEIGHT, 0x6ddc6d).setOrigin(0, 0.5);

    this.add([this.icon, this.barBack, this.barFill]);
    this.moveTo(0);
    scene.add.existing(this);
  }

  // 매 프레임 호출: 상태 효과 시간을 줄이고, 레일을 따라 앞으로 이동한다.
  // 이번 프레임에 지속 피해로 받을 피해량을 돌려준다.
  step(dt) {
    let speed = BASE_SPEED * this.type.speed;
    if (this.slow) {
      speed *= this.slow.factor;
      this.slow.timeLeft -= dt;
      if (this.slow.timeLeft <= 0) this.slow = null;
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

  // 피해를 받는다. 체력이 0이 되면 true를 돌려준다.
  takeDamage(amount) {
    if (this.dead) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.barFill.width = BAR_WIDTH * (this.hp / this.maxHp);

    if (this.hp === 0) {
      this.dead = true;
      return true;
    }
    return false;
  }

  updateTint() {
    if (this.slow) this.icon.setTint(SLOW_TINT);
    else if (this.dot) this.icon.setTint(DOT_TINT);
    else this.icon.clearTint();
  }
}
