// 로컬 상태 계산 엔진 — API 호출 없이 자산/관계/신용 계산

const EXCHANGE_RATES = {
  1997: { 1:860, 3:890, 4:895, 7:890, 10:965, 11:1000, 12:1695 },
  1998: { 1:1707, 4:1390, 7:1290, 10:1326, 12:1204 },
  1999: { 1:1190, 4:1186, 7:1175, 10:1198, 12:1145 },
  2000: { 1:1128, 4:1110, 7:1118, 10:1138, 12:1265 },
  2001: { 1:1292, 4:1325, 7:1299, 10:1313, 12:1314 },
  2002: { 1:1313, 4:1270, 7:1195, 10:1230, 12:1186 },
  2003: { 1:1185, 4:1225, 7:1178, 10:1155, 12:1192 },
  2004: { 1:1170, 4:1155, 7:1148, 10:1130, 12:1035 },
  2005: { 1:1025, 4:1005, 7:1025, 10:1040, 12:1010 },
  2006: { 1:975, 4:950, 7:955, 10:945, 12:930 },
  2007: { 1:940, 4:925, 7:920, 10:910, 12:936 }
};

const GOLD_PRICES = {
  1997:10500, 1998:12000, 1999:10800, 2000:10200, 2001:11500,
  2002:13000, 2003:14500, 2004:15000, 2005:17000, 2006:22000, 2007:28000
};

const DEPOSIT_RATES = {
  1997:20, 1998:12, 1999:7, 2000:7, 2001:6,
  2002:5, 2003:4.5, 2004:4, 2005:3.8, 2006:4.5, 2007:5.5
};

// 코스닥 지수 (월별)
const KOSDAQ = {
  1997: { 1:72, 4:68, 7:70, 10:55, 12:42 },
  1998: { 1:48, 4:42, 7:38, 10:52, 12:80 },
  1999: { 1:90, 4:145, 7:195, 10:210, 12:260 },
  2000: { 1:270, 3:280, 4:150, 7:130, 10:80, 12:53 },
  2001: { 1:55, 4:70, 7:75, 10:60, 12:72 },
  2002: { 1:78, 4:90, 7:70, 10:55, 12:44 },
  2003: { 1:42, 4:40, 7:55, 10:60, 12:58 },
  2004: { 1:60, 4:55, 7:45, 10:42, 12:42 },
  2005: { 1:45, 4:48, 7:55, 10:60, 12:68 },
  2006: { 1:70, 4:72, 7:65, 10:68, 12:68 },
  2007: { 1:68, 4:75, 7:85, 10:82, 12:72 }
};

// 코스피 지수 (월별)
const KOSPI = {
  1997: { 1:669, 4:698, 7:745, 10:584, 12:376 },
  1998: { 1:462, 4:370, 7:313, 10:340, 12:562 },
  1999: { 1:587, 4:735, 7:920, 10:890, 12:1028 },
  2000: { 1:1059, 4:815, 7:820, 10:540, 12:504 },
  2001: { 1:523, 4:545, 7:572, 10:525, 12:694 },
  2002: { 1:693, 4:860, 7:740, 10:650, 12:627 },
  2003: { 1:610, 4:595, 7:720, 10:770, 12:811 },
  2004: { 1:840, 4:870, 7:780, 10:860, 12:896 },
  2005: { 1:960, 4:960, 7:1050, 10:1120, 12:1379 },
  2006: { 1:1389, 4:1370, 7:1290, 10:1370, 12:1434 },
  2007: { 1:1385, 4:1530, 7:1900, 10:2028, 12:1897 }
};

function getIndex(data, year, month) {
  var yearData = data[year];
  if (!yearData) return 100;
  var months = Object.keys(yearData).map(Number).sort(function(a,b){return a-b;});
  var closest = months[0];
  for (var i = 0; i < months.length; i++) {
    if (months[i] <= month) closest = months[i];
  }
  var base = yearData[closest];
  var variation = 1 + (Math.random() - 0.5) * 0.1;
  return Math.round(base * variation);
}

function getExchangeRate(year, month) {
  const yearData = EXCHANGE_RATES[year];
  if (!yearData) return 1000;
  const months = Object.keys(yearData).map(Number).sort((a,b) => a-b);
  let closest = months[0];
  for (const m of months) {
    if (m <= month) closest = m;
  }
  const base = yearData[closest];
  // ±5% 랜덤 변동
  const variation = 1 + (Math.random() - 0.5) * 0.1;
  return Math.round(base * variation);
}

function getGoldPrice(year) {
  return GOLD_PRICES[year] || 15000;
}


