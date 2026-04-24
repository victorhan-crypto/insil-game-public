// 메인 앱 — 페이지네이션 + 자산 차감 + 챕터 전환

let gameState;
let apiClient;
let currentChapter;
let currentIntervention;

// 페이지네이션 상태
let textQueue = [];      // 표시할 텍스트 블록 큐
let isPageMode = false;  // 페이지 넘기기 모드인지
let afterPageCallback = null; // 페이지 다 넘긴 후 콜백

// DOM
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const narrativeText = document.getElementById('narrative-text');
const playerInput = document.getElementById('player-input');
const sendBtn = document.getElementById('send-btn');
const loading = document.getElementById('loading');
const toggleDetail = document.getElementById('toggle-detail');
const detailPanel = document.getElementById('detail-panel');
const detailContent = document.getElementById('detail-content');

const sYear = document.getElementById('s-year');
const sAge = document.getElementById('s-age');
const sCash = document.getElementById('s-cash');
const sChapter = document.getElementById('s-chapter');

// 이벤트
document.getElementById('start-btn').addEventListener('click', startGame);
sendBtn.addEventListener('click', handleInput);
playerInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleInput();
  }
});

// 페이지 넘기기: 터치/클릭 또는 스페이스 (디바운스 적용)
let lastPageTime = 0;
let pageProcessing = false;
function tryNextPage() {
  if (pageProcessing) return;
  const now = Date.now();
  if (now - lastPageTime < 500) return;
  lastPageTime = now;
  pageProcessing = true;
  showNextPage();
  setTimeout(function() { pageProcessing = false; }, 400);
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && isPageMode) {
    e.preventDefault();
    e.stopPropagation();
    tryNextPage();
  }
});
document.getElementById('narrative-area').addEventListener('click', (e) => {
  if (isPageMode && e.target.id !== 'player-input' && e.target.id !== 'send-btn') {
    e.preventDefault();
    e.stopPropagation();
    tryNextPage();
  }
});

toggleDetail.addEventListener('click', () => {
  if (detailPanel.style.display === 'none') {
    detailContent.innerHTML = gameState.getDetailHTML();
    detailPanel.style.display = 'block';
  } else {
    detailPanel.style.display = 'none';
  }
});

document.getElementById('detail-close').addEventListener('click', () => {
  detailPanel.style.display = 'none';
});

function startGame() {
  const geminiKey = document.getElementById('gemini-key').value.trim().replace(/\s/g, '');
  if (!geminiKey) {
    alert('Gemini API Key를 입력해주세요.');
    return;
  }

  localStorage.setItem('imf_gemini_key', geminiKey);
  apiClient = new APIClient(geminiKey);
  gameState = new GameState();

  if (gameState.load()) {
    if (confirm('저장된 게임이 있습니다. 이어서 하시겠습니까?')) {
      startScreen.style.display = 'none';
      gameScreen.style.display = 'flex';
      updateStatusBar();
      loadChapter(gameState.get().story.current_chapter);
      return;
    }
  }

  gameState = new GameState();
  startScreen.style.display = 'none';
  gameScreen.style.display = 'flex';
  updateStatusBar();
  loadChapter(1);
}

// ═══════ 텍스트 페이지네이션 ═══════════════════════════════════════

function splitIntoPages(text) {
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  const pages = [];
  let current = [];
  let charCount = 0;
  var pageLimit = 400; // 모바일에서 읽기 좋은 분량

  for (const para of paragraphs) {
    if (charCount + para.length > pageLimit && current.length > 0) {
      pages.push(current.join('\n\n'));
      current = [para];
      charCount = para.length;
    } else {
      current.push(para);
      charCount += para.length;
    }
  }
  if (current.length > 0) pages.push(current.join('\n\n'));
  return pages;
}

function startPageMode(text, callback) {
  textQueue = splitIntoPages(text);
  afterPageCallback = callback;
  isPageMode = true;
  disableInput();
  showNextPage();
}

// 글 로그 (이전 글 보기)
let pageLog = [];

