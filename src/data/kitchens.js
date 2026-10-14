// 주방(스테이지) 목록.
// unlockStars: 열리려면 필요한 별 (모든 주방 최고 별의 합)
// tipBonus: 이 주방에서 받는 팁 배율
// floor: 요리사 자리 바닥 체크무늬 색 두 가지
// gimmick: 주방마다 다른 방해 요소
//   rush     — every초마다 duration초 동안 주문이 factor배 빨라진다
//   fire     — every초마다 무작위 칸에 불이 붙어, 그 칸의 요리사가 duration초 동안 쉰다
//   blackout — every초마다 판 절반이 duration초 동안 어두워져, 그쪽 요리사 사거리가 rangeFactor배가 된다

export const KITCHENS = [
  {
    id: 'snack_bar',
    emoji: '🏠',
    name: '동네 분식집',
    desc: '기본 주방',
    unlockStars: 0,
    tipBonus: 1,
    floor: [0xf3e3c3, 0xe8d3ab],
    gimmick: null,
  },
  {
    id: 'sushi_bar',
    emoji: '🍣',
    name: '회전초밥집',
    desc: '레일이 가끔 빨라져요',
    unlockStars: 2,
    tipBonus: 1.2,
    floor: [0xe6f0f2, 0xcfe0e4],
    gimmick: { type: 'rush', every: 20, duration: 5, factor: 1.6 },
  },
  {
    id: 'chinese',
    emoji: '🔥',
    name: '불난 중식당',
    desc: '칸에 불이 붙으면 요리사가 쉬어요',
    unlockStars: 4,
    tipBonus: 1.4,
    floor: [0xf6d9c8, 0xebc1a8],
    gimmick: { type: 'fire', every: 7, duration: 4 },
  },
  {
    id: 'blackout',
    emoji: '💡',
    name: '정전된 레스토랑',
    desc: '판 절반이 어두워지면 사거리가 줄어요',
    unlockStars: 6,
    tipBonus: 1.6,
    floor: [0xd8d4e6, 0xc4bfd6],
    gimmick: { type: 'blackout', every: 15, duration: 6, rangeFactor: 0.6 },
  },
];

export function kitchenById(id) {
  return KITCHENS.find((k) => k.id === id) ?? KITCHENS[0];
}
