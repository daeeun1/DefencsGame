# 🍳 쿡쿡! - 요리 랜덤 디펜스

배고픈 몬스터 손님에게 요리를 던져 배를 채워 막는 **랜덤 타워 디펜스** 휴대폰 게임입니다.
기획 내용은 [DESIGN.md](DESIGN.md)에 있습니다.

## 바로 플레이하기

https://daeeun1.github.io/DefencsGame/

코드를 올릴 때마다 자동으로 새 버전이 배포됩니다. (`.github/workflows/deploy.yml`)

## 내 컴퓨터에서 실행하기

[Node.js](https://nodejs.org)가 설치되어 있어야 합니다.

```bash
npm install   # 처음 한 번만: 필요한 프로그램 설치
npm run dev   # 개발용 서버 실행
```

- 컴퓨터: 브라우저에서 `http://localhost:5173` 열기
- 휴대폰: 컴퓨터와 같은 와이파이에 연결한 뒤, 터미널에 나오는 `Network:` 주소 열기

## 폴더 구조

```
index.html            웹 페이지 (게임 화면이 들어가는 곳)
src/
  main.js             게임 시작점: 화면 크기, 장면 목록
  config.js           크기, 배치, 색상 같은 공용 값
  ui.js               버튼 같은 공용 화면 부품
  save.js             영구 기록 저장 (팁, 스테이지 별, 레시피 줄, 덱, 줄 경험치)
  cloud.js            ☁️ 클라우드 저장과 랭킹 (Firebase)
  firebase-config.js  Firebase 프로젝트 연결 정보 (공개용 값)
  effects.js          연출 (파티클, 빛 기둥, 화면 흔들림, 진동, 꽃가루)
  audio.js            효과음과 배경음악 (파일 없이 코드로 합성)
  eastereggs.js       🥚 이스터 에그 목록, 특별한 날 판별, 대사
  data/
    balance.js        웨이브 길이, 배고픔 증가율, 뽑기 비용, 손 힘 같은 밸런스 숫자
    monsters.js       🐭 몬스터 손님과 보스 손님
    chefs.js          레시피 줄 8개의 요리 목록, 등급, 칼질 횟수, 📖 신화 요리 8개와 조합표
    unlocks.js        🔓 계정 기준으로 하나씩 열리는 판 안 기능 (W10, 11, 16, 21, 31, 41)
    towns.js          🗺️ 동네 6개, 여정 진행(최고 웨이브, 동네 별), 기능이 열리는 동네
    runs.js           한 판의 설정 (여정, 오늘의 도전, 이벤트)
    missions.js       🎯 판 안 미션
    progress.js       판 끝 보상, 가게 강화, 줄 레벨, 랭킹 점수
    daily.js          🏆 오늘의 도전 (같은 운, 하루 3번)
    quests.js         📋 오늘의 주문서
    events.js         🎉 2주 이벤트
    items.js          🎁 상자(천장, 무료 상자), 🔪 주방 도구
    cosmetics.js      🎨 꾸미기 42개와 세트, 겹치면 돌려받는 팁
    rules.js          특별 규칙 합치기
    kitchens.js       주방 사고(불, 정전, 빠른 레일) 목록
  objects/
    Rail.js           회전 레일 경로 계산
    Monster.js        레일 위를 도는 몬스터 손님 하나 (배부름 막대, 좋아하는 요리 말풍선)
    Chef.js           소환진 위에서 칼질하고 요리를 던지는 요리 하나
    Projectile.js     포물선으로 날아가는 요리
  panels/
    RecipePanel.js    📖 신화 조합표 (아래에서 반쯤 올라오는 판)
    UpgradePanel.js   ⬆️ 종류별 강화 창
  art/                산타 모자 도트 그림
  scenes/
    BootScene.js      가장 먼저 열려서 그림을 준비
    TitleScene.js     첫 화면 (모험, 이벤트, 오늘의 도전, 주문서, 메뉴)
    JourneyScene.js   🗺️ 여정 (출발 동네 고르기, 이어 하기)
    DeckScene.js      🃏 덱 고르기
    GameScene.js      게임 화면 (웨이브, 뽑기, 칼질, 던지기, 합치기, 튜토리얼, 승패)
    ShopScene.js      🏪 가게 (상자, 도구, 꾸미기, 강화)
    CodexScene.js     📖 레시피 (줄 레벨, 만난 요리)
    RankingScene.js   🏆 랭킹 (오늘의 도전, 무한 모드)
```

## 사용한 것

- [Phaser](https://phaser.io) — 2D 게임 엔진 (MIT 라이선스)
- [갈무리(Galmuri)](https://galmuri.quiple.dev) — 한글 도트 글꼴, © Minseo Lee (SIL Open Font License 1.1)
- 산타 모자 도트 그림은 `src/art/sprites.js`에 글자 격자로 직접 그렸습니다.
- 요리, 몬스터 손님 그림은 기기에 들어 있는 컬러 이모지 글꼴로 표시합니다.
- 효과음과 배경음악은 `src/audio.js`에서 Web Audio로 직접 합성합니다.

## ☁️ 클라우드 저장 (Firebase)

- 저장 기록은 휴대폰(localStorage)과 Firebase Firestore `saves/{계정 id}`에 함께 저장됩니다.
- 랭킹은 `leaderboards/{daily_날짜 또는 endless}/scores/{계정 id}`에 계정마다 최고 점수 하나씩 저장됩니다.
- 보안 규칙은 `firestore.rules`에 있습니다. Firebase 콘솔 → Firestore Database → 규칙에 붙여 넣고 게시하세요.
- 인터넷이 없거나 Firebase가 준비되지 않았으면 휴대폰 저장만으로 그대로 플레이됩니다.

## 🙂 이모지 글꼴

폰마다 이모지 글꼴이 달라서 X로 보이는 일을 막으려고, 게임이 쓰는 이모지만 잘라 낸 Noto Color Emoji를 함께 넣었다 (`src/assets/emoji/`, `src/emojiFont.js`, 아이폰·맥은 원래 이모지).
새 이모지를 쓰면 `pip install fonttools brotli` 후 `python3 scripts/emoji-subset.py`로 다시 만든다.
