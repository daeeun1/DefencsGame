import { GAME_WIDTH, COLORS, FONT, EMOJI_FONT } from '../config.js';
import { RECIPES, chefById, recipeFitsDeck } from '../data/chefs.js';
import { createButton } from '../ui.js';
import { isDiscovered } from '../save.js';
import { sfx } from '../audio.js';

const PANEL_WIDTH = GAME_WIDTH - 24;
const BIG_ROW = 100; // 이 덱으로 만들 수 있는 신화
const SMALL_ROW = 50; // 이 덱으로는 못 만드는 신화 (흐리게)

// 📖 신화 조합표: 아래에서 반쯤 올라오는 판. 열려 있는 동안 게임은 느려진다 (GameScene).
// 덱으로 만들 수 있는 신화가 위에 크게, 못 만드는 건 아래에 흐리게.
// 재료가 판 위에 있으면 ✅, 없으면 ⬜. 다 모이면 줄이 금색이 되고 [만들기] 버튼이 켜진다.
export default class RecipePanel {
  // deck: 이번 판 덱, hasChef(id): 판 위에 그 요리가 있는지, onCraft(recipe): 만들기 버튼
  constructor(scene, { deck, hasChef, onCraft }) {
    this.scene = scene;
    this.hasChef = hasChef;
    this.onCraft = onCraft;
    this.fit = RECIPES.filter((r) => recipeFitsDeck(r, deck)).sort((a, b) => a.stars - b.stars);
    this.other = RECIPES.filter((r) => !recipeFitsDeck(r, deck));
    this.panelHeight = 150 + this.fit.length * BIG_ROW + (this.other.length ? 40 + this.other.length * SMALL_ROW : 0);
    this.top = scene.scale.height - this.panelHeight - 12;
    this.left = 12;
    this.container = scene.add.container(0, 0).setDepth(20).setVisible(false);
  }

  get isOpen() {
    return this.container.visible;
  }

  open() {
    sfx.click();
    this.container.setVisible(true);
    this.draw();
    this.container.y = this.panelHeight;
    this.scene.tweens.add({ targets: this.container, y: 0, duration: 220, ease: 'Back.Out' });
  }

  close() {
    this.container.setVisible(false);
    this.container.removeAll(true);
  }

  // 판 위 요리가 바뀌면 다시 그린다 (창이 열려 있는 동안 GameScene이 부른다)
  refresh() {
    if (this.key() !== this.lastKey) this.draw();
  }

  key() {
    return this.fit.map((r) => r.ingredients.map((id) => (this.hasChef(id) ? 1 : 0)).join('')).join('|');
  }

  draw() {
    const scene = this.scene;
    const c = this.container;
    c.removeAll(true);
    this.lastKey = this.key();
    const { left, top, panelHeight } = this;
    // 위쪽 빈 곳을 누르면 닫힌다 (판은 그대로 보인다)
    const shade = scene.add.rectangle(0, 0, GAME_WIDTH, top, 0x000000, 0.25).setOrigin(0).setInteractive();
    shade.on('pointerup', () => this.close());
    const box = scene.add.graphics();
    box.fillStyle(COLORS.hud, 0.97);
    box.fillRoundedRect(left, top, PANEL_WIDTH, panelHeight, 24);
    box.lineStyle(4, 0xe74c3c, 1);
    box.strokeRoundedRect(left, top, PANEL_WIDTH, panelHeight, 24);
    c.add([shade, box, scene.add.rectangle(left, top, PANEL_WIDTH, panelHeight, 0, 0).setOrigin(0).setInteractive()]);

    c.add(scene.add.text(left + 28, top + 40, '📖 신화 조합표', { fontFamily: FONT, fontSize: '32px', fontStyle: 'bold', color: COLORS.text }).setOrigin(0, 0.5));
    c.add(
      scene.add
        .text(left + 28, top + 82, '재료 요리를 판에 모으면 만들 수 있어요 (게임이 느려져요)', { fontFamily: FONT, fontSize: '18px', color: '#d8c8b4' })
        .setOrigin(0, 0.5),
    );
    c.add(createButton(scene, left + PANEL_WIDTH - 70, top + 44, 100, 60, '닫기', () => this.close(), { fontSize: 22, color: 0x7d8594 }));

    let y = top + 112;
    for (const recipe of this.fit) {
      this.drawBig(recipe, y);
      y += BIG_ROW;
    }
    if (this.other.length) {
      c.add(scene.add.text(left + 28, y + 18, '다른 덱으로 만드는 신화', { fontFamily: FONT, fontSize: '18px', color: '#8a7a6a' }).setOrigin(0, 0.5));
      y += 40;
      for (const recipe of this.other) {
        this.drawSmall(recipe, y);
        y += SMALL_ROW;
      }
    }
  }