function showNextPage() {
  if (textQueue.length === 0) {
    isPageMode = false;
    const hint = document.getElementById('page-hint');
    if (hint) hint.remove();
    if (afterPageCallback) {
      const cb = afterPageCallback;
      afterPageCallback = null;
      cb();
    }
    return;
  }

  const page = textQueue.shift();

  // 현재 화면 글을 로그에 저장
  const currentText = narrativeText.textContent.trim();
  if (currentText && currentText !== '\u25b6 탭하여 계속') {
    pageLog.push(currentText);
  }

  // 화면의 글을 교체
  narrativeText.innerHTML = '';
  const div = document.createElement('div');
  var displayPage = (gameState && gameState.get) ? dynamicSituation(page) : page;
  div.textContent = displayPage;
  narrativeText.appendChild(div);

  // "계속" 안내
  if (textQueue.length > 0) {
    const hint = document.createElement('div');
    hint.id = 'page-hint';
    hint.className = 'page-hint';
    hint.textContent = '\u25b6 탭하여 계속';
    narrativeText.appendChild(hint);
  }
}

// 로그 버튼
document.getElementById('log-btn').addEventListener('click', () => {
  const overlay = document.getElementById('log-overlay');
  const content = document.getElementById('log-content');
  content.innerHTML = '';

  if (pageLog.length === 0) {
    content.innerHTML = '<div class="log-entry" style="color:#555;">아직 이전 글이 없습니다.</div>';
  } else {
    pageLog.forEach((text, i) => {
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      entry.textContent = text;
      content.appendChild(entry);
    });
    overlay.scrollTop = overlay.scrollHeight;
  }

  overlay.style.display = 'block';
});

document.getElementById('log-close').addEventListener('click', () => {
  document.getElementById('log-overlay').style.display = 'none';
});

// 저장 버튼
document.getElementById('save-btn').addEventListener('click', () => {
  gameState.save();
  const btn = document.getElementById('save-btn');
  btn.textContent = '\u2705';
  btn.style.borderColor = '#4a6a4a';
  setTimeout(() => {
    btn.textContent = '\ud83d\udd16';
    btn.style.borderColor = '';
  }, 1500);
});

// ═══════ 챕터 로드 ═══════════════════════════════════════════════════

function loadChapter(code) {
  currentChapter = getChapter(code);
  if (!currentChapter) {
    showGameResult();
    return;
  }

  narrativeText.innerHTML = '';
  currentIntervention = gameState.get().story.current_intervention || 0;

  // 챕터 이미지 표시 (클릭하면 글 시작)
  if (currentChapter.image) {
    var imgDiv = document.createElement('div');
    imgDiv.className = 'chapter-image';
    var img = document.createElement('img');
    img.src = currentChapter.image;
    img.alt = currentChapter.title;

    var readingStarted = false;
    var startReading = function(e) {
      if (readingStarted) return;
      readingStarted = true;
      if (e) { e.stopPropagation(); e.preventDefault(); }
      imgDiv.removeEventListener('click', startReading);
      document.removeEventListener('keydown', spaceStart);
      narrativeText.removeEventListener('click', startReading);
      narrativeText.innerHTML = '';
      appendText(currentChapter.title, 'chapter-title');
      appendText('\u2500\u2500\u2500', 'divider');
      // 짧은 딜레이로 첫 페이지 넘김 방지
      setTimeout(function() {
        startPageMode(currentChapter.opening, function() {
          appendText('\u2500\u2500\u2500', 'divider');
          showIntervention();
        });
      }, 300);
    };

    img.onerror = function() { startReading(); };
    imgDiv.appendChild(img);
    narrativeText.appendChild(imgDiv);

    // 탭 안내
    var hint = document.createElement('div');
    hint.className = 'page-hint';
    hint.textContent = '\u25b6 탭하여 시작';
    narrativeText.appendChild(hint);

    // 이미지 클릭, 화면 클릭, 스페이스 모두 시작
    imgDiv.addEventListener('click', startReading);
    narrativeText.addEventListener('click', startReading);
    var spaceStart = function(e) {
      if (e.code === 'Space') { e.preventDefault(); startReading(); }
    };
    document.addEventListener('keydown', spaceStart);

    // 3초 후 자동 시작 제거 — 터치해야만 넘어감
    return;
  }

  appendText(currentChapter.title, 'chapter-title');
  appendText('\u2500\u2500\u2500', 'divider');

  startPageMode(currentChapter.opening, () => {
    appendText('\u2500\u2500\u2500', 'divider');
    showIntervention();
  });
}

// ═══════ 개입 표시 ═══════════════════════════════════════════════════

