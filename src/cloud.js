import { firebaseConfig } from './firebase-config.js';
import { getSave, replaceSave, onSaveWritten } from './save.js';

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
