import { GAME_WIDTH, COLORS, FONT, EMOJI_FONT } from '../config.js';
import { METHODS, RECIPES, HIDDEN_GRADES, chefById } from '../data/chefs.js';
import { createButton } from '../ui.js';
import { SETS, LUNCHBOX } from '../data/sets.js';
import { isDiscovered } from '../save.js';
import { sfx } from '../audio.js';

const PANEL_WIDTH = 680;
const ROW_HEIGHT = 112;
const PER_PAGE = 6;

// 📜 레시피 창: 🍳 히든 요리 조합표와 🍱 합작 요리 안내.
// 히든 요리는 한 번 만들기 전에는 이름이 ???이고, 판 위에 없는 재료는 ❓로 가려진다 (힌트).
// 이번 덱으로 만들 수 있는 레시피만 보여 주고, 지금 만들 수 있는 것이 맨 위에 온다.
export default class RecipePanel {
  // deck: 이번 판 덱, hasChef(id): 판 위에 그 요리가 있는지, isUnlocked(recipe): 이 등급을 쓸 수 있는지
  // onCraft(recipe): 만들기 버튼
  constructor(scene, { deck, hasChef, isUnlocked, onCraft }) {
    this.scene = scene;
    this.hasChef = hasChef;
    this.isUnlocked = isUnlocked;
    this.onCraft = onCraft;
    this.deck = deck;
    this.tab = 'hidden';
    this.page = 0;
    // 덱에 없는 줄의 재료가 들어간 레시피는 빼고 보여 준다
    const lines = new Set([...deck, 'buff']);
    this.recipes = RECIPES.filter((r) => r.ingredients.every((id) => lines.has(chefById(id).method)));

    const h = scene.scale.height;
    this.panelHeight = 160 + PER_PAGE * ROW_HEIGHT + 120;
    this.top = (h - this.panelHeight) / 2;
    this.left = (GAME_WIDTH - PANEL_WIDTH) / 2;
    this.container = scene.add.container(0, 0).setDepth(20).setVisible(false);
  }

  get isOpen() {
    return this.container.visible;
  }

  open() {
    this.page = 0;
    this.container.setVisible(true);
    this.draw();
  }

  close() {
    this.container.setVisible(false);
    this.container.removeAll(true);
  }

  // 판 위 요리가 바뀌면 다시 그린다 (창이 열려 있는 동안 GameScene이 부른다)
  refresh() {
    const key = this.recipes.map((r) => this.state(r).ready).join('');
    if (key !== this.lastKey) this.draw();
  }

  state(recipe) {
    const have = recipe.ingredients.map((id) => this.hasChef(id));
    return { have, ready: have.every(Boolean) && this.isUnlocked(recipe), known: isDiscovered(recipe.result) };
  }

  draw() {
    const scene = this.scene;
    const c = this.container;
    c.removeAll(true);
    this.lastKey = this.recipes.map((r) => this.state(r).ready).join('');
    const { left, top, panelHeight } = this;
    const shade = scene.add.rectangle(0, 0, GAME_WIDTH, scene.scale.height, 0x000000, 0.6).setOrigin(0).setInteractive();
    shade.on('pointerup', () => this.close());
    const box = scene.add.graphics();
    box.fillStyle(COLORS.hud, 1);
    box.fillRoundedRect(left, top, PANEL_WIDTH, panelHeight, 24);
    box.lineStyle(4, 0x2ecc71, 1);
    box.strokeRoundedRect(left, top, PANEL_WIDTH, panelHeight, 24);
    c.add([shade, box, scene.add.rectangle(left, top, PANEL_WIDTH, panelHeight, 0, 0).setOrigin(0).setInteractive()]);

    // 탭
    [
      { id: 'hidden', label: '🍳 히든 요리' },
      { id: 'combo', label: '🍱 합작 요리' },
    ].forEach((tab, i) => {
      const x = left + PANEL_WIDTH / 4 + (i * PANEL_WIDTH) / 2;
      const on = this.tab === tab.id;
      const bg = scene.add.rectangle(x, top + 50, PANEL_WIDTH / 2 - 30, 64, on ? 0x2e8b57 : 0x2b1d14).setInteractive({ useHandCursor: true });
      bg.on('pointerup', () => {
        sfx.click();
        this.tab = tab.id;
        this.page = 0;
        this.draw();
      });
      c.add([bg, scene.add.text(x, top + 50, tab.label, { fontFamily: FONT, fontSize: '28px', fontStyle: 'bold', color: on ? COLORS.text : '#b9a48f' }).setOrigin(0.5)]);
    });

    if (this.tab === 'hidden') this.drawHidden();
    else this.drawCombos();
    c.add(createButton(scene, GAME_WIDTH / 2, top + panelHeight - 55, 220, 76, '닫기', () => this.close(), { fontSize: 28, color: 0x7d8594 }));
  }

