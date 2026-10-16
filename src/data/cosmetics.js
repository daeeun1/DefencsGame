// 🎨 꾸미기: 강해지지는 않고 모양만 바뀐다. 상자에서 나오고, 같은 게 또 나오면 팁으로 돌려받는다.
//
// 칸 5개
//   hat    요리 위 모자 (emoji)
//   floor  판 바닥 색 두 가지 (colors)
//   rail   손님이 도는 레일 색 (rail: [바탕, 안쪽, 마디])
//   trail  던진 요리 뒤에 남는 꼬리 (emojis)
//   feed   손님 배가 찰 때 터지는 효과 (emojis)
//
// 테마(세트): 같은 테마 5칸을 다 모으면 칭호를 받는다. event가 있는 테마는 그 이벤트 기간에만 나온다.

export const COSMETIC_SLOTS = [
  { id: 'hat', emoji: '🎩', name: '모자' },
  { id: 'floor', emoji: '⬛', name: '바닥' },
  { id: 'rail', emoji: '🛤️', name: '레일' },
  { id: 'trail', emoji: '✨', name: '꼬리' },
  { id: 'feed', emoji: '😋', name: '배부름' },
];

export const THEMES = [
  { id: 'basic', emoji: '🛒', name: '기본', title: null },
  { id: 'strawberry', emoji: '🍓', name: '딸기', title: '🍓 딸기 사장님' },
  { id: 'ocean', emoji: '🌊', name: '바다', title: '🌊 바다 사장님' },
  { id: 'sakura', emoji: '🌸', name: '벚꽃', title: '🌸 벚꽃 사장님' },
  { id: 'space', emoji: '🚀', name: '우주', title: '🚀 우주 사장님' },
  { id: 'halloween', emoji: '🎃', name: '할로윈', title: '🎃 할로윈 사장님', event: 'halloween' },
  { id: 'christmas', emoji: '🎄', name: '크리스마스', title: '🎄 크리스마스 사장님', event: 'christmas' },
  { id: 'golden', emoji: '👑', name: '황금', title: '👑 황금 사장님' },
];

const item = (id, slot, theme, tier, name, emoji, extra = {}) => ({ id, slot, theme, tier, name, emoji, ...extra });

