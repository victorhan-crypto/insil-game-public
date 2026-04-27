// ═══ 다국어 지원 (i18n) ═══

const I18N = {
  ko: {
    // 시작 화면
    apiLabel: 'Gemini API Key',
    apiPlaceholder: 'AIza...',
    apiHint: 'Google AI Studio에서 발급받은 키를 입력하세요.',
    startBtn: '게임 시작',
    // 상태바
    labelYear: '연도',
    labelAge: '나이',
    labelAsset: '자산',
    labelChapter: '챕터',
    chapterUnit: '편',
    // 입력
    inputPlaceholder: '무엇을 하시겠습니까?',
    sendBtn: '보내기',
    // 버튼
    btnLog: '◁',
    btnSave: '♡',
    btnIndex: '≡',
    btnDetail: '◈',
    btnLogTitle: '이전글',
    btnSaveTitle: '저장',
    btnIndexTitle: '목차',
    btnDetailTitle: '상태',
    // 패널
    detailTitle: '상세 정보',
    detailClose: '닫기',
    indexTitle: '목차',
    indexClose: '닫기',
    logClose: '닫기',
    // 게임 내
    tapToContinue: '▶ 탭하여 계속',
    tapToStart: '▶ 탭하여 시작',
    noLogYet: '아직 이전 글이 없습니다.',
    savedOk: '✅',
    // 이어하기
    continuePrompt: '저장된 게임이 있습니다. 이어서 하시겠습니까?',
    alertNoKey: 'Gemini API Key를 입력해주세요.',
    // 목차
    reread: '📖 다시 읽기',
    backToCurrent: '↩ 현재 챕터로 돌아가기',
    rereadGo: '다시 읽기 →',
    locked: '???',
    // 결과
    resultTitle: '「인생은 실전이야」 완료',
    resultSubtitle: '1997 ~ 2007 · 10년의 기록',
    resultFinalAsset: '최종 자산',
    resultCash: '현금',
    resultDollar: '달러',
    resultGold: '금',
    resultStock: '주식',
    resultDebt: '부채',
    resultStartAsset: '시작 자산',
    resultReturn: '수익률',
    resultMessage: '2008년이 왔다. 다음 10년이 시작된다.',
    leaderboardTitle: '🏆 역대 플레이어 순위',
    leaderboardTotal: '총 {n}회 플레이',
    playerLabel: '플레이어 #{n}',
    thisPlay: '나 (이번 플레이)',
    retryBtn: '처음부터 다시하기',
    // 단위
    manwon: '만원',
    eok: '억원',
    won: '원',
    gram: 'g',
    share: '주',
    // 에러
    errorPrefix: '(오류: ',
    errorSuffix: ')',
    // 언어 선택
    langLabel: '언어',
  },
  en: {
    apiLabel: 'Gemini API Key',
    apiPlaceholder: 'AIza...',
    apiHint: 'Enter your key from Google AI Studio.',
    startBtn: 'Start Game',
    labelYear: 'Year',
    labelAge: 'Age',
    labelAsset: 'Assets',
    labelChapter: 'Ch.',
    chapterUnit: '',
    inputPlaceholder: 'What will you do?',
    sendBtn: 'Send',
    btnLog: '◁',
    btnSave: '♡',
    btnIndex: '≡',
    btnDetail: '◈',
    btnLogTitle: 'History',
    btnSaveTitle: 'Save',
    btnIndexTitle: 'Index',
    btnDetailTitle: 'Status',
    detailTitle: 'Details',
    detailClose: 'Close',
    indexTitle: 'Chapters',
    indexClose: 'Close',
    logClose: 'Close',
    tapToContinue: '▶ Tap to continue',
    tapToStart: '▶ Tap to start',
    noLogYet: 'No previous text yet.',
    savedOk: '✅',
    continuePrompt: 'Saved game found. Continue?',
    alertNoKey: 'Please enter your Gemini API Key.',
    reread: '📖 Re-read',
    backToCurrent: '↩ Back to current chapter',
    rereadGo: 'Re-read →',
    locked: '???',
    resultTitle: '"Life is Real" Complete',
    resultSubtitle: '1997 ~ 2007 · A Decade of Choices',
    resultFinalAsset: 'Final Assets',
    resultCash: 'Cash',
    resultDollar: 'USD',
    resultGold: 'Gold',
    resultStock: 'Stocks',
    resultDebt: 'Debt',
    resultStartAsset: 'Starting Assets',
    resultReturn: 'Return',
    resultMessage: '2008 has arrived. The next decade begins.',
    leaderboardTitle: '🏆 All-Time Rankings',
    leaderboardTotal: '{n} plays total',
    playerLabel: 'Player #{n}',
    thisPlay: 'Me (this play)',
    retryBtn: 'Start Over',
    manwon: 'M KRW',
    eok: 'B KRW',
    won: 'KRW',
    gram: 'g',
    share: 'shares',
    errorPrefix: '(Error: ',
    errorSuffix: ')',
    langLabel: 'Lang',
  },
  ja: {
    apiLabel: 'Gemini APIキー',
    apiPlaceholder: 'AIza...',
    apiHint: 'Google AI Studioで取得したキーを入力してください。',
    startBtn: 'ゲーム開始',
    labelYear: '年',
    labelAge: '年齢',
    labelAsset: '資産',
    labelChapter: '章',
    chapterUnit: '話',
    inputPlaceholder: 'どうしますか？',
    sendBtn: '送信',
    btnLog: '◁',
    btnSave: '♡',
    btnIndex: '≡',
    btnDetail: '◈',
    btnLogTitle: '履歴',
    btnSaveTitle: '保存',
    btnIndexTitle: '目次',
    btnDetailTitle: 'ステータス',
    detailTitle: '詳細情報',
    detailClose: '閉じる',
    indexTitle: '目次',
    indexClose: '閉じる',
    logClose: '閉じる',
    tapToContinue: '▶ タップして続ける',
    tapToStart: '▶ タップして開始',
    noLogYet: 'まだ履歴がありません。',
    savedOk: '✅',
    continuePrompt: 'セーブデータがあります。続けますか？',
    alertNoKey: 'Gemini APIキーを入力してください。',
    reread: '📖 読み返す',
    backToCurrent: '↩ 現在の章に戻る',
    rereadGo: '読み返す →',
    locked: '???',
    resultTitle: '「人生は実戦だ」完了',
    resultSubtitle: '1997 ~ 2007 · 10年の記録',
    resultFinalAsset: '最終資産',
    resultCash: '現金',
    resultDollar: 'ドル',
    resultGold: '金',
    resultStock: '株式',
    resultDebt: '負債',
    resultStartAsset: '初期資産',
    resultReturn: '収益率',
    resultMessage: '2008年が来た。次の10年が始まる。',
    leaderboardTitle: '🏆 歴代プレイヤーランキング',
    leaderboardTotal: '合計{n}回プレイ',
    playerLabel: 'プレイヤー #{n}',
    thisPlay: '自分（今回）',
    retryBtn: '最初からやり直す',
    manwon: '万ウォン',
    eok: '億ウォン',
    won: 'ウォン',
    gram: 'g',
    share: '株',
    errorPrefix: '（エラー：',
    errorSuffix: '）',
    langLabel: '言語',
  }
};

