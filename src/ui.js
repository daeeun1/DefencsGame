import { COLORS, FONT, EMOJI_FONT } from './config.js';
import { sfx } from './audio.js';

// 여러 장면에서 함께 쓰는 화면 부품.

// 둥근 버튼을 만든다. 누르면 onClick이 실행된다.
// 만든 뒤에도 button.setLabel('글자'), button.setEnabled(true/false)로 바꿀 수 있다.
export function createButton(
  scene,
  x,
  y,
  width,
  height,
  label,
  onClick,
  { enabled = true, fontSize = 34, color = COLORS.button } = {},
) {
  const box = scene.add.graphics();
  const text = scene.add
    .text(0, 0, label, { fontFamily: FONT, fontSize: `${fontSize}px`, fontStyle: 'bold', color: COLORS.text, align: 'center' })
    .setOrigin(0.5);

  const button = scene.add.container(x, y, [box, text]).setSize(width, height);
  button.setInteractive({ useHandCursor: true });

  let isEnabled = enabled;
  const draw = () => {
    box.clear();
    box.fillStyle(isEnabled ? color : COLORS.buttonDisabled, 1);
    box.fillRoundedRect(-width / 2, -height / 2, width, height, 18);
  };
  draw();

  button.on('pointerdown', () => {
    if (isEnabled) button.setScale(0.95);
  });
  button.on('pointerout', () => button.setScale(1));
  button.on('pointerup', () => {
    button.setScale(1);
    if (isEnabled) {
      sfx.click();
      onClick();
    } else {
      sfx.denied();
    }
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

// 게임 화면 아래 명령 버튼 (뽑기, 강화, 판매 …): 큰 이모지 + 이름 + 작은 설명 한 줄.
// 버튼이 낮으면(휴대폰 화면이 짧으면) 이모지와 이름을 한 줄에 놓는다.
// 만든 뒤에 button.setSub('12골드'), button.setLabel('2배속'), button.setEnabled(true/false)로 바꿀 수 있다.
export function createCommandButton(scene, x, y, width, height, { emoji, label, color }, onClick) {
  const box = scene.add.graphics();
  const tall = height >= 100;
  // 높은 버튼: 이모지 / 이름 / 설명을 세 줄로. 낮은 버튼: "이모지 이름"을 한 줄로, 그 아래 설명
  const emojiText = scene.add
    .text(0, -height * 0.24, tall ? emoji : '', { fontFamily: EMOJI_FONT, fontSize: '38px' })
    .setOrigin(0.5);
  const labelText = scene.add
    .text(0, tall ? height * 0.07 : -height * 0.17, '', {
      fontFamily: FONT,
      fontSize: tall ? '30px' : '26px',
      fontStyle: 'bold',
      color: COLORS.text,
    })
    .setOrigin(0.5);
  const subText = scene.add
    .text(0, tall ? height * 0.3 : height * 0.22, '', { fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: '#fff3c4' })
    .setOrigin(0.5);
  // 글자가 버튼보다 넓으면 작게 줄인다
  const fit = (text, size) => {
    text.setFontSize(size);
    if (text.width > width - 12) text.setFontSize(Math.floor((size * (width - 12)) / text.width));
  };
  const showLabel = (value) => {
    labelText.setText(tall ? value : `${emoji} ${value}`);
    fit(labelText, tall ? 30 : 26);
  };
  showLabel(label);

  const button = scene.add.container(x, y, [box, emojiText, labelText, subText]).setSize(width, height);
  button.setInteractive({ useHandCursor: true });

  let isEnabled = true;
  let isLit = false; // 반짝이는 금색 테두리 (예: 신화 레시피를 만들 수 있을 때)
  const draw = () => {
    box.clear();
    box.fillStyle(0x14171c, 1);
    box.fillRoundedRect(-width / 2, -height / 2 + 5, width, height, 16); // 아래 그림자
    box.fillStyle(isEnabled ? color : COLORS.buttonDisabled, 1);
    box.fillRoundedRect(-width / 2, -height / 2, width, height, 16);
    box.lineStyle(isLit ? 5 : 4, isLit ? 0xffd54f : 0x14171c, 1);
    box.strokeRoundedRect(-width / 2, -height / 2, width, height, 16);
    emojiText.setAlpha(isEnabled ? 1 : 0.5);
    labelText.setAlpha(isEnabled ? 1 : 0.6);
    subText.setAlpha(isEnabled ? 1 : 0.6);
  };
  draw();

  button.on('pointerdown', () => button.setScale(0.94));
  button.on('pointerout', () => button.setScale(1));
  button.on('pointerup', () => {
    button.setScale(1);
    if (isEnabled) {
      sfx.click();
      onClick();
    } else {
      sfx.denied();
    }
  });

  button.setLabel = (value) => {
    showLabel(value);
    return button;
  };
  button.setSub = (value) => {
    if (subText.text !== value) {
      subText.setText(value);
      fit(subText, tall ? 24 : 22);
    }
    return button;
  };
  button.setEnabled = (value) => {
    if (value !== isEnabled) {
      isEnabled = value;
      draw();
    }
    return button;
  };
  button.setLit = (value) => {
    if (value !== isLit) {
      isLit = value;
      draw();
    }
    return button;
  };
  return button;
}
