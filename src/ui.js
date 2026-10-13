import { COLORS, FONT } from './config.js';

// 여러 장면에서 함께 쓰는 화면 부품.

// 둥근 버튼을 만든다. 누르면 onClick이 실행된다.
// 만든 뒤에도 button.setLabel('글자'), button.setEnabled(true/false)로 바꿀 수 있다.
export function createButton(scene, x, y, width, height, label, onClick, { enabled = true, fontSize = 34 } = {}) {
  const box = scene.add.graphics();
  const text = scene.add
    .text(0, 0, label, { fontFamily: FONT, fontSize: `${fontSize}px`, fontStyle: 'bold', color: COLORS.text, align: 'center' })
    .setOrigin(0.5);

  const button = scene.add.container(x, y, [box, text]).setSize(width, height);
  button.setInteractive({ useHandCursor: true });

  let isEnabled = enabled;
  const draw = () => {
    box.clear();
    box.fillStyle(isEnabled ? COLORS.button : COLORS.buttonDisabled, 1);
    box.fillRoundedRect(-width / 2, -height / 2, width, height, 18);
  };
  draw();

  button.on('pointerdown', () => {
    if (isEnabled) button.setScale(0.95);
  });
  button.on('pointerout', () => button.setScale(1));
  button.on('pointerup', () => {
    button.setScale(1);
    if (isEnabled) onClick();
  });

  button.setLabel = (newLabel) => {
    if (text.text !== newLabel) text.setText(newLabel);
    return button;
  };
  button.setEnabled = (value) => {
    if (value !== isEnabled) {
      isEnabled = value;
      draw();
    }
    return button;
  };

  return button;
}
