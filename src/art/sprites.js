// 도트(픽셀) 그림 데이터.
// 글자 하나가 점 하나이고, '.'은 투명이다. 글자마다 어떤 색인지는 PALETTE에 있다.
// 그림을 고치고 싶으면 글자를 바꾸면 된다. (한 줄의 글자 수가 같아야 한다)

export const PALETTE = {
  k: '#2b1d14', // 테두리 (진한 갈색)
  w: '#fff8ec', // 흰색
  s: '#f5c9a0', // 피부
  S: '#dca07a', // 피부 그늘
  e: '#2b1d14', // 눈
  r: '#e8564a', // 빨강
  R: '#a8322a', // 진한 빨강
  o: '#ff9a3c', // 주황
  y: '#ffd54f', // 노랑
  Y: '#e0a82e', // 진한 노랑
  g: '#c9c9d6', // 밝은 회색
  G: '#7b7b8b', // 회색
  b: '#9a6237', // 갈색
  B: '#b5503a', // 고기색
  l: '#6dc04a', // 연두
  L: '#3f8a35', // 초록
  c: '#a8e0ff', // 하늘색
  C: '#5fa8e0', // 파랑
  p: '#ff9ec7', // 분홍
  P: '#8e4fc0', // 보라
  N: '#2f3d6b', // 남색
  K: '#24402e', // 김(진한 초록)
  // 'A', 'a'는 요리사 앞치마 색. 등급마다 바꿔 끼운다
  // 'H'는 요리사 모자 색. 보통 흰색, 신화는 특별한 색
};

// ───────── 요리사 ─────────
// 16 x 16. 오른손(오른쪽 아래)은 비워 두고, 조리법 도구를 위에 겹쳐 그린다.
export const CHEF_BODY = [
  '....kkkkkk......',
  '...kHHHHHHk.....',
  '..kHHHHHHHHk....',
  '..kHHHHHHHHk....',
  '...kHHHHHHk.....',
  '...kggggggk.....',
  '...kssssssk.....',
  '...ksessesk.....',
  '...krssssrk.....',
  '....kSssSk......',
  '...kwwAAwwk.....',
  '..kwwAAAAwwk....',
  '..kswAAAAwsk....',
  '...kwAaaAwk.....',
  '...kwwkkwwk.....',
  '...kkk..kkk.....',
];

// 조리법 도구. at: 요리사 그림 위 어디에 겹칠지 (왼쪽 위 칸 기준)
export const TOOLS = {
  // 🔪 썰기: 식칼
  cut: {
    at: [11, 3],
    grid: [
      '.kk.', //
      'kgwk',
      'kgwk',
      'kgwk',
      'kgwk',
      'kggk',
      '.kk.',
      'kbbk',
      'kbbk',
      '.kk.',
    ],
  },
  // 🔥 굽기: 불꽃 위 프라이팬
  grill: {
    at: [9, 6],
    grid: [
      '...o...',
      '..oyo.o',
      '..oyyoo',
      '...ooo.',
      'kkkkkk.',
      'kGGGGkb',
      '.kkkk.b',
    ],
  },
  // 🍲 끓이기: 김 나는 냄비
  boil: {
    at: [9, 5],
    grid: [
      '..w.w..',
      '...w.w.',
      '.kkkkkk',
      'kgggggk',
      'kGGGGGk',
      'kGGGGGk',
      '.kkkkk.',
    ],
  },
  // ❄️ 차갑게: 얼음 조각
  chill: {
    at: [10, 7],
    grid: [
      '.kkkk.', //
      'kcwcck',
      'kccwck',
      'kCccck',
      '.kkkk.',
    ],
  },
  // 📣 지휘: 확성기
  buff: {
    at: [10, 7],
    grid: [
      '....k.', //
      '.kkkrk',
      'krrrrk',
      '.kkkrk',
      '....k.',
    ],
  },
  // 🌟 요리의 신: 황금 별
  all: {
    at: [9, 6],
    grid: [
      '...y...',
      '..yyy..',
      'yyyyyyy',
      '.yyyyy.',
      '.yy.yy.',
      'y.....y',
    ],
  },
  // 🧁 디저트 마녀: 컵케이크
  witch: {
    at: [10, 6],
    grid: [
      '..r...', //
      '.pppp.',
      'pppppp',
      'kbbbbk',
      '.kbbk.',
    ],
  },
};

