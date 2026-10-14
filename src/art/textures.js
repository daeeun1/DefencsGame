import Phaser from 'phaser';
import { PALETTE, ORDERS, SANTA_HAT } from './sprites.js';

// 글자 격자(sprites.js)를 실제 그림(텍스처)으로 바꾼다. 게임이 시작될 때 한 번만 실행한다.
//
// 만들어지는 그림 이름:
//   santa_hat           크리스마스 산타 모자 (유닛은 이모지로 그린다)
//   order_<주문 종류>   주문과 VIP 손님 (16 x 16)

export function createTextures(scene) {
  makeTexture(scene, 'santa_hat', SANTA_HAT[0].length, SANTA_HAT.length, (ctx) => drawGrid(ctx, SANTA_HAT, PALETTE));

  for (const [key, grid] of Object.entries(ORDERS)) {
    makeTexture(scene, `order_${key}`, 16, 16, (ctx) => drawGrid(ctx, grid, PALETTE));
  }
}

// 빈 캔버스 그림을 만들고 draw로 칠한 뒤, 확대해도 흐려지지 않게(도트가 또렷하게) 설정한다
function makeTexture(scene, key, width, height, draw) {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, width, height);
  draw(texture.getContext());
  texture.refresh();
  texture.setFilter(Phaser.Textures.FilterMode.NEAREST);
}

// 글자 격자를 한 칸씩 색칠한다. '.'은 건너뛴다(투명)
function drawGrid(ctx, grid, colors, offsetX = 0, offsetY = 0) {
  grid.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      ctx.fillStyle = colors[ch];
      ctx.fillRect(offsetX + x, offsetY + y, 1, 1);
    });
  });
}