function parseAction(text, state) {
  const t = text.toLowerCase().replace(/,/g, '').replace(/\s+/g, ' ').trim();

  // ═══ 부정어 감지 ═══
  var isNegative = /안 |안한|안해|안낸|안다|안사|안갈|안할|하지 않|하지않|포기|거절|싫|안 할|안 사|안 갈|필요없|관두|그만|말자|말아|말고|않겠|않을|안 낼|안낼|거부|됐다|됐어|필요 없/.test(t);

  // ═══ 금액 추출 ═══
  let amount = 0;
  // "200만원", "50 만원", "1000만원"
  const manwonMatch = t.match(/(\d+)\s*만\s*원/);
  // "200만" (원 없이)
  const manMatch = t.match(/(\d+)\s*만(?!\s*원)/);
  // "30000원", "5000원"
  const wonMatch = t.match(/(\d+)\s*원/);
  // "1억", "2억5천"
  const eokMatch = t.match(/(\d+)\s*억/);
  if (manwonMatch) amount = parseInt(manwonMatch[1]) * 10000;
  else if (manMatch) amount = parseInt(manMatch[1]) * 10000;
  else if (wonMatch) amount = parseInt(wonMatch[1]);
  if (eokMatch) amount += parseInt(eokMatch[1]) * 100000000;

  // 달러 금액
  const dollarMatch = t.match(/(\d+)\s*달러/) || t.match(/(\d+)\s*\$/);
  let dollarAmount = dollarMatch ? parseInt(dollarMatch[1]) : 0;

  // ═══ 공통 동사 패턴 ═══
  var BUY = /산다|사자|사겠|사려|사볼|사둘|사둬|사놓|사놔|사요|삽니다|매수|매입|구매|구입|투자|들어가|넣|사 |살래|살게|살거|좀 사|에 사|을 사|를 사/.test(t);
  var SELL = /판다|팔자|팔겠|팔아|팔려|팔아야|팔까|매도|매각|처분|정리|빼|뺀다|빼자|현금화|팔 |팔래|팔게|팔거|다 팔|전부 팔|모두 팔/.test(t);
  var GIVE = /준다|줘|줬|줄게|줄래|드린|드렸|드려|드릴|보낸|보내|보냈|건넨|건네|전달|지원|후원|대신|대납|내준|내줬|내줄|갚아줬|갚아줄|갚아드|도와|도왔|돕/.test(t);
  var PAY = /낸다|냈|내|낼|지불|지출|결제|납부|쓴다|썼|쓸|쓸게|소비|사용|지급|치른|치르|치룬/.test(t);
  var BORROW_V = /빌린|빌려|빌렸|빌릴|대출|융자|꿔|꾸|꿨|차입/.test(t);
  var REPAY_V = /갚|상환|변제|청산|탕감|완납|돌려줬|돌려줄|돌려준|되갚/.test(t);

  // ═══ 1. 달러 거래 ═══
  if (t.includes('달러') || t.includes('$') || t.includes('환전') || t.includes('외화')) {
    // 매도 우선 체크
    if (SELL || t.includes('현금으로') || t.includes('원화로') || /모두|전부|다 /.test(t)) {
      return { type: 'SELL_USD', dollarAmount: dollarAmount || 0 };
    }
    if (BUY || t.includes('바꾸') || t.includes('바꿔') || (t.includes('달러로') && t.includes('환전'))) {
      return { type: 'BUY_USD', amount };
    }
    // "환전" 단독 → 보유 달러 있으면 매도, 없으면 매수
    if (t.includes('환전')) {
      if (state && state.assets && state.assets.usd > 0) return { type: 'SELL_USD', dollarAmount: dollarAmount || 0 };
      return { type: 'BUY_USD', amount };
    }
  }

  // ═══ 2. 금 거래 ═══
  if ((t.includes('금') && !t.includes('등록금') && !t.includes('현금') && !t.includes('세금') && !t.includes('금리') && !t.includes('금모으기') && !t.includes('금융')) ||
      t.includes('골드') || t.includes('금은방')) {
    if (SELL) return { type: 'SELL_GOLD', amount };
    if (BUY || GIVE || PAY) return { type: 'BUY_GOLD', amount };
  }

  // ═══ 3. 주식 거래 ═══
  if (t.includes('주식') || t.includes('코스피') || t.includes('코스닥') ||
      t.includes('삼성') || t.includes('포항') || t.includes('현대') || t.includes('sk') || t.includes('lg') ||
      t.includes('종목') || t.includes('증시') || t.includes('바이오') || t.includes('반도체') ||
      t.includes('it') || t.includes('인터넷') || t.includes('닷컴') || t.includes('벤처') ||
      t.includes('새롬') || t.includes('골드뱅크') || t.includes('다음') || t.includes('네이버') ||
      t.includes('카카오') || t.includes('셀트리온') || t.includes('한미약품') || t.includes('제약') ||
      t.includes('조선') || t.includes('철강') || t.includes('은행주') || t.includes('금융주') ||
      t.includes('etf') || t.includes('상장')) {
    if (SELL) return { type: 'SELL_STOCK', amount };
    if (BUY) return { type: 'BUY_STOCK', amount };
  }

  // ═══ 4. 펀드 거래 ═══
  if (t.includes('펀드') || t.includes('적립식') || t.includes('인덱스')) {
    if (SELL || /해지|환매/.test(t)) return { type: 'SELL_FUND', amount };
    if (BUY || /가입|들어|넣/.test(t)) return { type: 'BUY_FUND', amount };
  }

  // ═══ 5. 부동산 거래 ═══
  if (t.includes('부동산') || t.includes('아파트') || t.includes('집') || t.includes('전세') || t.includes('월세') || t.includes('매물')) {
    if (SELL) return { type: 'SELL_REALESTATE', amount };
    if (BUY || /계약|잡/.test(t)) return { type: 'BUY_REALESTATE', amount };
  }

  // ═══ 6. 건물 거래 ═══
  if (t.includes('건물') || t.includes('상가') || t.includes('오피스텔') || t.includes('빌딩') || t.includes('임대')) {
    if (SELL) return { type: 'SELL_BUILDING', amount };
    if (BUY || /계약|잡/.test(t)) return { type: 'BUY_BUILDING', amount };
  }

  // ═══ 7. 사업체 거래 ═══
  if (t.includes('회사') || t.includes('업체') || t.includes('가게') || t.includes('사업체') || t.includes('인수') || t.includes('창업') || t.includes('사업')) {
    if (SELL || /정리|폐업|접/.test(t)) return { type: 'SELL_BUSINESS', amount };
    if (BUY || /인수|시작|차린|차려|열/.test(t)) return { type: 'BUY_BUSINESS', amount };
  }

  // ═══ 8. 대출/차입 ═══
  if (BORROW_V || (t.includes('사채') && !REPAY_V && !GIVE)) {
    if (t.includes('사채') || t.includes('대출') || t.includes('돈') || amount > 0) {
      return { type: 'BORROW', amount };
    }
  }

  // ═══ 8.5. 카드 발급/사용 ═══
  if (/카드/.test(t) && /신청|만들|발급|가입|받/.test(t)) {
    return { type: 'GET_CARD', amount: 0 };
  }
  if (/카드/.test(t) && /쓴|썼|긁|결제|사용|질러|질렀/.test(t)) {
    return { type: 'USE_CARD', amount: amount || 500000 };
  }

  // ═══ 8.6. 데이트/유흥/소비 생활 ═══
  if (/데이트|영화|밥|술|노래방|카페|쇼핑|옷|놀러|여행|외식|회식/.test(t)) {
    return { type: 'LIFESTYLE_SPEND', amount: amount || 200000 };
  }

  // ═══ 9. 빚 상환 ═══
  if (REPAY_V && (t.includes('빚') || t.includes('사채') || t.includes('대출') || t.includes('이자') || amount > 0)) {
    return { type: 'REPAY', amount };
  }

  // ═══ 10. 가족 빚 대납 (아버지 사채 등) ═══
  if (/아버지|아빠/.test(t) && /사채|빚/.test(t) && (amount > 0 || GIVE || PAY || REPAY_V)) {
    return { type: 'SUPPORT_FAMILY', amount: amount || 500000, target: 'father' };
  }

  // ═══ 11. 예금/저축 ═══
  if (t.includes('예금') || t.includes('저축') || t.includes('적금') || t.includes('은행에 넣') || t.includes('통장에 넣') || t.includes('맡기') || t.includes('맡긴')) {
    return { type: 'DEPOSIT', amount };
  }

  // ═══ 12. 레버리지/파생 ═══
  if ((t.includes('선물') && t.includes('옵션')) || t.includes('레버리지') || t.includes('공매도') || t.includes('마진') || t.includes('선물거래') || t.includes('파생')) {
    return { type: 'LEVERAGE_TRADE', amount };
  }

  // ═══ 13. 교육비 ═══
  if (t.includes('학원') || t.includes('등록금') || t.includes('학비') || t.includes('수업료') || t.includes('과외')) {
    if (isNegative) return { type: 'NONE', amount: 0 };
    // 등록금/학비는 기본 180만원 (반액 장학금), 학원/과외는 30만원
    var eduDefault = (t.includes('등록금') || t.includes('학비')) ? 1800000 : 300000;
    return { type: 'SPEND_EDUCATION', amount: amount || eduDefault };
  }

  // ═══ 14. 선물/기프트 ═══
  if (/선물|사줘|사준|사줬|핸드크림|양말|구두|꽃|케이크|반지|목걸이|시계/.test(t) && !t.includes('옵션')) {
    return { type: 'SPEND_GIFT', amount: amount || 30000 };
  }

  // ═══ 15. 일/취직 ═══
  if (/알바|아르바이트|일한|일할|일하겠|취직|취업|입사|출근|일자리|파트타임|편의점/.test(t)) {
    return { type: 'WORK', amount: 0 };
  }

  // ═══ 16. 조만석 딜 ═══
  if (/조만석|딜|제안/.test(t)) {
    if (/수락|받아들|하겠|같이|좋|오케이|ok|응|그래|알겠|동의|합류/.test(t)) {
      return { type: 'ACCEPT_DEAL', amount };
    }
    if (isNegative || /거절|거부|안 한|싫|됐/.test(t)) {
      return { type: 'REJECT_DEAL', amount: 0 };
    }
  }

  // ═══ 17. 이직 ═══
  if (/이직|전직|옮기|증권사|그만두|그만둘|퇴사|퇴직|사표|사직/.test(t)) {
    return { type: 'CHANGE_JOB', amount: 0 };
  }

  // ═══ 18. 가족 금전 지원 (넓은 패턴) ═══
  if (/승연|은지|어머니|엄마|아버지|아빠|부모|가족/.test(t) && (GIVE || PAY || REPAY_V || amount > 0)) {
    // 금액이 있거나 돈 관련 동사가 있으면 → 금전 지원
    if (/등록금|생활비|병원비|약값|치료비|용돈|밥값|교통비|월세|사채|빚|돈/.test(t) || amount > 0) {
      return { type: 'SUPPORT_FAMILY', amount: amount || 500000, target: extractTarget(t) };
    }
  }

  // ═══ 19. 정보 거래 ═══
  if (/정보|김실장|김 실장|내부자|인사이더|첩보/.test(t) && (BUY || /거래|받|구한|구해|얻/.test(t))) {
    return { type: 'BUY_INFO', amount: amount || 1000000 };
  }

  // ═══ 20. 보험 ═══
  if (t.includes('보험') && (BUY || /가입|든다|들겠|들어|넣/.test(t))) {
    return { type: 'BUY_INSURANCE', amount: amount || 300000 };
  }

  // ═══ 21. 이사 ═══
  if (/이사|이사간|이사가|이사할/.test(t) || (t.includes('강남') && /간다|가자|갈|가겠|이전/.test(t))) {
    return { type: 'MOVE', amount: 0 };
  }

  // ═══ 22. 공부/자기계발 ═══
  if (/유학|자격증|mba|석사|박사|공인회계사|cfa|cpa|공부하|배우|수강/.test(t)) {
    return { type: 'STUDY', amount: amount || 5000000 };
  }

  // ═══ 23. 동준 관계 ═══
  if (t.includes('동준')) {
    if (/용서|화해|받아|괜찮|이해|만나|봐줄|봐줘/.test(t)) return { type: 'FORGIVE_DONGJUN', amount: 0 };
    if (isNegative || /거절|안 만|끊|절교|무시/.test(t)) return { type: 'REJECT_DONGJUN', amount: 0 };
  }

  // ═══ 24. 아버지에게 진실 고백 ═══
  if (/아버지|아빠/.test(t) && /말한|고백|사실|진실|알려|얘기|이야기|털어놓|솔직/.test(t)) {
    return { type: 'CONFESS_FATHER', amount: 0 };
  }

  // ═══ 25. 승연에게 진실 알림 ═══
  if (t.includes('승연') && /조현우|현우/.test(t) && /말한|알려|사실|진실|얘기|이야기|경고|조심/.test(t)) {
    return { type: 'TELL_SEUNGYEON', amount: 0 };
  }

  // ═══ 26. 대학/재수 ═══
  if (/재수|대학|수능|입시/.test(t)) {
    if (isNegative || /포기|그만|안 |않/.test(t)) return { type: 'SKIP_COLLEGE', amount: 0 };
    if (/한다|간다|가겠|결심|도전|준비|합격/.test(t)) return { type: 'GO_COLLEGE', amount: 0 };
  }

  // ═══ 27. 가족 대화 (금전 아닌 경우) ═══
  if (/아버지|어머니|엄마|아빠|승연|부모/.test(t)) {
    return { type: 'SOCIAL_FAMILY', amount: 0, target: extractTarget(t) };
  }

  // ═══ 28. 친구 대화 ═══
  if (/은지|동준/.test(t)) {
    return { type: 'SOCIAL_FRIEND', amount: 0, target: extractTarget(t) };
  }

  // ═══ 29. 정보 수집 ═══
  if (/신문|읽|공부|조사|뉴스|경제|분석|찾아|알아|검색|리서치/.test(t)) {
    return { type: 'INFO', amount: 0 };
  }

  // ═══ 30. 투자 단독 입력 (대상 미지정 → 주식으로 기본 처리) ═══
  if (/투자|넣겠|넣을|넣어|굴리|굴려|불리|불려|돈을 넣|돈 넣/.test(t) && !isNegative) {
    return { type: 'BUY_STOCK', amount };
  }

  // ═══ 31. 아무것도 안 함 ═══
  if (/아무것도|넘어|잔다|기다|가만|지켜|관망|패스|스킵|넘기/.test(t)) {
    return { type: 'NONE', amount: 0 };
  }

  // ═══ 31. 일반 지출 (금액 + 지출 동사) ═══
  if (amount > 0 && (PAY || GIVE)) {
    return { type: 'SPEND', amount };
  }

  // ═══ 32. 분류 불가 → 대화/행동 ═══
  return { type: 'SOCIAL', amount: 0 };
}