// ───────── 주문 ─────────
export const ORDERS = {
  salad: [
    '................',
    '................',
    '................',
    '................',
    '.....L..l.L.....',
    '....lLlrlLlL....',
    '...LlrlLlLrlL...',
    '..kLlLlLlLlLlk..',
    '..kwwwwwwwwwwk..',
    '...kwwwwwwwwk...',
    '....kwwwwwwk....',
    '.....kkkkkk.....',
    '................',
    '................',
    '................',
    '................',
  ],
  steak: [
    '................',
    '................',
    '................',
    '................',
    '.....kkkkkk.....',
    '...kkBBBBBBkk...',
    '..kBBBwwBBBBBk..',
    '..kBBBBBwwBBBk..',
    '..kRBBBBBBwBBk..',
    '...kRBBBBBBBk...',
    '....kkRRRRkk....',
    '......kkkk......',
    '................',
    '................',
    '................',
    '................',
  ],
  ramen: [
    '................',
    '................',
    '...........kk...',
    '..........kk....',
    '.........kk.....',
    '...yyyyyyyyyy...',
    '..kyywwoyyyyyk..',
    '..kyyowoyyyyyk..',
    '..krrrrrrrrrrk..',
    '...krrwrrwrrk...',
    '....krrrrrrk....',
    '.....kkkkkk.....',
    '................',
    '................',
    '................',
    '................',
  ],
  bingsu: [
    '................',
    '................',
    '.......kk.......',
    '......kwwk......',
    '.....kwwppk.....',
    '....kwwppppk....',
    '...kwwwwpwwwk...',
    '..kwwbbwwwwwwk..',
    '..kcccccccccck..',
    '...kcCcccCcck...',
    '....kccccccck...',
    '.....kkkkkk.....',
    '................',
    '................',
    '................',
    '................',
  ],
  bento: [
    '................',
    '................',
    '................',
    '..kkkkkkkkkkkk..',
    '..kyykwwwwwklk..',
    '..kyykwwwwwkLk..',
    '..kkkkwwwwwkkk..',
    '..kBBkwwwwwkrk..',
    '..kBBkkkkkkkrk..',
    '..kkkkkkkkkkkk..',
    '..kRRRRRRRRRRk..',
    '...kkkkkkkkkk...',
    '................',
    '................',
    '................',
    '................',
  ],
  onigiri: [
    '................',
    '................',
    '................',
    '.......kk.......',
    '......kwwk......',
    '.....kwwwwk.....',
    '....kwwwwwwk....',
    '...kwwwwwwwwk...',
    '..kwwwKKKKwwwk..',
    '..kwwKKKKKKwwk..',
    '..kkkKKKKKKkkk..',
    '.....kkkkkk.....',
    '................',
    '................',
    '................',
    '................',
  ],
  rush: [
    '................',
    '................',
    '..........kkkk..',
    '.........krrrrk.',
    '.........krwwrk.',
    '.........krrrrk.',
    '...kk....kkkkkk.',
    '...kyk..kyyyyk..',
    '....kyyyyyyyyk..',
    '...kkyyyyyyyykk.',
    '..kGGk.kkkk.kGGk',
    '..kGgk......kGgk',
    '...kk........kk.',
    '................',
    '................',
    '................',
  ],
  picky: [
    '................',
    '................',
    '......kkkk......',
    '.....kGgGgk.....',
    '....kkkkkkkk....',
    '....kwwwwwwk....',
    '....kwwwwwwk....',
    '....kwGwwGwk....',
    '....kwwwwwwk....',
    '....kwwwwwwk....',
    '....kwwwwwwk....',
    '.....kkkkkk.....',
    '................',
    '................',
    '................',
    '................',
  ],
  // ── VIP 손님 ──
  critic: [
    '......kkkk......',
    '....kkPPPPkk....',
    '...kPPPPPPPPk...',
    '...kkkkkkkkkk...',
    '...kssssssssk...',
    '..kkGGGssssssk..',
    '..kGweGssseksk..',
    '..kkGGGssssssk..',
    '...kssssSSsssk..',
    '...kssskkkkssk..',
    '....kssssssk....',
    '.....kkkkkk.....',
    '....kwwkkwwk....',
    '...kwwwkkwwwk...',
    '..kNNNwkkwNNNk..',
    '..kkkkkkkkkkkk..',
  ],
  chaebol: [
    '.....kkkkkk.....',
    '....kKKKKKKk....',
    '...kKKKKKKKKk...',
    '...kKssssssKk...',
    '...kkkkkkkkkk...',
    '...kkkksskkkk...',
    '...kssssssssk...',
    '...kssskkSssk...',
    '....kssssssk....',
    '.....kkkkkk.....',
    '...kkkwrrwkkk...',
    '..kNNNwrrwNNNk..',
    '..kNNNNrrNNNNk..',
    '..kNNNNyNNNNNk..',
    '..kNNNNNNNNNNk..',
    '..kkkkkkkkkkkk..',
  ],
  king: [
    '...y...y...y....',
    '...kyk.ky.kyk...',
    '...kyykyykyyk...',
    '...kyyryycyyk...',
    '...kkkkkkkkkk...',
    '...kssssssssk...',
    '...ksessssesk...',
    '...kssssssssk...',
    '...kwwwSSwwwk...',
    '...kwwwwwwwwk...',
    '....kwwwwwwk....',
    '.....kwwwwk.....',
    '..kRRRkkkkRRRk..',
    '..kRRRRyyRRRRk..',
    '..kRRRRyyRRRRk..',
    '..kkkkkkkkkkkk..',
  ],
};
