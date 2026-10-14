import { GAME_WIDTH, COLORS, FONT } from '../config.js';
import { TIERS } from '../data/chefs.js';
import { UPGRADE_DAMAGE_PER_LEVEL, upgradeCost } from '../data/balance.js';
import { createButton } from '../ui.js';

const PANEL_WIDTH = 640;
const ROW_HEIGHT = 120;
const UPGRADE_TIERS = [1, 2, 3, 4, 5];

// 등급별 공격력 강화 창.
// 게임은 멈추지 않고 계속 진행된다 (랜덤 디펜스답게 서둘러야 한다!).
export default class UpgradePanel {
  // levels: 등급별 현재 강화 레벨 객체 { 1: 0, 2: 0, ... } (GameScene과 같은 객체를 함께 쓴다)
  // getGold: 지금 골드를 알려 주는 함수
  // getCost(tier): 그 등급의 지금 강화 비용 (카드 할인 포함)
  // onUpgrade(tier): 강화 버튼을 눌렀을 때 부르는 함수
  constructor(scene, { levels, getGold, getCost, onUpgrade }) {
    this.scene = scene;
    this.levels = levels;
    this.getGold = getGold;
    this.getCost = getCost ?? ((tier) => upgradeCost(tier, this.levels[tier]));

    const screenHeight = scene.scale.height;
    const panelHeight = 140 + UPGRADE_TIERS.length * ROW_HEIGHT + 120;
    const top = (screenHeight - panelHeight) / 2;
    const left = (GAME_WIDTH - PANEL_WIDTH) / 2;

    // 뒤쪽 어두운 배경: 눌러도 아래 게임 화면이 눌리지 않게 막고, 누르면 창이 닫힌다
    const shade = scene.add.rectangle(0, 0, GAME_WIDTH, screenHeight, 0x000000, 0.6).setOrigin(0).setInteractive();
    shade.on('pointerup', () => this.close());

    const box = scene.add.graphics();
    box.fillStyle(COLORS.hud, 1);
    box.fillRoundedRect(left, top, PANEL_WIDTH, panelHeight, 24);
    box.lineStyle(4, 0xb9a48f, 1);
    box.strokeRoundedRect(left, top, PANEL_WIDTH, panelHeight, 24);
    // 창 안쪽을 눌러도 닫히지 않게 막는 투명 판
    const blocker = scene.add.rectangle(left, top, PANEL_WIDTH, panelHeight, 0, 0).setOrigin(0).setInteractive();

    const title = scene.add
      .text(GAME_WIDTH / 2, top + 60, '⬆ 등급별 강화', { fontFamily: FONT, fontSize: '40px', fontStyle: 'bold', color: COLORS.text })
      .setOrigin(0.5);

    const parts = [shade, box, blocker, title];

    // 등급마다 한 줄: 등급 이름 / 현재 레벨과 효과 / 강화 버튼
    this.rows = UPGRADE_TIERS.map((tier, i) => {
      const y = top + 140 + i * ROW_HEIGHT + ROW_HEIGHT / 2;
      const name = scene.add
        .text(left + 40, y - 18, TIERS[tier].name, {
          fontFamily: FONT,
          fontSize: '32px',
          fontStyle: 'bold',
          color: `#${TIERS[tier].color.toString(16).padStart(6, '0')}`,
        })
        .setOrigin(0, 0.5);
      const level = scene.add
        .text(left + 40, y + 22, '', { fontFamily: FONT, fontSize: '22px', color: '#d8c8b4' })
        .setOrigin(0, 0.5);
      const button = createButton(scene, left + PANEL_WIDTH - 130, y, 200, 84, '', () => onUpgrade(tier), {
        fontSize: 26,
      });
      parts.push(name, level, button);
      return { tier, level, button };
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

  // 레벨, 비용, 버튼 상태를 지금 값으로 다시 표시한다 (창이 열려 있는 동안 매 프레임)
  refresh() {
    const gold = this.getGold();
    for (const row of this.rows) {
      const lv = this.levels[row.tier];
      const cost = this.getCost(row.tier);
      row.level.setText(`Lv.${lv} · 공격력 +${Math.round(lv * UPGRADE_DAMAGE_PER_LEVEL * 100)}%`);
      row.button.setLabel(`${cost}골드`);
      row.button.setEnabled(gold >= cost);
    }
  }
}
