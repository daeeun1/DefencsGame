import Phaser from 'phaser';
import { TIERS } from '../data/chefs.js';

const RADIUS = 42;
const PIXEL_SCALE = 5; // 16 x 16 도트 그림을 5배로 키워서 80 x 80으로 그린다

// 주방 칸에 서 있는 요리사 하나.
// 등급 색깔 받침 위에 도트 그림 요리사가 서 있다. (앞치마 색 = 등급, 손에 든 도구 = 조리법)
export default class Chef extends Phaser.GameObjects.Container {
  constructor(scene, data, slot) {
    super(scene, slot.x, slot.y);

    this.data_ = data; // 능력치 (data/chefs.js의 항목)
    this.slot = slot; // 서 있는 칸 { col, row, x, y }
    this.cooldown = 0; // 다음 공격까지 남은 시간(초)
    this.attackSpeed = 1; // 총괄 주방장 버프로 올라가는 공격 속도 배율
    this.freezeTimer = 0; // 디저트 마녀의 레일 정지 타이머
    this.rangeScale = 1; // 사거리 배율 (정전된 레스토랑에서 어두운 칸이면 줄어든다)

    const tierColor = TIERS[data.tier].color;
    const plate = scene.add.circle(0, 6, RADIUS, tierColor, 0.35).setStrokeStyle(3, tierColor, 0.8);
    const sprite = scene.add.image(0, 0, `chef_${data.id}`).setScale(PIXEL_SCALE);
    this.body_ = scene.add.container(0, 0, [plate, sprite]);

    this.add(this.body_);
    scene.add.existing(this);

    // 등장 효과: 작게 시작해서 통통 커진다
    this.body_.setScale(0.2);
    scene.tweens.add({ targets: this.body_, scale: 1, duration: 250, ease: 'Back.Out' });
  }

  get stats() {
    return this.data_;
  }

  // 매 프레임 호출. 공격할 수 있으면 목표를 골라 onAttack(요리사, 목표)을 부른다.
  step(dt, orders, onAttack) {
    if (this.data_.method === 'buff') return; // 총괄 주방장은 직접 공격하지 않는다

    this.cooldown -= dt * this.attackSpeed;
    if (this.cooldown > 0) return;

    const target = this.findTarget(orders);
    if (!target) {
      this.cooldown = 0; // 목표가 생기면 바로 공격할 수 있게 기다린다
      return;
    }

    this.cooldown = this.data_.interval;
    onAttack(this, target);

    // 공격할 때 살짝 튀는 효과
    this.scene.tweens.add({ targets: this.body_, scale: 1.12, duration: 70, yoyo: true });
  }

  // 사거리 안의 주문 중 레일을 가장 많이 나아간(가장 급한) 주문을 고른다
  findTarget(orders) {
    let best = null;
    for (const order of orders) {
      if (order.dead) continue;
      const d = Phaser.Math.Distance.Between(this.x, this.y, order.x, order.y);
      if (d <= this.data_.range * this.rangeScale && (!best || order.distance > best.distance)) best = order;
    }
    return best;
  }
}
