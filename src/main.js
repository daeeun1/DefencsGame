import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './config.js';
import TitleScene from './scenes/TitleScene.js';
import GameScene from './scenes/GameScene.js';
import ShopScene from './scenes/ShopScene.js';
import CodexScene from './scenes/CodexScene.js';
import KitchenSelectScene from './scenes/KitchenSelectScene.js';

// 게임의 시작점. 화면 크기와 장면(Scene) 목록을 정한다.
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: COLORS.background,
  scale: {
    mode: Phaser.Scale.EXPAND, // 휴대폰 화면이 더 길면 세로를 늘려서 빈 공간 없이 채운다
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  scene: [TitleScene, KitchenSelectScene, GameScene, ShopScene, CodexScene], // 첫 번째 장면이 가장 먼저 열린다
});

// 개발 중에만: 브라우저 콘솔에서 game으로 게임 상태를 들여다볼 수 있게 한다
if (import.meta.env.DEV) window.game = game;
