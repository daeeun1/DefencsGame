import { getSave, writeSave } from './save.js';

// 소리: 효과음과 배경음악을 파일 없이 코드로 직접 만든다 (8비트 게임기 느낌).
// 브라우저는 사용자가 화면을 한 번 누르기 전에는 소리를 낼 수 없어서, 첫 터치 때 소리를 켠다.

let ctx = null;
let sfxGain = null;
let musicGain = null;
const lastPlayed = {}; // 너무 자주 나는 소리(공격, 처리)를 줄이기 위한 마지막 재생 시각

// 설정 묶음 (예전 기록에 설정이 없으면 새로 만든다). 값이 비어 있으면 "켬"으로 본다.
function settings() {
  const save = getSave();
  if (!save.settings) save.settings = { sfx: true, music: true, vibration: true };
  return save.settings;
}

function audio() {
  if (ctx) return ctx;
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return null;
  ctx = new AudioContext();
  sfxGain = ctx.createGain();
  musicGain = ctx.createGain();
  sfxGain.connect(ctx.destination);
  musicGain.connect(ctx.destination);
  applyVolumes();
  return ctx;
}

function applyVolumes() {
  if (!ctx) return;
  const s = settings();
  sfxGain.gain.value = s.sfx ? 0.5 : 0;
  musicGain.gain.value = s.music ? 0.22 : 0;
}

// 첫 터치 때 소리 켜기, 다른 앱으로 넘어가면 소리 멈추기
if (typeof document !== 'undefined') {
  const unlock = () => audio()?.resume();
  document.addEventListener('pointerdown', unlock);
  document.addEventListener('keydown', unlock);
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });
}

// ───────── 설정 ─────────

export function isOn(kind) {
  return settings()[kind] !== false;
}

export function toggle(kind) {
  const s = settings();
  s[kind] = !isOn(kind);
  writeSave();
  applyVolumes();
  return s[kind];
}

// ───────── 소리 재료 ─────────

const midiToFreq = (n) => 440 * 2 ** ((n - 69) / 12);

