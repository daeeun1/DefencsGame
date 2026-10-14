import Phaser from 'phaser';

const SPEED = 900; // 화면 픽셀/초

// 조리법별 투사체 모양
const LOOKS = {
  cut: { color: 0xffffff, radius: 7 }, // 칼날
  grill: { color: 0xff7a1a, radius: 12 }, // 불덩이
  boil: { color: 0xc9884a, radius: 10 }, // 끓는 국물
  chill: { color: 0x9fd8ff, radius: 9 }, // 얼음
  all: { color: 0xffd54f, radius: 13 }, // 요리의 신: 황금빛
};

// 요리사가 주문을 향해 날리는 투사체 (도트 느낌의 네모).
// 목표를 따라가다가 닿으면 onHit(위치)를 부른다. 목표가 먼저 사라지면 마지막 위치까지 날아간다.
export default class Projectile extends Phaser.GameObjects.Rectangle {
  constructor(scene, chef, target, onHit) {
    const look = LOOKS[chef.stats.method];
    super(scene, chef.x, chef.y, look.radius * 1.6, look.radius * 1.6, look.color);
    this.setStrokeStyle(3, 0x3d2a1e);

    this.chef = chef;
    this.target = target;
    this.targetPos = { x: target.x, y: target.y };
    this.onHit = onHit;
    this.done = false;
    scene.add.existing(this);
  }

  // 매 프레임 호출: 목표 쪽으로 이동하고, 닿으면 onHit
  step(dt) {
    if (!this.target.dead) this.targetPos = { x: this.target.x, y: this.target.y };

    const dx = this.targetPos.x - this.x;
    const dy = this.targetPos.y - this.y;
    const dist = Math.hypot(dx, dy);
    const move = SPEED * dt;

    if (dist <= move) {
      this.setPosition(this.targetPos.x, this.targetPos.y);
      this.done = true;
      this.onHit(this.targetPos);
      this.destroy();
      return;
    }
    this.setPosition(this.x + (dx / dist) * move, this.y + (dy / dist) * move);
  }
}
