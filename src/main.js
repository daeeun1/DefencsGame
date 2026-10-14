import Phaser from 'phaser';
import fontRegularUrl from 'galmuri/dist/Galmuri11.woff2?url';
import fontBoldUrl from 'galmuri/dist/Galmuri11-Bold.woff2?url';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './config.js';
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import KitchenSelectScene from './scenes/KitchenSelectScene.js';
import GameScene from './scenes/GameScene.js';
import ShopScene from './scenes/ShopScene.js';
import CodexScene from './scenes/CodexScene.js';
import RankingScene from './scenes/RankingScene.js';
import { startCloud } from './cloud.js';

// 도트 글꼴(갈무리)을 먼저 불러온다. 글꼴이 준비되기 전에 글씨를 그리면 다른 글꼴로 나와 버린다.
async function loadFonts() {
  try {
    const faces = [
      new FontFace('Galmuri11', `url(${fontRegularUrl})`, { weight: '400' }),
      new FontFace('Galmuri11', `url(${fontBoldUrl})`, { weight: '700' }),
    ];
    await Promise.all(faces.map((face) => face.load()));
    faces.forEach((face) => document.fonts.add(face));
  } catch (error) {
    console.warn('글꼴을 불러오지 못해서 기본 글꼴로 표시해요', error);
  }
}

// 게임 세로 길이: 가로는 항상 720으로 두고, 휴대폰 화면이 길쭉한 만큼 세로를 늘린다 (최소 1280).
// 화면이 이보다 넓으면 양옆에 같은 폭의 여백이 생기고 게임은 가운데에 온다.
function gameHeight() {
  const box = document.getElementById('game');
  const width = box.clientWidth || window.innerWidth;
  const height = box.clientHeight || window.innerHeight;
  return Math.max(GAME_HEIGHT, Math.round((GAME_WIDTH * height) / width));
}

function startGame() {
  // 게임의 시작점. 화면 크기와 장면(Scene) 목록을 정한다.
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: COLORS.background,
    scale: {
      mode: Phaser.Scale.FIT, // 비율을 지킨 채 화면에 맞추고, 남는 곳은 여백으로 둔다
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: gameHeight(),
    },
    scene: [BootScene, TitleScene, KitchenSelectScene, GameScene, ShopScene, CodexScene, RankingScene], // 첫 번째 장면이 가장 먼저 열린다
  });

  // 개발 중에만: 브라우저 콘솔에서 game으로 게임 상태를 들여다볼 수 있게 한다
  if (import.meta.env.DEV) window.game = game;
}

loadFonts().then(startGame);
startCloud(); // ☁️ 클라우드 저장 연결 (실패해도 게임은 그대로 할 수 있다)
