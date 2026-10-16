// 🐾 배고픈 몬스터 손님 (적).
// 몬스터는 레일을 돌며 요리를 기다린다. 요리를 던져 배를 꽉 채우면 팁(골드)을 남기고 떠난다.
// 레일에 몬스터가 너무 많이 쌓이면 식당이 망한다.
//
// hp: 1웨이브 기준 배고픔 (배를 채우는 데 필요한 양). 웨이브가 오를수록 커진다
// speed: 레일 위 이동 속도 배율 (1 = 보통)
// likes: 좋아하는 레시피 줄. 이 줄 요리를 먹으면 배가 2배로 찬다. 머리 위 말풍선에 보인다
//        'random'이면 나올 때마다 바뀐다 (까다로운 손님: 좋아하는 것 말고는 절반만 먹는다)
// reward: 배가 차서 떠날 때 남기는 팁 (웨이브가 오르면 조금씩 늘어난다)
// slowResist: 감속에 덜 걸리는 정도 (0.5면 감속 효과가 절반)
// size: 그림 크기 (기본 56)

export const MONSTERS = {
  // ── 동네 1~2 ──
  mouse: { name: '생쥐', emoji: '🐭', hp: 30, speed: 1.0, likes: 'cut', reward: 2 },
  dog: { name: '강아지', emoji: '🐶', hp: 55, speed: 0.75, likes: 'grill', reward: 3 },
  cat: { name: '고양이', emoji: '🐱', hp: 25, speed: 1.45, likes: 'boil', reward: 2 },
  bear: { name: '곰', emoji: '🐻', hp: 80, speed: 0.6, likes: 'chill', reward: 4, slowResist: 0.3, size: 64 },

  // ── 동네 3~4 ──
  rabbit: { name: '토끼', emoji: '🐰', hp: 18, speed: 2.0, likes: 'chill', reward: 3, size: 48 },
  // 암탉: 배가 차면 병아리 3마리가 나온다
  hen: { name: '암탉', emoji: '🐔', hp: 45, speed: 0.85, likes: null, reward: 3, splitInto: { type: 'chick', count: 3 } },
  chick: { name: '병아리', emoji: '🐤', hp: 12, speed: 1.2, likes: 'cut', reward: 1, size: 40 },
  panda: { name: '판다', emoji: '🐼', hp: 60, speed: 0.8, likes: 'noodle', reward: 3, size: 60 },
  fox: { name: '여우', emoji: '🦊', hp: 40, speed: 1.0, likes: 'random', reward: 4, picky: true },
  seagull: { name: '갈매기', emoji: '🐦', hp: 22, speed: 1.7, likes: 'sea', reward: 3, size: 48 },

  // ── 동네 5~6 ──
  penguin: { name: '펭귄', emoji: '🐧', hp: 45, speed: 1.1, likes: 'drink', reward: 3, slowResist: 0.5 },
  seal: { name: '아기 고래', emoji: '🐳', hp: 75, speed: 0.7, likes: 'sea', reward: 4, size: 62 },
  lizard: { name: '도마뱀', emoji: '🦎', hp: 30, speed: 1.55, likes: 'fry', reward: 3 },
  boar: { name: '멧돼지', emoji: '🐗', hp: 90, speed: 0.8, likes: 'grill', reward: 4, size: 62 },
  raccoon: { name: '햄스터', emoji: '🐹', hp: 40, speed: 1.2, likes: 'fry', reward: 3 },

  // ── 🎃 이벤트 손님 ──
  pumpkin: { name: '호박 유령', emoji: '🎃', hp: 50, speed: 0.9, likes: 'chill', reward: 4 },
  ghost: { name: '꼬마 유령', emoji: '👻', hp: 20, speed: 1.8, likes: 'random', reward: 3, picky: true },

  // ── 🥚 이스터 에그 손님 ──
  gg: { name: 'GG', emoji: '👾', hp: 30, speed: 1.0, likes: 'cut', reward: 5 },
  tiger: { name: '설날 호랑이', emoji: '🐯', hp: 35, speed: 0.9, likes: 'boil', reward: 3 },

  // ── 보스 손님 (동네마다 마지막 스테이지) ──
  // 보스 배고픔은 웨이브에 따라 커지지 않는 고정값 (스테이지 배율만 곱한다)
  owl: {
    name: '부엉이 평론가',
    emoji: '🦉',
    hp: 1600,
    speed: 0.6,
    likes: 'cut',
    reward: 60,
    slowResist: 0.5,
    size: 84,
    boss: true,
  },
  pig: {
    name: '돼지 부자',
    emoji: '🐷',
    hp: 3000,
    speed: 0.6,
    likes: 'grill',
    reward: 120,
    slowResist: 0.5,
    size: 84,
    boss: true,
    // 4초마다 "빨리빨리!": 주변 220 안의 손님이 2.5초 동안 1.6배 빨라진다
    rush: { every: 4, radius: 220, factor: 1.6, duration: 2.5 },
  },
  lion: {
    name: '숲의 사자 왕',
    emoji: '🦁',
    hp: 4000,
    speed: 0.55,
    likes: 'chill',
    reward: 150,
    slowResist: 0.5,
    size: 88,
    boss: true,
    // 6초마다 "간식 꿀꺽": 배가 조금 꺼진다 (배고픔 8% 회복)
    snack: { every: 6, heal: 0.08 },
  },
  octopus: {
    name: '문어 선장',
    emoji: '🐙',
    hp: 4600,
    speed: 0.55,
    likes: 'sea',
    reward: 180,
    slowResist: 0.5,
    size: 88,
    boss: true,
    // 10초마다 먹물: 판 절반이 4초 동안 어두워져 사거리가 줄어든다
    ink: { every: 10, duration: 4, rangeFactor: 0.6 },
  },
  snowman: {
    name: '눈사람 대장',
    emoji: '⛄',
    hp: 6000,
    speed: 0.5,
    likes: 'boil',
    reward: 200,
    slowResist: 0.7,
    size: 88,
    boss: true,
    // 7초마다 눈보라: 요리 하나가 3초 동안 얼어서 쉰다
    blizzard: { every: 7, duration: 3 },
  },
  dragon: {
    name: '미식 드래곤',
    emoji: '🐉',
    hp: 9000,
    speed: 0.5,
    likes: 'cut',
    reward: 0,
    slowResist: 0.5,
    size: 96,
    boss: true,
    // 배가 1/4씩 찰 때마다 좋아하는 요리가 바뀐다 (덱 안의 줄 중에서)
    likesCycle: true,
  },
};