  drawHidden() {
    const scene = this.scene;
    const c = this.container;
    const { left, top } = this;
    // 지금 만들 수 있는 것 → 한 번 만든 것 → 모르는 것 순서
    const list = this.recipes
      .map((recipe) => ({ recipe, ...this.state(recipe) }))
      .sort((a, b) => Number(b.ready) - Number(a.ready) || Number(b.known) - Number(a.known));
    const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
    this.page = Math.min(this.page, pages - 1);
    const found = list.filter((r) => r.known).length;
    c.add(
      scene.add
        .text(GAME_WIDTH / 2, top + 108, `이 덱으로 만들 수 있는 히든 ${list.length}개 · 발견 ${found}개`, { fontFamily: FONT, fontSize: '20px', color: '#d8c8b4' })
        .setOrigin(0.5),
    );

    list.slice(this.page * PER_PAGE, (this.page + 1) * PER_PAGE).forEach(({ recipe, have, ready, known }, i) => {
      const y = top + 140 + i * ROW_HEIGHT;
      const result = chefById(recipe.result);
      const grade = HIDDEN_GRADES[recipe.grade];
      const g = scene.add.graphics();
      g.fillStyle(ready ? 0x2e5a3a : 0x2b1d14, 1);
      g.fillRoundedRect(left + 16, y, PANEL_WIDTH - 32, ROW_HEIGHT - 10, 16);
      c.add(g);
      c.add(scene.add.circle(left + 66, y + 51, 36, grade.color, known ? 0.9 : 0.35).setStrokeStyle(3, 0x14171c));
      c.add(scene.add.text(left + 66, y + 51, known ? result.emoji : '❓', { fontFamily: EMOJI_FONT, fontSize: '40px' }).setOrigin(0.5));
      const title = known ? `${result.name}` : '???';
      c.add(
        scene.add
          .text(left + 116, y + 26, `[${grade.name}] ${title}`, { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: '#' + grade.color.toString(16).padStart(6, '0') })
          .setOrigin(0, 0.5),
      );
      // 재료: 있으면 ✅, 모르는 레시피에서 판 위에 없는 재료는 ❓ (힌트)
      const parts = recipe.ingredients.map((id, k) => {
        const chef = chefById(id);
        if (have[k]) return `✅${chef.emoji}`;
        return known ? `⬜${chef.emoji}` : '❓';
      });
      c.add(scene.add.text(left + 116, y + 70, parts.join(' + '), { fontFamily: EMOJI_FONT, fontSize: '24px', color: COLORS.text }).setOrigin(0, 0.5));
      if (known && result.ability) {
        c.add(scene.add.text(left + PANEL_WIDTH - 175, y + 26, result.ability, { fontFamily: FONT, fontSize: '15px', color: '#b9a48f' }).setOrigin(1, 0.5));
      }
      const unlocked = this.isUnlocked(recipe);
      const label = !unlocked ? (recipe.grade === 'fullcourse' ? '🔒 동네 4' : '🔒 동네 2') : '만들기';
      c.add(createButton(scene, left + PANEL_WIDTH - 95, y + 51, 140, 70, label, () => this.onCraft(recipe), { fontSize: 22, color: 0x2e8b57, enabled: ready }));
    });

    if (pages > 1) {
      const y = top + 140 + PER_PAGE * ROW_HEIGHT + 4;
      const arrow = (x, text, delta) => {
        const t = scene.add.text(x, y, text, { fontFamily: FONT, fontSize: '36px', fontStyle: 'bold', color: COLORS.text }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        t.on('pointerup', () => {
          this.page = (this.page + delta + pages) % pages;
          sfx.click();
          this.draw();
        });
        c.add(t);
      };
      arrow(left + 200, '◀', -1);
      arrow(left + PANEL_WIDTH - 200, '▶', 1);
      c.add(scene.add.text(GAME_WIDTH / 2, y, `${this.page + 1} / ${pages}`, { fontFamily: FONT, fontSize: '22px', color: '#d8c8b4' }).setOrigin(0.5));
    }
  }

  // 🍱 합작 요리 안내: 다른 줄 요리를 상하좌우로 붙이면 같이 던지는 요리 (이번 덱에서 나오는 것만)
  drawCombos() {
    const scene = this.scene;
    const { left, top } = this;
    const combos = SETS.filter((set) => set.lines.every((line) => this.deck.includes(line)));
    this.container.add(
      scene.add.text(left + 36, top + 110, '다른 줄 요리를 옆에 붙이면, 둘이 10번 던질 때마다 합작 요리!', { fontFamily: FONT, fontSize: '20px', color: '#d8c8b4' }),
    );
    [...combos, LUNCHBOX].forEach((set, i) => {
      const combo = set.lines ? set.lines.map((m) => METHODS[m].emoji).join(' + ') : '그 밖의 짝';
      this.container.add(
        scene.add.text(left + 36, top + 160 + i * 52, `${set.emoji} ${set.name} (${combo})  ${set.desc}`, { fontFamily: FONT, fontSize: '22px', color: COLORS.text }),
      );
    });
  }
}
