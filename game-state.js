// 게임 상태 관리

const initialState = {
  player: {
    name: "박승수",
    age: 18,
    year: 1997,
    month: 3
  },
  assets: {
    cash_krw: 2000000,
    usd: 0,
    stocks: [],
    gold_gram: 0,
    real_estate: [],
    buildings: [],
    business: [],
    debt: []
  },
  relationships: {
    father: 45,
    mother: 70,
    seungyeon: 60,
    eunji: 0,
    dongjun: 65,
    manseok: 0,
    kim_manager: 0
  },
  stats: {
    credit_score: 50,
    reputation: 50,
    info_level: 0,
    insurance: 0,
    dongjun_forgiven: 0,
    job: "student_highschool",
    monthly_expense: 150000
  },
  story: {
    current_chapter: 1,
    current_intervention: 0,
    choices_made: [],
    flags: {}
  }
};

class GameState {
  constructor() {
    this.state = JSON.parse(JSON.stringify(initialState));
    this.history = [];
  }

  get() {
    return this.state;
  }

  update(changes) {
    if (changes.assets) {
      Object.assign(this.state.assets, changes.assets);
    }
    if (changes.relationships) {
      for (const [key, val] of Object.entries(changes.relationships)) {
        this.state.relationships[key] = Math.max(0, Math.min(100,
          (this.state.relationships[key] || 0) + val
        ));
      }
    }
    if (changes.stats) {
      for (const [key, val] of Object.entries(changes.stats)) {
        if (key === 'info_level') {
          this.state.stats[key] = Math.max(0, Math.min(3, val));
        } else if (key === 'job' || key === 'monthly_expense') {
          this.state.stats[key] = val;
        } else {
          this.state.stats[key] = Math.max(0, Math.min(100, val));
        }
      }
    }
    if (changes.story) {
      Object.assign(this.state.story, changes.story);
    }
  }

  updateFull(newState) {
    this.state = newState;
  }

  addChoice(choice) {
    this.state.story.choices_made.push({
      chapter: this.state.story.current_chapter,
      action: choice,
      year: this.state.player.year,
      month: this.state.player.month
    });
  }

  addHistory(role, content) {
    this.history.push({ role, content });
    // 최근 6개만 유지 (3회 대화)
    if (this.history.length > 6) {
      this.history = this.history.slice(-6);
    }
  }

  formatCash() {
    const cash = this.state.assets.cash_krw;
    if (cash >= 100000000) return (cash / 100000000).toFixed(1) + '억원';
    if (cash >= 10000) return Math.floor(cash / 10000) + '만원';
    return cash.toLocaleString() + '원';
  }

  formatTotalAssets() {
    const s = this.state.assets;
    let total = s.cash_krw;
    // 달러 환산 (대략)
    total += s.usd * 1000;
    // 금 환산
    total += s.gold_gram * 15000;
    // 부채 차감
    for (const d of s.debt) {
      total -= d.amount;
    }
    return total;
  }

  getDetailHTML() {
    const s = this.state;
    let html = '';

    html += '<div class="section-title">자산</div>';
    html += `<div class="detail-row"><span>현금</span><span>${this.formatCash()}</span></div>`;
    if (s.assets.usd > 0) html += `<div class="detail-row"><span>달러</span><span>$${s.assets.usd}</span></div>`;
    if (s.assets.gold_gram > 0) html += `<div class="detail-row"><span>금</span><span>${s.assets.gold_gram}g</span></div>`;
    if (s.assets.stocks.length > 0) {
      for (const st of s.assets.stocks) {
        html += `<div class="detail-row"><span>${st.name}</span><span>${st.quantity}주</span></div>`;
      }
    }
    if (s.assets.real_estate && s.assets.real_estate.length > 0) {
      for (const re of s.assets.real_estate) {
        html += `<div class="detail-row"><span>부동산</span><span>${Math.floor(re.value/10000)}만원</span></div>`;
      }
    }
    if (s.assets.buildings) {
      var blds = Array.isArray(s.assets.buildings) ? s.assets.buildings : [s.assets.buildings];
      for (const bl of blds) {
        if (bl && bl.value) html += `<div class="detail-row"><span>건물</span><span>${Math.floor(bl.value/10000)}만원 (월세 ${Math.floor((bl.monthlyRent||0)/10000)}만원)</span></div>`;
      }
    }
    if (s.assets.business) {
      var bizs = Array.isArray(s.assets.business) ? s.assets.business : [s.assets.business];
      for (const bz of bizs) {
        if (bz && bz.value) html += `<div class="detail-row"><span>사업체</span><span>${Math.floor(bz.value/10000)}만원</span></div>`;
      }
    }
    if (s.assets.debt.length > 0) {
      html += '<div class="section-title">부채</div>';
      for (const d of s.assets.debt) {
        html += `<div class="detail-row"><span>${d.source}</span><span>-${Math.floor(d.amount/10000)}만원 (${d.rate}%)</span></div>`;
      }
    }

    html += '<div class="section-title">상태</div>';
    html += `<div class="detail-row"><span>직업</span><span>${this.jobName(s.stats.job)}</span></div>`;
    html += `<div class="detail-row"><span>신용</span><span>${s.stats.credit_score}</span></div>`;
    html += `<div class="detail-row"><span>정보</span><span>Lv.${s.stats.info_level.toFixed(1)}</span></div>`;
    html += `<div class="detail-row"><span>월 지출</span><span>${Math.floor(s.stats.monthly_expense/10000)}만원</span></div>`;

    return html;
  }

  jobName(job) {
    const map = {
      student_highschool: '고3',
      student_college: '대학생',
      parttime: '알바',
      banker: '은행원',
      unemployed: '무직',
      business: '자영업'
    };
    return map[job] || job;
  }

  save() {
    localStorage.setItem('imf_game_state', JSON.stringify(this.state));
    localStorage.setItem('imf_game_history', JSON.stringify(this.history));
  }

  load() {
    const saved = localStorage.getItem('imf_game_state');
    const hist = localStorage.getItem('imf_game_history');
    if (saved) {
      this.state = JSON.parse(saved);
      this.history = hist ? JSON.parse(hist) : [];
      return true;
    }
    return false;
  }
}