export const COSMETICS = [
  // 🛒 기본 (테마 없음)
  item('cap', 'hat', 'basic', 1, '야구 모자', '🧢'),
  item('grad', 'hat', 'basic', 1, '학사모', '🎓'),
  item('mint', 'floor', 'basic', 1, '민트 체크', '🍃', { colors: [0xd9f2e6, 0xc2e6d4] }),
  item('lemon', 'floor', 'basic', 1, '레몬 체크', '🍋', { colors: [0xfff5c2, 0xf5e79e] }),
  item('wood_rail', 'rail', 'basic', 1, '나무 레일', '🌲', { rail: [0x8a5a34, 0xa06c42, 0x7a4e2c] }),
  item('dust', 'trail', 'basic', 1, '흙먼지', '💨', { emojis: ['💨'] }),
  item('yum', 'feed', 'basic', 1, '냠냠', '😋', { emojis: ['😋', '👍'] }),
  // 🍓 딸기
  item('ribbon', 'hat', 'strawberry', 1, '리본', '🎀'),
  item('strawberry', 'floor', 'strawberry', 1, '딸기 우유', '🍓', { colors: [0xfde2ea, 0xf6c9d7] }),
  item('candy_rail', 'rail', 'strawberry', 2, '딸기 사탕 레일', '🍬', { rail: [0xe86a8a, 0xf59ab2, 0xd85578] }),
  item('berry_trail', 'trail', 'strawberry', 2, '딸기 꼬리', '🍓', { emojis: ['🍓'] }),
  item('heart_pop', 'feed', 'strawberry', 2, '하트 팡', '💖', { emojis: ['💖', '💕'] }),
  // 🌊 바다
  item('straw', 'hat', 'ocean', 2, '밀짚모자', '👒'),
  item('sea', 'floor', 'ocean', 2, '푸른 바다', '🐚', { colors: [0xcfeaf7, 0xb3dcf0] }),
  item('wave_rail', 'rail', 'ocean', 2, '파도 레일', '🌊', { rail: [0x3d7fb8, 0x5a9ad0, 0x336fa3] }),
  item('drop_trail', 'trail', 'ocean', 2, '물방울 꼬리', '💧', { emojis: ['💧'] }),
  item('shell_pop', 'feed', 'ocean', 2, '조개 팡', '🐚', { emojis: ['🐚', '🐠'] }),
  // 🌸 벚꽃
  item('blossom', 'hat', 'sakura', 2, '벚꽃 핀', '🌸'),
  item('sakura', 'floor', 'sakura', 3, '벚꽃길', '🌸', { colors: [0xffe4f0, 0xf6c2da] }),
  item('pink_rail', 'rail', 'sakura', 2, '분홍 나무 레일', '🌷', { rail: [0xc77d9e, 0xdb9ab6, 0xb56c8c] }),
  item('petal_trail', 'trail', 'sakura', 3, '꽃잎 꼬리', '🌸', { emojis: ['🌸'] }),
  item('flower_pop', 'feed', 'sakura', 3, '꽃가루', '🌼', { emojis: ['🌸', '🌼', '🌷'] }),
  // 🚀 우주
  item('silk', 'hat', 'space', 3, '실크햇', '🎩'),
  item('night', 'floor', 'space', 2, '밤하늘', '🌙', { colors: [0x4a4f80, 0x3c406c] }),
  item('galaxy_rail', 'rail', 'space', 3, '은하 레일', '🌌', { rail: [0x2b2b52, 0x3d3d70, 0x24244a] }),
  item('star_trail', 'trail', 'space', 3, '별똥별 꼬리', '⭐', { emojis: ['⭐', '✨'] }),
  item('planet_pop', 'feed', 'space', 3, '로켓 팡', '🚀', { emojis: ['🚀', '🌟'] }),
  // 🎃 할로윈 (10월 이벤트에만)
  item('pumpkin_hat', 'hat', 'halloween', 3, '호박 모자', '🎃'),
  item('pumpkin_floor', 'floor', 'halloween', 3, '호박밭', '🎃', { colors: [0xf5c38a, 0xe8a868] }),
  item('web_rail', 'rail', 'halloween', 3, '거미줄 레일', '🕸️', { rail: [0x3d2a4a, 0x5a3f6b, 0x332240] }),
  item('bat_trail', 'trail', 'halloween', 3, '박쥐 꼬리', '🦇', { emojis: ['🦇'] }),
  item('ghost_pop', 'feed', 'halloween', 3, '유령 팡', '👻', { emojis: ['👻', '🍬'] }),
  // 🎄 크리스마스 (12월 이벤트에만)
  item('santa_face', 'hat', 'christmas', 3, '산타 모자', '🎅'),
  item('snow_floor', 'floor', 'christmas', 3, '눈밭', '⛄', { colors: [0xf4f8ff, 0xdde8f5] }),
  item('candy_cane_rail', 'rail', 'christmas', 3, '지팡이 사탕 레일', '🍭', { rail: [0xc93a3a, 0xe8e8e8, 0xb02e2e] }),
  item('snow_trail', 'trail', 'christmas', 3, '눈송이 꼬리', '❄️', { emojis: ['❄️'] }),
  item('gift_pop', 'feed', 'christmas', 3, '선물 팡', '🎁', { emojis: ['🎁', '🎄'] }),
  // 👑 황금 (전설)
  item('crown', 'hat', 'golden', 4, '왕관', '👑'),
  item('gold', 'floor', 'golden', 4, '황금 주방', '✨', { colors: [0xffe9a8, 0xf5d77a] }),
  item('gold_rail', 'rail', 'golden', 4, '황금 레일', '🏆', { rail: [0xc99a2e, 0xe0b84a, 0xb58a26] }),
  item('sparkle_trail', 'trail', 'golden', 4, '반짝이 꼬리', '✨', { emojis: ['✨', '💫'] }),
  item('firework_pop', 'feed', 'golden', 4, '폭죽', '🎉', { emojis: ['🎉', '🎊', '✨'] }),
];

// 같은 꾸미기가 또 나오면 돌려받는 팁 (등급별)
export const DUPLICATE_TIPS = { 1: 20, 2: 40, 3: 80, 4: 200 };

export function cosmeticById(id) {
  return COSMETICS.find((c) => c.id === id);
}

export function themeById(id) {
  return THEMES.find((t) => t.id === id);
}

// 지금 얻을 수 있는 꾸미기인지 (이벤트 테마는 그 이벤트 기간에만)
export function isAvailable(cosmetic, eventId) {
  const theme = themeById(cosmetic.theme);
  return !theme.event || theme.event === eventId;
}

// 테마(세트) 진행: { theme, have, total, done }
export function themeProgress(owned) {
  return THEMES.filter((t) => t.title).map((theme) => {
    const items = COSMETICS.filter((c) => c.theme === theme.id);
    const have = items.filter((c) => owned.includes(c.id)).length;
    return { theme, have, total: items.length, done: have === items.length };
  });
}
