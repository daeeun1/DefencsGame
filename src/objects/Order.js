import Phaser from 'phaser';
import { FONT } from '../config.js';
import { ORDER_TYPES } from '../data/orders.js';
import { BASE_SPEED, orderHp } from '../data/balance.js';

const BAR_WIDTH = 64;
const BAR_HEIGHT = 8;

// 레일 위를 도는 주문 하나.
// 이모지 그림과 체력 막대로 이루어져 있다.
export default class Order extends Phaser.GameObjects.Container {
  constructor(scene, rail, typeKey, wave) {
    super(scene, 0, 0);

    this.rail = rail;
    this.type = ORDER_TYPES[typeKey];
    this.maxHp = orderHp(this.type.hp, wave);
    this.hp = this.maxHp;
    this.distance = 0; // 레일 출발점에서 얼마나 왔는지
    this.dead = false;

    this.icon = scene.add.text(0, 0, this.type.emoji, { fontFamily: FONT, fontSize: '56px' }).setOrigin(0.5);

    // 체력 막대: 회색 바탕 위에 초록색이 줄어든다
    this.barBack = scene.add.rectangle(0, 40, BAR_WIDTH, BAR_HEIGHT, 0x000000, 0.5);
    this.barFill = scene.add.rectangle(-BAR_WIDTH / 2, 40, BAR_WIDTH, BAR_HEIGHT, 0x6ddc6d).setOrigin(0, 0.5);

    this.add([this.icon, this.barBack, this.barFill]);
    this.setSize(80, 80);
    this.moveTo(0);
    scene.add.existing(this);
  }

  // 매 프레임 호출: 레일을 따라 앞으로 이동
  step(deltaSeconds) {
    this.moveTo(this.distance + BASE_SPEED * this.type.speed * deltaSeconds);
  }

  moveTo(distance) {
    this.distance = distance;
    const { x, y } = this.rail.positionAt(distance);
    this.setPosition(x, y);
  }

  // 피해를 받는다. 체력이 0이 되면 true를 돌려준다.
  takeDamage(amount) {
    if (this.dead) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.barFill.width = BAR_WIDTH * (this.hp / this.maxHp);

    // 맞을 때 살짝 움찔하는 효과
    this.scene.tweens.add({ targets: this.icon, scale: 0.8, duration: 60, yoyo: true });

    if (this.hp === 0) {
      this.dead = true;
      return true;
    }
    return false;
  }
}
