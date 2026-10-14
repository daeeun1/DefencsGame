import Phaser from 'phaser';
import { getSave } from './save.js';

// 화면 연출 모음: 파티클, 빛 기둥, 반짝이는 고리, 화면 흔들림, 진동.
// 모두 "보여 주기만" 하고 게임 규칙에는 영향을 주지 않는다.

// 주문을 처리했을 때 튀는 조각 색
export const ORDER_COLORS = {
  salad: [0x6dc04a, 0x3f8a35, 0xe8564a],
  steak: [0xb5503a, 0xa8322a, 0xfff8ec],
  ramen: [0xffd54f, 0xe8564a, 0xfff8ec],
  bingsu: [0xff9ec7, 0xa8e0ff, 0xfff8ec],
  bento: [0xe8564a, 0xffd54f, 0x6dc04a],
  onigiri: [0xfff8ec, 0x24402e],
  rush: [0xffd54f, 0xe8564a],
  picky: [0xc9c9d6, 0xfff8ec],
  gg: [0xffd54f, 0x2b1d14],
  tteokguk: [0xfff8ec, 0x9a6237, 0x6dc04a],
  critic: [0x8e4fc0, 0xffd54f, 0xfff8ec],
  chaebol: [0x2f3d6b, 0xffd54f, 0xe8564a],
  king: [0xffd54f, 0xa8322a, 0xfff8ec],
};

const RAINBOW = [0xe8564a, 0xff9a3c, 0xffd54f, 0x6dc04a, 0x5fa8e0, 0x8e4fc0];

// 작은 네모 조각들이 사방으로 튀었다가 떨어지며 사라진다
export function burst(scene, layer, x, y, colors, count = 8, power = 1) {
  for (let i = 0; i < count; i++) {
    const size = Phaser.Math.Between(6, 11);
    const piece = scene.add.rectangle(x, y, size, size, Phaser.Utils.Array.GetRandom(colors));
    layer.add(piece);
    const angle = Math.random() * Math.PI * 2;
    const distance = Phaser.Math.Between(30, 70) * power;
    scene.tweens.add({
      targets: piece,
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance + 30, // 살짝 아래로 떨어지는 느낌
      angle: Phaser.Math.Between(-180, 180),
      alpha: 0,
      duration: Phaser.Math.Between(350, 600),
      ease: 'Quad.Out',
      onComplete: () => piece.destroy(),
    });
  }
}

// 점점 커지며 사라지는 고리
export function ring(scene, layer, x, y, color, radius = 60) {
  const circle = scene.add.circle(x, y, radius).setStrokeStyle(8, color);
  layer.add(circle);
  circle.setScale(0.2);
  scene.tweens.add({ targets: circle, scale: 1.3, alpha: 0, duration: 400, ease: 'Quad.Out', onComplete: () => circle.destroy() });
}

// 하늘에서 내려오는 빛 기둥 (높은 등급 요리사 등장)
export function pillar(scene, layer, x, y, color) {
  const colors = color === 'rainbow' ? RAINBOW : [color];
  colors.forEach((c, i) => {
    const width = 100 - i * 12;
    const beam = scene.add.rectangle(x, y - 400, width, 900, c, 0.5).setOrigin(0.5, 0.5);
    layer.add(beam);
    beam.scaleX = 0;
    scene.tweens.add({
      targets: beam,
      scaleX: 1,
      duration: 180,
      delay: i * 40,
      yoyo: true,
      hold: 350,
      ease: 'Quad.Out',
      onComplete: () => beam.destroy(),
    });
  });
  burst(scene, layer, x, y, colors.concat(0xfff8ec), 16, 1.6);
}

// 등급에 맞는 등장 연출 (뽑기, 합성, 신화 만들기)
export function revealEffect(scene, layer, x, y, tier, tierColor) {
  if (tier <= 1) {
    burst(scene, layer, x, y, [0xfff8ec, 0xc9c9d6], 6, 0.7);
  } else if (tier === 2) {
    ring(scene, layer, x, y, tierColor);
    burst(scene, layer, x, y, [tierColor, 0xfff8ec], 10);
  } else if (tier <= 4) {
    pillar(scene, layer, x, y, tierColor);
    ring(scene, layer, x, y, tierColor, 80);
    shake(scene, 0.004, 200);
    vibrate(40);
  } else {
    pillar(scene, layer, x, y, 'rainbow');
    ring(scene, layer, x, y, 0xffd54f, 110);
    shake(scene, 0.012, 450);
    vibrate([100, 50, 150]);
  }
}

// 화면 전체에 번쩍 빛이 들어온다
export function flash(scene, color = 0xffffff) {
  scene.cameras.main.flash(250, (color >> 16) & 255, (color >> 8) & 255, color & 255, false);
}

export function shake(scene, intensity = 0.006, duration = 250) {
  scene.cameras.main.shake(duration, intensity);
}

// 휴대폰 진동 (지원하는 기기에서만, 설정에서 켜 둔 경우에만)
export function vibrate(pattern) {
  const settings = getSave().settings;
  if (settings && settings.vibration === false) return;
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // 진동을 못 쓰는 환경이면 조용히 넘어간다
    }
  }
}

// 꽃가루: 화면 위쪽에서 알록달록한 조각이 쏟아진다 (클리어 축하)
export function confetti(scene, width, height) {
  for (let i = 0; i < 70; i++) {
    const piece = scene.add
      .rectangle(Phaser.Math.Between(0, width), Phaser.Math.Between(-200, -20), 12, 8, Phaser.Utils.Array.GetRandom(RAINBOW))
      .setDepth(12);
    scene.tweens.add({
      targets: piece,
      y: height + 50,
      x: piece.x + Phaser.Math.Between(-80, 80),
      angle: Phaser.Math.Between(-360, 360),
      duration: Phaser.Math.Between(1800, 3200),
      delay: Phaser.Math.Between(0, 800),
      onComplete: () => piece.destroy(),
    });
  }
}
