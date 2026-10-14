import Phaser from 'phaser';
import { PALETTE, CHEF_BODY, TOOLS, ORDERS } from './sprites.js';
import { CHEFS, TIERS } from '../data/chefs.js';

// 글자 격자(sprites.js)를 실제 그림(텍스처)으로 바꾼다. 게임이 시작될 때 한 번만 실행한다.
//
// 만들어지는 그림 이름:
//   chef_<요리사 id>   요리사 (16 x 16)
//   tool_<조리법>       조리법 도구 (약점 표시 등에 사용)
//   order_<주문 종류>   주문과 VIP 손님 (16 x 16)

// 신화 요리사의 모자 색
const HAT_COLORS = { cooking_god: '#ffd54f', dessert_witch: '#ff9ec7' };

export function createTextures(scene) {
  for (const chef of CHEFS) {
    const toolKey = chef.id === 'dessert_witch' ? 'witch' : chef.method;
    const tierColor = toHex(TIERS[chef.tier].color);
    const colors = {
      ...PALETTE,
      A: tierColor, // 앞치마 = 등급 색
      a: darken(tierColor, 0.75),
      H: HAT_COLORS[chef.id] ?? PALETTE.w,
    };
    makeTexture(scene, `chef_${chef.id}`, 16, 16, (ctx) => {
      drawGrid(ctx, CHEF_BODY, colors);
      const tool = TOOLS[toolKey];
      drawGrid(ctx, tool.grid, colors, tool.at[0], tool.at[1]);
    });
  }

  for (const [key, tool] of Object.entries(TOOLS)) {
    makeTexture(scene, `tool_${key}`, tool.grid[0].length, tool.grid.length, (ctx) => drawGrid(ctx, tool.grid, PALETTE));
  }

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

function toHex(color) {
  return `#${color.toString(16).padStart(6, '0')}`;
}

// 색을 어둡게 (amount가 작을수록 더 어둡다)
function darken(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * amount);
  const g = Math.round(((n >> 8) & 255) * amount);
  const b = Math.round((n & 255) * amount);
  return toHex((r << 16) | (g << 8) | b);
}