// 좋아하는 요리를 먹으면 배가 차는 배율
export const LIKE_MULTIPLIER = 2;

// 까다로운 손님이 좋아하지 않는 요리를 먹으면
export const PICKY_MULTIPLIER = 0.5;

// 배를 채울 때 튀는 조각 색
export const MONSTER_COLORS = {
  mouse: [0xc9c9d6, 0xff9ec7],
  dog: [0xc98a4a, 0xfff8ec],
  cat: [0xffb35a, 0xfff8ec],
  bear: [0x9a6237, 0x5a3a20],
  rabbit: [0xfff8ec, 0xff9ec7],
  hen: [0xfff8ec, 0xe8564a],
  chick: [0xffd54f, 0xff9a3c],
  panda: [0xfff8ec, 0x2b2b2b],
  fox: [0xff9a3c, 0xfff8ec],
  seagull: [0xfff8ec, 0x9aa4b2],
  penguin: [0x2b2b2b, 0xfff8ec, 0xffd54f],
  seal: [0x9aa4b2, 0x6b7380],
  lizard: [0x6dc04a, 0x3f8a35],
  boar: [0x7a4a2a, 0xfff8ec],
  raccoon: [0x8a8a8a, 0x3d3d3d],
  pumpkin: [0xff9a3c, 0x3f8a35],
  ghost: [0xfff8ec, 0xc9c9d6],
  gg: [0xffd54f, 0x2b1d14],
  tiger: [0xff9a3c, 0x2b1d14],
  owl: [0x9a6237, 0xffd54f, 0xfff8ec],
  pig: [0xff9ec7, 0xffd54f],
  lion: [0xffd54f, 0xc98a4a],
  octopus: [0xe8564a, 0x8e4fc0],
  snowman: [0xfff8ec, 0x9fd8ff],
  dragon: [0x6dc04a, 0xe8564a, 0xffd54f],
};
