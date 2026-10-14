import { firebaseConfig } from './firebase-config.js';
import { getSave, writeSave, replaceSave, onSaveWritten } from './save.js';

// ☁️ 클라우드 저장 (Firebase).
// - 게임을 켜면 익명 계정으로 자동 로그인하고, 저장 기록을 Firestore의 saves/{계정 id}에 올린다.
// - 구글 계정을 연결하면 다른 휴대폰에서도 같은 기록을 이어서 할 수 있다.
// - 인터넷이 없거나 Firebase가 준비되지 않았으면 조용히 "오프라인"으로 두고, 게임은 휴대폰 저장만으로 계속된다.
//
// 상태(status): 'connecting' 연결 중 / 'synced' 저장됨 / 'saving' 저장 중 / 'offline' 오프라인

const PUSH_DELAY = 1500; // 저장이 몰리면 마지막 저장 후 이만큼 기다렸다가 한 번만 올린다

let fb = null; // 불러온 Firebase 기능들 { auth, db, ... }
let status = 'connecting';
let pushTimer = null;
const listeners = new Set();

export function cloudStatus() {
  return status;
}

// 연결된 구글 계정 이름 (없으면 null)
export function linkedAccount() {
  const user = fb?.auth.currentUser;
  if (!user || user.isAnonymous) return null;
  return user.displayName ?? user.email ?? '구글 계정';
}

// 상태가 바뀌거나 클라우드에서 기록을 받아 왔을 때 부르는 함수 등록. 해제 함수를 돌려준다
export function onCloudChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function setStatus(next, event = 'status') {
  status = next;
  for (const fn of listeners) fn(event);
}

// 게임이 켜질 때 한 번 부른다
export async function startCloud() {
  try {
    // Firebase는 처음 화면을 늦추지 않도록 따로(나중에) 불러온다
    const [{ initializeApp }, authLib, storeLib] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      import('firebase/firestore'),
    ]);
    const app = initializeApp(firebaseConfig);
    fb = { ...authLib, ...storeLib, auth: authLib.getAuth(app), db: storeLib.getFirestore(app) };
    if (import.meta.env.DEV) window.cloud = fb; // 개발 중에만: 콘솔에서 확인용

    // 이 기기에서 전에 로그인한 계정이 있으면 그대로, 없으면 익명 계정을 새로 만든다
    await fb.auth.authStateReady();
    if (!fb.auth.currentUser) await fb.signInAnonymously(fb.auth);

    await sync();
    onSaveWritten(schedulePush);
  } catch (error) {
    console.warn('클라우드 저장에 연결하지 못했어요 (휴대폰 저장만 사용)', error);
    setStatus('offline');
  }
}

function saveRef() {
  return fb.doc(fb.db, 'saves', fb.auth.currentUser.uid);
}

// 클라우드와 휴대폰 중 더 최근 기록을 쓴다. preferRemote면 클라우드에 기록이 있을 때 그쪽을 쓴다
async function sync(preferRemote = false) {
  const snap = await fb.getDoc(saveRef());
  const remote = snap.exists() ? snap.data().save : null;
  if (remote && (preferRemote || (remote.updatedAt ?? 0) > (getSave().updatedAt ?? 0))) {
    replaceSave(remote);
    setStatus('synced', 'pulled');
    return;
  }
  await push();
}

async function push() {
  setStatus('saving');
  await fb.setDoc(saveRef(), { save: getSave(), version: 1, updatedAt: fb.serverTimestamp() });
  setStatus('synced');
}

function schedulePush() {
  if (!fb?.auth.currentUser) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    push().catch((error) => {
      console.warn('클라우드에 저장하지 못했어요', error);
      setStatus('offline');
    });
  }, PUSH_DELAY);
}

// 🔗 구글 계정 연결.
// - 처음 연결하면: 지금 익명 기록이 그대로 구글 계정의 기록이 된다.
// - 이미 다른 기기에서 쓰던 구글 계정이면: 그 계정으로 바꾸고 클라우드 기록을 불러온다.
// 결과를 글로 돌려준다.
export async function linkGoogle() {
  if (!fb?.auth.currentUser) return '클라우드에 연결되지 않았어요';
  const provider = new fb.GoogleAuthProvider();
  try {
    await fb.linkWithPopup(fb.auth.currentUser, provider);
    await push();
    setStatus('synced');
    return '구글 계정을 연결했어요';
  } catch (error) {
    if (error.code === 'auth/credential-already-in-use') {
      const credential = fb.GoogleAuthProvider.credentialFromError(error);
      await fb.signInWithCredential(fb.auth, credential);
      await sync(true);
      return '구글 계정의 기록을 불러왔어요';
    }
    if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') return '연결을 취소했어요';
    console.warn('구글 계정 연결 실패', error);
    return '연결하지 못했어요';
  }
}