function extractTarget(text) {
  if (text.includes('아버지') || text.includes('아빠')) return 'father';
  if (text.includes('어머니') || text.includes('엄마')) return 'mother';
  if (text.includes('승연')) return 'seungyeon';
  if (text.includes('은지')) return 'eunji';
  if (text.includes('동준')) return 'dongjun';
  return null;
}

// 메인 계산 함수
function calculateStateLocal(action, state, year, month) {
  const parsed = parseAction(action, state);
  const result = {
    action_type: parsed.type,
    action_valid: true,
    action_description: '',
    rejection_reason: null,
    state_changes: { assets: {}, relationships: {}, stats: {} },
    asset_summary: null,
    narrative_hints: { tone: 'neutral', details: action }
  };

  const cash = state.assets.cash_krw;

  switch (parsed.type) {
    case 'BUY_USD': {
      var amt = parsed.amount || Math.floor(cash * 0.5);
      if (amt <= 0 || cash <= 0) { result.action_valid = false; result.rejection_reason = '환전할 현금이 없습니다.'; break; }
      if (amt > cash) amt = cash;
      const rate = getExchangeRate(year, month);
      const usd = Math.floor(amt / rate);
      result.state_changes.assets = { cash_krw: -amt, usd: usd, usd_buy_rate: rate };
      result.asset_summary = `원화 ${Math.floor(amt/10000)}만원 → 달러 ${usd} (환율 ${rate}원)`;
      result.action_description = `달러 ${usd}달러 매수 (환율 ${rate}원)`;
      result.narrative_hints = { tone: 'tense', details: `은행에 가서 ${Math.floor(amt/10000)}만원을 달러로 환전했다. 환율 ${rate}원. ${usd}달러.` };
      break;
    }
    case 'SELL_USD': {
      const usdToSell = parsed.dollarAmount || state.assets.usd || 0;
      if (usdToSell <= 0 || (state.assets.usd || 0) < usdToSell) {
        result.action_valid = false;
        result.rejection_reason = '보유 달러가 부족합니다. (보유: ' + (state.assets.usd || 0) + ')';
        break;
      }
      const rate = getExchangeRate(year, month);
      const krw = usdToSell * rate;
      result.state_changes.assets = { cash_krw: krw, usd: -usdToSell };
      result.asset_summary = `달러 ${usdToSell} → 원화 ${Math.floor(krw/10000)}만원 (환율 ${rate}원)`;
      result.action_description = `달러 ${usdToSell}달러 매도`;
      break;
    }
    case 'BUY_GOLD': {
      var amt = parsed.amount || Math.floor(cash * 0.5);
      if (amt <= 0 || cash <= 0) {
        result.action_valid = false;
        result.rejection_reason = amt <= 0 ? '투자할 현금이 없습니다.' : '현금이 부족합니다.';
        break;
      }
      if (amt > cash) amt = cash;
      const goldPrice = getGoldPrice(year);
      const goldGrams = Math.floor(amt / goldPrice);
      var goldRemaining = cash - amt;
      result.state_changes.assets = { cash_krw: -amt, gold_gram: goldGrams };
      result.asset_summary = Math.floor(amt/10000) + '만원 → 금 ' + goldGrams + 'g (' + year + '년 g당 ' + goldPrice.toLocaleString() + '원) | 잔액 ' + Math.floor(goldRemaining/10000) + '만원';
      result.action_description = '금 ' + goldGrams + 'g 매수';
      result.narrative_hints = { tone: 'cautious', details: '금은방에서 금을 샀다. ' + goldGrams + 'g. g당 ' + goldPrice.toLocaleString() + '원.' };
      break;
    }
    case 'SELL_GOLD': {
      const grams = state.assets.gold_gram || 0;
      if (grams <= 0) {
        result.action_valid = false;
        result.rejection_reason = '보유 금이 없습니다.';
        break;
      }
      const price = getGoldPrice(year);
      const krwFromGold = grams * price;
      result.state_changes.assets = { cash_krw: krwFromGold, gold_gram: -grams };
      result.asset_summary = '금 ' + grams + 'g 매도 → +' + Math.floor(krwFromGold/10000) + '만원 (' + year + '년 금시세 g당 ' + price.toLocaleString() + '원)';
      result.narrative_hints = { tone: 'calculated', details: '금을 팔았다. ' + grams + 'g. g당 ' + price.toLocaleString() + '원. ' + Math.floor(krwFromGold/10000) + '만원을 받았다.' };
      break;
    }
    case 'SPEND_EDUCATION':
    case 'SPEND_GIFT':
    case 'SPEND': {
      const amt = parsed.amount;
      if (amt > cash) {
        result.action_valid = false;
        result.rejection_reason = '현금이 부족합니다. (보유: ' + Math.floor(cash/10000) + '만원, 필요: ' + Math.floor(amt/10000) + '만원)';
        break;
      }
      result.state_changes.assets = { cash_krw: -amt };
      var remaining = cash - amt;
      result.asset_summary = Math.floor(amt/10000) + '만원 지출 → 잔액 ' + Math.floor(remaining/10000) + '만원';
      result.action_description = Math.floor(amt/10000) + '만원 지출';
      if (parsed.type === 'SPEND_EDUCATION') {
        result.narrative_hints = { tone: 'determined', details: '학원비 ' + Math.floor(amt/10000) + '만원을 냈다. 통장에 ' + Math.floor(remaining/10000) + '만원이 남았다.' };
      }
      break;
    }
    case 'BORROW': {
      const borrowAmt = parsed.amount || 5000000;
      var monthlyInterest = Math.floor(borrowAmt * 0.36 / 12);
      result.state_changes.assets = { cash_krw: borrowAmt };
      const newDebt = { source: '사채', amount: borrowAmt, rate: 36 };
      result.state_changes.assets.debt = newDebt;
      result.asset_summary = '사채 ' + Math.floor(borrowAmt/10000) + '만원 차입 (연 36%, 월이자 ' + Math.floor(monthlyInterest/10000) + '만' + Math.floor((monthlyInterest%10000)/1000) + '천원)';
      result.narrative_hints = { tone: 'dark', details: '사채업자한테 ' + Math.floor(borrowAmt/10000) + '만원을 빌렸다. 연 이자 36%. 매달 ' + Math.floor(monthlyInterest/10000) + '만원씩 이자가 붙는다.' };
      break;
    }
    case 'REPAY': {
      var debts = state.assets.debt || [];
      if (debts.length === 0) {
        result.action_valid = false;
        result.rejection_reason = '갚을 빚이 없습니다.';
        break;
      }
      var repayAmt = parsed.amount || debts[0].amount || 0;
      if (repayAmt > cash) {
        result.action_valid = false;
        result.rejection_reason = '현금이 부족합니다. (보유: ' + Math.floor(cash/10000) + '만원)';
        break;
      }
      var debt = debts[0];
      var newDebtAmt = debt.amount - repayAmt;
      if (newDebtAmt <= 0) {
        result.state_changes.assets = { cash_krw: -debt.amount, debt: [] };
        result.asset_summary = debt.source + ' ' + Math.floor(debt.amount/10000) + '만원 전액 상환 완료';
      } else {
        result.state_changes.assets = { cash_krw: -repayAmt };
        result.state_changes.assets.debt_update = { index: 0, amount: newDebtAmt };
        result.asset_summary = debt.source + ' ' + Math.floor(repayAmt/10000) + '만원 상환 → 잔액 ' + Math.floor(newDebtAmt/10000) + '만원';
      }
      result.action_description = '빚 상환 ' + Math.floor(repayAmt/10000) + '만원';
      result.narrative_hints = { tone: 'relieved', details: '빚을 갚았다. ' + Math.floor(repayAmt/10000) + '만원.' };
      break;
    }
    case 'DEPOSIT': {
      var depAmt = parsed.amount || Math.floor(cash * 0.5);
      if (depAmt <= 0 || cash <= 0) { result.action_valid = false; result.rejection_reason = '예금할 현금이 없습니다.'; break; }
      if (depAmt > cash) depAmt = cash;
      var depRate = DEPOSIT_RATES[year] || 5;
      var annualInterest = Math.floor(depAmt * depRate / 100);
      result.state_changes.assets = { cash_krw: -depAmt + annualInterest };
      result.asset_summary = Math.floor(depAmt/10000) + '만원 예금 (연 ' + depRate + '%) → 이자 +' + Math.floor(annualInterest/10000) + '만원';
      result.action_description = '예금 ' + Math.floor(depAmt/10000) + '만원';
      result.narrative_hints = { tone: 'steady', details: '은행에 ' + Math.floor(depAmt/10000) + '만원을 넣었다. 연 ' + depRate + '%. 이자가 ' + Math.floor(annualInterest/10000) + '만원 붙었다.' };
      break;
    }
    case 'BUY_REALESTATE': {
      var reAmt = parsed.amount || 0;
      if (reAmt <= 0) { result.action_description = '금액을 지정해주세요'; break; }
      if (state.player.age < 20) {
        result.action_valid = false;
        result.rejection_reason = '아직 부동산을 살 수 있는 나이가 아닙니다.';
        break;
      }
      // 자기자본 30% + 대출 70% 구조
      var downPayment = Math.floor(reAmt * 0.3);
      if (downPayment > cash) {
        result.action_valid = false;
        result.rejection_reason = '계약금이 부족합니다. (필요: ' + Math.floor(downPayment/10000) + '만원, 보유: ' + Math.floor(cash/10000) + '만원)';
        break;
      }
      var mortgage = reAmt - downPayment;
      var mortgageRate = (DEPOSIT_RATES[year] || 5) + 2;
      result.state_changes.assets = { cash_krw: -downPayment };
      result.state_changes.assets.real_estate = { value: reAmt, buyPrice: reAmt, buyYear: year, mortgage: mortgage };
      if (mortgage > 0) {
        result.state_changes.assets.debt = { source: '주택담보대출', amount: mortgage, rate: mortgageRate };
      }
      result.asset_summary = Math.floor(reAmt/10000) + '만원 부동산 매수 (자기자본 ' + Math.floor(downPayment/10000) + '만원 + 대출 ' + Math.floor(mortgage/10000) + '만원)';
      result.action_description = '부동산 ' + Math.floor(reAmt/10000) + '만원 매수';
      result.narrative_hints = { tone: 'tense', details: '부동산을 샀다. ' + Math.floor(reAmt/10000) + '만원. 계약금 ' + Math.floor(downPayment/10000) + '만원을 냈다.' };
      break;
    }
    case 'SELL_REALESTATE': {
      var reList = state.assets.real_estate || [];
      if (reList.length === 0) {
        result.action_valid = false;
        result.rejection_reason = '보유 부동산이 없습니다.';
        break;
      }
      var prop = reList[0];
      // 시세 변동 적용 (연도별 상승률)
      var reGrowth = { 2000:0.95, 2001:1.02, 2002:1.15, 2003:1.05, 2004:1.12, 2005:1.18, 2006:1.15, 2007:1.08 };
      var currentValue = prop.buyPrice;
      for (var y = prop.buyYear + 1; y <= year; y++) {
        currentValue = Math.floor(currentValue * (reGrowth[y] || 1.03));
      }
      var reProfit = currentValue - prop.buyPrice;
      var mortgageLeft = 0;
      // 담보대출 상환
      if (state.assets.debt) {
        for (var di = 0; di < state.assets.debt.length; di++) {
          if (state.assets.debt[di].source === '주택담보대출') {
            mortgageLeft = state.assets.debt[di].amount;
          }
        }
      }
      var netProceeds = currentValue - mortgageLeft;
      result.state_changes.assets = { cash_krw: netProceeds, real_estate: [] };
      if (mortgageLeft > 0) {
        result.state_changes.assets.debt_remove = '주택담보대출';
      }
      result.asset_summary = '부동산 매도 ' + Math.floor(currentValue/10000) + '만원' + (mortgageLeft > 0 ? ' - 대출상환 ' + Math.floor(mortgageLeft/10000) + '만원' : '') + ' → 순수익 ' + Math.floor(netProceeds/10000) + '만원 (' + (reProfit >= 0 ? '+' : '') + Math.floor(reProfit/10000) + '만원)';
      result.action_description = '부동산 매도 (수익 ' + Math.floor(reProfit/10000) + '만원)';
      result.narrative_hints = { tone: reProfit >= 0 ? 'triumphant' : 'bitter', details: '부동산을 팔았다. ' + Math.floor(currentValue/10000) + '만원에.' };
      break;
    }
    case 'BUY_BUILDING': {
      var bldAmt = parsed.amount || 0;
      if (bldAmt <= 0) { result.action_description = '금액을 지정해주세요'; break; }
      var bldDown = Math.floor(bldAmt * 0.3);
      if (bldDown > cash) {
        result.action_valid = false;
        result.rejection_reason = '계약금이 부족합니다. (필요: ' + Math.floor(bldDown/10000) + '만원)';
        break;
      }
      var bldLoan = bldAmt - bldDown;
      var bldRate = (DEPOSIT_RATES[year] || 5) + 2;
      // 월 임대수익 (매입가의 연 5~8%)
      var monthlyRent = Math.floor(bldAmt * 0.06 / 12);
      result.state_changes.assets = { cash_krw: -bldDown };
      result.state_changes.assets.buildings = { type: '건물', value: bldAmt, buyPrice: bldAmt, buyYear: year, monthlyRent: monthlyRent };
      if (bldLoan > 0) {
        result.state_changes.assets.debt = { source: '건물담보대출', amount: bldLoan, rate: bldRate };
      }
      result.asset_summary = Math.floor(bldAmt/10000) + '만원 건물 매수 (계약금 ' + Math.floor(bldDown/10000) + '만원 + 대출 ' + Math.floor(bldLoan/10000) + '만원) | 월 임대수익 ' + Math.floor(monthlyRent/10000) + '만원';
      result.action_description = '건물 ' + Math.floor(bldAmt/10000) + '만원 매수';
      result.narrative_hints = { tone: 'ambitious', details: '건물을 샀다. ' + Math.floor(bldAmt/10000) + '만원. 매달 임대료가 들어온다.' };
      break;
    }
    case 'SELL_BUILDING': {
      var bldList = state.assets.buildings || [];
      if (bldList.length === 0) {
        result.action_valid = false;
        result.rejection_reason = '보유 건물이 없습니다.';
        break;
      }
      var bld = bldList[0];
      var bldGrowth = { 2000:0.98, 2001:1.03, 2002:1.08, 2003:1.05, 2004:1.10, 2005:1.15, 2006:1.12, 2007:1.06 };
      var bldValue = bld.buyPrice;
      for (var by = bld.buyYear + 1; by <= year; by++) {
        bldValue = Math.floor(bldValue * (bldGrowth[by] || 1.03));
      }
      // 보유 기간 임대수익 합산
      var holdMonths = (year - bld.buyYear) * 12;
      var totalRent = (bld.monthlyRent || 0) * holdMonths;
      var bldMortgage = 0;
      if (state.assets.debt) {
        for (var bi = 0; bi < state.assets.debt.length; bi++) {
          if (state.assets.debt[bi].source === '건물담보대출') bldMortgage = state.assets.debt[bi].amount;
        }
      }
      var bldNet = bldValue - bldMortgage + totalRent;
      var bldProfit = bldNet - bld.buyPrice + bldMortgage;
      result.state_changes.assets = { cash_krw: bldNet, buildings: [] };
      if (bldMortgage > 0) result.state_changes.assets.debt_remove = '건물담보대출';
      result.asset_summary = '건물 매도 ' + Math.floor(bldValue/10000) + '만원 + 임대수익 ' + Math.floor(totalRent/10000) + '만원' + (bldMortgage > 0 ? ' - 대출 ' + Math.floor(bldMortgage/10000) + '만원' : '') + ' → 순수익 ' + Math.floor(bldProfit/10000) + '만원';
      result.action_description = '건물 매도 (수익 ' + Math.floor(bldProfit/10000) + '만원)';
      result.narrative_hints = { tone: bldProfit >= 0 ? 'triumphant' : 'bitter', details: '건물을 팔았다. ' + Math.floor(bldValue/10000) + '만원에.' };
      break;
    }
    case 'BUY_BUSINESS': {
      var bizAmt = parsed.amount || 0;
      if (bizAmt <= 0) { result.action_description = '금액을 지정해주세요'; break; }
      if (bizAmt > cash) {
        result.action_valid = false;
        result.rejection_reason = '현금이 부족합니다. (보유: ' + Math.floor(cash/10000) + '만원)';
        break;
      }
      // 사업체 수익은 불확실 — 월 매출의 10~30% 순이익
      var bizMonthlyProfit = Math.floor(bizAmt * (0.1 + Math.random() * 0.2) / 12);
      result.state_changes.assets = { cash_krw: -bizAmt };
      result.state_changes.assets.business = { type: '사업체', value: bizAmt, buyPrice: bizAmt, buyYear: year, monthlyProfit: bizMonthlyProfit };
      result.state_changes.stats = { job: 'business' };
      result.asset_summary = Math.floor(bizAmt/10000) + '만원 사업체 인수 | 예상 월 순이익 ' + Math.floor(bizMonthlyProfit/10000) + '만원';
      result.action_description = '사업체 인수 ' + Math.floor(bizAmt/10000) + '만원';
      result.narrative_hints = { tone: 'ambitious', details: '사업체를 인수했다. ' + Math.floor(bizAmt/10000) + '만원. 사장이 됐다.' };
      break;
    }
    case 'SELL_BUSINESS': {
      var bizList = state.assets.business || [];
      if (!bizList || (Array.isArray(bizList) && bizList.length === 0) || (!Array.isArray(bizList) && !bizList.type)) {
        result.action_valid = false;
        result.rejection_reason = '보유 사업체가 없습니다.';
        break;
      }
      var biz = Array.isArray(bizList) ? bizList[0] : bizList;
      // 사업체 가치 변동 (경기에 따라 ±30%)
      var bizMultiplier = 0.7 + Math.random() * 0.6;
      var bizSellPrice = Math.floor(biz.buyPrice * bizMultiplier);
      var holdMonthsBiz = (year - biz.buyYear) * 12;
      var totalBizProfit = (biz.monthlyProfit || 0) * holdMonthsBiz;
      var bizNetGain = bizSellPrice + totalBizProfit - biz.buyPrice;
      result.state_changes.assets = { cash_krw: bizSellPrice + totalBizProfit, business: [] };
      result.asset_summary = '사업체 매각 ' + Math.floor(bizSellPrice/10000) + '만원 + 운영수익 ' + Math.floor(totalBizProfit/10000) + '만원 → 순수익 ' + (bizNetGain >= 0 ? '+' : '') + Math.floor(bizNetGain/10000) + '만원';
      result.action_description = '사업체 매각';
      result.narrative_hints = { tone: bizNetGain >= 0 ? 'relieved' : 'bitter', details: '사업체를 팔았다.' };
      break;
    }
    case 'BUY_FUND': {
      var fundAmt = parsed.amount || Math.floor(cash * 0.5);
      if (fundAmt <= 0 || cash <= 0) { result.action_valid = false; result.rejection_reason = '투자할 현금이 없습니다.'; break; }
      if (fundAmt > cash) fundAmt = cash;
      var isChinaFund = action.includes('중국');
      var fundName = isChinaFund ? '중국펀드' : '국내펀드';
      // 펀드 수익률: 시기에 따라 다름
      var fundReturn = { 1999:0.35, 2000:-0.25, 2001:-0.10, 2002:0.05, 2003:0.15, 2004:0.10, 2005:0.20, 2006:0.30, 2007:0.15 };
      if (isChinaFund) fundReturn = { 2005:0.45, 2006:0.55, 2007:0.40, 2008:-0.50 };
      var expectedReturn = fundReturn[year] || 0.05;
      var fundGain = Math.floor(fundAmt * expectedReturn);
      result.state_changes.assets = { cash_krw: -fundAmt + fundGain };
      result.asset_summary = fundName + ' ' + Math.floor(fundAmt/10000) + '만원 투자 → 수익 ' + (fundGain >= 0 ? '+' : '') + Math.floor(fundGain/10000) + '만원 (' + Math.round(expectedReturn*100) + '%)';
      result.action_description = fundName + ' ' + Math.floor(fundAmt/10000) + '만원 투자';
      result.narrative_hints = { tone: fundGain >= 0 ? 'hopeful' : 'disappointed', details: fundName + '에 ' + Math.floor(fundAmt/10000) + '만원을 넣었다. ' + (fundGain >= 0 ? '수익이 났다.' : '손실이 났다.') };
      break;
    }
    case 'SELL_FUND': {
      result.action_description = '펀드는 투자 시 즉시 수익/손실이 반영됩니다.';
      result.narrative_hints = { tone: 'neutral', details: '펀드는 이미 정산됐다.' };
      break;
    }
    case 'WORK': {
      var jobType = '';
      var income = 0;
      if (action.includes('편의점') || action.includes('알바')) {
        jobType = 'parttime'; income = 430000;
        result.narrative_hints = { tone: 'steady', details: '편의점 알바를 시작했다. 시급 1,800원. 한 달 43만원.' };
      } else if (action.includes('은행') || action.includes('취직') || action.includes('입사')) {
        jobType = 'banker'; income = 1200000;
        result.narrative_hints = { tone: 'proud', details: '은행에 입사했다. 월급 120만원.' };
      } else if (action.includes('사업') || action.includes('창업')) {
        jobType = 'business'; income = 0;
        result.narrative_hints = { tone: 'ambitious', details: '사업을 시작했다.' };
      } else {
        jobType = 'parttime'; income = 430000;
        result.narrative_hints = { tone: 'steady', details: '일을 시작했다.' };
      }
      result.state_changes.stats = { job: jobType };
      if (income > 0) {
        result.state_changes.assets = { cash_krw: income };
        result.asset_summary = '첫 급여 +' + Math.floor(income/10000) + '만원';
      }
      result.action_description = jobType === 'parttime' ? '알바 시작' : (jobType === 'banker' ? '은행 입사' : '사업 시작');
      break;
    }
    case 'ACCEPT_DEAL': {
      // 조만석 딜 수락 — 고수익 고위험
      var dealAmt = parsed.amount || 10000000;
      var dealProfit = Math.floor(dealAmt * (0.15 + Math.random() * 0.25));
      // 30% 확률로 실패 (조만석 함정)
      if (Math.random() < 0.3) {
        var dealLoss = Math.floor(dealAmt * (0.1 + Math.random() * 0.2));
        result.state_changes.assets = { cash_krw: -dealLoss };
        result.state_changes.relationships = { manseok: 10 };
        result.asset_summary = '조만석 딜 실패 → -' + Math.floor(dealLoss/10000) + '만원 손실';
        result.narrative_hints = { tone: 'dark', details: '조만석의 딜을 받아들였다. 실패했다. 돈을 잃었다. 조만석은 웃고 있었다.' };
      } else {
        result.state_changes.assets = { cash_krw: dealProfit };
        result.state_changes.relationships = { manseok: 15 };
        result.asset_summary = '조만석 딜 성공 → +' + Math.floor(dealProfit/10000) + '만원 수익';
        result.narrative_hints = { tone: 'tense', details: '조만석의 딜이 성공했다. 돈이 들어왔다. 그런데 빚진 기분이었다.' };
      }
      result.action_description = '조만석 딜 수락';
      break;
    }
    case 'REJECT_DEAL': {
      result.state_changes.relationships = { manseok: -10 };
      result.action_description = '조만석 딜 거절';
      result.narrative_hints = { tone: 'defiant', details: '조만석의 제안을 거절했다. 조만석 얼굴이 굳었다. "후회할 거야."' };
      break;
    }
    case 'CHANGE_JOB': {
      var currentJob = state.stats.job;
      var newJob = '';
      var newIncome = 0;
      if (action.includes('증권사')) {
        newJob = 'securities'; newIncome = 1800000;
        result.narrative_hints = { tone: 'ambitious', details: '증권사로 이직했다. 월급이 올랐다. 시장이 더 가까워졌다.' };
      } else if (action.includes('조만석') || action.includes('그 사람')) {
        newJob = 'manseok_employee'; newIncome = 2500000;
        result.state_changes.relationships = { manseok: 20 };
        result.narrative_hints = { tone: 'dark', details: '조만석 밑에서 일하기 시작했다. 월급은 좋았다. 대가가 뭔지 아직 모른다.' };
      } else if (action.includes('그만')) {
        newJob = 'unemployed'; newIncome = 0;
        result.narrative_hints = { tone: 'uncertain', details: '직장을 그만뒀다. 자유로웠다. 불안했다.' };
      } else {
        newJob = 'banker'; newIncome = 1500000;
        result.narrative_hints = { tone: 'steady', details: '새 직장을 구했다.' };
      }
      result.state_changes.stats = { job: newJob, monthly_expense: newJob === 'unemployed' ? 100000 : 200000 };
      if (newIncome > 0) {
        result.state_changes.assets = { cash_krw: newIncome };
        result.asset_summary = '이직 → 첫 급여 ' + Math.floor(newIncome/10000) + '만원';
      }
      result.action_description = '이직: ' + newJob;
      break;
    }
    case 'SUPPORT_FAMILY': {
      var supportAmt = parsed.amount || 500000;
      var supportTarget = parsed.target || 'mother';
      if (supportAmt > cash) {
        result.action_valid = false;
        result.rejection_reason = '현금이 부족합니다.';
        break;
      }
      result.state_changes.assets = { cash_krw: -supportAmt };
      result.state_changes.relationships = { [supportTarget]: 10 };
      var targetName = { father: '아버지', mother: '어머니', seungyeon: '승연이', eunji: '은지' }[supportTarget] || supportTarget;
      result.asset_summary = targetName + '에게 ' + Math.floor(supportAmt/10000) + '만원 지원';
      result.action_description = targetName + ' 지원 ' + Math.floor(supportAmt/10000) + '만원';
      result.narrative_hints = { tone: 'warm', details: targetName + '에게 돈을 보냈다. ' + Math.floor(supportAmt/10000) + '만원. 통장이 줄었다. 마음은 가벼워졌다.' };
      break;
    }
    case 'BUY_INFO': {
      var infoCost = parsed.amount || 1000000;
      if (infoCost > cash) {
        result.action_valid = false;
        result.rejection_reason = '현금이 부족합니다.';
        break;
      }
      result.state_changes.assets = { cash_krw: -infoCost };
      result.state_changes.stats = { info_level: 1 };
      // 정보 품질 랜덤 — 50% 좋은 정보, 30% 쓸모없음, 20% 거짓
      var infoRoll = Math.random();
      if (infoRoll < 0.5) {
        result.asset_summary = '정보 구매 ' + Math.floor(infoCost/10000) + '만원 → 유용한 정보 획득 (투자 함정 확률 감소)';
        result.narrative_hints = { tone: 'calculated', details: '정보를 샀다. 쓸 만했다. 조만석의 다음 움직임이 보이기 시작했다.' };
        // 다음 투자 시 함정 확률 감소 효과 (info_level로 반영)
      } else if (infoRoll < 0.8) {
        result.asset_summary = '정보 구매 ' + Math.floor(infoCost/10000) + '만원 → 쓸모없는 정보';
        result.narrative_hints = { tone: 'disappointed', details: '정보를 샀다. 이미 아는 내용이었다. 돈만 날렸다.' };
      } else {
        result.asset_summary = '정보 구매 ' + Math.floor(infoCost/10000) + '만원 → 거짓 정보 (주의)';
        result.narrative_hints = { tone: 'suspicious', details: '정보를 샀다. 뭔가 이상했다. 일부러 잘못된 정보를 흘린 건지.' };
      }
      result.action_description = '정보 거래 ' + Math.floor(infoCost/10000) + '만원';
      break;
    }
    case 'BUY_INSURANCE': {
      var insPremium = parsed.amount || 300000;
      if (insPremium > cash) {
        result.action_valid = false;
        result.rejection_reason = '현금이 부족합니다.';
        break;
      }
      result.state_changes.assets = { cash_krw: -insPremium };
      // 보험 플래그 설정 — 다음 투자 함정 시 손실 50% 감소
      result.state_changes.stats = { insurance: 1 };
      result.asset_summary = '보험 가입 ' + Math.floor(insPremium/10000) + '만원 (투자 손실 시 50% 보전)';
      result.action_description = '보험 가입';
      result.narrative_hints = { tone: 'cautious', details: '보험에 가입했다. ' + Math.floor(insPremium/10000) + '만원. 안전장치. 쓸 일이 없으면 좋겠다.' };
      break;
    }
    case 'MOVE': {
      var isToGangnam = action.includes('강남') || action.includes('서울');
      if (isToGangnam) {
        var moveCost = 5000000; // 보증금 차이
        if (moveCost > cash) {
          result.action_valid = false;
          result.rejection_reason = '이사 비용이 부족합니다. (필요: 500만원)';
          break;
        }
        result.state_changes.assets = { cash_krw: -moveCost };
        result.state_changes.stats = { monthly_expense: 300000, info_level: 0.5 };
        result.asset_summary = '강남 이사 → 보증금 500만원 | 월 생활비 30만원으로 증가 | 정보 접근성 상승';
        result.narrative_hints = { tone: 'ambitious', details: '강남으로 이사했다. 원룸. 좁았다. 그래도 강남이었다. 은행까지 걸어서 10분.' };
      } else {
        result.state_changes.stats = { monthly_expense: 150000 };
        result.asset_summary = '이사 완료 | 월 생활비 15만원';
        result.narrative_hints = { tone: 'quiet', details: '이사했다. 새 동네. 조용했다.' };
      }
      result.action_description = isToGangnam ? '강남 이사' : '이사';
      break;
    }
    case 'STUDY': {
      var studyCost = parsed.amount || 5000000;
      if (studyCost > cash) {
        result.action_valid = false;
        result.rejection_reason = '학비가 부족합니다. (필요: ' + Math.floor(studyCost/10000) + '만원)';
        break;
      }
      var studyType = '';
      if (action.includes('유학')) { studyType = '유학'; }
      else if (action.includes('mba') || action.includes('석사')) { studyType = 'MBA'; }
      else if (action.includes('cfa') || action.includes('공인')) { studyType = 'CFA'; }
      else { studyType = '자격증'; }
      result.state_changes.assets = { cash_krw: -studyCost };
      result.state_changes.stats = { info_level: 1, credit_score: 10 };
      // 수입 증가 효과 — 다음 직장 월급 30% 상승
      result.asset_summary = studyType + ' 투자 ' + Math.floor(studyCost/10000) + '만원 → 정보력 상승 + 신용 상승';
      result.action_description = studyType + ' 시작';
      result.narrative_hints = { tone: 'determined', details: studyType + '을 시작했다. ' + Math.floor(studyCost/10000) + '만원. 시간과 돈을 투자했다. 나중에 돌아올 거라고 믿었다.' };
      break;
    }
    case 'LEVERAGE_TRADE': {
      var levAmt = parsed.amount || 0;
      if (levAmt <= 0) { result.action_description = '금액을 지정해주세요'; break; }
      if (levAmt > cash) {
        result.action_valid = false;
        result.rejection_reason = '증거금이 부족합니다.';
        break;
      }
      // 레버리지 3배 — 수익도 3배, 손실도 3배
      var levMultiplier = 3;
      var baseReturn = (Math.random() - 0.45) * 0.3; // -13.5% ~ +16.5% 기본 수익률
      var levReturn = baseReturn * levMultiplier;
      var levGain = Math.floor(levAmt * levReturn);
      // 손실이 증거금 초과 시 강제 청산
      if (levGain < -levAmt) levGain = -levAmt;
      result.state_changes.assets = { cash_krw: levGain };
      var levPct = Math.round(levReturn * 100);
      result.asset_summary = '레버리지 거래 ' + Math.floor(levAmt/10000) + '만원 (3배) → ' + (levGain >= 0 ? '+' : '') + Math.floor(levGain/10000) + '만원 (' + (levPct >= 0 ? '+' : '') + levPct + '%)';
      result.action_description = '레버리지 거래 (' + (levGain >= 0 ? '수익' : '손실') + ')';
      result.narrative_hints = { tone: levGain >= 0 ? 'thrilled' : 'devastated', details: levGain >= 0 ? '레버리지가 먹혔다. ' + Math.floor(levGain/10000) + '만원. 심장이 뛰었다.' : '레버리지가 역으로 갔다. ' + Math.floor(Math.abs(levGain)/10000) + '만원을 잃었다. 손이 떨렸다.' };
      break;
    }
    case 'FORGIVE_DONGJUN': {
      // 동준이 용서 — 관계 회복 + 이후 정보 접근 가능
      result.state_changes.relationships = { dongjun: 30 };
      result.action_description = '동준이를 용서했다';
      result.narrative_hints = { tone: 'warm', details: '"됐어." 한마디. 동준이 눈이 젖었다. 3년 만이었다. 순대를 시켰다. 두 접시. 예전처럼.' };
      // 동준 용서 플래그 — 53편(동준의 귀환)에서 정보를 받을 수 있음
      result.state_changes.stats = { dongjun_forgiven: 1 };
      break;
    }
    case 'REJECT_DONGJUN': {
      // 동준이 거절 — 관계 단절, 정보 접근 불가
      result.state_changes.relationships = { dongjun: -30 };
      result.action_description = '동준이를 거절했다';
      result.narrative_hints = { tone: 'cold', details: '전화를 끊었다. 동준이 목소리가 끊겼다. 3년 전에도 끊었다. 또 끊었다. 이번에는 돌아오지 않을 수도 있었다.' };
      break;
    }
    case 'CONFESS_FATHER': {
      // 아버지한테 진실 말하기 — 조만석 담당/은지 관계
      var confessType = '';
      if (action.includes('은지') || action.includes('조만석 딸')) {
        confessType = 'eunji';
        result.narrative_hints = { tone: 'heavy', details: '"아빠, 은지가 조만석 딸이에요." 아버지가 멈췄다. 숟가락을 내려놨다. 오래 침묵했다. "알고 사귀는 거야?" "네." 아버지가 창밖을 봤다. 옆 동 아파트를.' };
        result.state_changes.relationships = { father: -5 };
      } else if (action.includes('은행') || action.includes('담당') || action.includes('조만석')) {
        confessType = 'bank';
        result.narrative_hints = { tone: 'tense', details: '"아빠, 은행에서 조만석 대출을 제가 담당하고 있어요." 아버지 얼굴이 굳었다. 1초. 풀렸다. "그래." 그게 전부였다. 그래. 한마디.' };
        result.state_changes.relationships = { father: 5 };
      } else {
        confessType = 'general';
        result.narrative_hints = { tone: 'vulnerable', details: '아버지한테 말했다. 숨기고 있던 것들을. 아버지가 들었다. 고개를 끄덕이지 않았다. 그냥 들었다.' };
        result.state_changes.relationships = { father: 3 };
      }
      result.action_description = '아버지한테 진실을 말했다 (' + confessType + ')';
      break;
    }
    case 'TELL_SEUNGYEON': {
      // 승연이한테 조현우 정체 알려주기
      // 승연이 관계 급변 — 충격 → 분노 → 감사 순서
      result.state_changes.relationships = { seungyeon: -15 };
      result.action_description = '승연이한테 조현우 정체를 알려줬다';
      result.narrative_hints = { tone: 'devastating', details: '"승연아, 조현우 아버지가 조만석이야." 승연이가 멈췄다. 젓가락을 들고 있었다. 내려놨다. "뭐?" "조만석. 아빠 회사 망하게 한 사람." 승연이 얼굴이 하얘졌다. 눈이 커졌다. 입술이 떨렸다. "거짓말." "거짓말 아니야." 승연이가 방으로 들어갔다. 문을 닫았다. 세게.' };
      break;
    }
    case 'SKIP_COLLEGE': {
      // 대학 안 가고 바로 취직 — 학비 절약, 빠른 수입, 낮은 천장
      result.state_changes.stats = { job: 'parttime', monthly_expense: 100000 };
      result.state_changes.assets = { cash_krw: 430000 }; // 첫 알바비
      result.action_description = '대학을 포기하고 취직했다';
      result.narrative_hints = { tone: 'determined', details: '대학을 안 가기로 했다. 등록금을 아꼈다. 편의점 알바를 계속했다. 공책은 계속 적었다. 대학에서 배우는 건 신문에서도 배울 수 있었다. 아마.' };
      break;
    }
    case 'GO_COLLEGE': {
      // 대학 진학 — 등록금 지출, 장기적 수입 증가
      var tuition = 1800000; // 반액 장학금 기준
      if (tuition > cash) {
        result.action_valid = false;
        result.rejection_reason = '등록금이 부족합니다. (필요: 180만원, 보유: ' + Math.floor(cash/10000) + '만원)';
        break;
      }
      result.state_changes.assets = { cash_krw: -tuition };
      result.state_changes.stats = { job: 'student_college', info_level: 0.5 };
      result.asset_summary = '등록금 180만원 납부 → 잔액 ' + Math.floor((cash - tuition)/10000) + '만원';
      result.action_description = '대학 진학 (서강대 경제학과)';
      result.narrative_hints = { tone: 'hopeful', details: '대학에 갔다. 서강대 경제학과. 장학금 반액. 나머지는 통장에서 냈다. 숫자가 줄었다. 그래도 투자였다. 자신에게.' };
      break;
    }
    case 'SOCIAL_FAMILY': {
      const target = parsed.target || 'father';
      const isAngry = action.includes('화') || action.includes('소리') || action.includes('따지');
      const isKind = action.includes('괜찮') || action.includes('걱정') || action.includes('안부') || action.includes('물어');
      const delta = isAngry ? -10 : (isKind ? 5 : 3);
      result.state_changes.relationships = { [target]: delta };
      result.action_description = `${target}와 대화`;
      result.narrative_hints = { tone: isAngry ? 'tense' : 'warm', details: action };
      break;
    }
    case 'SOCIAL_FRIEND': {
      const target = parsed.target || 'dongjun';
      result.state_changes.relationships = { [target]: 3 };
      result.action_description = `${target}와 대화`;
      break;
    }
    case 'INFO': {
      result.state_changes.stats = { info_level: 0.3 };
      result.action_description = '정보 수집';
      result.narrative_hints = { tone: 'curious', details: '신문을 읽거나 공부를 했다.' };
      break;
    }
    case 'BUY_STOCK': {
      var stockAmt = parsed.amount || 0;
      // 금액 미지정 시 현금의 50% 자동 투자
      if (stockAmt <= 0) {
        stockAmt = Math.floor(cash * 0.5);
        if (stockAmt < 100000) stockAmt = cash; // 10만원 미만이면 전액
      }
      if (stockAmt <= 0 || cash <= 0) {
        result.action_valid = false;
        result.rejection_reason = '투자할 현금이 없습니다.';
        break;
      }
      if (stockAmt > cash) {
        stockAmt = cash; // 보유 현금 초과 시 전액 투자
      }
      // 코스닥인지 코스피인지 판별 — 시대별 자동 선택
      var isKosdaq = action.includes('코스닥') || action.includes('벤처') || action.includes('새롬') || action.includes('골드뱅크') || action.includes('다음') || action.includes('IT');
      // 1999~2000년에 종목 미지정이면 코스닥 (시대 분위기)
      if (!action.includes('코스피') && !action.includes('코스닥') && !isKosdaq) {
        if (year >= 1999 && year <= 2000) isKosdaq = true;
      }
      var indexData = isKosdaq ? KOSDAQ : KOSPI;
      var indexName = isKosdaq ? '코스닥' : '코스피';
      var currentIndex = getIndex(indexData, year, month);
      // 지수를 주당 가격처럼 사용 (1포인트 = 100원)
      var pricePerUnit = currentIndex * 100;
      var units = Math.floor(stockAmt / pricePerUnit);
      if (units <= 0) units = 1;
      var actualCost = units * pricePerUnit;
      result.state_changes.assets = { cash_krw: -actualCost };
      // 주식 보유 정보 저장
      result.state_changes.assets.stocks = [{ name: indexName, quantity: units, buyPrice: pricePerUnit, buyIndex: currentIndex }];
      var stockRemaining = cash - actualCost;
      result.asset_summary = Math.floor(actualCost/10000) + '만원 → ' + indexName + ' ' + units + '주 (지수 ' + currentIndex + ') | 잔액 ' + Math.floor(stockRemaining/10000) + '만원';
      result.action_description = indexName + ' ' + units + '주 매수';
      result.narrative_hints = { tone: 'tense', details: '증권사에 갔다. ' + indexName + '에 ' + Math.floor(actualCost/10000) + '만원을 넣었다. 지수 ' + currentIndex + '. ' + (isKosdaq ? '코스닥이 매일 오르고 있었다.' : '코스피에 넣었다. 안정적이었다.') };
      break;
    }
    case 'SELL_STOCK': {
      var stocks = state.assets.stocks || [];
      if (stocks.length === 0) {
        result.action_valid = false;
        result.rejection_reason = '보유 주식이 없습니다.';
        break;
      }
      var stock = stocks[0];
      var sellIndexData = action.includes('코스닥') ? KOSDAQ : (action.includes('코스피') ? KOSPI : (stock.name === '코스닥' ? KOSDAQ : KOSPI));
      var sellIndex = getIndex(sellIndexData, year, month);
      var sellPrice = sellIndex * 100;
      var sellProceeds = stock.quantity * sellPrice;
      var buyTotal = stock.quantity * stock.buyPrice;
      var profit = sellProceeds - buyTotal;
      var profitPct = Math.round((profit / buyTotal) * 100);
      result.state_changes.assets = { cash_krw: sellProceeds, stocks: [] };
      result.asset_summary = stock.name + ' ' + stock.quantity + '주 매도 → +' + Math.floor(sellProceeds/10000) + '만원 (지수 ' + sellIndex + ') | ' + (profit >= 0 ? '수익 +' : '손실 ') + Math.floor(profit/10000) + '만원 (' + (profit >= 0 ? '+' : '') + profitPct + '%)';
      result.action_description = stock.name + ' 매도 (' + (profit >= 0 ? '수익' : '손실') + ' ' + profitPct + '%)';
      result.narrative_hints = { tone: profit >= 0 ? 'relieved' : 'bitter', details: '주식을 팔았다. ' + (profit >= 0 ? Math.floor(profit/10000) + '만원 벌었다.' : Math.floor(Math.abs(profit)/10000) + '만원 잃었다.') };
      break;
    }
    case 'GET_CARD': {
      // 카드 발급 — 2001~2003년 카드 남발 시기
      var cardLimit = 3000000; // 기본 한도 300만원
      if (year >= 2001 && year <= 2003) cardLimit = 10000000; // 카드 대란기 한도 1000만원
      // 카드 플래그 설정
      result.state_changes.stats = { has_card: 1, card_limit: cardLimit, card_debt: 0 };
      result.asset_summary = '신용카드 발급 완료 (한도 ' + Math.floor(cardLimit/10000) + '만원)';
      result.action_description = '신용카드 발급';
      if (year >= 2001 && year <= 2003) {
        result.narrative_hints = { tone: 'ominous', details: '카드사 직원이 웃으며 카드를 건넸다. 한도 ' + Math.floor(cardLimit/10000) + '만원. 신분증만 보여주면 됐다. 심사 같은 건 없었다. "많이 쓰세요." 그 말이 이상하게 들렸다.' };
      } else {
        result.narrative_hints = { tone: 'neutral', details: '은행에서 카드를 만들었다. 한도 ' + Math.floor(cardLimit/10000) + '만원.' };
      }
      break;
    }
    case 'USE_CARD': {
      // 카드 사용 — 현금 안 빠지고 카드 부채 증가
      var cardAmt = parsed.amount || 500000;
      var hasCard = state.stats && state.stats.has_card;
      if (!hasCard) {
        // 카드 없으면 현금 지출로 전환
        if (cardAmt > cash) {
          result.action_valid = false;
          result.rejection_reason = '카드가 없고 현금도 부족합니다.';
          break;
        }
        result.state_changes.assets = { cash_krw: -cardAmt };
        result.asset_summary = Math.floor(cardAmt/10000) + '만원 현금 지출 (카드 없음)';
        break;
      }
      // 카드 부채 추가
      var currentCardDebt = (state.stats.card_debt || 0) + cardAmt;
      result.state_changes.stats = { card_debt: currentCardDebt };
      result.asset_summary = '카드 결제 ' + Math.floor(cardAmt/10000) + '만원 (카드 부채 누적 ' + Math.floor(currentCardDebt/10000) + '만원)';
      result.action_description = '카드 ' + Math.floor(cardAmt/10000) + '만원 결제';
      result.narrative_hints = { tone: 'careless', details: '카드를 긁었다. ' + Math.floor(cardAmt/10000) + '만원. 통장에서 안 빠지니까 가벼웠다. 명세서는 다음 달에 온다.' };
      break;
    }
    case 'LIFESTYLE_SPEND': {
      // 데이트/유흥/소비 — 현금 차감 + 관계 상승
      var spendAmt = parsed.amount || 200000;
      // 카드가 있으면 카드로 결제
      var hasCard2 = state.stats && state.stats.has_card;
      if (hasCard2) {
        var currentDebt = (state.stats.card_debt || 0) + spendAmt;
        result.state_changes.stats = { card_debt: currentDebt, monthly_expense: (state.stats.monthly_expense || 150000) + 50000 };
        result.asset_summary = Math.floor(spendAmt/10000) + '만원 소비 (카드 결제 → 부채 ' + Math.floor(currentDebt/10000) + '만원)';
        result.narrative_hints = { tone: 'light', details: '카드를 긁었다. ' + Math.floor(spendAmt/10000) + '만원. 즐거웠다. 명세서는 나중에 생각하기로 했다.' };
      } else {
        if (spendAmt > cash) spendAmt = Math.floor(cash * 0.3);
        if (spendAmt <= 0) { result.action_description = '돈이 없어서 못 갔다'; result.narrative_hints = { tone: 'bitter', details: '지갑을 열었다. 비어 있었다.' }; break; }
        result.state_changes.assets = { cash_krw: -spendAmt };
        result.state_changes.stats = { monthly_expense: (state.stats.monthly_expense || 150000) + 30000 };
        result.asset_summary = Math.floor(spendAmt/10000) + '만원 소비 → 잔액 ' + Math.floor((cash - spendAmt)/10000) + '만원';
        result.narrative_hints = { tone: 'light', details: '돈을 썼다. ' + Math.floor(spendAmt/10000) + '만원. 가끔은 이런 것도 필요했다.' };
      }
      // 은지와 데이트면 관계 상승
      if (/은지|데이트/.test(action)) {
        result.state_changes.relationships = { eunji: 5 };
      }
      result.action_description = Math.floor(spendAmt/10000) + '만원 소비';
      break;
    }
    case 'NONE': {
      result.action_description = '아무것도 하지 않았다';
      result.narrative_hints = { tone: 'quiet', details: '시간이 흘렀다. 아무것도 하지 않았다.' };
      break;
    }
    default: {
      result.action_description = action;
      result.narrative_hints = { tone: 'neutral', details: action };
    }
  }

  // 투자 함정 시스템 — 투자 행동 시 랜덤 이벤트 발동
  if (['BUY_USD', 'SELL_USD', 'BUY_GOLD', 'SELL_GOLD', 'BUY_STOCK', 'SELL_STOCK', 'BUY_REALESTATE', 'SELL_REALESTATE', 'BUY_BUILDING', 'SELL_BUILDING', 'BUY_BUSINESS', 'SELL_BUSINESS', 'BUY_FUND', 'LEVERAGE_TRADE'].includes(result.action_type) && result.action_valid) {
    var trap = checkInvestmentTrap(state, year, month, result);
    if (trap) {
      // 보험 효과 — 손실 50% 감소
      if (state.stats && state.stats.insurance > 0) {
        trap.cost = Math.floor(trap.cost * 0.5);
        trap.message += ' (보험 적용: 손실 50% 감소)';
        result.state_changes.stats = result.state_changes.stats || {};
        result.state_changes.stats.insurance = -1; // 보험 소진
      }
      result.trap = trap;
      if (trap.cost > 0) {
        result.state_changes.assets.cash_krw = (result.state_changes.assets.cash_krw || 0) - trap.cost;
      }
      result.asset_summary = (result.asset_summary || '') + ' | ' + trap.message;
    }
  }

  return result;
}