function showIntervention() {
  const intervention = getIntervention(
    gameState.get().story.current_chapter,
    currentIntervention
  );

  if (!intervention) {
    goToNextChapter();
    return;
  }

  if (intervention.context && intervention.context.trim()) {
    const lastNarrative = narrativeText.lastElementChild?.textContent || '';
    const contextTrimmed = intervention.context.trim();
    if (lastNarrative.includes(contextTrimmed) || contextTrimmed.length < 20) {
      appendText('\u2500\u2500\u2500', 'divider');
      appendText(dynamicSituation(intervention.situation), 'intervention');
      enableInput();
      playerInput.focus();
      scrollToBottom();
    } else {
      startPageMode(intervention.context, () => {
        appendText('\u2500\u2500\u2500', 'divider');
        appendText(dynamicSituation(intervention.situation), 'intervention');
        enableInput();
        playerInput.focus();
        scrollToBottom();
      });
    }
  } else {
    appendText(dynamicSituation(intervention.situation), 'intervention');
    enableInput();
    playerInput.focus();
    scrollToBottom();
  }
}

// ═══════ 챕터 전환 ═══════════════════════════════════════════════════

function goToNextChapter() {
  const currentCode = String(gameState.get().story.current_chapter);
  const currentIdx = CHAPTER_ORDER.findIndex(c => String(c) === currentCode);
  const nextCode = CHAPTER_ORDER[currentIdx + 1];

  if (nextCode !== undefined && getChapter(nextCode)) {
    const nextCh = getChapter(nextCode);

    // 챕터 전환 전 자산 평가액 기록
    var prevTotal = calcTotalAssets(gameState.get(), gameState.get().player.year, gameState.get().player.month);

    gameState.get().player.year = nextCh.year;
    gameState.get().player.month = nextCh.month_start;
    gameState.get().player.age = nextCh.year - 1979;

    // 챕터 간 생활비 자동 차감 (월 지출 × 경과 개월)
    var prevYear = gameState.get().player.year;
    var prevMonth = gameState.get().player.month;
    var monthsElapsed = (nextCh.year - prevYear) * 12 + (nextCh.month_start - prevMonth);
    if (monthsElapsed < 1) monthsElapsed = 1;
    if (monthsElapsed > 12) monthsElapsed = 12; // 최대 1년치
    var livingCost = (gameState.get().stats.monthly_expense || 150000) * monthsElapsed;
    // 알바/직장 수입 상쇄
    var job = gameState.get().stats.job;
    var monthlyIncome = 0;
    if (job === 'parttime') monthlyIncome = 430000;
    else if (job === 'banker') monthlyIncome = 1200000;
    else if (job === 'business') monthlyIncome = 2000000;
    var netCost = livingCost - (monthlyIncome * monthsElapsed);
    if (netCost > 0 && gameState.get().assets.cash_krw > netCost) {
      gameState.get().assets.cash_krw -= netCost;
      console.log('생활비 차감: -' + Math.floor(netCost/10000) + '만원 (' + monthsElapsed + '개월)');
    } else if (netCost < 0) {
      // 수입이 지출보다 많으면 저축
      gameState.get().assets.cash_krw += Math.abs(netCost);
      console.log('급여 저축: +' + Math.floor(Math.abs(netCost)/10000) + '만원 (' + monthsElapsed + '개월)');
    }
    // 건물 임대수익 반영
    var blds = gameState.get().assets.buildings;
    if (blds) {
      var bldArr = Array.isArray(blds) ? blds : [blds];
      for (var bi = 0; bi < bldArr.length; bi++) {
        if (bldArr[bi] && bldArr[bi].monthlyRent) {
          var rentIncome = bldArr[bi].monthlyRent * monthsElapsed;
          gameState.get().assets.cash_krw += rentIncome;
          console.log('임대수익: +' + Math.floor(rentIncome/10000) + '만원');
        }
      }
    }
    // 사업체 수익 반영
    var bizs = gameState.get().assets.business;
    if (bizs) {
      var bizArr = Array.isArray(bizs) ? bizs : [bizs];
      for (var bzi = 0; bzi < bizArr.length; bzi++) {
        if (bizArr[bzi] && bizArr[bzi].monthlyProfit) {
          var bizIncome = bizArr[bzi].monthlyProfit * monthsElapsed;
          gameState.get().assets.cash_krw += bizIncome;
          console.log('사업수익: +' + Math.floor(bizIncome/10000) + '만원');
        }
      }
    }
    // 부채 이자 차감
    var debts = gameState.get().assets.debt || [];
    for (var dbi = 0; dbi < debts.length; dbi++) {
      var debtInterest = Math.floor(debts[dbi].amount * (debts[dbi].rate || 10) / 100 / 12 * monthsElapsed);
      gameState.get().assets.cash_krw -= debtInterest;
      if (gameState.get().assets.cash_krw < 0) gameState.get().assets.cash_krw = 0;
      console.log('이자 차감: -' + Math.floor(debtInterest/10000) + '만원 (' + debts[dbi].source + ')');
    }

    // 챕터 전환 후 자산 평가액 (새 시점 환율/금값 적용)
    var newTotal = calcTotalAssets(gameState.get(), nextCh.year, nextCh.month_start);
    var diff = newTotal - prevTotal;

    gameState.update({ story: { current_chapter: nextCode, current_intervention: 0 } });
    currentIntervention = 0;
    gameState.save();
    updateStatusBar();

    narrativeText.innerHTML = '';

    // 자산 변동 알림 (캡션)
    if (Math.abs(diff) > 10000 && (gameState.get().assets.usd > 0 || gameState.get().assets.gold_gram > 0)) {
      var sign = diff > 0 ? '+' : '';
      appendText(sign + Math.floor(diff/10000) + '\uB9CC\uC6D0 | \uCD1D \uC790\uC0B0 ' + Math.floor(newTotal/10000) + '\uB9CC\uC6D0', 'asset-caption');
    }

    loadChapter(nextCode);
  } else {
    // ═══ 게임 완료 — 결과 화면 + 순위표 ═══
    showGameResult();
  }
}