// ───────── 🏆 랭킹 ─────────
// Firestore: leaderboards/{주방 id}/scores/{계정 id} = { name, score, wave, stars, orders, updatedAt }
// 계정마다 주방별 최고 점수 하나만 남는다.

const NAME_MAX = 10;

// 랭킹에 보일 이름. 정하지 않았으면 구글 이름 앞부분, 그것도 없으면 "손님1234"
export function nickname() {
  const save = getSave();
  if (save.nickname) return save.nickname;
  const google = linkedAccount();
  if (google) return google.slice(0, NAME_MAX);
  const uid = fb?.auth.currentUser?.uid ?? '0000';
  const digits = [...uid].reduce((sum, ch) => (sum * 31 + ch.charCodeAt(0)) % 10000, 7);
  return `손님${String(digits).padStart(4, '0')}`;
}

// 이름 바꾸기 (앞뒤 공백을 빼고 10글자까지). 바꾼 이름을 돌려준다
export function setNickname(name) {
  const clean = String(name ?? '').trim().slice(0, NAME_MAX);
  if (!clean) return nickname();
  getSave().nickname = clean;
  writeSave();
  return clean;
}

export function isOnline() {
  return Boolean(fb?.auth.currentUser) && status !== 'offline';
}

function scoreRef(kitchenId, uid = fb.auth.currentUser.uid) {
  return fb.doc(fb.db, 'leaderboards', kitchenId, 'scores', uid);
}

// 판 결과를 올린다. 이 주방 최고 점수보다 높을 때만 올라간다.
// 돌려주는 값: { status: 'new' | 'kept' | 'offline', best, rank }
export async function submitScore(kitchenId, result) {
  if (!isOnline()) return { status: 'offline' };
  try {
    const ref = scoreRef(kitchenId);
    const old = await fb.getDoc(ref);
    const best = old.exists() ? old.data().score : -1;
    let state = 'kept';
    if (result.score > best) {
      await fb.setDoc(ref, { name: nickname(), ...result, updatedAt: fb.serverTimestamp() });
      state = 'new';
    }
    const myBest = Math.max(best, result.score);
    return { status: state, best: myBest, rank: await rankOf(kitchenId, myBest) };
  } catch (error) {
    console.warn('랭킹에 올리지 못했어요', error);
    return { status: 'offline' };
  }
}

// 이 점수가 몇 등인지 (나보다 점수가 높은 사람 수 + 1)
async function rankOf(kitchenId, score) {
  const higher = fb.query(fb.collection(fb.db, 'leaderboards', kitchenId, 'scores'), fb.where('score', '>', score));
  const snap = await fb.getCountFromServer(higher);
  return snap.data().count + 1;
}

// 주방별 상위 기록과 내 기록. 실패하면 null
export async function fetchLeaderboard(kitchenId, limit = 50) {
  if (!isOnline()) return null;
  try {
    const top = fb.query(fb.collection(fb.db, 'leaderboards', kitchenId, 'scores'), fb.orderBy('score', 'desc'), fb.limit(limit));
    const [list, mine] = await Promise.all([fb.getDocs(top), fb.getDoc(scoreRef(kitchenId))]);
    const uid = fb.auth.currentUser.uid;
    const rows = list.docs.map((d, i) => ({ rank: i + 1, uid: d.id, me: d.id === uid, ...d.data() }));
    let me = null;
    if (mine.exists()) me = { ...mine.data(), me: true, rank: await rankOf(kitchenId, mine.data().score) };
    return { rows, me };
  } catch (error) {
    console.warn('랭킹을 불러오지 못했어요', error);
    return null;
  }
}

// 이름을 바꾸면 이미 올린 랭킹 기록의 이름도 바꾼다
export async function renameEverywhere(kitchenIds) {
  if (!isOnline()) return;
  const name = nickname();
  await Promise.all(
    kitchenIds.map(async (id) => {
      const ref = scoreRef(id);
      const snap = await fb.getDoc(ref);
      if (snap.exists()) await fb.setDoc(ref, { ...snap.data(), name, updatedAt: fb.serverTimestamp() });
    }),
  ).catch((error) => console.warn('랭킹 이름을 바꾸지 못했어요', error));
}
