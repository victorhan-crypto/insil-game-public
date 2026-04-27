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

// 플레이어 입력을 분석해서 행동 유형과 금액을 추출
function parseAction(text) {
  const t = text.toLowerCase().replace(/,/g, '').replace(/\s+/g, ' ').trim();

  // 금액 추출 (만원, 원)
  let amount = 0;
  const manwonMatch = t.match(/(\d+)\s*만\s*원/);
  const wonMatch = t.match(/(\d+)\s*원/);
  if (manwonMatch) amount = parseInt(manwonMatch[1]) * 10000;
  else if (wonMatch) amount = parseInt(wonMatch[1]);

  // 달러 금액
  const dollarMatch = t.match(/(\d+)\s*달러/);
  let dollarAmount = dollarMatch ? parseInt(dollarMatch[1]) : 0;

  // "현금으로 바꿔", "원화로 환전" → 달러 매도
  if ((t.includes('현금') || t.includes('원화')) && (t.includes('바꾸') || t.includes('환전') || t.includes('바꿔'))) {
    return { type: 'SELL_USD', dollarAmount: dollarAmount || 0 };
  }

  // 행동 분류
  if (t.includes('달러') && (t.includes('산다') || t.includes('사') || t.includes('환전') || t.includes('매수') || t.includes('바꾸'))) {
    return { type: 'BUY_USD', amount };
  }
  if (t.includes('달러') && (t.includes('판다') || t.includes('팔') || t.includes('매도') || t.includes('환전') || t.includes('바꾸') || t.includes('현금'))) {
    return { type: 'SELL_USD', dollarAmount: dollarAmount || amount };
  }
  if (t.includes('금') && (t.includes('산다') || t.includes('사') || t.includes('매수'))) {
    return { type: 'BUY_GOLD', amount };
  }
  if (t.includes('금') && (t.includes('판다') || t.includes('팔') || t.includes('매도'))) {
    return { type: 'SELL_GOLD', amount };
  }
  if (t.includes('예금') || t.includes('저축') || t.includes('넣') || t.includes('적금')) {
    return { type: 'DEPOSIT', amount };
  }
  if (t.includes('주식') && (t.includes('산다') || t.includes('사') || t.includes('매수'))) {
    return { type: 'BUY_STOCK', amount };
  }
  if (t.includes('주식') && (t.includes('판다') || t.includes('팔') || t.includes('매도'))) {
    return { type: 'SELL_STOCK', amount };
  }
  if ((t.includes('사채') && (t.includes('빌린다') || t.includes('빌려') || t.includes('쓴다'))) || 
      (t.includes('빌린다') && t.includes('돈')) || 
      (t.includes('대출') && (t.includes('받') || t.includes('신청')))) {
    return { type: 'BORROW', amount };
  }
  if ((t.includes('갚') || t.includes('상환')) && (t.includes('만원') || t.includes('돈') || t.includes('빚') || t.includes('사채'))) {
    return { type: 'REPAY', amount };
  }
  if ((t.includes('부동산') || t.includes('아파트') || t.includes('집')) && (t.includes('산다') || t.includes('사') || t.includes('매수') || t.includes('계약'))) {
    return { type: 'BUY_REALESTATE', amount };
  }
  if ((t.includes('부동산') || t.includes('아파트') || t.includes('집')) && (t.includes('판다') || t.includes('팔') || t.includes('매도'))) {
    return { type: 'SELL_REALESTATE', amount };
  }
  if ((t.includes('건물') || t.includes('상가') || t.includes('오피스텔') || t.includes('빌딩')) && (t.includes('산다') || t.includes('사') || t.includes('매수') || t.includes('계약'))) {
    return { type: 'BUY_BUILDING', amount };
  }
  if ((t.includes('건물') || t.includes('상가') || t.includes('오피스텔') || t.includes('빌딩')) && (t.includes('판다') || t.includes('팔') || t.includes('매도'))) {
    return { type: 'SELL_BUILDING', amount };
  }
  if ((t.includes('회사') || t.includes('업체') || t.includes('가게') || t.includes('인수') || t.includes('사업체')) && (t.includes('산다') || t.includes('사') || t.includes('인수') || t.includes('매수'))) {
    return { type: 'BUY_BUSINESS', amount };
  }
  if ((t.includes('회사') || t.includes('업체') || t.includes('가게') || t.includes('사업체')) && (t.includes('판다') || t.includes('팔') || t.includes('매도') || t.includes('정리'))) {
    return { type: 'SELL_BUSINESS', amount };
  }
  if ((t.includes('펀드') || t.includes('적립식')) && (t.includes('산다') || t.includes('사') || t.includes('가입') || t.includes('넣'))) {
    return { type: 'BUY_FUND', amount };
  }
  if ((t.includes('펀드') || t.includes('적립식')) && (t.includes('판다') || t.includes('팔') || t.includes('해지') || t.includes('환매'))) {
    return { type: 'SELL_FUND', amount };
  }
  if ((t.includes('삼성') || t.includes('포항') || t.includes('현대') || t.includes('sk') || t.includes('lg')) && (t.includes('산다') || t.includes('사') || t.includes('매수'))) {
    return { type: 'BUY_STOCK', amount };
  }
  if (t.includes('학원') || t.includes('등록금') || t.includes('학비')) {
    return { type: 'SPEND_EDUCATION', amount: amount || 300000 };
  }
  if (t.includes('선물') || t.includes('사줘') || t.includes('사준다') || t.includes('핸드크림') || t.includes('양말') || t.includes('구두')) {
    return { type: 'SPEND_GIFT', amount: amount || 30000 };
  }
  if (t.includes('알바') || t.includes('일한다') || t.includes('취직')) {
    return { type: 'WORK', amount: 0 };
  }
  // ═══ 새 자유도 ═══
  if ((t.includes('조만석') || t.includes('딜')) && (t.includes('수락') || t.includes('받아들') || t.includes('하겠') || t.includes('같이'))) {
    return { type: 'ACCEPT_DEAL', amount };
  }
  if ((t.includes('조만석') || t.includes('딜')) && (t.includes('거절') || t.includes('안 한다') || t.includes('거부') || t.includes('싫'))) {
    return { type: 'REJECT_DEAL', amount: 0 };
  }
  if (t.includes('이직') || t.includes('전직') || t.includes('옮기') || t.includes('증권사') || t.includes('그만두')) {
    return { type: 'CHANGE_JOB', amount: 0 };
  }
  if ((t.includes('승연') || t.includes('은지') || t.includes('어머니') || t.includes('엄마') || t.includes('아버지') || t.includes('아빠')) && (t.includes('등록금') || t.includes('생활비') || t.includes('병원비') || t.includes('도와') || t.includes('보내'))) {
    return { type: 'SUPPORT_FAMILY', amount: amount || 500000, target: extractTarget(t) };
  }
  if ((t.includes('정보') || t.includes('김실장') || t.includes('김 실장')) && (t.includes('산다') || t.includes('사') || t.includes('거래') || t.includes('받'))) {
    return { type: 'BUY_INFO', amount: amount || 1000000 };
  }
  if (t.includes('보험') && (t.includes('가입') || t.includes('든다') || t.includes('넣'))) {
    return { type: 'BUY_INSURANCE', amount: amount || 300000 };
  }
  if (t.includes('이사') || t.includes('강남') && t.includes('간다') || t.includes('이사간다')) {
    return { type: 'MOVE', amount: 0 };
  }
  if (t.includes('유학') || t.includes('자격증') || t.includes('mba') || t.includes('석사') || t.includes('공인회계사') || t.includes('cfa')) {
    return { type: 'STUDY', amount: amount || 5000000 };
  }
  if (t.includes('선물') && t.includes('옵션') || t.includes('레버리지') || t.includes('공매도') || t.includes('마진') || t.includes('선물거래')) {
    return { type: 'LEVERAGE_TRADE', amount };
  }
  // ═══ 관계/인생 선택 자유도 ═══
  if (t.includes('동준') && (t.includes('용서') || t.includes('화해') || t.includes('받아') || t.includes('괜찮'))) {
    return { type: 'FORGIVE_DONGJUN', amount: 0 };
  }
  if (t.includes('동준') && (t.includes('거절') || t.includes('안 만') || t.includes('끊') || t.includes('절교'))) {
    return { type: 'REJECT_DONGJUN', amount: 0 };
  }
  if ((t.includes('아버지') || t.includes('아빠')) && (t.includes('말한다') || t.includes('고백') || t.includes('사실') || t.includes('진실') || t.includes('알려'))) {
    return { type: 'CONFESS_FATHER', amount: 0 };
  }
  if (t.includes('승연') && (t.includes('조현우') || t.includes('현우')) && (t.includes('말한다') || t.includes('알려') || t.includes('사실') || t.includes('진실'))) {
    return { type: 'TELL_SEUNGYEON', amount: 0 };
  }
  if ((t.includes('재수') || t.includes('대학')) && (t.includes('안') || t.includes('포기') || t.includes('그만'))) {
    return { type: 'SKIP_COLLEGE', amount: 0 };
  }
  if ((t.includes('재수') || t.includes('대학')) && (t.includes('한다') || t.includes('간다') || t.includes('가겠') || t.includes('결심'))) {
    return { type: 'GO_COLLEGE', amount: 0 };
  }
  if (t.includes('아버지') || t.includes('어머니') || t.includes('엄마') || t.includes('아빠') || t.includes('승연')) {
    return { type: 'SOCIAL_FAMILY', amount: 0, target: extractTarget(t) };
  }
  if (t.includes('은지') || t.includes('동준')) {
    return { type: 'SOCIAL_FRIEND', amount: 0, target: extractTarget(t) };
  }
  if (t.includes('신문') || t.includes('읽') || t.includes('공부') || t.includes('조사')) {
    return { type: 'INFO', amount: 0 };
  }
  if (t.includes('아무것도') || t.includes('넘어') || t.includes('잔다') || t.includes('기다')) {
    return { type: 'NONE', amount: 0 };
  }

  // 돈을 쓰는 행동 (일반)
  if (amount > 0 && (t.includes('낸다') || t.includes('내') || t.includes('쓴다') || t.includes('준다') || t.includes('줘') || t.includes('보낸다'))) {
    return { type: 'SPEND', amount };
  }

  // 분류 불가 → 대화/행동으로 처리
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
  const parsed = parseAction(action);
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
      const amt = parsed.amount || 0;
      if (amt <= 0) { result.action_description = '금액을 지정해주세요'; break; }
      if (amt > cash) {
        result.action_valid = false;
        result.rejection_reason = `현금 ${Math.floor(cash/10000)}만원으로 ${Math.floor(amt/10000)}만원을 환전할 수 없습니다.`;
        break;
      }
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
      const amt = parsed.amount || 0;
      if (amt <= 0 || amt > cash) {
        result.action_valid = false;
        result.rejection_reason = amt <= 0 ? '금액을 지정해주세요' : '현금이 부족합니다.';
        break;
      }
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
      var depAmt = parsed.amount || 0;
      if (depAmt <= 0) { result.action_description = '금액을 지정해주세요'; break; }
      if (depAmt > cash) {
        result.action_valid = false;
        result.rejection_reason = '현금이 부족합니다.';
        break;
      }
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
      if (year < 2000) {
        result.action_valid = false;
        result.rejection_reason = '아직 부동산을 살 수 있는 상황이 아닙니다.';
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
      var fundAmt = parsed.amount || 0;
      if (fundAmt <= 0) { result.action_description = '금액을 지정해주세요'; break; }
      if (fundAmt > cash) {
        result.action_valid = false;
        result.rejection_reason = '현금이 부족합니다.';
        break;
      }
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
      if (stockAmt <= 0) { result.action_description = '금액을 지정해주세요'; break; }
      if (stockAmt > cash) {
        result.action_valid = false;
        result.rejection_reason = '현금이 부족합니다. (보유: ' + Math.floor(cash/10000) + '만원)';
        break;
      }
      // 코스닥인지 코스피인지 판별
      var isKosdaq = action.includes('코스닥') || action.includes('벤처') || action.includes('새롬') || action.includes('골드뱅크') || action.includes('다음');
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
      result.narrative_hints = { tone: 'tense', details: '증권사에 갔다. ' + indexName + '에 ' + Math.floor(actualCost/10000) + '만원을 넣었다. 지수 ' + currentIndex + '.' };
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

