import Phaser from 'phaser';
import { TIERS } from '../data/chefs.js';
import { EMOJI_FONT } from '../config.js';
import { isChristmas } from '../eastereggs.js';

const PAD_Y = 26; // 소환진(타원 받침)이 유닛 가운데보다 아래에 있는 거리
const PAD_SQUASH = 0.45; // 동그라미를 이만큼 납작하게 눌러 바닥에 놓인 타원처럼 보이게
const PAD_RADIUS = 44;

// 판 위 소환진에 올라가 있는 유닛(레시피 단계) 하나.
// 등급 색으로 빛나는 소환진 위에 대표 요리 이모지가 둥실 떠 있다.
export default class Chef extends Phaser.GameObjects.Container {
  constructor(scene, data, slot) {
    super(scene, slot.x, slot.y);

    this.data_ = data; // 능력치 (data/chefs.js의 항목)
    this.slot = slot; // 서 있는 칸 { col, row, x, y }
    this.cooldown = 0; // 다음 공격까지 남은 시간(초)
    this.attackSpeed = 1; // 총괄 주방장 버프로 올라가는 공격 속도 배율
    this.freezeTimer = 0; // 디저트 마녀의 레일 정지 타이머
    this.rangeScale = 1; // 사거리 배율 (정전된 레스토랑에서 어두운 칸이면 줄어든다)
    this.rangeBonus = 0; // 🥖 세트 메뉴로 늘어난 사거리
    this.sets = new Set(); // 지금 들어가 있는 세트 메뉴 id
    this.fullCourse = false; // 🍽️ 풀코스에 들어가 있는지
    this.bonus = { damage: 0, attackSpeed: 0, range: 0, weakness: 0, slow: null, gold: 0 }; // 세트 효과 합계

    const tierColor = TIERS[data.tier].color;

    // 소환진: 납작한 상자(squash) 안에 동그라미를 그려서 바닥에 놓인 타원처럼 보이게 한다
    const glow = scene.add.graphics();
    const glowSteps = data.tier >= 4 ? 5 : 3; // 전설 이상은 더 넓게 빛난다
    for (let i = glowSteps; i >= 1; i--) {
      glow.fillStyle(tierColor, 0.12);
      glow.fillCircle(0, 0, PAD_RADIUS + i * 6);
    }
    glow.lineStyle(7, tierColor, 1);
    glow.strokeCircle(0, 0, PAD_RADIUS);
    // 안쪽에서 천천히 도는 점선 고리
    this.runes = scene.add.graphics();
    this.runes.lineStyle(4, 0xfff8ec, 0.9);
    const dashes = 10;
    for (let i = 0; i < dashes; i++) {
      const start = (i / dashes) * Math.PI * 2;
      this.runes.beginPath();
      this.runes.arc(0, 0, PAD_RADIUS - 12, start, start + (Math.PI * 2) / dashes / 1.6);
      this.runes.strokePath();
    }
    this.pad = scene.add.container(0, PAD_Y, [glow, this.runes]).setScale(1, PAD_SQUASH);
    scene.tweens.add({ targets: this.runes, angle: 360, duration: 6000 - data.tier * 600, repeat: -1 });

    // 이모지 밑 그림자 + 대표 요리 이모지
    const shadow = scene.add.ellipse(0, PAD_Y, 46, 14, 0x000000, 0.25);
    this.sprite = scene.add.text(0, -8, data.emoji, { fontFamily: EMOJI_FONT, fontSize: '52px' }).setOrigin(0.5);
    const parts = [this.pad, shadow, this.sprite];
    // 🎅 크리스마스에는 산타 모자를 씌운다
    if (isChristmas()) parts.push(scene.add.image(-20, -42, 'santa_hat').setScale(4).setAngle(-15));
    this.body_ = scene.add.container(0, 0, parts);

    this.add(this.body_);
    scene.add.existing(this);

    // 등장 효과: 작게 시작해서 통통 커진다
    this.body_.setScale(0.2);
    scene.tweens.add({ targets: this.body_, scale: 1, duration: 250, ease: 'Back.Out' });

    // 둥실둥실 떠 있는 움직임 (유닛마다 박자가 조금씩 다르다)
    scene.tweens.add({
      targets: this.sprite,
      y: -16,
      duration: Phaser.Math.Between(650, 850),
      delay: Phaser.Math.Between(0, 500),
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  get stats() {
    return this.data_;
  }

  // 매 프레임 호출. 공격할 수 있으면 목표를 골라 onAttack(유닛, 목표)을 부른다.
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
      if (d <= (this.data_.range + this.rangeBonus) * this.rangeScale && (!best || order.distance > best.distance)) best = order;
    }
    return best;
  }
}
