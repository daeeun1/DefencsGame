import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './config.js';
import TitleScene from './scenes/TitleScene.js';
import GameScene from './scenes/GameScene.js';

// 게임의 시작점. 화면 크기와 장면(Scene) 목록을 정한다.
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: COLORS.background,
  scale: {
    mode: Phaser.Scale.EXPAND, // 휴대폰 화면이 더 길면 세로를 늘려서 빈 공간 없이 채운다
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  scene: [TitleScene, GameScene], // 첫 번째 장면이 가장 먼저 열린다
});
