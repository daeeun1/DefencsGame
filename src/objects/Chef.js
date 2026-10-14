import Phaser from 'phaser';
import { TIERS } from '../data/chefs.js';
import { isChristmas } from '../eastereggs.js';

const RADIUS = 40;
const ICON_SIZE = 56; // 도구 그림을 이 크기 안에 들어오게 키운다

// 주방 칸에 서 있는 요리사 하나.
// 등급 색 동그라미 안에 조리법 도구(식칼, 프라이팬, 냄비, 얼음 등)가 그려져 있다.
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
    const plate = scene.add.circle(0, 0, RADIUS, tierColor).setStrokeStyle(5, 0x3d2a1e);
    this.sprite = scene.add.image(0, 0, `tool_${data.tool ?? data.method}`);
    // 도구마다 그림 크기가 달라서, 긴 쪽이 ICON_SIZE에 맞도록 정수 배로 키운다 (도트가 또렷하게)
    this.sprite.setScale(Math.max(1, Math.floor(ICON_SIZE / Math.max(this.sprite.width, this.sprite.height))));
    const parts = [plate, this.sprite];
    // 🎅 크리스마스에는 동그라미에 산타 모자를 씌운다
    if (isChristmas()) parts.push(scene.add.image(-22, -34, 'santa_hat').setScale(4).setAngle(-15));
    this.body_ = scene.add.container(0, 0, parts);

    this.add(this.body_);
    scene.add.existing(this);

    // 등장 효과: 작게 시작해서 통통 커진다
    this.body_.setScale(0.2);
    scene.tweens.add({ targets: this.body_, scale: 1, duration: 250, ease: 'Back.Out' });

    // 숨 쉬듯 살짝 들썩이는 움직임 (요리사마다 박자가 조금씩 다르다)
    scene.tweens.add({
      targets: this.sprite,
      y: -4,
      duration: Phaser.Math.Between(450, 650),
      delay: Phaser.Math.Between(0, 500),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
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

    // 공격할 때 목표 쪽으로 몸을 내미는 효과
    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    this.scene.tweens.add({
      targets: this.body_,
      x: Math.cos(angle) * 10,
      y: Math.sin(angle) * 10,
      scale: 1.08,
      duration: 70,
      yoyo: true,
    });
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
