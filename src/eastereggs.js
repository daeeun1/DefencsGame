import { getSave, writeSave } from './save.js';

// 🥚 이스터 에그 모음.
// 찾은 이스터 에그는 기록에 저장되고, 도감 화면에 찾은 개수가 표시된다.

export const EGGS = {
  pot: '♨️ 냄비가 넘쳤다',
  ramen: '🍜 황금 라면',
  pet: '😊 요리사 쓰다듬기',
  dishwasher: '🧽 설거지 담당',
  golden: '✨ 황금 주문',
  streak: '🎉 오늘은 ○○의 날',
  gg: '🎮 GG',
  critic: '🧐 평론가의 복수',
  maker: '📜 만든 사람의 레시피',
  holiday: '🎅 특별한 날',
  midnight: '🌙 야식 타임',
};

export const EGG_TOTAL = Object.keys(EGGS).length;

// 이스터 에그를 찾았다고 기록한다. 처음 찾은 것이면 true
export function findEgg(id) {
  const save = getSave();
  save.eggs ??= [];
  if (save.eggs.includes(id)) return false;
  save.eggs.push(id);
  writeSave();
  return true;
}

export function eggCount() {
  return (getSave().eggs ?? []).length;
}

// ───────── 특별한 날 ─────────

// 크리스마스 주간 (12월 20일 ~ 26일)
export function isChristmas(date = new Date()) {
  return date.getMonth() === 11 && date.getDate() >= 20 && date.getDate() <= 26;
}

// 설날 (음력이라 해마다 날짜가 다르다). 설날 앞뒤 하루씩 포함
const SEOLLAL = ['2026-02-17', '2027-02-06', '2028-01-26', '2029-02-13', '2030-02-03', '2031-01-23', '2032-02-11'];
export function isSeollal(date = new Date()) {
  return SEOLLAL.some((day) => {
    const [y, m, d] = day.split('-').map(Number);
    const diff = (date - new Date(y, m - 1, d)) / 86400000;
    return diff >= -1 && diff < 2;
  });
}

// 새벽 3시
export function isLateNight(date = new Date()) {
  return date.getHours() === 3;
}

// ───────── 대사 ─────────

// 요리사를 꾹 눌러 쓰다듬었을 때 (조리법별)
export const PET_LINES = {
  cut: ['헤헤, 칼 조심하세요!', '오늘 칼질이 잘 되네요!', '쓱싹쓱싹~'],
  grill: ['앗 뜨거! 아니 부끄러워요', '불 맛 좀 보실래요?', '지글지글~'],
  boil: ['보글보글~ 기분 좋아요', '국물이 끝내줘요!', '냄비 넘치면 안 되는데...'],
  chill: ['으슬으슬... 아니 설레요!', '시원하시죠?', '얼음처럼 차갑지만 마음은 따뜻해요'],
  buff: ['자, 다들 힘내!', '오늘 영업도 잘 부탁해요!', '사장님 최고!'],
  all: ['요리는 사랑이란다', '모든 맛은 하나로 통하지', '...후후'],
};

// 평론가에게 졌을 때 나오는 혹평 리뷰
export const CRITIC_REVIEWS = [
  '45초를 기다렸지만 물 한 잔도 나오지 않았다. ★☆☆☆☆',
  '레일 위 음식들이 나보다 더 오래 기다린 것 같다.',
  '요리사는 많았으나 요리는 없었다. 다시는 오지 않겠다.',
  '서비스 속도: 달팽이가 배달하는 편이 빠를 듯.',
  '인테리어는 귀엽다. 그게 전부다.',
];

// 도감을 다 채웠을 때 열리는 "만든 사람의 레시피"
export const MAKER_RECIPE = [
  '📜 만든 사람의 레시피',
  '',
  '재료',
  '· 스타 랜디의 추억 한 스푼',
  '· 정신없는 주방 한 접시',
  '· "이것도 넣자!" 아이디어 듬뿍',
  '· 끝까지 플레이해 준 당신 (가장 중요)',
  '',
  '만드는 법',
  '1. 아이디어를 Claude와 함께 버무린다',
  '2. 한 단계씩 만들고, 직접 맛본다',
  '3. 웃음이 날 때까지 고친다',
  '',
  '도감을 모두 채워 줘서 고마워요!',
].join('\n');