// ═══════ 플레이어 입력 처리 ═══════════════════════════════════════════

async function handleInput() {
  const action = playerInput.value.trim();
  if (!action) return;

  appendText(action, 'player-action');
  playerInput.value = '';
  disableInput();
  showLoading(true);

  const state = gameState.get();
  const intervention = getIntervention(state.story.current_chapter, currentIntervention);

  try {
    // 1. 상태 계산 (로컬 — API 호출 없음)
    const stateResult = calculateStateLocal(
      action, state, state.player.year, state.player.month
    );

    console.log('로컬 상태 계산 결과:', JSON.stringify(stateResult, null, 2));

    // 2. 상태 업데이트 (자산 차감 포함)
    if (stateResult.action_valid !== false) {
      if (stateResult.state_changes && Object.keys(stateResult.state_changes).length > 0) {
        applyStateChanges(stateResult.state_changes);
        console.log('상태 변경 적용됨:', JSON.stringify(stateResult.state_changes));
      } else {
        console.warn('state_changes가 비어있음. Gemini 응답 확인 필요.');
      }
    } else {
      console.log('행동 불가:', stateResult.rejection_reason);
    }

    // 즉시 상태바 업데이트
    updateStatusBar();
    gameState.save();
    console.log('현재 자산:', JSON.stringify(gameState.get().assets));

    // 3. 서사 생성
    const narrative = await apiClient.generateNarrative(
      currentChapter.summary, intervention, action,
      stateResult, gameState.get(), gameState.history, currentChapter.opening
    );

    gameState.addHistory('user', action);
    gameState.addHistory('assistant', narrative);
    gameState.addChoice(action);

    showLoading(false);

    // 자산 변동 캡션
    if (stateResult.asset_summary) {
      appendText(stateResult.asset_summary, 'asset-caption');
    }

    // 서사를 페이지 모드로 표시
    startPageMode(narrative, () => {
      updateStatusBar();

      const currentInterv = getIntervention(
        gameState.get().story.current_chapter, currentIntervention
      );
      const textAfter = currentInterv?.betweenText || currentInterv?.afterText || '';

      currentIntervention++;
      gameState.update({ story: { current_intervention: currentIntervention } });
      gameState.save();

      if (textAfter) {
        appendText('\u2500\u2500\u2500', 'divider');
        startPageMode(textAfter, () => {
          appendText('\u2500\u2500\u2500', 'divider');
          setTimeout(() => showIntervention(), 300);
        });
      } else {
        appendText('\u2500\u2500\u2500', 'divider');
        setTimeout(() => showIntervention(), 300);
      }
    });

  } catch (e) {
    console.error('처리 오류:', e);
    showLoading(false);
    appendText('(오류: ' + e.message + ')', 'intervention');
    enableInput();
  }
}

// ═══════ 상태 변경 적용 (자산 차감 로직) ═══════════════════════════

