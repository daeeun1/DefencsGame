import Phaser from 'phaser';
import { TIERS } from '../data/chefs.js';
import { EMOJI_FONT } from '../config.js';
import { isChristmas } from '../eastereggs.js';

const PAD_Y = 26; // 소환진(타원 받침)이 유닛 가운데보다 아래에 있는 거리
const PAD_SQUASH = 0.45; // 동그라미를 이만큼 납작하게 눌러 바닥에 놓인 타원처럼 보이게
const PAD_RADIUS = 44;
const DOT_Y = 46; // 칼질 횟수 점이 놓이는 높이
const DOT_GAP = 15;

// 판 위 소환진에 올라가 있는 요리(레시피 단계) 하나.
// 칼(🔪)로 chops번 칼질하면 요리가 완성되고, 사거리 안의 손님에게 던진다.
// 아래 점들이 칼질 진행을 보여 준다 (다 차면 던질 준비 완료).
export default class Chef extends Phaser.GameObjects.Container {
  constructor(scene, data, slot) {
    super(scene, slot.x, slot.y);

    this.data_ = data; // 능력치 (data/chefs.js의 항목)
    this.slot = slot; // 서 있는 칸 { col, row, x, y }
    this.chops = data.chops ?? 3; // 요리 하나에 필요한 칼질 수
    this.chop = 0; // 지금까지 한 칼질 수
    this.chopTimer = 0; // 다음 칼질까지 쌓인 시간
    this.attackSpeed = 1; // 칼질 속도 배율 (총괄 주방장, 음료, 카드로 올라간다)
    this.freezeTimer = 0; // 디저트 마녀의 레일 정지 타이머
    this.rangeScale = 1; // 사거리 배율 (어두운 칸이면 줄어든다)
    this.sets = new Set(); // 지금 붙어 있는 합작 요리 id

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

    // 이모지 밑 그림자 + 요리 이모지 + 칼 + 칼질 점
    const shadow = scene.add.ellipse(0, PAD_Y, 46, 14, 0x000000, 0.25);
    this.sprite = scene.add.text(0, -8, data.emoji, { fontFamily: EMOJI_FONT, fontSize: '52px' }).setOrigin(0.5, 0.75);
    this.sprite.y = 14; // 아래쪽을 기준으로 눌리게 (칼질할 때 납작해진다)
    this.knife = scene.add
      .text(30, -14, '🔪', { fontFamily: EMOJI_FONT, fontSize: '28px' })
      .setOrigin(0.2, 0.8)
      .setVisible(data.method !== 'buff');
    this.dots = scene.add.graphics();
    const parts = [this.pad, shadow, this.sprite, this.knife, this.dots];
    // 🎅 크리스마스에는 산타 모자를 씌운다
    if (isChristmas()) parts.push(scene.add.image(-20, -42, 'santa_hat').setScale(4).setAngle(-15));
    this.body_ = scene.add.container(0, 0, parts);

    this.add(this.body_);
    scene.add.existing(this);
    this.drawDots();

    // 등장 효과: 작게 시작해서 통통 커진다
    this.body_.setScale(0.2);
    scene.tweens.add({ targets: this.body_, scale: 1, duration: 250, ease: 'Back.Out' });
  }

  get stats() {
    return this.data_;
  }

  get ready() {
    return this.chop >= this.chops;
  }

  // 매 프레임 호출. 칼질을 하고, 요리가 완성되면 목표를 골라 onThrow(요리, 목표)를 부른다.
  step(dt, monsters, onThrow) {
    if (this.data_.method === 'buff') return; // 총괄 주방장은 요리하지 않는다

    const perChop = this.data_.interval / this.chops;
    if (!this.ready) {
      this.chopTimer += dt * this.attackSpeed;
      while (this.chopTimer >= perChop && !this.ready) {
        this.chopTimer -= perChop;
        this.addChop();
      }
    }
    this.animateKnife(this.ready ? 0 : this.chopTimer / perChop);
    if (!this.ready) return;

    this.chopTimer = 0;
    const target = this.findTarget(monsters);
    if (!target) return; // 다 만들어 두고 손님을 기다린다

    this.chop = 0;
    this.drawDots();
    onThrow(this, target);

    // 던질 때 목표 쪽으로 몸을 내미는 효과
    const angle = Phaser.Math.Angle.Between(this.x, this.y, target.x, target.y);
    this.scene.tweens.add({
      targets: this.body_,
      x: Math.cos(angle) * 10,
      y: Math.sin(angle) * 10,
      duration: 70,
      yoyo: true,
    });
  }

  // 칼질 한 번. 이미 다 만들었으면 false
  addChop() {
    if (this.ready || this.data_.method === 'buff') return false;
    this.chop += 1;
    this.drawDots();
    return true;
  }

  // 톡 눌러 칼질을 도와줬을 때: 칼질 한 번 + 통통 튀는 효과
  helpChop() {
    if (!this.addChop()) return false;
    this.chopTimer = 0;
    this.sprite.setScale(1.15, 0.8);
    this.scene.tweens.add({ targets: this.sprite, scaleX: 1, scaleY: 1, duration: 140, ease: 'Back.Out' });
    return true;
  }

  // 칼이 위아래로 움직이고, 칼이 내려올 때 요리가 살짝 눌린다 (트윈 없이 매 프레임 계산)
  animateKnife(progress) {
    const down = Math.sin(progress * Math.PI); // 0 → 1 → 0
    this.knife.setAngle(-55 + 70 * down);
    if (!this.scene.tweens.isTweening(this.sprite)) this.sprite.setScale(1 + down * 0.04, 1 - down * 0.08);
  }

  // 칼질 점: 한 칸씩 금색으로 찬다. 다 차면 초록색 (던질 준비)
  drawDots() {
    const g = this.dots;
    g.clear();
    if (this.data_.method === 'buff') return;
    const left = -((this.chops - 1) * DOT_GAP) / 2;
    for (let i = 0; i < this.chops; i++) {
      const filled = i < this.chop;
      g.fillStyle(0x14171c, 0.85);
      g.fillCircle(left + i * DOT_GAP, DOT_Y, 6.5);
      g.fillStyle(this.ready ? 0x6ddc6d : filled ? 0xffd54f : 0x5a4a3e, 1);
      g.fillCircle(left + i * DOT_GAP, DOT_Y, 4.5);
    }
  }

  get range() {
    return this.data_.range * this.rangeScale;
  }

  // 사거리 안의 손님 중 레일을 가장 많이 나아간(가장 급한) 손님을 고른다.
  // 해산물 줄은 가장 배고픈(배고픔이 가장 많이 남은) 손님을 고른다.
  findTarget(monsters) {
    let best = null;
    const range = this.range;
    const hungriest = this.data_.hungriest;
    for (const m of monsters) {
      if (m.dead) continue;
      const d = Phaser.Math.Distance.Between(this.x, this.y, m.x, m.y);
      if (d > range) continue;
      if (!best || (hungriest ? m.hp > best.hp : m.distance > best.distance)) best = m;
    }
    return best;
  }
}
