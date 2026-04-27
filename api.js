// API 호출 모듈 — Gemini 단일 엔진

class APIClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  }

  async callGemini(prompt, options = {}) {
    const models = ['gemini-2.0-flash', 'gemini-2.5-flash-lite'];
    const temp = options.temperature || 0.7;
    const maxTokens = options.maxTokens || 2048;
    const json = options.json || false;

    const config = {
      temperature: temp,
      maxOutputTokens: maxTokens
    };
    if (json) config.responseMimeType = "application/json";

    // 모델 순서대로 시도
    for (const model of models) {
      try {
        console.log(`Gemini 호출: ${model}`);
        const response = await fetch(
          `${this.baseUrl}/${model}:generateContent?key=${this.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: config
            })
          }
        );

        if (!response.ok) {
          const err = await response.text();
          console.warn(`${model} 실패 (${response.status}):`, err.substring(0, 200));
          continue; // 다음 모델 시도
        }

        const data = await response.json();

        if (data.candidates?.[0]?.finishReason === 'SAFETY') {
          console.warn(`${model} 안전 필터 차단`);
          continue;
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          console.warn(`${model} 응답 비어있음`);
          continue;
        }

        console.log(`${model} 성공, 응답 길이: ${text.length}`);
        return text;
      } catch (e) {
        console.warn(`${model} 에러:`, e.message);
        continue;
      }
    }

    throw new Error('모든 모델 호출 실패');
  }

  // 상태 계산
  async calculateState(action, currentState, chapter, year, month) {
    const prompt = `너는 "박승수의 10년" 게임의 상태 계산 엔진이다.
플레이어 행동을 분석하고 게임 상태를 정확히 업데이트해라. JSON만 반환해라.

현재 시점: ${year}년 ${month}월, ${chapter}편

═══ 역사 데이터 (해당 시점 기준) ═══
환율(원/달러):
1997: 1월=860, 4월=895, 7월=890, 10월=965, 11월=1000, 12월=1695
1998: 1월=1707, 4월=1390, 7월=1290, 10월=1326, 12월=1204
1999: 1월=1190, 4월=1186, 7월=1175, 10월=1198, 12월=1145
2000~2007: 900~1300 범위

코스피: 1997.12=376, 1998.12=562, 1999.12=1028, 2000.12=504
코스닥: 1999.12=260, 2000.3=270(정점), 2000.12=53
금(g당): 1997=10500, 1998=12000, 1999=10800
예금금리: 1997.12=18~22%, 1998.12=8~12%, 1999=6~8%
사채금리: 40~60%

═══ 플레이어 행동 ═══
"${action}"

═══ 현재 자산 상태 ═══
${JSON.stringify(currentState.assets, null, 2)}

═══ 핵심 규칙 ═══
1. 플레이어가 말한 금액만 정확히 처리해라. "100만원어치 달러를 산다"면 100만원만 차감.
2. 현재 시점의 환율로 정확히 계산해라. 예: ${year}년 ${month}월 환율 기준.
3. state_changes.assets의 값은 반드시 변동값(delta)이다. 절대값이 아니다!
   - 30만원 지출: cash_krw: -300000 (마이너스!)
   - 달러 매수: usd: 1052 (플러스, 추가되는 양)
   - 100만원 지출: cash_krw: -1000000
4. 현금이 부족하면 action_valid=false
5. 학생은 은행 대출 불가. 사채는 항상 가능.
6. 투자는 해당 시점 실제 시세 ±10% 변동 적용.

═══ 출력 형식 (JSON만) ═══
{
  "action_type": "INVEST/SELL/BORROW/REPAY/SAVE/SPEND/WORK/SOCIAL/INFO/NONE",
  "action_valid": true/false,
  "action_description": "100만원으로 달러 XXX달러 매수 (환율 XXX원)",
  "rejection_reason": null,
  "state_changes": {
    "assets": {
      "cash_krw": -1000000,
      "usd": 1052
    },
    "relationships": {},
    "stats": {}
  },
  "asset_summary": "원화 100만원 → 달러 1,052달러 (환율 950원 기준)",
  "narrative_hints": {
    "tone": "감정톤",
    "details": "은행에 가서 환전했다. 100만원을 내밀었다. 직원이 달러를 세어줬다."
  }
}

중요: action_description과 asset_summary에 정확한 금액과 환율을 명시해라.`;

    try {
      const text = await this.callGemini(prompt, { temperature: 0.2, json: true, maxTokens: 1024 });
      console.log('Gemini 원본 응답:', text);
      // JSON 파싱 시도, 실패하면 정리 후 재시도
      try {
        return JSON.parse(text);
      } catch (parseErr) {
        // 잘린 JSON 복구 시도
        const cleaned = text.replace(/[\r\n]/g, ' ').replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
        try {
          return JSON.parse(cleaned);
        } catch {
          console.error('JSON 파싱 실패, 원본:', text);
          throw parseErr;
        }
      }
    } catch (e) {
      console.error('상태 계산 오류:', e);
      return {
        action_type: "SOCIAL",
        action_valid: true,
        action_description: action,
        rejection_reason: null,
        state_changes: {},
        asset_summary: null,
        narrative_hints: { tone: "neutral", details: action }
      };
    }
  }

  // 서사 생성
  async generateNarrative(chapterSummary, intervention, playerAction, stateResult, gameState, history, chapterOpening) {
    const valid = stateResult?.action_valid !== false;
    const hints = stateResult?.narrative_hints || {};
    const state = gameState;

    let historyText = '';
    if (history.length > 0) {
      historyText = '\n[직전 흐름]\n' + history.slice(-4).map(h =>
        h.role === 'user' ? `> 플레이어: "${h.content}"` : h.content.substring(0, 300)
      ).join('\n\n');
    }

    // 관계 상태를 자연어로
    const relDesc = [];
    if (state.relationships.father < 30) relDesc.push('아버지와 사이가 좋지 않다. 대화가 거의 없다.');
    else if (state.relationships.father < 60) relDesc.push('아버지와 어색하다. 눈을 잘 안 마주친다.');
    else relDesc.push('아버지와 조금씩 대화가 늘고 있다.');
    if (state.relationships.eunji > 0) {
      if (state.relationships.eunji > 60) relDesc.push('은지와 가까워지고 있다.');
      else if (state.relationships.eunji > 30) relDesc.push('은지와 알고 지내는 사이다.');
    }
    if (state.relationships.dongjun > 50) relDesc.push('동준과 친하다.');

    // 자산 상태를 자연어로
    const cash = state.assets.cash_krw;
    let assetDesc = '';
    if (cash < 500000) assetDesc = '돈이 거의 없다. 라면으로 끼니를 때우는 수준.';
    else if (cash < 2000000) assetDesc = '통장에 ' + Math.floor(cash/10000) + '만원. 넉넉하지 않다.';
    else if (cash < 10000000) assetDesc = '통장에 ' + Math.floor(cash/10000) + '만원. 조금 여유가 생겼다.';
    else assetDesc = '통장에 ' + Math.floor(cash/10000) + '만원. 꽤 모았다.';

    const yearDesc = {
      1997: '1997년. IMF 직전. 불안, 침묵, 뉴스. PC방, 스타크래프트, 콜라 500원. 상계동 아파트. 아래층 피아노 소리. 선풍기.',
      1998: '1998년. IMF 한복판. 명예퇴직, 금 모으기, 편의점 야간 알바. 쉬리가 개봉했다. 거리에 양복 입은 실업자들.',
      1999: '1999년. Y2K, 밀레니엄, IT 열풍. 코스닥이 매일 오른다. 이소라, 조성모. 016 핸드폰. 대학 캠퍼스.',
      2000: '2000년. 닷컴 붕괴. 코스닥 폭락. JSA 개봉. 대우 해체. 거품이 꺼졌다.',
      2001: '2001년. 9.11 테러. 유가 불안. 대학 3학년. 투자론, 화폐금융론 수업.',
      2002: '2002년. 월드컵 4강. 붉은 악마. 카드 남발. 첫 직장. 은행 강남 지점.',
      2003: '2003년. 카드 대란. 신용불량자 400만. 이라크전. 은행원 생활.',
      2004: '2004년. 부동산 상승 시작. 강남 재건축. 행정수도 이전 논란.',
      2005: '2005년. 부동산 본격 상승. 강남 아파트가 매달 수천만원씩 오른다. 스타벅스.',
      2006: '2006년. 중국 펀드 열풍. 적립식 펀드. 서브프라임이라는 단어가 나왔다.',
      2007: '2007년. 서브프라임 위기 전야. 베어스턴스 파산. 원더걸스 Tell Me. 10년의 끝.'
    };

    const langInstruction = currentLang === 'en'
      ? '\n═══ LANGUAGE ═══\nWrite the narrative in ENGLISH. Keep the same literary style but in English. Character names stay Korean (Seungsu, Eunji, Dongjun, etc). Currency amounts use "만원" format but add English equivalent in parentheses.\n'
      : currentLang === 'ja'
      ? '\n═══ 言語 ═══\n日本語で書いてください。同じ文学的スタイルを維持しつつ、日本語で。人物名は韓国語のまま（スンス、ウンジ、ドンジュンなど）。金額は「万ウォン」形式で。\n'
      : '';

    const prompt = `너는 "박승수의 10년"이라는 텍스트 기반 경제 시뮬레이션 게임의 서사 작가다.
플레이어가 행동을 입력하면, 그 행동의 결과를 소설처럼 써야 한다.

═══ 문체 규칙 (반드시 지켜라) ═══
1. 짧은 문장. 주어 생략이 자연스러운 한국어.
2. "승수는", "승수가" 최소화. 주어 없이 서술. "~했다", "~봤다" 식으로.
3. 감정을 직접 말하지 마라. 행동, 사물, 풍경으로 보여줘라.
   - ❌ "슬펐다", "화가 났다"
   - ✅ "국이 짰다. 원래 이 정도였는지 몰랐다."
   - ✅ "문을 닫았다. 세게 닫았다."
4. 대화는 짧고 현실적으로. 한국 사람이 실제로 하는 말투.
5. 느낌표 금지. 과장 금지. 설명 금지.
6. 참고 작가: 김영하(내면 서사, 판단을 독자에게 맡김), 장강명(경제/사회 구조), 손원평(유머와 비극의 공존)

═══ 감정 톤 규칙 (중요) ═══
슬픔만 쓰지 마라. 감정의 진폭이 있어야 한다. 아래 상황별 톤을 따라라:
- 투자 성공: 통쾌하게. 숫자가 올라가는 쾌감. "계산이 맞았다. 공책의 선이 예언이 됐다."
- 조만석에게 한 방: 짜릿하게. 참았던 것이 터지는 순간. "조만석 얼굴이 굳었다. 처음 보는 표정이었다."
- 동준과의 대화: 가볍고 유머러스하게. "야, 순대 두 접시." 시끄러운 동준이의 에너지.
- 은지와의 순간: 설레게. 심장이 뛰는 묘사. 손끝, 목소리, 냄새.
- 가족 장면: 따뜻하게. 떡국, 핸드크림, 안전화. 작은 것들의 무게.
- 위기/손실: 차갑게. 숫자가 떨어지는 공포. 그래도 담담하게.
- 시대 소품으로 웃음: PC방에서 스타크래프트, 016 핸드폰 문자, 노래방에서 이소라, 분식집 순대.

═══ 서사 규칙 ═══
1. 플레이어의 행동을 정확히 반영해라. 행동을 무시하거나 다른 행동으로 바꾸지 마라.
2. 행동의 과정과 결과를 구체적으로 써라. 장소, 사물, 소리, 냄새, 온도를 넣어라.
3. 주변 인물의 반응을 넣어라. 특히 동준이는 유머 담당 — 가벼운 농담, 과장된 반응.
4. 선택지를 제시하지 마라. 유도하지 마라. 투자 조언을 하지 마라.
5. 큰 사건(경제 이벤트)은 절대 바꾸지 마라. 역사는 고정이다.
6. 최소 400자, 최대 800자. 너무 짧으면 안 된다.
7. 마지막 문장은 다음 장면으로 자연스럽게 이어지는 여운을 남겨라.
8. 금액과 종목명을 절대 지어내지 마라. 아래 "경제 상황"과 "자산 변동"에 나온 숫자와 종목만 사용해라. "삼성전자", "포항제철", "현대" 같은 구체적 종목명을 쓰지 마라 — 아래 주식 보유 정보에 나온 이름만 써라 (코스피 또는 코스닥). 금액도 아래 제공된 숫자만 써라. 모르면 금액을 아예 쓰지 마라. 숫자를 나열하지 마라. "81만원. 500만원. 780만원." 같은 숫자 나열은 절대 하지 마라. 서사는 소설이다. 회계장부가 아니다.
9. 투자 성공 시 — 숫자의 쾌감을 살려라. 통장 잔고가 올라가는 순간, 환율 차이로 돈을 번 순간을 생생하게.
10. 조만석 관련 — 승수가 우위에 설 때 통쾌함을 살려라. 조만석이 당황하는 모습, 계산이 틀어지는 순간.
11. 시대 소품을 적극 활용해라. 그 시절 노래, 영화, 음식, 물건이 나오면 몰입감이 올라간다.
12. 플레이어가 하지 않은 행동을 서사에 넣지 마라. 학원비를 안 냈으면 낸 것처럼 쓰지 마라. 돈을 안 썼으면 쓴 것처럼 쓰지 마라. "안 한다", "말자", "포기" 같은 부정 표현이면 그 행동을 하지 않은 것이다. 반대로 쓰지 마라.
13. 자산 금액은 반드시 아래 "경제 상황"에 나온 숫자만 사용해라. 200만원이 통장에 있으면 200만원이라고 써라. 170만원이라고 임의로 바꾸지 마라.
14. 플레이어가 거절하거나 안 하겠다고 하면, 서사에서 그 결정을 존중해라. "학원 다니지 말자" → "학원을 안 가기로 했다" 식으로 써라. 절대 "학원비가 빠져나갔다"라고 쓰지 마라.

═══ 시대 배경 ═══
${yearDesc[state.player.year] || ''}

═══ 인물 관계 ═══
${relDesc.join(' ')}

═══ 경제 상황 (이 숫자만 사용해라. 다른 금액을 지어내지 마라) ═══
현금: ${Math.floor(cash/10000)}만원 (정확히 ${cash.toLocaleString()}원)
${state.assets.usd > 0 ? '달러: $' + state.assets.usd + ' 보유 중' : ''}
${state.assets.gold_gram > 0 ? '금: ' + state.assets.gold_gram + 'g 보유 중' : ''}
${state.assets.stocks && state.assets.stocks.length > 0 ? '주식: ' + state.assets.stocks[0].name + ' ' + state.assets.stocks[0].quantity + '주 보유 중 (매수 지수 ' + state.assets.stocks[0].buyIndex + ')' : '주식: 없음'}
${state.assets.debt && state.assets.debt.length > 0 ? '빚: ' + state.assets.debt.map(d => d.source + ' ' + Math.floor(d.amount/10000) + '만원').join(', ') : '빚: 없음'}
${state.stats && state.stats.card_debt > 0 ? '카드 부채: ' + Math.floor(state.stats.card_debt/10000) + '만원' : ''}
직업: ${state.stats.job || '없음'}

주의: 위 경제 상황의 숫자만 서사에 사용해라. 다른 금액을 지어내지 마라. 숫자를 나열하지 마라.
할머니가 준 돈은 항상 200만원이다 (게임 시작 자산, 현재 잔고와 다름).
"포항제철"이라는 단어를 절대 쓰지 마라. 주식을 언급할 때는 위 보유 종목명(코스피/코스닥)만 써라.

═══ 챕터 배경 ═══
${chapterSummary}

═══ 챕터 도입부 (문체 참고용) ═══
${(() => {
  var op = (chapterOpening || '').substring(0, 500);
  // 포항제철을 플레이어 보유 종목으로 치환
  var sn = (state.assets.stocks && state.assets.stocks.length > 0) ? state.assets.stocks[0].name : '주식';
  op = op.replace(/포항제철/g, sn);
  return op;
})()}
${historyText}

═══ 현재 개입 상황 ═══
${(() => { var ctx = intervention.context || ''; var sn2 = (state.assets.stocks && state.assets.stocks.length > 0) ? state.assets.stocks[0].name : '주식'; return ctx.replace(/포항제철/g, sn2); })()}

상황: ${(() => { var sit = intervention.situation || ''; var sn3 = (state.assets.stocks && state.assets.stocks.length > 0) ? state.assets.stocks[0].name : '주식'; return sit.replace(/포항제철/g, sn3); })()}

═══ 플레이어 행동 ═══
"${playerAction}"

${!valid ? `═══ 행동 불가 ═══\n사유: ${stateResult.rejection_reason}\n이 행동이 왜 안 되는지를 서사 안에서 자연스럽게 보여줘라. 직접 설명하지 말고 상황으로.\n` : ''}
${stateResult?.asset_summary ? `═══ 자산 변동 (정확히 반영해라) ═══\n${stateResult.asset_summary}\n이 금액을 서사에 정확히 반영해라. 다른 금액으로 바꾸지 마라.\n` : ''}
${stateResult?.trap ? `═══ 투자 함정 발생 ═══\n${stateResult.trap.narrative}\n이 함정을 서사에 자연스럽게 녹여라. 투자가 순탄하지 않았다는 걸 보여줘라.\n` : ''}
${hints.details ? `═══ 서사 힌트 ═══\n톤: ${hints.tone}\n디테일: ${hints.details}\n` : ''}

위 모든 맥락을 반영해서, 플레이어의 행동에 대한 서사를 소설처럼 써라.
서사 텍스트만 출력. 메타 설명 없음. 제목 없음. 마크다운 없음.${langInstruction}`;

    try {
      return await this.callGemini(prompt, { temperature: 0.85, maxTokens: 2048 });
    } catch (e) {
      console.error('서사 생성 오류:', e);
      // 재시도 1회
      try {
        console.log('서사 생성 재시도...');
        return await this.callGemini(prompt, { temperature: 0.9, maxTokens: 1500 });
      } catch (e2) {
        console.error('서사 생성 재시도 실패:', e2);
        return '잠시 후 다시 시도해주세요.';
      }
    }
  }

  // ═══ 행동 분류 (Gemini fallback) ═══
  async classifyAction(playerAction, situation, state) {
    var cash = state.assets.cash_krw || 0;
    var prompt = `너는 경제 시뮬레이션 게임의 행동 분류기다.
플레이어가 입력한 행동을 분석해서 JSON으로 분류해라.

가능한 행동 유형:
- BUY_USD: 달러 매수 (환전)
- SELL_USD: 달러 매도
- BUY_GOLD: 금 매수
- SELL_GOLD: 금 매도
- BUY_STOCK: 주식 매수
- SELL_STOCK: 주식 매도
- BUY_FUND: 펀드 투자
- SELL_FUND: 펀드 환매
- BUY_REALESTATE: 부동산 매수
- SELL_REALESTATE: 부동산 매도
- BUY_BUILDING: 건물/상가 매수
- SELL_BUILDING: 건물/상가 매도
- BUY_BUSINESS: 사업체 인수/창업
- SELL_BUSINESS: 사업체 매각
- DEPOSIT: 예금/저축
- BORROW: 대출/사채 차입
- REPAY: 빚 상환
- SPEND_EDUCATION: 학비/등록금/학원비 지출
- SPEND_GIFT: 선물/기프트 구매
- SPEND: 일반 지출 (돈을 쓰는 행동)
- WORK: 취직/알바 시작
- CHANGE_JOB: 이직/퇴사
- SUPPORT_FAMILY: 가족에게 금전 지원 (target: father/mother/seungyeon)
- ACCEPT_DEAL: 조만석 딜 수락
- REJECT_DEAL: 조만석 딜 거절
- BUY_INFO: 정보 구매
- BUY_INSURANCE: 보험 가입
- MOVE: 이사
- STUDY: 유학/자격증/자기계발
- LEVERAGE_TRADE: 레버리지/파생 거래
- GO_COLLEGE: 대학 진학
- SKIP_COLLEGE: 대학 포기
- FORGIVE_DONGJUN: 동준 용서
- REJECT_DONGJUN: 동준 거절
- CONFESS_FATHER: 아버지에게 진실 고백
- TELL_SEUNGYEON: 승연에게 진실 알림
- INFO: 정보 수집 (신문/공부)
- SOCIAL_FAMILY: 가족과 대화 (금전 아님)
- SOCIAL_FRIEND: 친구와 대화
- SOCIAL: 기타 대화/행동
- NONE: 아무것도 안 함

현재 상황: ${situation}
플레이어 현금: ${Math.floor(cash/10000)}만원

플레이어 입력: "${playerAction}"

JSON 형식으로만 응답해라:
{"type": "행동유형", "amount": 금액(원단위숫자, 없으면 0), "target": "대상(있으면)"}`;

    try {
      var text = await this.callGemini(prompt, { temperature: 0.1, json: true, maxTokens: 256 });
      var result = JSON.parse(text);
      console.log('Gemini 행동 분류:', result);
      return result;
    } catch (e) {
      console.error('행동 분류 실패:', e);
      return null;
    }
  }

  // ═══ 텍스트 번역 (opening, intervention 등) ═══
  async translateText(text, targetLang) {
    if (!text || !text.trim()) return text;
    if (targetLang === 'ko') return text;

    // 캐시 확인
    var cacheKey = targetLang + ':' + text.substring(0, 80);
    if (!this._transCache) this._transCache = {};
    if (this._transCache[cacheKey]) return this._transCache[cacheKey];

    var langName = targetLang === 'en' ? 'English' : '日本語';
    var langInst = targetLang === 'en'
      ? 'Translate the following Korean text into natural, literary English. Keep character names in romanized Korean (Seungsu, Eunji, Dongjun, Seungyeon, Manseok). Keep the short-sentence literary style. Keep paragraph breaks. Do NOT add any explanation.'
      : '以下の韓国語テキストを自然で文学的な日本語に翻訳してください。人物名は韓国語の発音のまま（スンス、ウンジ、ドンジュン、スンヨン、マンソク）。短文の文学的スタイルを維持。段落区切りを維持。説明は不要。';

    var prompt = langInst + '\n\n---\n' + text + '\n---\n\nTranslation:';

    try {
      var result = await this.callGemini(prompt, { temperature: 0.3, maxTokens: 2048 });
      // "Translation:" 이후만 추출 (혹시 포함되어 있으면)
      result = result.replace(/^Translation:\s*/i, '').trim();
      this._transCache[cacheKey] = result;
      return result;
    } catch (e) {
      console.error('번역 오류:', e);
      return text; // 실패 시 원본 반환
    }
  }
}