function applyStateChanges(changes) {
  const state = gameState.get();

  if (changes.assets) {
    for (const [key, val] of Object.entries(changes.assets)) {
      if (key === 'usd_buy_rate') {
        state.assets.usd_buy_rate = val;
        continue;
      }
      if (key === 'debt_update') {
        // 부채 금액 업데이트
        if (state.assets.debt && state.assets.debt[val.index]) {
          state.assets.debt[val.index].amount = val.amount;
        }
        continue;
      }
      if (key === 'debt_remove') {
        // 특정 부채 제거
        state.assets.debt = (state.assets.debt || []).filter(function(d) { return d.source !== val; });
        continue;
      }
      if (typeof val === 'number') {
        const before = state.assets[key] || 0;
        state.assets[key] = before + val;
        if (key === 'cash_krw' && state.assets[key] < 0) {
          state.assets[key] = 0;
        }
        console.log('자산 변경: ' + key + ' ' + before + ' -> ' + state.assets[key] + ' (' + (val > 0 ? '+' : '') + val + ')');
      } else if (Array.isArray(val)) {
        state.assets[key] = val;
      } else if (typeof val === 'object' && val !== null) {
        if (!Array.isArray(state.assets[key])) state.assets[key] = [];
        state.assets[key].push(val);
      }
    }
  }

  if (changes.relationships) {
    for (const [key, val] of Object.entries(changes.relationships)) {
      if (typeof val === 'number') {
        state.relationships[key] = Math.max(0, Math.min(100,
          (state.relationships[key] || 0) + val
        ));
      }
    }
  }

  if (changes.stats) {
    for (const [key, val] of Object.entries(changes.stats)) {
      if (key === 'info_level') {
        state.stats[key] = Math.max(0, Math.min(3, (state.stats[key] || 0) + (typeof val === 'number' ? val : 0)));
      } else if (key === 'job' || key === 'monthly_expense') {
        state.stats[key] = val;
      } else if (typeof val === 'number') {
        state.stats[key] = Math.max(0, Math.min(100, val));
      }
    }
  }
}

// ═══════ UI 헬퍼 ═══════════════════════════════════════════════════════

// 총 자산 평가 (시점 기준)
function calcTotalAssets(state, year, month) {
  var total = state.assets.cash_krw || 0;
  // 달러 평가
  if (state.assets.usd > 0 && typeof getExchangeRate === 'function') {
    total += state.assets.usd * getExchangeRate(year, month);
  }
  // 금 평가
  if (state.assets.gold_gram > 0 && typeof getGoldPrice === 'function') {
    total += state.assets.gold_gram * getGoldPrice(year);
  }
  // 주식 평가
  if (state.assets.stocks && state.assets.stocks.length > 0) {
    for (var i = 0; i < state.assets.stocks.length; i++) {
      var st = state.assets.stocks[i];
      var indexData = (st.name === '코스닥') ? KOSDAQ : KOSPI;
      var curIdx = (typeof getIndex === 'function') ? getIndex(indexData, year, month) : 100;
      total += st.quantity * curIdx * 100;
    }
  }
  // 부동산 평가
  if (state.assets.real_estate && state.assets.real_estate.length > 0) {
    for (var j = 0; j < state.assets.real_estate.length; j++) {
      total += state.assets.real_estate[j].value || 0;
    }
  }
  // 건물 평가
  if (state.assets.buildings && state.assets.buildings.length > 0) {
    for (var b = 0; b < state.assets.buildings.length; b++) {
      total += state.assets.buildings[b].value || 0;
    }
  } else if (state.assets.buildings && state.assets.buildings.value) {
    total += state.assets.buildings.value;
  }
  // 사업체 평가
  if (state.assets.business) {
    if (Array.isArray(state.assets.business) && state.assets.business.length > 0) {
      total += state.assets.business[0].value || 0;
    } else if (state.assets.business.value) {
      total += state.assets.business.value;
    }
  }
  // 부채 차감
  if (state.assets.debt && Array.isArray(state.assets.debt)) {
    for (var d of state.assets.debt) {
      total -= (d.amount || 0);
    }
  }
  return total;
}

