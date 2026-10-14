import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, FONT, EMOJI_FONT } from '../config.js';
import { createButton } from '../ui.js';
import { getSave, totalStars } from '../save.js';
import { playMusic, isOn, toggle } from '../audio.js';
import { cloudStatus, linkedAccount, linkGoogle, onCloudChange } from '../cloud.js';

// 첫 화면: 게임 제목, 내 팁과 별, 영업 시작 / 가게 강화 / 요리사 도감 버튼.
export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create() {
    const centerX = GAME_WIDTH / 2;
    const height = this.scale.height; // 휴대폰마다 다른 실제 화면 높이
    const top = (height - GAME_HEIGHT) / 2; // 기준 높이보다 긴 만큼 전체를 가운데로 내린다
    const save = getSave();
    playMusic('title');

    // 주방 로고: 가운데 샐러드, 양옆에 빵과 케이크
    const logoY = top + 265;
    this.add.circle(centerX, logoY, 110, 0xf3e3c3).setStrokeStyle(8, 0xe85d3a);
    const salad = this.add.image(centerX, logoY + 5, 'order_salad').setScale(10);
    this.add.circle(centerX - 165, logoY + 40, 62, 0xb8b8b8).setStrokeStyle(6, 0x3d2a1e);
    this.add.circle(centerX + 165, logoY + 40, 62, 0xb8b8b8).setStrokeStyle(6, 0x3d2a1e);
    const bread = this.add.text(centerX - 165, logoY + 40, '🍞', { fontFamily: EMOJI_FONT, fontSize: '64px' }).setOrigin(0.5).setAngle(-20);
    const cake = this.add.text(centerX + 165, logoY + 40, '🍰', { fontFamily: EMOJI_FONT, fontSize: '64px' }).setOrigin(0.5).setAngle(10);
    this.tweens.add({ targets: salad, y: salad.y - 10, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.tweens.add({ targets: bread, angle: -30, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.tweens.add({ targets: cake, angle: 20, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: 200 });

    this.add
      .text(centerX, top + 460, '주방 디펜스', {
        fontFamily: FONT,
        fontSize: '84px',
        fontStyle: 'bold',
        color: COLORS.text,
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, top + 545, '레일 위 주문을 막아라!', {
        fontFamily: FONT,
        fontSize: '32px',
        color: COLORS.gold,
      })
      .setOrigin(0.5);

    // 내 재화: 팁과 별
    this.add
      .text(centerX, top + 640, `🪙 팁 ${save.tips}    ⭐ 별 ${totalStars()}`, {
        fontFamily: FONT,
        fontSize: '34px',
        fontStyle: 'bold',
        color: COLORS.text,
        backgroundColor: '#3d2a1e',
        padding: { x: 28, y: 12 },
      })
      .setOrigin(0.5);

    createButton(this, centerX, top + 800, 400, 110, '🔥 영업 시작', () => this.scene.start('KitchenSelect'), { fontSize: 38 });
    createButton(this, centerX - 105, top + 930, 200, 100, '🏪 가게\n강화', () => this.scene.start('Shop'), { fontSize: 28 });
    createButton(this, centerX + 105, top + 930, 200, 100, '📖 레시피\n도감', () => this.scene.start('Codex'), { fontSize: 28 });
    createButton(this, centerX, top + 1050, 410, 100, '🏆 랭킹', () => this.scene.start('Ranking'), { color: 0xc77d2e });

    // 설정: 효과음 / 음악 / 진동 켜고 끄기
    const options = [
      { key: 'sfx', on: '🔊 효과음', off: '🔇 효과음' },
      { key: 'music', on: '🎵 음악', off: '🚫 음악' },
      { key: 'vibration', on: '📳 진동', off: '📴 진동' },
    ];
    options.forEach((option, i) => {
      const label = () => `${isOn(option.key) ? option.on : option.off} ${isOn(option.key) ? '켬' : '끔'}`;
      const text = this.add
        .text(centerX + (i - 1) * 220, height - 120, label(), {
          fontFamily: FONT,
          fontSize: '24px',
          color: COLORS.text,
          backgroundColor: '#3d2a1e',
          padding: { x: 14, y: 10 },
        })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      text.on('pointerup', () => {
        toggle(option.key);
        text.setText(label());
        text.setAlpha(isOn(option.key) ? 1 : 0.6);
      });
      text.setAlpha(isOn(option.key) ? 1 : 0.6);
    });

    this.createCloudBar(centerX, top + 62);

    this.add
      .text(centerX, height - 50, 'v0.9 · 개발 중', {
        fontFamily: FONT,
        fontSize: '22px',
        color: '#b9a48f',
      })
      .setOrigin(0.5);
  }

  // ☁️ 클라우드 저장 상태와 🔗 구글 계정 연결 버튼
  createCloudBar(x, y) {
    const labels = {
      connecting: '☁️ 연결 중...',
      saving: '☁️ 저장 중...',
      synced: '☁️ 클라우드 저장됨',
      offline: '📴 오프라인 (휴대폰에만 저장)',
    };
    const statusText = this.add.text(x, y - 26, '', { fontFamily: FONT, fontSize: '22px', color: '#b9a48f' }).setOrigin(0.5);
    const linkButton = this.add
      .text(x, y + 20, '', {
        fontFamily: FONT,
        fontSize: '22px',
        color: COLORS.text,
        backgroundColor: '#3d2a1e',
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    let busy = false;
    const refresh = () => {
      statusText.setText(labels[cloudStatus()] ?? '');
      const account = linkedAccount();
      linkButton.setText(account ? `✅ ${account}` : '🔗 구글 계정 연결 (기기 바꿔도 기록 유지)');
      linkButton.setVisible(cloudStatus() !== 'offline' && cloudStatus() !== 'connecting');
    };
    linkButton.on('pointerup', async () => {
      if (busy || linkedAccount()) return;
      busy = true;
      statusText.setText('🔗 구글 로그인 창을 확인하세요');
      const message = await linkGoogle();
      busy = false;
      refresh();
      statusText.setText(message);
    });

    refresh();
    const off = onCloudChange((event) => {
      if (event === 'pulled') this.scene.restart(); // 클라우드 기록을 받아 왔으면 팁과 별을 다시 그린다
      else refresh();
    });
    this.events.once('shutdown', off);
  }
}
