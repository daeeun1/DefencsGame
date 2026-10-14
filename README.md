# 🍳 주방 디펜스

회전 레일 위를 도는 주문을 요리(레시피 단계 유닛)로 처리하는 **랜덤 타워 디펜스** 휴대폰 게임입니다.
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
  save.js             영구 성장 기록 저장 (팁, 별, 강화, 도감)
  cloud.js            ☁️ 클라우드 저장 (Firebase 익명 로그인 + 구글 계정 연결)
  firebase-config.js  Firebase 프로젝트 연결 정보 (공개용 값)
  effects.js          연출 (파티클, 빛 기둥, 화면 흔들림, 진동, 꽃가루)
  audio.js            효과음과 배경음악 (파일 없이 코드로 합성)
  eastereggs.js       🥚 이스터 에그 목록, 특별한 날 판별, 대사
  data/
    balance.js        웨이브 길이, 체력 증가율 같은 밸런스 숫자
    orders.js         주문(적) 종류와 능력치
    chefs.js          레시피 줄(빵·고기·디저트·국물) 유닛 목록, 등급, 능력치, 신화 레시피
    progress.js       판 끝 보상, 가게 강화, 도감 숫자
    kitchens.js       주방(스테이지) 목록과 기믹
  objects/
    Rail.js           회전 레일 경로 계산
    Order.js          레일 위를 도는 주문 하나 (감속, 지속 피해 포함)
    Chef.js           소환진 위에서 주문을 공격하는 유닛 하나 (요리 이모지)
    Projectile.js     유닛이 던지는 빵 부스러기, 불덩이, 국물, 크림
  panels/
    UpgradePanel.js   등급별 강화 창
    RecipePanel.js    신화 레시피 창
  art/
    sprites.js        도트 그림 데이터 (글자 하나 = 점 하나)
    textures.js       도트 그림 데이터를 실제 그림으로 바꾸기
  scenes/
    BootScene.js      가장 먼저 열려서 도트 그림을 준비
    TitleScene.js     첫 화면 (제목, 팁과 별, 메뉴)
    KitchenSelectScene.js  주방 선택 화면
    ShopScene.js      가게 강화 화면
    CodexScene.js     레시피 도감 화면
    RankingScene.js   🏆 주방별 랭킹 화면
    GameScene.js      게임 화면 (웨이브, 뽑기, 공격, 합성, 강화, 승패 판정)
```

## 사용한 것

- [Phaser](https://phaser.io) — 2D 게임 엔진 (MIT 라이선스)
- [갈무리(Galmuri)](https://galmuri.quiple.dev) — 한글 도트 글꼴, © Minseo Lee (SIL Open Font License 1.1)
- 산타 모자 도트 그림은 `src/art/sprites.js`에 글자 격자로 직접 그렸습니다.
- 유닛, 주문, 손님 그림은 기기에 들어 있는 컬러 이모지 글꼴로 표시합니다.
- 효과음과 배경음악은 `src/audio.js`에서 Web Audio로 직접 합성합니다.

## ☁️ 클라우드 저장 (Firebase)

- 저장 기록은 휴대폰(localStorage)과 Firebase Firestore `saves/{계정 id}`에 함께 저장됩니다.
- 랭킹은 `leaderboards/{주방 id}/scores/{계정 id}`에 계정마다 최고 점수 하나씩 저장됩니다.
- 보안 규칙은 `firestore.rules`에 있습니다. Firebase 콘솔 → Firestore Database → 규칙에 붙여 넣고 게시하세요.
- 인터넷이 없거나 Firebase가 준비되지 않았으면 휴대폰 저장만으로 그대로 플레이됩니다.