// ═══ 투자 함정 시스템 ═══════════════════════════════════════

function checkInvestmentTrap(state, year, month, result) {
  var roll = Math.random();
  var cash = state.assets.cash_krw;

  // 45% 확률로 함정 발동 (정보 레벨이 높으면 확률 감소)
  var trapChance = 0.45;
  if (state.stats && state.stats.info_level >= 2) trapChance = 0.30;
  if (state.stats && state.stats.info_level >= 3) trapChance = 0.20;
  if (roll > trapChance) return null;

  var traps = [];

  // ═══ 기본 함정 (항상 가능) ═══

  // 1. 정보 지연
  traps.push({
    type: 'DELAY',
    message: '은행이 혼잡해서 시세가 바뀌었다.',
    cost: Math.floor(cash * 0.03),
    narrative: '은행 창구에 줄이 길었다. 2시간을 기다렸다. 그 사이 시세가 움직였다. 불리한 가격에 체결됐다.'
  });

  // 2. 수수료/세금
  traps.push({
    type: 'FEE',
    message: '수수료와 세금이 예상보다 많았다.',
    cost: Math.floor(cash * 0.03),
    narrative: '거래를 끝내고 명세서를 봤다. 수수료. 세금. 생각보다 많이 빠졌다.'
  });

  // 3. 환율/시세 급변
  traps.push({
    type: 'VOLATILITY',
    message: '거래 직후 시세가 급변했다.',
    cost: Math.floor(cash * 0.04),
    narrative: '거래를 마치고 나왔다. 1시간 뒤 뉴스를 봤다. 시세가 반대로 움직이고 있었다.'
  });

  // ═══ 시기별 특수 함정 ═══

  // 1997: IMF 혼란기 — 은행 시스템 마비
  if (year === 1997 && month >= 11) {
    traps.push({
      type: 'SYSTEM_DOWN',
      message: '은행 전산 시스템이 마비됐다. 거래가 지연됐다.',
      cost: Math.floor(cash * 0.05),
      narrative: '은행에 갔다. 전산이 먹통이었다. 직원이 말했다. "지금 시스템이 안 돼요. 내일 다시 오세요." 내일 환율은 달라져 있었다.'
    });
  }

  // 1998: 사채업자 위협
  if (year === 1998) {
    traps.push({
      type: 'LOAN_SHARK',
      message: '사채업자가 집 앞에 또 왔다. 급하게 현금이 필요했다.',
      cost: Math.min(Math.floor(cash * 0.15), 500000),
      narrative: '집에 오니 현관 앞에 봉투가 있었다. 독촉장. 이번 달까지. 급하게 돈을 빼야 했다.'
    });
  }

  // 1999: 코스닥 광풍 — 주변 압박
  if (year === 1999) {
    traps.push({
      type: 'PEER_PRESSURE',
      message: '동준이가 "더 넣어야 한다"고 했다. 추가로 넣었다.',
      cost: Math.floor(cash * 0.08),
      narrative: '동준이 전화했다. "야, 지금 안 넣으면 바보야." 흔들렸다. 조금 더 넣었다. 떨어졌다.'
    });
    traps.push({
      type: 'FAKE_TIP',
      message: '편의점 정장 남자가 준 정보를 따라갔다. 틀렸다.',
      cost: Math.floor(cash * 0.06),
      narrative: '명함 뒷면의 번호로 전화했다. 종목을 추천받았다. 샀다. 다음 날 하한가였다.'
    });
  }

  // 2000: 닷컴 붕괴 — 손절 못 함
  if (year === 2000) {
    traps.push({
      type: 'CANT_SELL',
      message: '팔려고 했는데 매수자가 없었다. 더 떨어진 가격에 팔았다.',
      cost: Math.floor(cash * 0.07),
      narrative: '팔려고 주문을 넣었다. 체결이 안 됐다. 가격을 낮췄다. 또 안 됐다. 더 낮췄다. 겨우 팔렸다.'
    });
  }

  // 2002-2003: 카드 대란 — 강제 지출
  if (year >= 2002 && year <= 2003) {
    traps.push({
      type: 'CARD_CRISIS',
      message: '카드 연체 이자가 불어났다. 급하게 갚아야 했다.',
      cost: Math.floor(cash * 0.05),
      narrative: '카드 명세서가 왔다. 이자가 불어나 있었다. 연체되기 전에 갚아야 했다.'
    });
  }

  // 2003+: 조만석 관련 함정
  if (year >= 2003 && state.relationships && state.relationships.manseok > 0) {
    traps.push({
      type: 'MANSEOK_TRAP',
      message: '조만석 쪽에서 좋은 정보라고 했다. 함정이었다.',
      cost: Math.floor(cash * 0.10),
      narrative: '유서연한테 전화가 왔다. 확실한 정보라고. 따라갔다. 확실하지 않았다. 조만석이 웃고 있는 게 보이는 것 같았다.'
    });
  }

  // 2004+: 부동산 — 규제 리스크
  if (year >= 2004) {
    traps.push({
      type: 'REGULATION',
      message: '정부 규제가 갑자기 나왔다. 거래가 제한됐다.',
      cost: Math.floor(cash * 0.04),
      narrative: '뉴스 속보. 투기과열지구 추가 지정. 대출 규제 강화. 계획이 틀어졌다.'
    });
  }

  // 2006+: 서브프라임 전조 — 글로벌 불안
  if (year >= 2006) {
    traps.push({
      type: 'GLOBAL_SHOCK',
      message: '해외 뉴스에 시장이 흔들렸다. 일시적 손실.',
      cost: Math.floor(cash * 0.06),
      narrative: '미국에서 뉴스가 터졌다. 서브프라임. 시장이 출렁였다. 하루 만에 빠졌다.'
    });
  }

  // ═══ 가족 위기 (항상 가능, 1998년 이후) ═══
  if (year >= 1998) {
    traps.push({
      type: 'FAMILY_CRISIS',
      message: '가족한테 급한 돈이 필요했다.',
      cost: Math.min(Math.floor(cash * 0.12), 500000),
      narrative: '어머니한테 전화가 왔다. 목소리가 떨리고 있었다. 급한 돈이 필요하다고. 투자금을 빼야 했다.'
    });
  }

  // ═══ 욕심 함정 (자산 500만원 이상) ═══
  if (cash > 5000000) {
    traps.push({
      type: 'GREED',
      message: '더 넣으면 더 번다. 그 생각이 틀렸다.',
      cost: Math.floor(cash * 0.10),
      narrative: '확신이 있었다. 더 넣으면 더 번다. 추가로 넣었다. 확신은 비쌌다.'
    });
  }

  // 랜덤으로 하나 선택
  var selected = traps[Math.floor(Math.random() * traps.length)];

  // 비용이 보유 현금의 50%를 넘지 않도록
  if (selected.cost > cash * 0.5) {
    selected.cost = Math.floor(cash * 0.05);
  }
  // 최소 1만원
  if (selected.cost < 10000) selected.cost = 10000;

  return selected;
}

