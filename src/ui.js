import { COLORS, FONT } from './config.js';

// 여러 장면에서 함께 쓰는 화면 부품.

// 둥근 버튼을 만든다. 누르면 onClick이 실행된다.
export function createButton(scene, x, y, width, height, label, onClick, { enabled = true } = {}) {
  const color = enabled ? COLORS.button : COLORS.buttonDisabled;

  const box = scene.add.graphics();
  box.fillStyle(color, 1);
  box.fillRoundedRect(-width / 2, -height / 2, width, height, 18);

  const text = scene.add
    .text(0, 0, label, { fontFamily: FONT, fontSize: '34px', fontStyle: 'bold', color: COLORS.text })
    .setOrigin(0.5);

  const button = scene.add.container(x, y, [box, text]).setSize(width, height);

  if (enabled) {
    button.setInteractive({ useHandCursor: true });
    button.on('pointerdown', () => button.setScale(0.95));
    button.on('pointerout', () => button.setScale(1));
    button.on('pointerup', () => {
      button.setScale(1);
      onClick();
    });
  }

  return button;
}
