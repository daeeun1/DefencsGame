import { GAME_WIDTH, COLORS, FONT, EMOJI_FONT } from '../config.js';
import { METHODS } from '../data/chefs.js';
import { LINE_UPGRADE_MAX, LINE_UPGRADE_BONUS } from '../data/balance.js';
import { createButton } from '../ui.js';

const PANEL_WIDTH = 640;
const ROW_HEIGHT = 120;

// ⬆️ 줄별 강화 창: 덱의 4줄(빵 강화, 고기 강화 …)을 골드로 강화한다.
// 게임은 멈추지 않고 계속 진행된다 (랜덤 디펜스답게 서둘러야 한다!).
export default class UpgradePanel {
  // deck: 이번 판 덱 4줄, levels: 줄별 강화 레벨 (GameScene과 같은 객체)
  // getGold(), getCost(line), onUpgrade(line)
  constructor(scene, { deck, levels, getGold, getCost, onUpgrade }) {
    this.scene = scene;
    this.levels = levels;
    this.getGold = getGold;
    this.getCost = getCost;

    const screenHeight = scene.scale.height;
    const panelHeight = 130 + deck.length * ROW_HEIGHT + 110;
    const top = (screenHeight - panelHeight) / 2;
    const left = (GAME_WIDTH - PANEL_WIDTH) / 2;

    // 뒤쪽 어두운 배경: 누르면 창이 닫힌다
    const shade = scene.add.rectangle(0, 0, GAME_WIDTH, screenHeight, 0x000000, 0.45).setOrigin(0).setInteractive();
    shade.on('pointerup', () => this.close());
    const box = scene.add.graphics();
    box.fillStyle(COLORS.hud, 1);
    box.fillRoundedRect(left, top, PANEL_WIDTH, panelHeight, 24);
    box.lineStyle(4, 0x3f7fd0, 1);
    box.strokeRoundedRect(left, top, PANEL_WIDTH, panelHeight, 24);
    const blocker = scene.add.rectangle(left, top, PANEL_WIDTH, panelHeight, 0, 0).setOrigin(0).setInteractive();
    const title = scene.add
      .text(GAME_WIDTH / 2, top + 50, '⬆️ 종류별 강화', { fontFamily: FONT, fontSize: '38px', fontStyle: 'bold', color: COLORS.text })
      .setOrigin(0.5);
    const hint = scene.add
      .text(GAME_WIDTH / 2, top + 95, `강화할 때마다 그 줄 요리 양 +${Math.round(LINE_UPGRADE_BONUS * 100)}% (이번 판만)`, {
        fontFamily: FONT,
        fontSize: '20px',
        color: '#d8c8b4',
      })
      .setOrigin(0.5);
    const parts = [shade, box, blocker, title, hint];

    this.rows = deck.map((line, i) => {
      const y = top + 130 + i * ROW_HEIGHT + ROW_HEIGHT / 2;
      const method = METHODS[line];
      const icon = scene.add.text(left + 60, y, method.emoji, { fontFamily: EMOJI_FONT, fontSize: '56px' }).setOrigin(0.5);
      const name = scene.add
        .text(left + 110, y - 20, `${method.name} 강화`, { fontFamily: FONT, fontSize: '30px', fontStyle: 'bold', color: COLORS.text })
        .setOrigin(0, 0.5);
      const level = scene.add.text(left + 110, y + 22, '', { fontFamily: FONT, fontSize: '21px', color: COLORS.gold }).setOrigin(0, 0.5);
      const button = createButton(scene, left + PANEL_WIDTH - 110, y, 180, 84, '', () => onUpgrade(line), { fontSize: 26, color: 0x3f7fd0 });
      parts.push(icon, name, level, button);
      return { line, level, button };
    });

    parts.push(createButton(scene, GAME_WIDTH / 2, top + panelHeight - 55, 240, 76, '닫기', () => this.close(), { fontSize: 28, color: 0x7d8594 }));
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

  // 레벨, 비용, 버튼 상태 다시 그리기 (창이 열려 있는 동안 매 프레임)
  refresh() {
    for (const row of this.rows) {
      const lv = this.levels[row.line] ?? 0;
      row.level.setText(`Lv.${lv}  요리 양 +${Math.round(lv * LINE_UPGRADE_BONUS * 100)}%`);
      if (lv >= LINE_UPGRADE_MAX) row.button.setLabel('MAX').setEnabled(false);
      else {
        const cost = this.getCost(row.line);
        row.button.setLabel(`💰 ${cost}`).setEnabled(this.getGold() >= cost);
      }
    }
  }
}
