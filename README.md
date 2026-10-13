# 🍳 주방 디펜스

회전 레일 위를 도는 주문을 요리사들이 처리하는 **랜덤 타워 디펜스** 휴대폰 게임입니다.
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
  data/
    balance.js        웨이브 길이, 체력 증가율 같은 밸런스 숫자
    orders.js         주문(적) 종류와 능력치
    chefs.js          요리사 목록, 등급, 조리법별 능력치
  objects/
    Rail.js           회전 레일 경로 계산
    Order.js          레일 위를 도는 주문 하나 (감속, 지속 피해 포함)
    Chef.js           칸에 서서 주문을 공격하는 요리사 하나
    Projectile.js     요리사가 던지는 칼, 불덩이, 국물, 얼음
  panels/
    UpgradePanel.js   등급별 강화 창
  scenes/
    TitleScene.js     첫 화면 (제목, 시작 버튼)
    GameScene.js      게임 화면 (웨이브, 뽑기, 공격, 합성, 강화, 승패 판정)
```
