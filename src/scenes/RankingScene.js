import Phaser from 'phaser';
import { GAME_WIDTH, COLORS, FONT } from '../config.js';
import { playMusic, sfx } from '../audio.js';
import { SCORE_RULE } from '../data/progress.js';
import { todaysSpecial } from '../data/daily.js';
import { fetchLeaderboard, nickname, setNickname, renameEverywhere, isOnline } from '../cloud.js';

const ROW_HEIGHT = 50;
const SHOW_ROWS = 15;

// 🏆 랭킹 화면: 오늘의 도전(매일 새로), 무한 모드. 위쪽 탭으로 고른다.
export default class RankingScene extends Phaser.Scene {
  constructor() {
    super('Ranking');
  }

  create() {
    playMusic('title');
    const height = this.scale.height;

    this.add.rectangle(0, 0, GAME_WIDTH, 120, COLORS.hud).setOrigin(0);
    this.add
      .text(GAME_WIDTH / 2, 60, '🏆 랭킹', { fontFamily: FONT, fontSize: '42px', fontStyle: 'bold', color: COLORS.text })
      .setOrigin(0.5);
    const back = this.add
      .text(30, 60, '←', { fontFamily: FONT, fontSize: '48px', color: COLORS.text })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });
    back.on('pointerup', () => this.scene.start('Title'));

    // 탭: 오늘의 도전(일일 랭킹) + 무한 모드
    const daily = todaysSpecial();
    const boards = [
      { id: daily.boardId, emoji: '🏆', name: '오늘의 도전' },
      { id: 'endless', emoji: '♾️', name: '무한 모드' },
    ];
    const tabWidth = (GAME_WIDTH - 40) / boards.length;
    this.tabs = boards.map((kitchen, i) => {
      const x = 20 + i * tabWidth + tabWidth / 2;
      const bg = this.add.rectangle(x, 160, tabWidth - 8, 64, COLORS.hud).setInteractive({ useHandCursor: true });
      const label = this.add
        .text(x, 160, `${kitchen.emoji}\n${kitchen.name}`, {
          fontFamily: FONT,
          fontSize: '20px',
          color: COLORS.text,
          align: 'center',
        })
        .setOrigin(0.5);
      bg.on('pointerup', () => {
        sfx.click();
        this.show(kitchen.id);
      });
      return { kitchen, bg, label };
    });

    // 점수 계산 방법
    this.add
      .text(
        GAME_WIDTH / 2,
        215,
        `점수 = 웨이브×${SCORE_RULE.wave} + 손님×${SCORE_RULE.order} + 별×${SCORE_RULE.star}`,
        { fontFamily: FONT, fontSize: '19px', color: '#b9a48f' },
      )
      .setOrigin(0.5);

    // 순위 목록 (고정된 줄을 만들어 두고 글자만 바꾼다)
    this.listTop = 250;
    this.rows = Array.from({ length: SHOW_ROWS }, (_, i) => {
      const y = this.listTop + i * ROW_HEIGHT + ROW_HEIGHT / 2;
      const bg = this.add.rectangle(GAME_WIDTH / 2, y, GAME_WIDTH - 40, ROW_HEIGHT - 6, 0x3d2a1e).setVisible(false);
      const style = { fontFamily: FONT, fontSize: '22px', color: COLORS.text };
      return {
        bg,
        rank: this.add.text(50, y, '', { ...style, fontStyle: 'bold' }).setOrigin(0, 0.5),
        name: this.add.text(130, y, '', style).setOrigin(0, 0.5),
        detail: this.add.text(GAME_WIDTH - 190, y, '', { ...style, fontSize: '17px', color: '#b9a48f' }).setOrigin(1, 0.5),
        score: this.add.text(GAME_WIDTH - 40, y, '', { ...style, fontStyle: 'bold', color: COLORS.gold }).setOrigin(1, 0.5),
      };
    });
    this.message = this.add
      .text(GAME_WIDTH / 2, this.listTop + 200, '', { fontFamily: FONT, fontSize: '24px', color: '#b9a48f', align: 'center' })
      .setOrigin(0.5);

    // 아래: 내 기록과 이름 바꾸기
    const bottom = Math.max(this.listTop + SHOW_ROWS * ROW_HEIGHT + 30, height - 170);
    this.add.rectangle(GAME_WIDTH / 2, bottom + 40, GAME_WIDTH - 40, 80, 0x5a3d2a).setStrokeStyle(4, 0xffd54f);
    this.myText = this.add
      .text(50, bottom + 40, '', { fontFamily: FONT, fontSize: '22px', fontStyle: 'bold', color: COLORS.text, lineSpacing: 4 })
      .setOrigin(0, 0.5);
    this.myScore = this.add
      .text(GAME_WIDTH - 40, bottom + 40, '', { fontFamily: FONT, fontSize: '26px', fontStyle: 'bold', color: COLORS.gold })
      .setOrigin(1, 0.5);
    const rename = this.add
      .text(GAME_WIDTH / 2, bottom + 115, '', {
        fontFamily: FONT,
        fontSize: '22px',
        color: COLORS.text,
        backgroundColor: '#3d2a1e',
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const showName = () => rename.setText(`✏️ 내 이름: ${nickname()}`);
    showName();
    rename.on('pointerup', async () => {
      // 휴대폰 기본 입력창으로 이름을 받는다
      const input = window.prompt('랭킹에 보일 이름 (10글자까지)', nickname());
      if (input === null) return;
      setNickname(input);
      showName();
      await renameEverywhere(boards.map((b) => b.id));
      this.show(this.current);
    });

    this.show(daily.boardId);
  }

  async show(kitchenId) {
    this.current = kitchenId;
    for (const tab of this.tabs) {
      const on = tab.kitchen.id === kitchenId;
      tab.bg.setFillStyle(on ? 0xe85d3a : COLORS.hud);
      tab.label.setColor(on ? COLORS.text : '#b9a48f');
    }
    this.fill([]);
    this.myText.setText('');
    this.myScore.setText('');

    if (!isOnline()) {
      this.message.setText('📴 오프라인이에요\n인터넷에 연결되면 랭킹을 볼 수 있어요');
      return;
    }
    this.message.setText('불러오는 중...');
    const data = await fetchLeaderboard(kitchenId);
    if (this.current !== kitchenId || !this.scene.isActive()) return; // 그사이 다른 탭을 눌렀거나 화면을 나갔다
    if (!data) {
      this.message.setText('랭킹을 불러오지 못했어요');
      return;
    }
    this.message.setText(data.rows.length === 0 ? '아직 기록이 없어요\n첫 번째 주인공이 되어 보세요!' : '');
    this.fill(data.rows.slice(0, SHOW_ROWS));
    if (data.me) {
      this.myText.setText(
        `나  ${data.me.rank}위  ${data.me.name}\n${data.me.wave}웨이브 · ⭐${data.me.stars} · 손님 ${data.me.orders}`,
      );
      this.myScore.setText(`${data.me.score % SCORE_RULE.grade}`);
    } else {
      this.myText.setText('나  아직 기록이 없어요');
    }
  }

  fill(rows) {
    const medals = ['🥇', '🥈', '🥉'];
    this.rows.forEach((row, i) => {
      const data = rows[i];
      row.bg.setVisible(Boolean(data));
      if (!data) {
        for (const t of [row.rank, row.name, row.detail, row.score]) t.setText('');
        return;
      }
      row.bg.setFillStyle(data.me ? 0x7a4a2a : 0x3d2a1e);
      row.rank.setText(medals[i] ?? `${data.rank}`);
      row.name.setText(data.name);
      row.detail.setText(`${data.wave}웨이브`);
      row.score.setText(`${data.score % SCORE_RULE.grade}`);
    });
  }
}