// 음 하나: 주파수, 길이(초), 파형, 크기, 끝 주파수(미끄러지기), 시작 지연
function tone(freq, duration, { type = 'square', volume = 0.3, slideTo = null, delay = 0, out = sfxGain } = {}) {
  const c = audio();
  if (!c || c.state !== 'running') return;
  const t = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(gain).connect(out);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

// 치익 하는 잡음 (불, 북소리 등)
function noise(duration, { volume = 0.2, delay = 0, highpass = 1000, out = sfxGain } = {}) {
  const c = audio();
  if (!c || c.state !== 'running') return;
  const t = c.currentTime + delay;
  const buffer = c.createBuffer(1, Math.ceil(c.sampleRate * duration), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = highpass;
  const gain = c.createGain();
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
  src.connect(filter).connect(gain).connect(out);
  src.start(t);
}

// 음 여러 개를 차례로 (아르페지오)
function arpeggio(notes, step, options = {}) {
  notes.forEach((n, i) => tone(midiToFreq(n), step * 1.6, { ...options, delay: i * step }));
}

// 같은 소리가 minGap초 안에 또 나면 건너뛴다
function throttle(key, minGap) {
  const now = performance.now() / 1000;
  if (lastPlayed[key] && now - lastPlayed[key] < minGap) return false;
  lastPlayed[key] = now;
  return true;
}

// ───────── 효과음 ─────────

export const sfx = {
  click: () => tone(880, 0.05, { volume: 0.15 }),
  denied: () => tone(140, 0.12, { type: 'sawtooth', volume: 0.15 }),

  // 뽑기: 등급이 높을수록 음이 많고 높아진다
  summon: (tier) => {
    const runs = { 1: [72, 76], 2: [72, 76, 79, 84], 3: [72, 76, 79, 84, 88, 91] };
    arpeggio(runs[tier] ?? runs[1], 0.06, { volume: 0.2 });
  },
  merge: (tier) => {
    tone(midiToFreq(60 + tier * 4), 0.12, { volume: 0.2, slideTo: midiToFreq(72 + tier * 4) });
    arpeggio([84, 88, 91, 96].slice(0, tier), 0.05, { delay: 0.1, volume: 0.15, type: 'triangle' });
  },
  mythic: () => {
    arpeggio([60, 64, 67, 72, 76, 79, 84, 88, 91, 96], 0.05, { volume: 0.22 });
    arpeggio([72, 76, 79, 84], 0.15, { volume: 0.18, type: 'triangle' });
  },

  // 손님 배부름: 동전 소리 (자주 나니까 간격 제한)
  serve: () => {
    if (!throttle('serve', 0.06)) return;
    tone(1318, 0.05, { volume: 0.12 });
    tone(1760, 0.12, { volume: 0.12, delay: 0.05 });
  },
  // 요리 던지기: 레시피 줄마다 다른 짧은 소리 (아주 작게, 간격 제한)
  attack: (method) => {
    if (!throttle('attack', 0.09)) return;
    if (method === 'cut') tone(1200, 0.03, { volume: 0.05, slideTo: 600 });
    else if (method === 'grill') noise(0.08, { volume: 0.06, highpass: 600 });
    else if (method === 'boil') tone(300, 0.06, { type: 'sine', volume: 0.08, slideTo: 500 });
    else if (method === 'chill') tone(2000, 0.05, { type: 'triangle', volume: 0.05 });
    else tone(1500, 0.05, { type: 'triangle', volume: 0.06, slideTo: 2200 });
  },

  bossAppear: () => {
    tone(110, 0.5, { type: 'sawtooth', volume: 0.25, slideTo: 82 });
    tone(165, 0.5, { type: 'square', volume: 0.15, slideTo: 123, delay: 0.05 });
    noise(0.5, { volume: 0.15, highpass: 200 });
  },
  bossDefeat: () => arpeggio([67, 72, 76, 79, 84], 0.08, { volume: 0.22 }),
  freeze: () => tone(2400, 0.6, { type: 'triangle', volume: 0.15, slideTo: 600 }),
  rush: () => [0, 0.15, 0.3].forEach((d) => tone(880, 0.1, { volume: 0.15, delay: d, slideTo: 1200 })),
  fire: () => noise(0.4, { volume: 0.18, highpass: 400 }),
  blackout: () => tone(400, 0.5, { type: 'sawtooth', volume: 0.15, slideTo: 50 }),
  upgrade: () => arpeggio([76, 79, 84], 0.05, { volume: 0.18 }),
  // 🔪 톡 눌러 칼질: 도마 위 "탁!"
  chop: () => {
    noise(0.04, { volume: 0.12, highpass: 1800 });
    tone(520, 0.04, { type: 'square', volume: 0.05, slideTo: 260 });
  },
  coin: () => arpeggio([88, 93], 0.06, { volume: 0.15 }),
  wave: () => tone(660, 0.08, { volume: 0.12, slideTo: 990 }),
  star: (i) => tone(midiToFreq(84 + i * 4), 0.25, { type: 'triangle', volume: 0.2 }),
  win: () => {
    arpeggio([72, 76, 79, 84, 79, 84, 88], 0.1, { volume: 0.22 });
    arpeggio([48, 52, 55, 60], 0.18, { volume: 0.15, type: 'triangle' });
  },
  lose: () => arpeggio([67, 64, 60, 55], 0.18, { volume: 0.2, type: 'triangle' }),
};

// ───────── 배경음악 ─────────
// 칸 하나 = 8분음표. 멜로디는 32칸(4마디)을 계속 반복한다. null은 쉼표.

const TRACKS = {
  // 첫 화면: 잔잔하고 따뜻하게
  title: {
    bpm: 100,
    lead: 'triangle',
    melody: [72, null, 74, 76, null, 79, 76, null, 74, null, 72, 74, 76, null, null, null,
             72, null, 74, 76, null, 79, 81, null, 79, null, 76, 74, 72, null, null, null],
    bass: [48, 55, 53, 55],
    drums: false,
  },
  // 영업 중: 신나는 주방
  game: {
    bpm: 136,
    lead: 'square',
    melody: [72, null, 76, 79, 76, null, 72, 74, 76, null, 74, 72, 69, null, 67, null,
             72, null, 76, 79, 81, null, 79, 76, 74, null, 76, 74, 72, null, null, null],
    bass: [48, 53, 55, 48],
    drums: true,
  },
  // VIP 손님: 긴박한 단조
  boss: {
    bpm: 156,
    lead: 'sawtooth',
    melody: [69, null, 72, 69, 76, null, 75, null, 74, null, 72, 71, 69, null, 64, null,
             69, null, 72, 76, 77, null, 76, 74, 72, null, 71, 72, 69, null, null, null],
    bass: [45, 41, 43, 40],
    drums: true,
  },
};

let current = null; // { name, step, nextTime, timer }

export function playMusic(name) {
  if (current?.name === name) return;
  stopMusic();
  const track = TRACKS[name];
  if (!track) return;
  current = { name, step: 0, nextTime: 0, timer: null };
  const stepTime = 60 / track.bpm / 2; // 8분음표 길이

  // 0.1초 앞까지 미리 음을 예약해 두는 방식 (끊김 없이 정확한 박자)
  current.timer = setInterval(() => {
    const c = audio();
    if (!c || c.state !== 'running' || !current) return;
    if (current.nextTime < c.currentTime) current.nextTime = c.currentTime + 0.05;
    while (current.nextTime < c.currentTime + 0.1) {
      scheduleStep(track, current.step, current.nextTime, stepTime);
      current.step = (current.step + 1) % track.melody.length;
      current.nextTime += stepTime;
    }
  }, 25);
}

export function stopMusic() {
  if (current?.timer) clearInterval(current.timer);
  current = null;
}

function scheduleStep(track, step, time, stepTime) {
  const delay = time - ctx.currentTime;
  const note = track.melody[step];
  if (note) tone(midiToFreq(note), stepTime * 0.9, { type: track.lead, volume: 0.18, delay, out: musicGain });

  // 베이스: 4칸(4분음표)마다, 8칸마다 코드가 바뀐다
  if (step % 2 === 0) {
    const root = track.bass[Math.floor(step / 8) % track.bass.length];
    const n = step % 4 === 0 ? root : root + 12;
    tone(midiToFreq(n), stepTime * 1.6, { type: 'triangle', volume: 0.35, delay, out: musicGain });
  }

  if (track.drums) {
    if (step % 8 === 0 || step % 8 === 5) tone(150, 0.12, { type: 'sine', volume: 0.5, slideTo: 40, delay, out: musicGain }); // 쿵
    if (step % 8 === 4) noise(0.1, { volume: 0.18, highpass: 1500, delay, out: musicGain }); // 탁
    noise(0.03, { volume: 0.05, highpass: 6000, delay, out: musicGain }); // 칙
  }
}
