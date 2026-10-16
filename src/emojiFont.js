// 🙂 게임에 들어 있는 이모지 글꼴 (Noto Color Emoji에서 이 게임이 쓰는 이모지만 잘라 낸 것, SIL OFL)
// 폰마다 이모지 글꼴이 달라서 X(빈 네모)로 보이는 일을 막는다. 이모지를 새로 쓰면 scripts/emoji-subset.py로 다시 만든다.

import url0 from './assets/emoji/emoji1.woff2?url';
import url1 from './assets/emoji/emoji2.woff2?url';
import url2 from './assets/emoji/emoji3.woff2?url';
import url3 from './assets/emoji/emoji4.woff2?url';
import url4 from './assets/emoji/emoji5.woff2?url';
import url5 from './assets/emoji/emoji6.woff2?url';
import url6 from './assets/emoji/emoji7.woff2?url';
import url7 from './assets/emoji/emoji8.woff2?url';
import url8 from './assets/emoji/emoji9.woff2?url';

export const EMOJI_FACES = [
  { url: url0, range: 'U+1F308, U+1F3C1' },
  { url: url1, range: 'U+23E9, U+23F8, U+25B6, U+2668, U+26A0, U+2705, U+2753, U+2B06, U+2B1B, U+2B1C, U+1F193, U+1F3B5, U+1F49C, U+1F4AC, U+1F4F3, U+1F4F4, U+1F500, U+1F501, U+1F504, U+1F507, U+1F6AB' },
  { url: url2, range: 'U+231B, U+23F3, U+2694, U+2699, U+270F, U+1F392, U+1F393, U+1F3A9, U+1F451, U+1F452, U+1F455, U+1F4A1, U+1F4B0, U+1F4B8, U+1F4CB, U+1F4D6, U+1F4DC, U+1F50A, U+1F512, U+1F513, U+1F517, U+1F5E1, U+1F6CE, U+1F6D2, U+1F9E2, U+1F9E4' },
  { url: url3, range: 'U+1F0CF, U+1F380, U+1F381, U+1F382, U+1F383, U+1F384, U+1F389, U+1F38A, U+1F38D, U+1F39F, U+1F3A8, U+1F3A9, U+1F3AE, U+1F3AF, U+1F3B2, U+1F3C5, U+1F3C6, U+1F47E, U+1F947, U+1F948, U+1F949' },
  { url: url4, range: 'U+1F3E0, U+1F3EA, U+1F5FA, U+1F680, U+1F6E4' },
  { url: url5, range: 'U+2615, U+1F336, U+1F34B, U+1F353, U+1F354, U+1F356, U+1F357, U+1F35C, U+1F35D, U+1F35E, U+1F35F, U+1F362, U+1F363, U+1F364, U+1F365, U+1F367, U+1F36C, U+1F36D, U+1F370, U+1F371, U+1F372, U+1F373, U+1F375, U+1F379, U+1F37D, U+1F382, U+1F52A, U+1F950, U+1F954, U+1F955, U+1F956, U+1F958, U+1F95A, U+1F95B, U+1F95F, U+1F962, U+1F963, U+1F964, U+1F969, U+1F96A' },
  { url: url6, range: 'U+2601, U+26C4, U+2728, U+2744, U+2B1B, U+2B50, U+1F308, U+1F30A, U+1F30B, U+1F30C, U+1F319, U+1F31F, U+1F331, U+1F332, U+1F333, U+1F337, U+1F338, U+1F33C, U+1F33E, U+1F33F, U+1F340, U+1F343, U+1F3D4, U+1F3D6, U+1F409, U+1F414, U+1F417, U+1F419, U+1F41A, U+1F41F, U+1F420, U+1F424, U+1F426, U+1F427, U+1F42D, U+1F42F, U+1F430, U+1F431, U+1F433, U+1F436, U+1F437, U+1F439, U+1F43B, U+1F43C, U+1F43E, U+1F4A7, U+1F525, U+1F578, U+1F980, U+1F981, U+1F987, U+1F989, U+1F98A, U+1F98E, U+1F990, U+1F991' },
  { url: url7, range: 'U+1F33E, U+1F373, U+1F384, U+1F385, U+1F393, U+1F3A8, U+1F3C3, U+1F430, U+1F680' },
  { url: url8, range: 'U+26C4, U+2728, U+2B50, U+1F31F, U+1F389, U+1F38A, U+1F446, U+1F44D, U+1F47B, U+1F47E, U+1F495, U+1F496, U+1F49C, U+1F4A4, U+1F4A6, U+1F4A8, U+1F4AA, U+1F4AB, U+1F525, U+1F60A, U+1F60B, U+1F635, U+1F642' },
];