  // 큰 줄: 🍔 산더미 버거 ★  [🍞 ✅] + [🍗 ⬜]  능력   [만들기]
  drawBig(recipe, y) {
    const scene = this.scene;
    const c = this.container;
    const left = this.left;
    const result = chefById(recipe.result);
    const have = recipe.ingredients.map((id) => this.hasChef(id));
    const ready = have.every(Boolean);
    const g = scene.add.graphics();
    g.fillStyle(ready ? 0x8a6a1a : 0x2b1d14, 1);
    g.fillRoundedRect(left + 14, y, PANEL_WIDTH - 28, BIG_ROW - 10, 16);
    if (ready) {
      g.lineStyle(4, 0xffd54f, 1);
      g.strokeRoundedRect(left + 14, y, PANEL_WIDTH - 28, BIG_ROW - 10, 16);
    }
    c.add(g);
    c.add(scene.add.text(left + 58, y + 45, result.emoji, { fontFamily: EMOJI_FONT, fontSize: '46px' }).setOrigin(0.5));
    const made = isDiscovered(result.id) ? '' : '  NEW';
    c.add(
      scene.add
        .text(left + 100, y + 22, `${result.name} ${'★'.repeat(recipe.stars)}${made}`, { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: ready ? '#fff3c4' : COLORS.text })
        .setOrigin(0, 0.5),
    );
    const parts = recipe.ingredients.map((id, k) => `[${chefById(id).emoji}${have[k] ? '✅' : '⬜'}]`).join(' + ');
    c.add(scene.add.text(left + 100, y + 56, parts, { fontFamily: EMOJI_FONT, fontSize: '22px', color: COLORS.text }).setOrigin(0, 0.5));
    c.add(scene.add.text(left + 100, y + 80, result.ability, { fontFamily: FONT, fontSize: '16px', color: ready ? '#fff3c4' : '#b9a48f' }).setOrigin(0, 0.5));
    const button = createButton(scene, left + PANEL_WIDTH - 90, y + 45, 130, 66, '만들기', () => this.onCraft(recipe), { fontSize: 24, color: 0xc0392b, enabled: ready });
    c.add(button);
    if (ready) scene.tweens.add({ targets: button, scale: 1.08, duration: 400, yoyo: true, repeat: -1 });
  }

  // 작은 줄: 흐리게 (덱에 없는 줄의 재료)
  drawSmall(recipe, y) {
    const scene = this.scene;
    const result = chefById(recipe.result);
    const parts = recipe.ingredients.map((id) => chefById(id).emoji).join(' + ');
    this.container.add(
      scene.add
        .text(this.left + 36, y + SMALL_ROW / 2, `${result.emoji} ${result.name} ${'★'.repeat(recipe.stars)}   ${parts}`, {
          fontFamily: EMOJI_FONT,
          fontSize: '20px',
          color: '#8a7a6a',
        })
        .setOrigin(0, 0.5)
        .setAlpha(0.7),
    );
  }
}
