// ═══ 글로벌 리더보드 (Firebase Realtime Database) ═══

// Firebase 설정 — 아래 값을 본인의 Firebase 프로젝트로 교체하세요
const FIREBASE_CONFIG = {
  databaseURL: "https://insil-game-default-rtdb.firebaseio.com"
};

// Firebase REST API로 직접 호출 (SDK 불필요)
const DB_URL = FIREBASE_CONFIG.databaseURL;

// ═══ 글로벌 리더보드에 기록 저장 ═══
async function saveToGlobalLeaderboard(name, totalAssets, choices) {
  try {
    var entry = {
      name: name || '익명',
      assets: totalAssets,
      date: new Date().toISOString().slice(0, 10),
      timestamp: Date.now()
    };
    var response = await fetch(DB_URL + '/leaderboard.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
    if (response.ok) {
      console.log('글로벌 리더보드 저장 완료');
    }
  } catch (e) {
    console.error('글로벌 리더보드 저장 실패:', e);
  }
}

// ═══ 글로벌 리더보드 조회 (상위 50명) ═══
async function getGlobalLeaderboard() {
  try {
    var response = await fetch(DB_URL + '/leaderboard.json?orderBy="assets"&limitToLast=50');
    if (!response.ok) return [];
    var data = await response.json();
    if (!data) return [];
    // 객체를 배열로 변환 후 자산 내림차순 정렬
    var entries = Object.values(data);
    entries.sort(function(a, b) { return b.assets - a.assets; });
    return entries;
  } catch (e) {
    console.error('글로벌 리더보드 조회 실패:', e);
    return [];
  }
}

// ═══ 총 플레이 횟수 조회 ═══
async function getGlobalPlayCount() {
  try {
    var response = await fetch(DB_URL + '/leaderboard.json?shallow=true');
    if (!response.ok) return 0;
    var data = await response.json();
    return data ? Object.keys(data).length : 0;
  } catch (e) {
    return 0;
  }
}