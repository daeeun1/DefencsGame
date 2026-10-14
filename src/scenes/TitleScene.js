import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, FONT, EMOJI_FONT } from '../config.js';
import { createButton } from '../ui.js';
import { getSave, totalStars } from '../save.js';
import { playMusic, isOn, toggle } from '../audio.js';
import { todaysSpecial, DAILY_TIP_BONUS, DAILY_TRIES, triesLeft, useTry } from '../data/daily.js';
import { cloudStatus, linkedAccount, linkGoogle, onCloudChange } from '../cloud.js';
import { canFullscreen, isFullscreen, toggleFullscreen } from '../fullscreen.js';
import { todaysQuests, claimQuest, canClaimBonus, claimBonus, hasQuestReward, QUEST_REWARD, QUEST_BONUS } from '../data/quests.js';

const TAB_BAR_HEIGHT = 130;

// 첫 화면: 로고, 내 팁과 별, 큰 버튼 2개(영업 시작, 오늘의 도전), 아래 메뉴줄(가게, 도감, 랭킹, 설정).
export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  create(data) {
    const centerX = GAME_WIDTH / 2;
    const height = this.scale.height; // 휴대폰마다 다른 실제 화면 높이
    // 메뉴줄을 뺀 공간 안에서, 기준 높이보다 남는 만큼 가운데로 내린다
    const top = Math.max(0, (height - TAB_BAR_HEIGHT - (GAME_HEIGHT - TAB_BAR_HEIGHT)) / 2);
    const save = getSave();
    playMusic('title');

    // 주방 로고: 가운데 샐러드, 양옆에 빵과 케이크 (모두 이모지)
    const logoY = top + 210;
    this.add.circle(centerX, logoY, 110, 0xf3e3c3).setStrokeStyle(8, 0xe85d3a);
    const salad = this.add.text(centerX, logoY + 5, '🥗', { fontFamily: EMOJI_FONT, fontSize: '120px' }).setOrigin(0.5);
    this.add.circle(centerX - 165, logoY + 40, 62, 0xb8b8b8).setStrokeStyle(6, 0x3d2a1e);
    this.add.circle(centerX + 165, logoY + 40, 62, 0xb8b8b8).setStrokeStyle(6, 0x3d2a1e);
    const bread = this.add.text(centerX - 165, logoY + 40, '🍞', { fontFamily: EMOJI_FONT, fontSize: '64px' }).setOrigin(0.5).setAngle(-20);
    const cake = this.add.text(centerX + 165, logoY + 40, '🍰', { fontFamily: EMOJI_FONT, fontSize: '64px' }).setOrigin(0.5).setAngle(10);
    this.tweens.add({ targets: salad, y: salad.y - 10, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.tweens.add({ targets: bread, angle: -30, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    this.tweens.add({ targets: cake, angle: 20, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.InOut', delay: 200 });

    this.add
      .text(centerX, top + 405, '쿡쿡!', { fontFamily: FONT, fontSize: '110px', fontStyle: 'bold', color: COLORS.text })
      .setOrigin(0.5);
    this.add
      .text(centerX, top + 500, '레일 위 주문을 막아라!', { fontFamily: FONT, fontSize: '32px', color: COLORS.gold })
      .setOrigin(0.5);
    this.add
      .text(centerX, top + 570, `🪙 팁 ${save.tips}    ⭐ 별 ${totalStars()}`, {
        fontFamily: FONT,
        fontSize: '34px',
        fontStyle: 'bold',
        color: COLORS.text,
        backgroundColor: '#3d2a1e',
        padding: { x: 28, y: 12 },
      })
      .setOrigin(0.5);

    // 큰 버튼 2개
    createButton(this, centerX, top + 730, 560, 140, '🔥 영업 시작', () => this.scene.start('KitchenSelect'), { fontSize: 48 });
    const { special } = todaysSpecial();
    createButton(this, centerX, top + 885, 560, 120, `🏆 오늘의 도전 (${triesLeft()}/${DAILY_TRIES})\n${special.emoji} ${special.name}`, () => this.showDaily(), {
      fontSize: 32,
      color: 0x8e4fc0,
    });

    // 📋 오늘의 주문서 (받을 보상이 있으면 반짝)
    const quests = todaysQuests();
    const doneCount = quests.filter((q) => q.done).length;
    const questButton = createButton(this, centerX, top + 1010, 560, 84, `📋 오늘의 주문서  ${doneCount}/${quests.length}`, () => this.showQuests(), {
      fontSize: 30,
      color: 0x3f7fd0,
    });
    if (hasQuestReward()) {
      questButton.setLabel(`📋 오늘의 주문서  🎁 보상 받기!`);
      this.tweens.add({ targets: questButton, scale: 1.05, duration: 450, yoyo: true, repeat: -1 });
    }

    // 아래 메뉴줄
    this.createTabBar(height);
    // ⚙️ 설정에서 바꿀 수 있는 클라우드 상태: 클라우드에서 기록을 받아 오면 화면을 다시 그린다
    const off = onCloudChange((event) => {
      if (event === 'pulled') this.scene.restart();
    });
    this.events.once('shutdown', off);

    // 결과 화면에서 "다시 도전"을 누르고 왔으면 바로 시작
    if (data?.startDaily) this.startDaily();
    if (data?.showQuests) this.showQuests();
  }

  // 🏆 오늘의 도전 시작: 남은 횟수가 있으면 한 번 쓰고 시작한다
  startDaily() {
    if (!useTry()) return this.showDaily();
    this.scene.start('Game', { daily: true });
  }

  // 휴대폰 앱처럼 화면 맨 아래 메뉴줄: 아이콘 + 작은 글씨
  createTabBar(height) {
    const y = height - TAB_BAR_HEIGHT;
    this.add.rectangle(0, y, GAME_WIDTH, TAB_BAR_HEIGHT, 0x3d2a1e).setOrigin(0);
    this.add.rectangle(0, y, GAME_WIDTH, 4, 0x1c120c).setOrigin(0);
    const tabs = [
      { emoji: '🏪', label: '가게', onClick: () => this.scene.start('Shop') },
      { emoji: '📖', label: '도감', onClick: () => this.scene.start('Codex') },
      { emoji: '🏆', label: '랭킹', onClick: () => this.scene.start('Ranking') },
      { emoji: '⚙️', label: '설정', onClick: () => this.showSettings() },
    ];
    const width = GAME_WIDTH / tabs.length;
    tabs.forEach((tab, i) => {
      const x = width * i + width / 2;
      const hit = this.add.rectangle(x, y + TAB_BAR_HEIGHT / 2, width, TAB_BAR_HEIGHT, 0, 0).setInteractive({ useHandCursor: true });
      const icon = this.add.text(x, y + 48, tab.emoji, { fontFamily: EMOJI_FONT, fontSize: '48px' }).setOrigin(0.5);
      this.add.text(x, y + 98, tab.label, { fontFamily: FONT, fontSize: '24px', fontStyle: 'bold', color: COLORS.text }).setOrigin(0.5);
      hit.on('pointerdown', () => icon.setScale(0.9));
      hit.on('pointerout', () => icon.setScale(1));
      hit.on('pointerup', () => {
        icon.setScale(1);
        tab.onClick();
      });
    });
  }

  // 📋 오늘의 주문서 창: 퀘스트 3개, 진행 막대, 보상 받기
  showQuests() {
    const centerX = GAME_WIDTH / 2;
    const centerY = this.scale.height / 2;
    const parts = [];
    const shade = this.add.rectangle(0, 0, GAME_WIDTH, this.scale.height, 0x000000, 0.7).setOrigin(0).setInteractive();
    const box = this.add.graphics();
    box.fillStyle(0x3d2a1e, 1);
    box.fillRoundedRect(centerX - 310, centerY - 380, 620, 760, 24);
    box.lineStyle(5, 0x3f7fd0, 1);
    box.strokeRoundedRect(centerX - 310, centerY - 380, 620, 760, 24);
    parts.push(
      shade,
      box,
      this.add.text(centerX, centerY - 320, '📋 오늘의 주문서', { fontFamily: FONT, fontSize: '42px', fontStyle: 'bold', color: COLORS.text }).setOrigin(0.5),
      this.add.text(centerX, centerY - 270, '매일 바뀌어요 · 다 하면 보너스!', { fontFamily: FONT, fontSize: '22px', color: '#b9a48f' }).setOrigin(0.5),
    );
    todaysQuests().forEach((q, i) => {
      const y = centerY - 175 + i * 150;
      const card = this.add.graphics();
      card.fillStyle(0x2b1d14, 1);
      card.fillRoundedRect(centerX - 285, y - 60, 570, 125, 18);
      const bar = this.add.graphics();
      bar.fillStyle(0x5a4a3e, 1);
      bar.fillRoundedRect(centerX - 200, y + 22, 260, 18, 9);
      bar.fillStyle(q.done ? 0x6dc04a : 0xffd54f, 1);
      bar.fillRoundedRect(centerX - 200, y + 22, Math.max(18, (260 * q.progress) / q.target), 18, 9);
      parts.push(
        card,
        bar,
        this.add.text(centerX - 245, y, q.emoji, { fontFamily: EMOJI_FONT, fontSize: '48px' }).setOrigin(0.5),
        this.add.text(centerX - 200, y - 22, q.text, { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: COLORS.text }).setOrigin(0, 0.5),
        this.add.text(centerX + 70, y + 31, `${q.progress}/${q.target}`, { fontFamily: FONT, fontSize: '20px', color: '#d8c8b4' }).setOrigin(0, 0.5),
      );
      const label = q.claimed ? '✅ 받음' : q.done ? `🪙 ${QUEST_REWARD} 받기` : `🪙 ${QUEST_REWARD}`;
      const button = createButton(this, centerX + 205, y + 10, 140, 70, label, () => {
        // 받으면 팁 숫자를 다시 그리고 창을 다시 연다
        if (claimQuest(q.id) > 0) this.scene.restart({ showQuests: true });
      }, { fontSize: 22, color: 0x3f9a4a, enabled: q.done && !q.claimed });
      parts.push(button);
    });

    const bonusReady = canClaimBonus();
    parts.push(
      createButton(this, centerX, centerY + 270, 460, 80, bonusReady ? `🎁 모두 완료 보너스 🪙${QUEST_BONUS} 받기` : `🎁 3개 다 하면 🪙${QUEST_BONUS} 보너스`, () => {
        if (claimBonus() > 0) this.scene.restart({ showQuests: true });
      }, { fontSize: 24, color: 0xc77d2e, enabled: bonusReady }),
    );
    const close = () => parts.forEach((p) => p.destroy());
    parts.push(createButton(this, centerX, centerY + 340, 240, 64, '닫기', close, { fontSize: 26, color: 0x7d8594 }));
    for (const p of parts) p.setDepth(20);
  }

  // ⚙️ 설정 창: 소리, 진동, 전체 화면, 클라우드 저장과 구글 계정 연결
  showSettings() {
    const centerX = GAME_WIDTH / 2;
    const centerY = this.scale.height / 2;
    const parts = [];
    const shade = this.add.rectangle(0, 0, GAME_WIDTH, this.scale.height, 0x000000, 0.7).setOrigin(0).setInteractive();
    const box = this.add.graphics();
    box.fillStyle(0x3d2a1e, 1);
    box.fillRoundedRect(centerX - 300, centerY - 400, 600, 800, 24);
    box.lineStyle(5, 0xb9a48f, 1);
    box.strokeRoundedRect(centerX - 300, centerY - 400, 600, 800, 24);
    parts.push(
      shade,
      box,
      this.add.text(centerX, centerY - 335, '⚙️ 설정', { fontFamily: FONT, fontSize: '44px', fontStyle: 'bold', color: COLORS.text }).setOrigin(0.5),
    );

    // 켜고 끄는 버튼들
    const toggles = [
      { on: '🔊 효과음 켬', off: '🔇 효과음 끔', get: () => isOn('sfx'), set: () => toggle('sfx') },
      { on: '🎵 음악 켬', off: '🚫 음악 끔', get: () => isOn('music'), set: () => toggle('music') },
      { on: '📳 진동 켬', off: '📴 진동 끔', get: () => isOn('vibration'), set: () => toggle('vibration') },
    ];
    if (canFullscreen()) toggles.push({ on: '⛶ 전체 화면 켬', off: '⛶ 전체 화면 끔', get: isFullscreen, set: toggleFullscreen });
    toggles.forEach((item, i) => {
      const label = () => (item.get() ? item.on : item.off);
      const button = createButton(this, centerX, centerY - 235 + i * 105, 440, 90, label(), () => {
        item.set();
        // 전체 화면은 바뀌는 데 잠깐 걸린다
        this.time.delayedCall(250, () => button.active && button.setLabel(label()).setAlpha(item.get() ? 1 : 0.6));
        button.setLabel(label()).setAlpha(item.get() ? 1 : 0.6);
      }, { fontSize: 30, color: 0x5a4a3e });
      button.setAlpha(item.get() ? 1 : 0.6);
      parts.push(button);
    });

    // 클라우드 저장
    const cloudY = centerY + 205;
    const labels = {
      connecting: '☁️ 연결 중...',
      saving: '☁️ 저장 중...',
      synced: '☁️ 클라우드 저장됨',
      offline: '📴 오프라인 (휴대폰에만 저장)',
    };
    const status = this.add.text(centerX, cloudY - 30, '', { fontFamily: FONT, fontSize: '24px', color: '#d8c8b4' }).setOrigin(0.5);
    const link = this.add
      .text(centerX, cloudY + 20, '', {
        fontFamily: FONT,
        fontSize: '24px',
        color: COLORS.text,
        backgroundColor: '#5a4a3e',
        padding: { x: 18, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    let busy = false;
    const refresh = () => {
      if (!status.active) return;
      status.setText(labels[cloudStatus()] ?? '');
      const account = linkedAccount();
      link.setText(account ? `✅ ${account}` : '🔗 구글 계정 연결 (기기 바꿔도 기록 유지)');
      link.setVisible(cloudStatus() !== 'offline' && cloudStatus() !== 'connecting');
    };
    link.on('pointerup', async () => {
      if (busy || linkedAccount()) return;
      busy = true;
      status.setText('🔗 구글 로그인 창을 확인하세요');
      const message = await linkGoogle();
      busy = false;
      refresh();
      if (status.active) status.setText(message);
    });
    refresh();
    const off = onCloudChange(refresh);
    parts.push(status, link);

    parts.push(
      this.add.text(centerX, centerY + 290, 'v0.10 · 개발 중', { fontFamily: FONT, fontSize: '20px', color: '#b9a48f' }).setOrigin(0.5),
    );
    const close = () => {
      off();
      parts.forEach((p) => p.destroy());
    };
    parts.push(createButton(this, centerX, centerY + 345, 260, 80, '닫기', close, { fontSize: 30 }));
    for (const p of parts) p.setDepth(20);
  }

  // 🏆 오늘의 도전 안내 창: 오늘의 주방과 특선 메뉴(규칙), 남은 횟수를 보여 주고 시작한다
  showDaily() {
    const { date, kitchen, special } = todaysSpecial();
    const centerX = GAME_WIDTH / 2;
    const centerY = this.scale.height / 2;
    const shade = this.add.rectangle(0, 0, GAME_WIDTH, this.scale.height, 0x000000, 0.7).setOrigin(0).setInteractive();
    const box = this.add.graphics();
    box.fillStyle(0x3d2a1e, 1);
    box.fillRoundedRect(centerX - 290, centerY - 330, 580, 660, 24);
    box.lineStyle(5, 0x8e4fc0, 1);
    box.strokeRoundedRect(centerX - 290, centerY - 330, 580, 660, 24);
    const text = (y, message, size, color = COLORS.text, bold = false) =>
      this.add
        .text(centerX, y, message, { fontFamily: FONT, fontSize: `${size}px`, fontStyle: bold ? 'bold' : '', color, align: 'center', wordWrap: { width: 520 } })
        .setOrigin(0.5);
    const parts = [
      shade,
      box,
      text(centerY - 270, '🏆 오늘의 도전', 38, COLORS.text, true),
      text(centerY - 220, date, 22, '#b9a48f'),
      this.add.text(centerX, centerY - 130, special.emoji, { fontFamily: EMOJI_FONT, fontSize: '84px' }).setOrigin(0.5),
      text(centerY - 50, special.name, 40, COLORS.gold, true),
      text(centerY + 10, special.desc, 24),
      text(centerY + 55, `주방: ${kitchen.emoji} ${kitchen.name} (잠긴 주방도 OK)`, 22, '#d8c8b4'),
      text(centerY + 118, `🎲 오늘은 모두 같은 운! 실력으로 겨뤄요\n🏅3 등급 · 팁 ×${DAILY_TIP_BONUS} · 일일 랭킹`, 22, '#d8c8b4'),
      text(centerY + 190, `남은 도전 ${triesLeft()} / ${DAILY_TRIES}`, 28, triesLeft() > 0 ? COLORS.gold : '#ff8a8a', true),
    ];
    const close = () => parts.forEach((p) => p.destroy());
    parts.push(
      createButton(this, centerX - 130, centerY + 265, 220, 96, '닫기', close, { color: 0x7d8594 }),
      createButton(this, centerX + 130, centerY + 265, 220, 96, triesLeft() > 0 ? '▶ 도전' : '내일 다시', () => this.startDaily(), {
        color: 0x3f9a4a,
        enabled: triesLeft() > 0,
      }),
    );
    for (const p of parts) p.setDepth(20);
  }
}
