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
import { autoFullscreen } from './fullscreen.js';

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
  if (import.meta.env.DEV || import.meta.env.VITE_EXPOSE_GAME) window.game = game; // VITE_EXPOSE_GAME: 밸런스 시뮬레이션용 빌드
  watchResize(game);
}

// 전체 화면을 켜고 끄거나 주소창이 사라져서 화면 크기가 바뀌면, 게임 세로 길이를 다시 맞추고 화면을 다시 그린다.
// 게임(한 판) 중에는 진행이 사라지지 않게 기다렸다가, 판이 끝나고 다른 화면으로 가면 맞춘다.
function watchResize(game) {
  let timer = null;
  let pending = false;
  const apply = () => {
    const height = gameHeight();
    if (Math.abs(height - game.scale.height) < 8) {
      pending = false;
      return;
    }
    if (game.scene.isActive('Game')) {
      pending = true;
      return;
    }
    pending = false;
    game.scale.setGameSize(GAME_WIDTH, height);
    for (const scene of game.scene.getScenes(true)) scene.scene.restart();
  };
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    timer = setTimeout(apply, 300);
  });
  game.events.on('poststep', () => {
    if (pending && !game.scene.isActive('Game')) apply();
  });
}

loadFonts().then(startGame);
autoFullscreen(); // 처음 화면을 누르면 전체 화면으로
startCloud(); // ☁️ 클라우드 저장 연결 (실패해도 게임은 그대로 할 수 있다)