function dynamicSituation(text) {
  var cash = gameState.get().assets.cash_krw;
  var cashText = gameState.formatCash();
  // "할머니가 준 200만원"은 고정 금액이므로 보호
  // 먼저 보호할 패턴을 임시 치환
  var protected1 = text.replace(/할머니가 준 200만원/g, '##GRANDMA##');
  var protected2 = protected1.replace(/할머니가 대학 가면 쓰라고 준 200만원/g, '##GRANDMA2##');
  // 나머지 200만원을 실제 자산으로 치환
  var replaced = protected2.replace(/200만원/g, cashText);
  // 보호된 패턴 복원
  replaced = replaced.replace(/##GRANDMA##/g, '할머니가 준 200만원');
  replaced = replaced.replace(/##GRANDMA2##/g, '할머니가 대학 가면 쓰라고 준 200만원');
  return replaced;
}

function appendText(text, className) {
  const div = document.createElement('div');
  if (className) div.className = className;
  // 게임 진행 중이면 자산 금액을 실제 값으로 치환
  var displayText = (gameState && gameState.get) ? dynamicSituation(text) : text;
  // 마크다운 링크를 바로가기 버튼으로 변환: [텍스트](URL)
  var linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
  var hasLinks = linkRegex.test(displayText);
  if (hasLinks) {
    linkRegex.lastIndex = 0;
    var parts = displayText.split(linkRegex);
    // parts: [before, text1, url1, between, text2, url2, after, ...]
    var fragment = document.createDocumentFragment();
    for (var i = 0; i < parts.length; i++) {
      if (i % 3 === 0) {
        // 일반 텍스트
        if (parts[i].trim()) {
          var span = document.createTextNode(parts[i]);
          fragment.appendChild(span);
        }
      } else if (i % 3 === 1) {
        // 링크 텍스트 — 다음 요소가 URL
        var linkText = parts[i];
        var linkUrl = parts[i + 1];
        i++; // URL 건너뛰기
        var btn = document.createElement('a');
        btn.href = linkUrl;
        btn.target = '_blank';
        btn.rel = 'noopener noreferrer';
        btn.className = 'ref-link';
        btn.textContent = linkText + ' →';
        fragment.appendChild(btn);
      }
    }
    div.appendChild(fragment);
  } else {
    div.textContent = displayText;
  }
  narrativeText.appendChild(div);
  scrollToBottom();
}

function scrollToBottom() {
  const area = document.getElementById('narrative-area');
  area.scrollTop = area.scrollHeight;
}

function updateStatusBar() {
  var s = gameState.get();
  sYear.textContent = s.player.year;
  sAge.textContent = s.player.age;
  var cashText = gameState.formatCash();
  if (s.assets.usd > 0) {
    var currentRate = getExchangeRate ? getExchangeRate(s.player.year, s.player.month) : 1000;
    var usdValue = s.assets.usd * currentRate;
    cashText += ' +$' + s.assets.usd + '(' + Math.floor(usdValue/10000) + '\uB9CC\uC6D0)';
  }
  if (s.assets.gold_gram > 0) cashText += ' +\uAE08' + s.assets.gold_gram + 'g';
  if (s.assets.stocks && s.assets.stocks.length > 0) {
    var st = s.assets.stocks[0];
    var curIdx = typeof getIndex === 'function' ? getIndex(st.name === '\uCF54\uC2A4\uB2E5' ? KOSDAQ : KOSPI, s.player.year, s.player.month) : 100;
    var stockVal = st.quantity * curIdx * 100;
    cashText += ' +' + st.name + '(' + Math.floor(stockVal/10000) + '\uB9CC\uC6D0)';
  }
  sCash.textContent = cashText;
  sChapter.textContent = s.story.current_chapter + '\ud3b8';
}

function enableInput() {
  playerInput.disabled = false;
  sendBtn.disabled = false;
  document.getElementById('input-area').style.display = 'flex';
}

function disableInput() {
  playerInput.disabled = true;
  sendBtn.disabled = true;
  document.getElementById('input-area').style.display = 'none';
}

function showLoading(show) {
  loading.style.display = show ? 'block' : 'none';
}

// ═══════ 목차 ═══════════════════════════════════════════════════════════

const toggleIndex = document.getElementById('toggle-index');
const indexPanel = document.getElementById('index-panel');
const indexList = document.getElementById('index-list');

toggleIndex.addEventListener('click', () => {
  if (indexPanel.style.display === 'none') {
    renderIndex();
    indexPanel.style.display = 'block';
  } else {
    indexPanel.style.display = 'none';
  }
});

function renderIndex() {
  const currentCode = String(gameState.get().story.current_chapter);
  const currentIdx = CHAPTER_ORDER.findIndex(c => String(c) === currentCode);

  let html = '';
  const yearLabels = {
    1997: '1997', 1998: '1998', 1999: '1999', 2000: '2000',
    2001: '2001', 2002: '2002', 2003: '2003', 2004: '2004~2005',
    2005: '2004~2005', 2006: '2006~2007', 2007: '2006~2007'
  };
  const shownYears = new Set();

  CHAPTER_ORDER.forEach((code, idx) => {
    const ch = getChapter(code);
    if (!ch) return;

    const yearLabel = yearLabels[ch.year] || String(ch.year);
    if (!shownYears.has(yearLabel)) {
      shownYears.add(yearLabel);
      html += '<div class="index-year">' + yearLabel + '</div>';
    }

    let status = 'locked';
    let marker = '\ud83d\udd12';
    if (idx < currentIdx) { status = 'completed'; marker = '\u2705'; }
    else if (idx === currentIdx) { status = 'current'; marker = '\u25b6'; }

    const title = status === 'locked' ? '???' : ch.title;

    html += '<div class="index-item ' + status + '" data-code="' + code + '">'
      + '<span class="idx-marker">' + marker + '</span>'
      + '<span class="idx-title">' + title + '</span>'
      + (status === 'completed' ? '<span class="idx-go">다시 읽기 \u2192</span>' : '')
      + '</div>';
  });

  html += '<button id="index-close">닫기</button>';
  indexList.innerHTML = html;

  indexList.querySelectorAll('.index-item.completed').forEach(item => {
    item.addEventListener('click', () => {
      const code = item.dataset.code;
      const ch = getChapter(code);
      if (!ch) return;
      indexPanel.style.display = 'none';
      showReadOnlyChapter(ch);
    });
  });

  document.getElementById('index-close').addEventListener('click', () => {
    indexPanel.style.display = 'none';
  });

  const currentItem = indexPanel.querySelector('.index-item.current');
  if (currentItem) {
    currentItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function showReadOnlyChapter(ch) {
  narrativeText.innerHTML = '';
  disableInput();
  appendText('\ud83d\udcd6 다시 읽기', 'chapter-title');
  appendText(ch.title, 'chapter-title');
  appendText('\u2500\u2500\u2500', 'divider');

  startPageMode(ch.opening, () => {
    const backBtn = document.createElement('div');
    backBtn.className = 'intervention';
    backBtn.textContent = '\u21a9 현재 챕터로 돌아가기';
    backBtn.style.cursor = 'pointer';
    backBtn.style.textAlign = 'center';
    backBtn.addEventListener('click', returnToCurrentChapter);
    narrativeText.appendChild(backBtn);
    scrollToBottom();
  });
}

function returnToCurrentChapter() {
  const code = gameState.get().story.current_chapter;
  loadChapter(code);
  updateStatusBar();
}

// ═══════ 게임 완료 — 결과 + 리더보드 ═══════════════════════════════

function showGameResult() {
  var s = gameState.get();
  var totalAssets = calcTotalAssets(s, 2007, 12);
  var cashText = gameState.formatCash();

  // 리더보드에 기록 저장
  saveToLeaderboard(totalAssets);

  narrativeText.innerHTML = '';
  disableInput();

  // 결과 화면
  var resultDiv = document.createElement('div');
  resultDiv.className = 'game-result';
  resultDiv.innerHTML =
    '<div class="result-title">「인생은 실전이야」 완료</div>' +
    '<div class="result-subtitle">1997 ~ 2007 · 10년의 기록</div>' +
    '<div class="result-divider">───</div>' +
    '<div class="result-stat"><span>최종 자산</span><span class="result-value">' + formatAssetFull(totalAssets) + '</span></div>' +
    '<div class="result-stat"><span>현금</span><span>' + cashText + '</span></div>' +
    (s.assets.usd > 0 ? '<div class="result-stat"><span>달러</span><span>' + s.assets.usd + '$</span></div>' : '') +
    (s.assets.gold_gram > 0 ? '<div class="result-stat"><span>금</span><span>' + s.assets.gold_gram + 'g</span></div>' : '') +
    (s.assets.stocks && s.assets.stocks.length > 0 ? '<div class="result-stat"><span>주식</span><span>' + s.assets.stocks[0].name + ' ' + s.assets.stocks[0].quantity + '주 (' + formatAssetFull(s.assets.stocks[0].quantity * (typeof getIndex === 'function' ? getIndex(s.assets.stocks[0].name === '코스닥' ? KOSDAQ : KOSPI, 2007, 12) : 100) * 100) + ')</span></div>' : '') +
    (s.assets.debt && s.assets.debt.length > 0 ? '<div class="result-stat"><span>부채</span><span style="color:#9a6a6a">-' + formatAssetFull(s.assets.debt.reduce(function(sum,d){return sum+(d.amount||0);},0)) + '</span></div>' : '') +
    '<div class="result-stat"><span>시작 자산</span><span>200만원</span></div>' +
    '<div class="result-stat"><span>수익률</span><span>' + Math.round((totalAssets - 2000000) / 2000000 * 100) + '%</span></div>' +
    '<div class="result-divider">───</div>' +
    '<div class="result-message">2008년이 왔다. 다음 10년이 시작된다.</div>';
  narrativeText.appendChild(resultDiv);

  // 리더보드 표시
  var board = getLeaderboard();
  var myRank = getMyRank(totalAssets, board);

  var boardDiv = document.createElement('div');
  boardDiv.className = 'leaderboard';
  var boardHTML = '<div class="lb-title">🏆 역대 플레이어 순위</div>';

  var top10 = board.slice(0, 10);
  for (var i = 0; i < top10.length; i++) {
    var entry = top10[i];
    var rankIcon = i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : (i + 1) + '.'));
    var isMe = entry.isLatest;
    boardHTML += '<div class="lb-row' + (isMe ? ' lb-me' : '') + '">' +
      '<span class="lb-rank">' + rankIcon + '</span>' +
      '<span class="lb-name">' + entry.name + '</span>' +
      '<span class="lb-asset">' + formatAssetFull(entry.assets) + '</span>' +
      '</div>';
  }

  if (myRank > 10) {
    boardHTML += '<div class="lb-row lb-me lb-gap">' +
      '<span class="lb-rank">···</span>' +
      '<span class="lb-name"></span>' +
      '<span class="lb-asset"></span>' +
      '</div>' +
      '<div class="lb-row lb-me">' +
      '<span class="lb-rank">' + myRank + '.</span>' +
      '<span class="lb-name">나 (이번 플레이)</span>' +
      '<span class="lb-asset">' + formatAssetFull(totalAssets) + '</span>' +
      '</div>';
  }

  boardHTML += '<div class="lb-total">총 ' + board.length + '회 플레이</div>';
  boardDiv.innerHTML = boardHTML;
  narrativeText.appendChild(boardDiv);

  // 다시하기 버튼
  var retryBtn = document.createElement('button');
  retryBtn.className = 'retry-btn';
  retryBtn.textContent = '처음부터 다시하기';
  retryBtn.addEventListener('click', function() {
    localStorage.removeItem('imf_game_state');
    localStorage.removeItem('imf_game_history');
    location.reload();
  });
  narrativeText.appendChild(retryBtn);

  scrollToBottom();
}

function formatAssetFull(amount) {
  if (amount >= 100000000) return (amount / 100000000).toFixed(1) + '억원';
  if (amount >= 10000) return Math.floor(amount / 10000).toLocaleString() + '만원';
  if (amount < 0) return '-' + Math.floor(Math.abs(amount) / 10000).toLocaleString() + '만원';
  return amount.toLocaleString() + '원';
}

function saveToLeaderboard(totalAssets) {
  var board = JSON.parse(localStorage.getItem('imf_leaderboard') || '[]');
  // 기존 isLatest 플래그 제거
  board.forEach(function(e) { e.isLatest = false; });
  // 새 기록 추가
  var playNum = board.length + 1;
  board.push({
    name: '플레이어 #' + playNum,
    assets: totalAssets,
    date: new Date().toISOString().slice(0, 10),
    isLatest: true
  });
  // 자산 내림차순 정렬
  board.sort(function(a, b) { return b.assets - a.assets; });
  localStorage.setItem('imf_leaderboard', JSON.stringify(board));
}

function getLeaderboard() {
  return JSON.parse(localStorage.getItem('imf_leaderboard') || '[]');
}

function getMyRank(totalAssets, board) {
  for (var i = 0; i < board.length; i++) {
    if (board[i].isLatest) return i + 1;
  }
  return board.length;
}

// 페이지 로드 시 저장된 키 복원
window.addEventListener('load', () => {
  const savedKey = localStorage.getItem('imf_gemini_key');
  if (savedKey) document.getElementById('gemini-key').value = savedKey;
});
