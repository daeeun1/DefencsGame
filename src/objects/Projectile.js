import Phaser from 'phaser';
import { EMOJI_FONT } from '../config.js';

const SPEED = 800; // 화면 픽셀/초

// 요리가 손님에게 던지는 요리 접시. 포물선을 그리며 빙글빙글 날아간다.
// 목표를 따라가다가 닿으면 onHit(위치)를 부른다. 목표가 먼저 떠나면 마지막 위치까지 날아간다.
// options.emoji: 날아가는 그림 (기본은 던진 요리의 이모지), options.size: 크기
export default class Projectile extends Phaser.GameObjects.Text {
  constructor(scene, from, target, onHit, options = {}) {
    const size = options.size ?? 30;
    super(scene, from.x, from.y - 10, options.emoji ?? from.stats.emoji, { fontFamily: EMOJI_FONT, fontSize: `${size}px` });
    this.setOrigin(0.5);

    this.start = { x: from.x, y: from.y - 10 };
    this.target = target;
    this.targetPos = { x: target.x, y: target.y };
    this.onHit = onHit;
    this.done = false;
    this.elapsed = 0;
    const dist = Phaser.Math.Distance.Between(this.start.x, this.start.y, target.x, target.y);
    this.duration = Math.max(0.12, dist / SPEED);
    this.arc = Math.min(90, dist * 0.35); // 포물선 높이
    this.spin = Phaser.Math.Between(0, 1) ? 720 : -720; // 1초에 도는 각도
    scene.add.existing(this);
  }

  // 매 프레임 호출: 포물선을 따라 이동하고, 닿으면 onHit
  step(dt) {
    if (!this.target.dead) this.targetPos = { x: this.target.x, y: this.target.y };
    this.elapsed += dt;
    const t = Math.min(1, this.elapsed / this.duration);
    const x = this.start.x + (this.targetPos.x - this.start.x) * t;
    const y = this.start.y + (this.targetPos.y - this.start.y) * t - Math.sin(t * Math.PI) * this.arc;
    this.setPosition(x, y);
    this.angle += this.spin * dt;

    if (t >= 1) {
      this.done = true;
      this.onHit(this.targetPos);
      this.destroy();
    }
  }
}