let currentLang = localStorage.getItem('imf_lang') || 'ko';

function t(key) {
  return (I18N[currentLang] && I18N[currentLang][key]) || I18N.ko[key] || key;
}

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('imf_lang', lang);
  applyI18n();
}

function applyI18n() {
  // 시작 화면
  var apiLabel = document.querySelector('.api-setup label');
  if (apiLabel) apiLabel.textContent = t('apiLabel');
  var apiInput = document.getElementById('gemini-key');
  if (apiInput) apiInput.placeholder = t('apiPlaceholder');
  var hint = document.querySelector('.hint');
  if (hint) hint.textContent = t('apiHint');
  var startBtn = document.getElementById('start-btn');
  if (startBtn) startBtn.textContent = t('startBtn');

  // 상태바
  var labels = document.querySelectorAll('.status-item .label');
  var labelKeys = ['labelYear', 'labelAge', 'labelAsset', 'labelChapter'];
  labels.forEach(function(el, i) {
    if (labelKeys[i]) el.textContent = t(labelKeys[i]);
  });

  // 입력
  var playerInput = document.getElementById('player-input');
  if (playerInput) playerInput.placeholder = t('inputPlaceholder');
  var sendBtn2 = document.getElementById('send-btn');
  if (sendBtn2) sendBtn2.textContent = t('sendBtn');

  // 하단 버튼
  var logBtn = document.getElementById('log-btn');
  if (logBtn) { logBtn.textContent = t('btnLog'); logBtn.title = t('btnLogTitle'); }
  var saveBtn = document.getElementById('save-btn');
  if (saveBtn) { saveBtn.textContent = t('btnSave'); saveBtn.title = t('btnSaveTitle'); }
  var idxBtn = document.getElementById('toggle-index');
  if (idxBtn) { idxBtn.textContent = t('btnIndex'); idxBtn.title = t('btnIndexTitle'); }
  var detBtn = document.getElementById('toggle-detail');
  if (detBtn) { detBtn.textContent = t('btnDetail'); detBtn.title = t('btnDetailTitle'); }

  // 패널
  var detTitle = document.querySelector('#detail-panel h3');
  if (detTitle) {
    var closeBtn = document.getElementById('detail-close');
    if (closeBtn) closeBtn.textContent = t('detailClose');
    detTitle.childNodes[0].textContent = t('detailTitle') + ' ';
  }
  var idxTitle = document.querySelector('#index-panel h3');
  if (idxTitle) idxTitle.textContent = t('indexTitle');
  var logClose = document.getElementById('log-close');
  if (logClose) logClose.textContent = t('logClose');

  // 언어 선택 버튼 활성 상태
  document.querySelectorAll('.lang-btn').forEach(function(btn) {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });
}