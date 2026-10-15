import { GAME_WIDTH, COLORS, FONT } from '../config.js';
import { METHODS, RECIPES, chefById } from '../data/chefs.js';
import { RECIPE_UNLOCK_STARS } from '../data/progress.js';
import { createButton } from '../ui.js';
import { SETS, LUNCHBOX } from '../data/sets.js';

const PANEL_WIDTH = 660;
const ROW_HEIGHT = 300;
const SET_LINE_HEIGHT = 34;
const SET_ROWS = 7; // 덱 4줄로 나올 수 있는 합작 요리 6개 + 도시락
const SET_SECTION_HEIGHT = 60 + SET_ROWS * SET_LINE_HEIGHT; // 합작 요리 안내

// 📜 레시피 창: 풀코스(신화) 레시피와 합작 요리 안내.
// 레시피마다 결과 요리사, 능력, 재료(갖췄으면 ✅, 없으면 ❌)와 "만들기" 버튼을 보여 준다.
export default class RecipePanel {
  // hasChef(id): 판 위에 그 요리사가 있는지 알려 주는 함수
  // isUnlocked(recipe): 별을 모아서 레시피가 열렸는지 알려 주는 함수
  // onCraft(recipe): 만들기 버튼을 눌렀을 때 부르는 함수
  // deck: 이번 판 덱 (합작 요리 안내를 덱에 맞춰 보여 준다)
  constructor(scene, { deck, hasChef, isUnlocked, onCraft }) {
    this.scene = scene;
    this.hasChef = hasChef;
    this.isUnlocked = isUnlocked;

    const screenHeight = scene.scale.height;
    const panelHeight = 130 + RECIPES.length * ROW_HEIGHT + SET_SECTION_HEIGHT + 120;
    const top = (screenHeight - panelHeight) / 2;
    const left = (GAME_WIDTH - PANEL_WIDTH) / 2;

    // 뒤쪽 어두운 배경: 아래 게임 화면이 눌리지 않게 막고, 누르면 창이 닫힌다
    const shade = scene.add.rectangle(0, 0, GAME_WIDTH, screenHeight, 0x000000, 0.6).setOrigin(0).setInteractive();
    shade.on('pointerup', () => this.close());

    const box = scene.add.graphics();
    box.fillStyle(COLORS.hud, 1);
    box.fillRoundedRect(left, top, PANEL_WIDTH, panelHeight, 24);
    box.lineStyle(4, 0xe74c3c, 1);
    box.strokeRoundedRect(left, top, PANEL_WIDTH, panelHeight, 24);
    const blocker = scene.add.rectangle(left, top, PANEL_WIDTH, panelHeight, 0, 0).setOrigin(0).setInteractive();

    const title = scene.add
      .text(GAME_WIDTH / 2, top + 60, '📜 풀코스 레시피', { fontFamily: FONT, fontSize: '40px', fontStyle: 'bold', color: COLORS.text })
      .setOrigin(0.5);

    const parts = [shade, box, blocker, title];

    this.rows = RECIPES.map((recipe, i) => {
      const y = top + 130 + i * ROW_HEIGHT;
      const result = chefById(recipe.result);
      const ability = result.ability ? `${METHODS[result.method].role} · ${result.ability}` : METHODS[result.method].role;

      const name = scene.add.text(left + 36, y + 10, `${result.emoji} ${result.name}`, {
        fontFamily: FONT,
        fontSize: '32px',
        fontStyle: 'bold',
        color: '#e74c3c',
        stroke: '#fff8ec',
        strokeThickness: 2,
      });
      const desc = scene.add.text(left + 36, y + 58, ability, {
        fontFamily: FONT,
        fontSize: '22px',
        color: '#d8c8b4',
        wordWrap: { width: PANEL_WIDTH - 72 },
      });

      // 재료 3개: 한 줄에 하나씩
      const ingredientTexts = recipe.ingredients.map((id, j) =>
        scene.add.text(left + 36, y + 110 + j * 40, '', { fontFamily: FONT, fontSize: '26px', color: COLORS.text }),
      );

      const button = createButton(scene, left + PANEL_WIDTH - 120, y + 150, 180, 90, '만들기', () => onCraft(recipe), {
        fontSize: 28,
      });

      parts.push(name, desc, ...ingredientTexts, button);
      return { recipe, ingredientTexts, button };
    });

    // 🍱 합작 요리 안내: 다른 줄 요리를 상하좌우로 붙이면 같이 던지는 요리 (이번 덱에서 나오는 것만)
    const setTop = top + 130 + RECIPES.length * ROW_HEIGHT;
    parts.push(
      scene.add.text(left + 36, setTop, '🍱 합작 요리 (다른 줄을 옆에 붙이기)', {
        fontFamily: FONT,
        fontSize: '28px',
        fontStyle: 'bold',
        color: COLORS.gold,
      }),
    );
    const combos = SETS.filter((set) => set.lines.every((line) => deck.includes(line))).slice(0, SET_ROWS - 1);
    [...combos, LUNCHBOX].forEach((set, i) => {
      const combo = set.lines ? set.lines.map((m) => METHODS[m].emoji).join('+') : '그 밖의 짝';
      parts.push(
        scene.add.text(left + 36, setTop + 50 + i * SET_LINE_HEIGHT, `${set.emoji} ${set.name} (${combo})  ${set.desc}`, {
          fontFamily: FONT,
          fontSize: '20px',
          color: COLORS.text,
        }),
      );
    });

    const closeButton = createButton(scene, GAME_WIDTH / 2, top + panelHeight - 70, 260, 84, '닫기', () => this.close(), {
      fontSize: 30,
    });
    parts.push(closeButton);

    this.container = scene.add.container(0, 0, parts).setDepth(20).setVisible(false);
  }

  get isOpen() {
    return this.container.visible;
  }

  open() {
    this.refresh();
    this.container.setVisible(true);
  }

  close() {
    this.container.setVisible(false);
  }

  // 재료를 갖췄는지 다시 확인해서 ✅/❌와 버튼 상태를 바꾼다 (창이 열려 있는 동안 매 프레임)
  refresh() {
    for (const row of this.rows) {
      let ready = true;
      row.recipe.ingredients.forEach((id, j) => {
        const have = this.hasChef(id);
        if (!have) ready = false;
        const chef = chefById(id);
        row.ingredientTexts[j].setText(`${have ? '✅' : '❌'} ${chef.emoji} ${chef.name}`);
        row.ingredientTexts[j].setColor(have ? COLORS.text : '#8a7a6a');
      });
      // 잠긴 레시피: 별이 모자라면 만들 수 없다
      const unlocked = this.isUnlocked(row.recipe);
      row.button.setLabel(unlocked ? '만들기' : `🔒 ⭐${RECIPE_UNLOCK_STARS[row.recipe.result]}개`);
      row.button.setEnabled(unlocked && ready);
    }
  }
}
