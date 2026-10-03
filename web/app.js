'use strict';
const trees = window.TREES,
  main = document.querySelector('#main'),
  dialog = document.querySelector('#detail');

const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[c]));

const pad = n => String(n).padStart(3, '0');

let saved;
try {
  saved = JSON.parse(localStorage.getItem('tree120-progress') || '{}');
} catch {
  saved = {};
}
const progress = saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};

let savedTreeStats;
try {
  savedTreeStats = JSON.parse(localStorage.getItem('tree120-tree-stats') || '{}');
} catch {
  savedTreeStats = {};
}
const treeStats = savedTreeStats && typeof savedTreeStats === 'object' && !Array.isArray(savedTreeStats) ? savedTreeStats : {};

let savedHistory;
try {
  savedHistory = JSON.parse(localStorage.getItem('tree120-history') || '[]');
} catch {
  savedHistory = [];
}
const quizHistory = Array.isArray(savedHistory) ? savedHistory : [];

let view = 'study', query = '', range = 'all', quiz = null, detailId = null;

function save() {
  try {
    localStorage.setItem('tree120-progress', JSON.stringify(progress));
    localStorage.setItem('tree120-tree-stats', JSON.stringify(treeStats));
    localStorage.setItem('tree120-history', JSON.stringify(quizHistory));
  } catch {
    toast('이 브라우저에서는 학습 기록을 저장할 수 없습니다.');
  }
  updateCount();
}

function wrongTrees() {
  return trees.filter(t => progress[t.id]?.wrong);
}

function updateCount() {
  const el = document.querySelector('#wrong-count');
  if (el) el.textContent = wrongTrees().length;
}

function toast(msg) {
  const t = document.querySelector('#toast');
  t.textContent = msg;
  t.style.opacity = 1;
  setTimeout(() => t.style.opacity = 0, 2600);
}

function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function navigate(v) {
  cleanupQuizOverlay();
  view = v;
  document.querySelectorAll('[data-nav]').forEach(b => b.classList.toggle('active', b.dataset.nav === v));
  if (v === 'quiz') renderSetup();
  else if (v === 'stats') renderStats();
  else renderStudy();
  window.scrollTo(0, 0);
}

document.querySelectorAll('[data-nav]').forEach(b => b.onclick = () => navigate(b.dataset.nav));
document.querySelector('.brand').onclick = e => {
  e.preventDefault();
  navigate('study');
};

function card(t) {
  const fam = t.family ? t.family.split('/')[0].split('(')[0].trim() : '';
  return `<button class="card" data-tree="${t.id}" aria-label="${t.id}번 ${escapeHtml(t.name)} 학습">
    <div class="card-photo">
      <img src="${t.images[0].src}" alt="${escapeHtml(t.name)} 감별 사진" loading="lazy">
      <span class="num">NO. ${pad(t.id)}</span>
    </div>
    <div class="card-body">
      <div class="card-title">
        <span>${escapeHtml(t.name)}</span>
        <small>${t.images.length}장</small>
      </div>
      ${fam ? `<div class="card-family">${escapeHtml(fam)}</div>` : ''}
      <p>${escapeHtml(t.points[0])}</p>
    </div>
  </button>`;
}

function renderStudy() {
  const wrong = view === 'wrong';
  main.innerHTML = `<section class="intro">
    <div>
      <div class="eyebrow">${wrong ? 'REVIEW YOUR MISTAKES' : 'TREE IDENTIFICATION · 120'}</div>
      <h1>${wrong ? '다시 만나면, 기억할 수 있도록.' : '나무를 알아보는 눈을 기르세요.'}</h1>
      <p>${wrong ? '틀린 수목을 살펴보고 다시 풀어보세요.' : '영상 속 120종을 사진과 감별 포인트, 수목도감 형태 정보로 익혀보세요.'}</p>
    </div>
    <button class="primary" id="go-quiz">${wrong ? '오답 퀴즈' : '랜덤 퀴즈 풀기'}</button>
  </section>
  ${wrong ? '' : `<div class="study-banner">
    <div>
      <strong>잎을 먼저 보고, 꽃과 열매를 함께 확인하세요.</strong>
      <p>사진을 누르면 감별 포인트와 수목도감의 4대 형태 특징(잎·꽃·열매·줄기)을 볼 수 있어요.</p>
    </div>
    <span class="badge">원영상 번호순 · 001 — 120</span>
  </div>`}
  <div class="toolbar">
    <label class="search">
      <input id="search" type="search" placeholder="수목 이름 또는 번호 검색" aria-label="수목 이름 또는 번호 검색" value="${escapeHtml(query)}">
    </label>
    <div class="range" aria-label="번호 범위">
      ${[['all', '전체'], ['1', '01–30'], ['31', '31–60'], ['61', '61–90'], ['91', '91–120']].map(([v, l]) => `<button data-range="${v}" class="${range === v ? 'active' : ''}">${l}</button>`).join('')}
    </div>
    <span class="count" id="count"></span>
  </div>
  <div class="grid" id="cards"></div>`;

  document.querySelector('#go-quiz').onclick = () => {
    navigate('quiz');
    if (wrong) document.querySelector('#pool').value = 'wrong';
  };
  document.querySelector('#search').oninput = e => {
    query = e.target.value;
    renderCards();
  };
  document.querySelectorAll('[data-range]').forEach(b => b.onclick = () => {
    range = b.dataset.range;
    document.querySelectorAll('[data-range]').forEach(x => x.classList.toggle('active', x === b));
    renderCards();
  });
  renderCards();
}

function renderCards() {
  const source = view === 'wrong' ? wrongTrees() : trees;
  const q = query.trim().replace(/\s/g, '');
  const arr = source.filter(t => (!q || t.name.includes(q) || String(t.id) === q || pad(t.id) === q || (t.family && t.family.includes(q)) || (t.scientificName && t.scientificName.toLowerCase().includes(q.toLowerCase()))) && (range === 'all' || t.id >= +range && t.id < +range + 30));

  document.querySelector('#count').textContent = `${arr.length}종 / ${source.length}종`;
  document.querySelector('#cards').innerHTML = arr.length
    ? arr.map(card).join('')
    : `<div class="empty">${view === 'wrong' && !source.length ? '아직 오답이 없어요. 랜덤 퀴즈를 풀면 복습할 수목이 모입니다.' : '검색 결과가 없어요. 이름이나 번호를 다시 확인해 주세요.'}</div>`;

  document.querySelectorAll('[data-tree]').forEach(b => b.onclick = () => showDetail(+b.dataset.tree));
}

function videoUrl(t) {
  return `https://www.youtube.com/watch?v=K3PvgTi3eXI&t=${Math.floor(t.start)}s`;
}

function showDetail(id) {
  detailId = id;
  const t = trees.find(t => t.id === id);
  if (!t) return;
  const prevT = trees.find(x => x.id === id - 1);
  const nextT = trees.find(x => x.id === id + 1);
  const initialImg = t.images[0];

  document.querySelector('#detail-content').innerHTML = `
    <!-- Floating Side Arrows (Desktop) -->
    <button id="float-prev-tree" class="dialog-float-arrow prev" ${!prevT ? 'disabled' : ''} aria-label="이전 수목: ${prevT ? escapeHtml(prevT.name) : '없음'}" title="이전 수목 (← 단축키)">‹</button>
    <button id="float-next-tree" class="dialog-float-arrow next" ${!nextT ? 'disabled' : ''} aria-label="다음 수목: ${nextT ? escapeHtml(nextT.name) : '없음'}" title="다음 수목 (→ 단축키)">›</button>

    <div class="dialog-top">
      <div class="dialog-top-left">
        <span class="num">TREE NOTE / ${pad(t.id)}</span>
      </div>
      <div class="dialog-top-nav">
        <button id="top-prev-tree" class="top-nav-btn" ${!prevT ? 'disabled' : ''} aria-label="이전 수목" title="이전 수목 (←)">◀</button>
        <select id="jump-tree" class="dialog-jump-select" aria-label="120종 수목 바로 이동">
          ${trees.map(item => `<option value="${item.id}" ${item.id === id ? 'selected' : ''}>${pad(item.id)}. ${escapeHtml(item.name)}</option>`).join('')}
        </select>
        <button id="top-next-tree" class="top-nav-btn" ${!nextT ? 'disabled' : ''} aria-label="다음 수목" title="다음 수목 (→)">▶</button>
      </div>
      <div class="dialog-top-right">
        <button class="close" aria-label="닫기">×</button>
      </div>
    </div>
    <div class="detail-layout">
      <div class="detail-visual">
        <img id="large-photo" src="${initialImg.src}" alt="${escapeHtml(t.name)} 감별 사진">
        <div id="photo-caption-box" class="photo-caption-box">
          <span id="photo-morph-tag" class="photo-morph-tag">${escapeHtml(initialImg.tag || '감별 사진')}</span>
          <p id="photo-morph-desc" class="photo-morph-desc">${escapeHtml(initialImg.desc || t.points[0])}</p>
        </div>
        <div class="thumbs">
          ${t.images.map((im, i) => `
            <button data-img="${i}" class="${i === 0 ? 'active' : ''}" aria-label="사진 ${i + 1} (${im.tag})">
              <img src="${im.src}" alt="">
              <span class="thumb-tag">${escapeHtml(im.tag)}</span>
            </button>
          `).join('')}
        </div>
        <p class="detail-source">사이버 수목원(treeworld) 수목도감 부위별 실물 사진 · ${t.images.length}장<br>사진을 누르면 형태 부위 및 해설이 변경됩니다.</p>
      </div>
      <div class="detail-text">
        <h2>${escapeHtml(t.name)}</h2>
        ${t.scientificName ? `<div class="scientific-name"><em>${escapeHtml(t.scientificName)}</em> <span>(${escapeHtml(t.family || '')})</span></div>` : ''}
        <span class="tag">영상 ${t.id}번</span>

        <ul class="points">
          ${t.points.map(p => `<li>${escapeHtml(p)}</li>`).join('')}
        </ul>

        <div class="morph-section">
          <h3>주된 형태 특징 (4대 감별 지표)</h3>
          <div class="morph-grid">
            ${(t.features4 || []).map(f => `
              <div class="morph-card">
                <div class="morph-header">
                  <span class="morph-icon">${f.icon}</span>
                  <strong>${escapeHtml(f.part)}</strong>
                </div>
                <p class="morph-desc">${escapeHtml(f.desc)}</p>
              </div>
            `).join('')}
          </div>
        </div>

        ${t.caution ? `<div class="confusion"><strong>함께 기억하기</strong>${escapeHtml(t.caution)}</div>` : ''}

        <div class="detail-sources-box">
          <div class="sources-title">📚 다양한 정보 출처 및 도감 연계</div>
          <div class="sources-btn-row">
            ${t.natureUrl ? `<a class="source-link-btn nature" target="_blank" rel="noreferrer" href="${escapeHtml(t.natureUrl)}">🌿 국가생물종지식정보 ↗</a>` : ''}
            ${t.treeworldUrl ? `<a class="source-link-btn treeworld" target="_blank" rel="noreferrer" href="${escapeHtml(t.treeworldUrl)}">🌳 사이버 수목원 도감 ↗</a>` : ''}
            ${t.wikiKoUrl ? `<a class="source-link-btn wiki-ko" target="_blank" rel="noreferrer" href="${escapeHtml(t.wikiKoUrl)}">🇰🇷 위키백과 (한국어) ↗</a>` : ''}
            ${t.wikiEnUrl ? `<a class="source-link-btn wiki-en" target="_blank" rel="noreferrer" href="${escapeHtml(t.wikiEnUrl)}">🌐 Wikipedia (English) ↗</a>` : ''}
            <a class="source-link-btn youtube" target="_blank" rel="noreferrer" href="${videoUrl(t)}">📺 파이팅혼공 TV 강의 ↗</a>
          </div>
          <div class="sources-sub-links">
            <span>🌿 국가생물종지식정보시스템: <a href="${escapeHtml(t.natureUrl || 'https://www.nature.go.kr/kbi/plant/pilbk/selectPlantPilbkDtlList.do')}" target="_blank" rel="noreferrer">도감 상세</a> · <a href="https://www.nature.go.kr/kbi/plant/pilbk/selectPlantPilbkDtlList.do" target="_blank" rel="noreferrer">식물도감 자세히찾기</a> · <a href="https://www.nature.go.kr/main/Main.do" target="_blank" rel="noreferrer">메인 포털</a></span>
          </div>
        </div>

        <div class="detail-actions">
          ${progress[id]?.wrong ? '<button class="secondary" id="mastered">오답에서 제외</button>' : ''}
        </div>
        <p class="detail-source">정보 출처: 국가생물종지식정보시스템(국립수목원) · 사이버 수목원(treeworld) · 파이팅혼공TV · 한국어/영문 위키백과<br>단일 특징만으로 판단하지 말고 잎·꽃·열매·줄기 형태를 다각도로 비교해 보세요.</p>
      </div>
    </div>
    <div class="dialog-nav">
      <button id="prev-tree" class="nav-tree-btn prev" ${!prevT ? 'disabled' : ''} aria-label="이전 수목으로 이동">
        <span class="nav-tree-arrow">◀</span>
        <span class="nav-tree-label">
          <small class="nav-tree-sub">이전 수목 (←)</small>
          <strong class="nav-tree-title">${prevT ? `${pad(prevT.id)} ${escapeHtml(prevT.name)}` : '첫 번째 수목'}</strong>
        </span>
      </button>

      <div class="dialog-nav-center">
        <span class="nav-tree-counter"><strong>${id}</strong> / 120</span>
        <span class="dialog-key-hint">단축키: ← 이전 / → 다음</span>
      </div>

      <button id="next-tree" class="nav-tree-btn next" ${!nextT ? 'disabled' : ''} aria-label="다음 수목으로 이동">
        <span class="nav-tree-label">
          <small class="nav-tree-sub">다음 수목 (→)</small>
          <strong class="nav-tree-title">${nextT ? `${pad(nextT.id)} ${escapeHtml(nextT.name)}` : '마지막 수목'}</strong>
        </span>
        <span class="nav-tree-arrow">▶</span>
      </button>
    </div>`;

  document.querySelector('.close').onclick = () => dialog.close();

  document.querySelectorAll('[data-img]').forEach(b => b.onclick = () => {
    const idx = +b.dataset.img;
    const im = t.images[idx];
    document.querySelector('#large-photo').src = im.src;
    document.querySelector('#photo-morph-tag').textContent = im.tag || '감별 사진';
    document.querySelector('#photo-morph-desc').textContent = im.desc || t.points[Math.min(idx, t.points.length - 1)];
    document.querySelectorAll('[data-img]').forEach(x => x.classList.toggle('active', x === b));
  });

  const goPrev = () => { if (prevT) showDetail(id - 1); };
  const goNext = () => { if (nextT) showDetail(id + 1); };

  const topPrev = document.querySelector('#top-prev-tree');
  if (topPrev) topPrev.onclick = goPrev;
  const topNext = document.querySelector('#top-next-tree');
  if (topNext) topNext.onclick = goNext;

  const floatPrev = document.querySelector('#float-prev-tree');
  if (floatPrev) floatPrev.onclick = goPrev;
  const floatNext = document.querySelector('#float-next-tree');
  if (floatNext) floatNext.onclick = goNext;

  const bottomPrev = document.querySelector('#prev-tree');
  if (bottomPrev) bottomPrev.onclick = goPrev;
  const bottomNext = document.querySelector('#next-tree');
  if (bottomNext) bottomNext.onclick = goNext;

  const jumpTree = document.querySelector('#jump-tree');
  if (jumpTree) {
    jumpTree.onchange = e => {
      const targetId = parseInt(e.target.value, 10);
      if (targetId && targetId !== id) showDetail(targetId);
    };
  }

  const mastered = document.querySelector('#mastered');
  if (mastered) {
    mastered.onclick = () => {
      progress[id].wrong = false;
      save();
      showDetail(id);
      if (view === 'wrong') renderStudy();
      toast('오답 목록에서 제외했습니다.');
    };
  }

  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
}

dialog.addEventListener('click', e => {
  if (e.target === dialog) {
    const r = dialog.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close();
  }
});

// Keyboard shortcut: Left/Right arrows navigate trees when detail dialog is open
window.addEventListener('keydown', e => {
  if (dialog && dialog.open && !document.querySelector('#quiz-overlay')) {
    const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (detailId > 1) showDetail(detailId - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (detailId < trees.length) showDetail(detailId + 1);
    }
  }
});

// Mobile touch swipe gestures (Swipe left: Next tree, Swipe right: Prev tree)
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

dialog.addEventListener('touchstart', e => {
  if (!dialog.open) return;
  if (e.touches.length === 1) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
  }
}, { passive: true });

dialog.addEventListener('touchend', e => {
  if (!dialog.open || !detailId) return;
  if (e.changedTouches.length === 1) {
    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const deltaY = e.changedTouches[0].clientY - touchStartY;
    const duration = Date.now() - touchStartTime;

    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4 && duration < 600) {
      if (deltaX < 0 && detailId < trees.length) {
        showDetail(detailId + 1);
      } else if (deltaX > 0 && detailId > 1) {
        showDetail(detailId - 1);
      }
    }
  }
});

function renderSetup() {
  main.innerHTML = `<section class="intro">
    <div>
      <div class="eyebrow">PRACTICE MAKES FAMILIAR</div>
      <h1>이 나무의 이름은 무엇일까요?</h1>
      <p>부위별 실물 사진(잎·꽃·열매·수형)을 보고 수목의 이름을 맞혀보세요.</p>
    </div>
  </section>
  <div class="setup">
    <div class="quiz-cover">
      <img src="${trees[0].images[0].src}" alt="수목 감별 연습용 사진">
      <div>
        <h2>실전 수목감별 사진 퀴즈</h2>
        <p>실제 시험처럼 잎, 꽃, 열매, 수형 사진만 보고 수목을 맞혀보세요.<br>정답을 확인하면 감별 포인트와 수목도감 해설이 함께 제공됩니다.</p>
      </div>
    </div>
    <form class="setup-form" id="quiz-form">
      <div class="field">
        <label for="pool">출제 범위</label>
        <select id="pool">
          <option value="all">전체 120종</option>
          <option value="1">01–30번</option>
          <option value="31">31–60번</option>
          <option value="61">61–90번</option>
          <option value="91">91–120번</option>
          <option value="wrong">오답 수목 (${wrongTrees().length}종)</option>
        </select>
      </div>
      <fieldset class="field">
        <legend>답변 방식</legend>
        <div class="options-row">
          <label><input type="radio" name="mode" value="choice" checked><span>4지선다</span></label>
          <label><input type="radio" name="mode" value="typing"><span>이름 직접 쓰기</span></label>
        </div>
      </fieldset>
      <div class="field">
        <label for="length">문제 수</label>
        <select id="length">
          <option value="10">10문제 · 가볍게 연습</option>
          <option value="20" selected>20문제 · 집중 연습</option>
          <option value="all">선택 범위 전체</option>
        </select>
      </div>
      <button class="primary" type="submit">퀴즈 시작</button>
      <p class="note">한 회차에서는 같은 수목이 중복 출제되지 않아요.<br>오답과 학습 통계는 이 브라우저에 자동 기록됩니다.</p>
    </form>
  </div>`;

  document.querySelector('#quiz-form').onsubmit = e => {
    e.preventDefault();
    const p = document.querySelector('#pool').value;
    const poolLabels = {
      'all': '전체 120종',
      '1': '01–30번',
      '31': '31–60번',
      '61': '61–90번',
      '91': '91–120번',
      'wrong': '오답 수목'
    };
    const pool = p === 'wrong' ? wrongTrees() : p === 'all' ? trees : trees.filter(t => t.id >= +p && t.id < +p + 30);
    if (!pool.length) {
      toast('오답 수목이 없습니다. 다른 범위를 선택해 주세요.');
      return;
    }
    const n = document.querySelector('#length').value;
    startQuiz(pool, n === 'all' ? pool.length : Math.min(+n, pool.length), document.querySelector('[name=mode]:checked').value, poolLabels[p] || '선택 범위');
  };
}

function startQuiz(pool, n, mode, poolName = '전체 120종') {
  quiz = {
    poolName,
    questions: shuffle(pool).slice(0, n).map(t => ({
      tree: t,
      choices: shuffle([t, ...shuffle(trees.filter(x => x.id !== t.id)).slice(0, 3)])
    })),
    index: 0,
    answers: [],
    mode,
    recorded: false
  };
  renderQuestion();
  window.scrollTo(0, 0);
}

let confettiAnimId = null;

function cleanupQuizOverlay() {
  window.removeEventListener('keydown', handleOverlayKey);
  if (confettiAnimId) {
    cancelAnimationFrame(confettiAnimId);
    confettiAnimId = null;
  }
  const ov = document.querySelector('#quiz-overlay');
  if (ov) ov.remove();
  const cvs = document.querySelector('#confetti-canvas');
  if (cvs) cvs.remove();
}

function triggerConfetti() {
  if (confettiAnimId) {
    cancelAnimationFrame(confettiAnimId);
    confettiAnimId = null;
  }
  const oldCanvas = document.querySelector('#confetti-canvas');
  if (oldCanvas) oldCanvas.remove();

  const canvas = document.createElement('canvas');
  canvas.id = 'confetti-canvas';
  canvas.className = 'confetti-canvas';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  const width = canvas.width = window.innerWidth;
  const height = canvas.height = window.innerHeight;

  const colors = [
    '#22c55e', '#16a34a', '#4ade80',
    '#f59e0b', '#fbbf24', '#fcd34d',
    '#3b82f6', '#60a5fa',
    '#ec4899', '#f472b6',
    '#8b5cf6', '#a855f7'
  ];

  const count = 75;
  const particles = [];
  const originX = width / 2;
  const originY = height / 2 - 20;

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 11 + 5;
    particles.push({
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4,
      w: Math.random() * 8 + 6,
      h: Math.random() * 12 + 7,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      tilt: Math.random() * 10,
      tiltSpeed: Math.random() * 0.12 + 0.05,
      opacity: 1,
      life: 0,
      maxLife: Math.random() * 35 + 65
    });
  }

  function update() {
    ctx.clearRect(0, 0, width, height);
    let alive = false;

    for (const p of particles) {
      p.life++;
      if (p.life > p.maxLife) {
        p.opacity -= 0.035;
      }
      if (p.opacity <= 0) continue;

      alive = true;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.38;
      p.vx *= 0.985;
      p.rotation += p.rotationSpeed;
      p.tilt += p.tiltSpeed;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.scale(Math.cos(p.tilt), 1);
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }

    if (alive) {
      confettiAnimId = requestAnimationFrame(update);
    } else {
      if (confettiAnimId) {
        cancelAnimationFrame(confettiAnimId);
        confettiAnimId = null;
      }
      canvas.remove();
    }
  }

  confettiAnimId = requestAnimationFrame(update);
}

function handleOverlayKey(e) {
  if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
    if (document.activeElement && document.activeElement.tagName === 'A') return;
    e.preventDefault();
    advanceQuiz();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    advanceQuiz();
  }
}

function advanceQuiz() {
  cleanupQuizOverlay();
  quiz.index++;
  if (quiz.index === quiz.questions.length) renderResult();
  else renderQuestion();
}

function showQuizFeedbackOverlay(correct, t, answerName) {
  cleanupQuizOverlay();
  if (correct) {
    triggerConfetti();
  }

  const isLastQuestion = quiz.index + 1 === quiz.questions.length;
  const overlay = document.createElement('div');
  overlay.id = 'quiz-overlay';
  overlay.className = 'quiz-overlay';

  overlay.innerHTML = `
    <div class="quiz-overlay-card ${correct ? 'is-correct' : 'is-wrong'}" role="dialog" aria-modal="true" aria-labelledby="overlay-title">
      <div class="overlay-header">
        <div class="overlay-badge">
          ${correct
            ? '<span class="badge-icon">🎉</span><span class="badge-text">정답입니다!</span>'
            : '<span class="badge-icon">💡</span><span class="badge-text">다시 기억해 두세요</span>'}
        </div>
        <button class="overlay-close-btn" id="overlay-close" aria-label="다음 문제로">✕</button>
      </div>

      <div class="overlay-tree-info">
        <span class="overlay-tree-tag">NO. ${pad(t.id)}</span>
        <h2 class="overlay-tree-name" id="overlay-title">${escapeHtml(t.name)}</h2>
        ${t.scientificName ? `<p class="overlay-tree-sci"><em>${escapeHtml(t.scientificName)}</em> · ${escapeHtml(t.family || '')}</p>` : ''}
      </div>

      ${!correct && answerName ? `
        <div class="overlay-user-answer">
          <span>내가 고른 답:</span> <strong>${escapeHtml(answerName)}</strong>
        </div>
      ` : ''}

      <div class="overlay-points">
        <div class="overlay-points-title">핵심 감별 포인트</div>
        ${t.points.map(p => `<p class="overlay-point-item">· ${escapeHtml(p)}</p>`).join('')}
      </div>

      <div class="overlay-links">
        <a class="overlay-link yt" href="${videoUrl(t)}" target="_blank" rel="noreferrer">파이팅혼공 TV 강의 ↗</a>
        ${t.natureUrl ? `<a class="overlay-link nature" href="${escapeHtml(t.natureUrl)}" target="_blank" rel="noreferrer">국가생물종 ↗</a>` : ''}
        ${t.treeworldUrl ? `<a class="overlay-link tw" href="${escapeHtml(t.treeworldUrl)}" target="_blank" rel="noreferrer">수목도감 ↗</a>` : ''}
        ${t.wikiKoUrl ? `<a class="overlay-link wiki" href="${escapeHtml(t.wikiKoUrl)}" target="_blank" rel="noreferrer">위키백과 ↗</a>` : ''}
        ${t.wikiEnUrl ? `<a class="overlay-link wiki-en" href="${escapeHtml(t.wikiEnUrl)}" target="_blank" rel="noreferrer">Wiki(EN) ↗</a>` : ''}
      </div>

      <div class="overlay-actions">
        <button class="primary overlay-next-btn" id="overlay-next">
          ${isLastQuestion ? '결과 보기 📊' : '다음 문제 →'}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  window.addEventListener('keydown', handleOverlayKey);
  overlay.querySelector('#overlay-next').onclick = advanceQuiz;
  overlay.querySelector('#overlay-close').onclick = advanceQuiz;
  overlay.onclick = e => {
    if (e.target === overlay) advanceQuiz();
  };

  setTimeout(() => {
    const nextBtn = overlay.querySelector('#overlay-next');
    if (nextBtn) nextBtn.focus();
  }, 40);
}

function renderQuestion() {
  cleanupQuizOverlay();
  const q = quiz.questions[quiz.index];
  const t = q.tree;
  quiz.answered = false;

  main.innerHTML = `
    <div class="quiz-top">
      <span class="num">QUESTION ${String(quiz.index + 1).padStart(2, '0')} / ${quiz.questions.length}</span>
      <button id="quit">퀴즈 종료</button>
    </div>
    <div class="progress" aria-label="진행률">
      <div style="width:${quiz.index / quiz.questions.length * 100}%"></div>
    </div>
    <div class="quiz-layout">
      <div class="quiz-photos-grid count-${t.images.length}">
        ${t.images.map((im, i) => `
          <div class="quiz-photo-card" data-preview-img="${im.src}" data-preview-tag="${escapeHtml(im.tag)}" title="클릭하여 ${escapeHtml(im.tag)} 사진 확대">
            <img src="${im.src}" alt="${escapeHtml(im.tag)} 감별 사진" loading="lazy">
            <span class="quiz-photo-badge">${escapeHtml(im.tag)}</span>
          </div>
        `).join('')}
      </div>

      <section class="question-side">
        <div class="eyebrow">IDENTIFICATION PRACTICE</div>
        <h2>이 수목의 이름을 맞혀보세요.</h2>
        <p>사진 속 잎, 꽃, 열매, 수형의 특징을 관찰하여 답을 골라보세요. (사진을 누르면 크게 볼 수 있습니다)</p>

        ${quiz.mode === 'choice' ? `
          <div class="choices">
            ${q.choices.map((c, i) => `<button class="choice" data-answer="${c.id}"><b>${i + 1}</b>${escapeHtml(c.name)}</button>`).join('')}
          </div>
        ` : `
          <form id="typed-form">
            <label for="answer" class="note">수목 이름</label>
            <input class="answer-input" id="answer" autocomplete="off" placeholder="수목 이름을 입력하세요">
            <button class="primary" type="submit">정답 확인</button>
          </form>
        `}

        <button id="unknown" class="secondary" style="margin-top:16px">잘 모르겠어요</button>
      </section>
    </div>`;

  document.querySelector('#quit').onclick = () => {
    cleanupQuizOverlay();
    if (quiz.answers.length) renderResult(true);
    else navigate('quiz');
  };

  document.querySelectorAll('[data-preview-img]').forEach(card => {
    card.onclick = () => {
      const src = card.dataset.previewImg;
      const tag = card.dataset.previewTag;
      document.querySelector('#detail-content').innerHTML = `
        <div class="dialog-top">
          <span class="num">${escapeHtml(tag)} 사진 확대</span>
          <button class="close" aria-label="닫기">×</button>
        </div>
        <div style="padding:22px;text-align:center;background:#f0f3ed">
          <img src="${src}" alt="${escapeHtml(tag)}" style="max-width:100%;max-height:78vh;border-radius:8px;object-fit:contain;box-shadow:0 4px 16px rgba(0,0,0,0.12)">
        </div>
      `;
      document.querySelector('.close').onclick = () => dialog.close();
      dialog.showModal();
    };
  });

  document.querySelectorAll('[data-answer]').forEach(b => b.onclick = () => grade(+b.dataset.answer));

  const form = document.querySelector('#typed-form');
  if (form) {
    form.onsubmit = e => {
      e.preventDefault();
      const a = document.querySelector('#answer').value.trim();
      if (!a) {
        toast('수목 이름을 입력하거나 ‘잘 모르겠어요’를 눌러주세요.');
        return;
      }
      grade(a);
    };
  }

  document.querySelector('#unknown').onclick = () => grade(null);
}

function normalize(s) {
  return String(s).normalize('NFC').replace(/[\s·.,]/g, '');
}

function grade(answer) {
  if (quiz.answered) return;
  quiz.answered = true;
  const t = quiz.questions[quiz.index].tree;
  const correct = quiz.mode === 'choice'
    ? answer === t.id
    : answer !== null && [t.name, ...(t.aliases || [])].map(normalize).includes(normalize(answer));

  const answerName = answer === null
    ? '모르겠어요'
    : quiz.mode === 'choice'
      ? trees.find(x => x.id === answer)?.name
      : String(answer);

  quiz.answers.push({ id: t.id, correct, answer: answerName });
  progress[t.id] = { wrong: !correct, attempts: (Number(progress[t.id]?.attempts) || 0) + 1 };

  // Update treeStats
  if (!treeStats[t.id]) treeStats[t.id] = { attempts: 0, correct: 0, wrong: 0, lastSeen: '' };
  treeStats[t.id].attempts = (treeStats[t.id].attempts || 0) + 1;
  if (correct) treeStats[t.id].correct = (treeStats[t.id].correct || 0) + 1;
  else treeStats[t.id].wrong = (treeStats[t.id].wrong || 0) + 1;
  treeStats[t.id].lastSeen = new Date().toISOString();

  save();

  document.querySelectorAll('[data-answer]').forEach(b => {
    b.disabled = true;
    if (+b.dataset.answer === t.id) b.classList.add('correct');
    else if (+b.dataset.answer === answer) b.classList.add('incorrect');
  });

  const input = document.querySelector('#answer');
  if (input) {
    input.disabled = true;
    document.querySelector('#typed-form button').disabled = true;
  }
  document.querySelector('#unknown').hidden = true;

  showQuizFeedbackOverlay(correct, t, answerName);
}

function renderResult(early = false) {
  cleanupQuizOverlay();
  const answers = quiz.answers, correct = answers.filter(a => a.correct).length;

  // Record session to history
  if (answers.length > 0 && !quiz.recorded) {
    quiz.recorded = true;
    const now = new Date();
    const dateStr = `${now.getMonth() + 1}월 ${now.getDate()}일 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const percent = answers.length ? Math.round(correct / answers.length * 100) : 0;
    quizHistory.unshift({
      id: 'q_' + Date.now(),
      date: dateStr,
      pool: quiz.poolName || '전체 120종',
      mode: quiz.mode === 'choice' ? '4지선다' : '직접 쓰기',
      total: answers.length,
      correct,
      percent,
      early
    });
    if (quizHistory.length > 50) quizHistory.pop();
    save();
  }

  main.innerHTML = `
    <div class="result">
      <div class="score">
        <div class="eyebrow">${early ? 'PRACTICE PAUSED' : 'PRACTICE COMPLETE'}</div>
        <h2>${early ? '여기까지의 학습 결과' : '한 번 더, 익숙해졌어요.'}</h2>
        <strong>${correct}<small> / ${answers.length}</small></strong>
        <p>${answers.length ? Math.round(correct / answers.length * 100) : 0}% 정답 · ${answers.length - correct}종을 오답에 기록했어요.</p>
      </div>
      <div class="result-actions">
        <button class="primary" id="again">새 퀴즈 풀기</button>
        <button class="secondary" id="review">오답 복습하기</button>
        <button class="secondary" id="go-stats">학습 통계 보기 📊</button>
      </div>
      <h2>이번에 만난 수목</h2>
      ${answers.map(a => {
        const t = trees.find(t => t.id === a.id);
        return `<button class="result-row" data-tree="${t.id}">
          <img src="${t.images[0].src}" alt="">
          <div>
            <span>${escapeHtml(t.name)}</span>
            <small style="display:block;color:#6b8271">${escapeHtml(t.family ? t.family.split('/')[0] : '')}</small>
          </div>
          <small class="${a.correct ? '' : 'miss'}">${a.correct ? '정답' : `내 답: ${escapeHtml(a.answer)}`}</small>
        </button>`;
      }).join('')}
    </div>`;

  document.querySelector('#again').onclick = () => navigate('quiz');
  document.querySelector('#review').onclick = () => navigate('wrong');
  document.querySelector('#go-stats').onclick = () => navigate('stats');
  document.querySelectorAll('[data-tree]').forEach(b => b.onclick = () => showDetail(+b.dataset.tree));
  window.scrollTo(0, 0);
}

function renderStats() {
  const totalQuizzes = quizHistory.length;
  let totalAnswered = 0, totalCorrect = 0;
  Object.values(treeStats).forEach(s => {
    totalAnswered += (s.attempts || 0);
    totalCorrect += (s.correct || 0);
  });
  const overallAccuracy = totalAnswered > 0 ? Math.round((totalCorrect / totalAnswered) * 100) : 0;

  // Mastered: attempts >= 2 and correct >= 2 and not currently wrong
  const masteredTrees = trees.filter(t => {
    const s = treeStats[t.id];
    return s && s.correct >= 2 && !progress[t.id]?.wrong;
  });
  const wrongList = wrongTrees();
  const attemptedTrees = trees.filter(t => (treeStats[t.id]?.attempts || 0) > 0);
  const learningTrees = attemptedTrees.filter(t => !masteredTrees.includes(t));
  const unseenCount = 120 - attemptedTrees.length;
  const coveragePercent = Math.round((attemptedTrees.length / 120) * 100);

  // Weakest trees: sort by wrong count desc
  const weakTrees = trees
    .filter(t => (treeStats[t.id]?.wrong || 0) > 0)
    .sort((a, b) => (treeStats[b.id].wrong - treeStats[a.id].wrong) || (treeStats[b.id].attempts - treeStats[a.id].attempts))
    .slice(0, 8);

  main.innerHTML = `
    <section class="intro">
      <div>
        <div class="eyebrow">LEARNING ANALYTICS</div>
        <h1>나의 수목감별 학습 통계</h1>
        <p>퀴즈 응시 기록과 120종 수목별 정답/오답 데이터를 종합 분석한 결과입니다.</p>
      </div>
      <button class="primary" id="stats-start-quiz">퀴즈 풀러 가기</button>
    </section>

    <div class="stats-container">
      <div class="stats-summary">
        <div class="stat-card">
          <span class="stat-icon">🎯</span>
          <div class="stat-num">${overallAccuracy}<small>%</small></div>
          <div class="stat-label">종합 정답률 (${totalCorrect}/${totalAnswered}문항)</div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">📝</span>
          <div class="stat-num">${totalQuizzes}<small>회</small></div>
          <div class="stat-label">총 퀴즈 응시 횟수</div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">🌳</span>
          <div class="stat-num">${attemptedTrees.length}<small>/120</small></div>
          <div class="stat-label">수목 학습 진도율 (${coveragePercent}%)</div>
        </div>
        <div class="stat-card">
          <span class="stat-icon">⚠️</span>
          <div class="stat-num">${wrongList.length}<small>종</small></div>
          <div class="stat-label">현재 복습 대상 오답</div>
        </div>
      </div>

      <div class="stats-section">
        <div class="stats-section-header">
          <h2>120종 수목 학습 진도 현황</h2>
          <span class="count">${attemptedTrees.length}종 학습 완료 / 120종 전체</span>
        </div>
        <div class="coverage-card">
          <div class="coverage-bar-wrap">
            <div class="coverage-seg-master" style="width:${(masteredTrees.length / 120) * 100}%" title="마스터: ${masteredTrees.length}종"></div>
            <div class="coverage-seg-learning" style="width:${(learningTrees.length / 120) * 100}%" title="학습 중: ${learningTrees.length}종"></div>
            <div class="coverage-seg-unseen" style="width:${(unseenCount / 120) * 100}%" title="미학습: ${unseenCount}종"></div>
          </div>
          <div class="coverage-legend">
            <span><i class="legend-dot master"></i> 마스터 완료 (${masteredTrees.length}종)</span>
            <span><i class="legend-dot learning"></i> 학습 중 / 오답 이력 (${learningTrees.length}종)</span>
            <span><i class="legend-dot unseen"></i> 미학습 수목 (${unseenCount}종)</span>
          </div>
        </div>
      </div>

      <div class="stats-section">
        <div class="stats-section-header">
          <h2>자주 틀리는 취약 수목 Top 8</h2>
          <span class="count">${weakTrees.length ? '카드를 누르면 상세 도감으로 바로 복습할 수 있어요' : ''}</span>
        </div>
        ${weakTrees.length ? `
          <div class="weak-trees-grid">
            ${weakTrees.map(t => {
              const s = treeStats[t.id];
              const acc = Math.round((s.correct / s.attempts) * 100);
              return `
                <div class="weak-tree-card" data-tree="${t.id}">
                  <img src="${t.images[0].src}" alt="${escapeHtml(t.name)}">
                  <div class="weak-tree-info">
                    <strong>NO. ${pad(t.id)} ${escapeHtml(t.name)}</strong>
                    <small>${escapeHtml(t.family ? t.family.split('/')[0] : '')} · 정답률 ${acc}% (${s.correct}/${s.attempts})</small>
                  </div>
                  <span class="weak-tree-badge">오답 ${s.wrong}회</span>
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <div class="stats-empty">아직 오답이 발생한 수목이 없습니다. 퀴즈를 풀면 취약 수목이 분석됩니다.</div>
        `}
      </div>

      <div class="stats-section">
        <div class="stats-section-header">
          <h2>최근 퀴즈 응시 이력</h2>
          ${quizHistory.length ? `<button class="reset-stats-btn" id="reset-history">통계 초기화</button>` : ''}
        </div>
        ${quizHistory.length ? `
          <div class="history-list">
            ${quizHistory.map(h => {
              const scoreClass = h.percent >= 80 ? 'high' : h.percent >= 60 ? 'mid' : 'low';
              return `
                <div class="history-card">
                  <div class="history-left">
                    <div class="history-score-badge ${scoreClass}">${h.percent}%</div>
                    <div>
                      <div class="history-title">
                        ${h.correct} / ${h.total} 정답
                        <span class="history-tag">${escapeHtml(h.pool)}</span>
                        <span class="history-tag">${escapeHtml(h.mode)}</span>
                      </div>
                      <div class="history-meta">${escapeHtml(h.date)}${h.early ? ' (중도 종료)' : ''}</div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <div class="stats-empty">아직 완료된 퀴즈 기록이 없습니다. 상단의 '퀴즈 풀러 가기'를 눌러 시작해보세요!</div>
        `}
      </div>
    </div>
  `;

  document.querySelector('#stats-start-quiz').onclick = () => navigate('quiz');
  document.querySelectorAll('[data-tree]').forEach(b => b.onclick = () => showDetail(+b.dataset.tree));
  const resetBtn = document.querySelector('#reset-history');
  if (resetBtn) {
    resetBtn.onclick = () => {
      if (confirm('모든 퀴즈 응시 기록과 누적 통계를 초기화하시겠습니까? (오답 목록도 초기화됩니다)')) {
        quizHistory.length = 0;
        for (let k in treeStats) delete treeStats[k];
        for (let k in progress) delete progress[k];
        save();
        renderStats();
        toast('학습 통계와 기록을 초기화했습니다.');
      }
    };
  }
}

document.querySelector('#sources').onclick = () => {
  document.querySelector('#detail-content').innerHTML = `
    <div class="dialog-top">
      <h2>학습 자료 안내</h2>
      <button class="close" aria-label="닫기">×</button>
    </div>
    <div class="source-body">
      <h3>원영상에 맞춘 120종</h3>
      <p>파이팅혼공TV의 「2026 조경기능사 및 나무의사 수목감별 120 올인원총정리」를 바탕으로 영상의 순서와 수목 이름을 대조했습니다. 사진은 영상 화면에서 추출하고, 설명은 화면과 한국어 자동 자막을 참고해 핵심 감별 특징을 다시 썼습니다.</p>
      
      <h3>사이버 수목원 수목도감 정보 연동</h3>
      <p>수목별 학명, 과명, 영명 및 4대 형태학적 특징(잎, 꽃, 열매, 줄기/수형)은 <a href="https://treeworld.co.kr/a01_01_02" target="_blank" rel="noreferrer">사이버 수목원(treeworld.co.kr) 수목도감</a>의 공공 식물 데이터를 체계적으로 수집·연계하여 학습자가 시험 및 동정(Identification)에 필요한 식물학적 기준을 명확히 확인할 수 있도록 보강했습니다.</p>

      <h3>다각도 식물학 정보 출처 (한국어 & 영문 위키백과 연동)</h3>
      <p>120종 모든 수목에 대해 <a href="https://ko.wikipedia.org/" target="_blank" rel="noreferrer">한국어 위키백과</a> 및 <a href="https://en.wikipedia.org/" target="_blank" rel="noreferrer">영문 Wikipedia</a>의 정식 식물 분류학·생태 문서를 100% 매핑하여, 시험 대비 단기 감별 포인트뿐만 아니라 다각도의 생태 정보, 해외 자생지 분포 및 원예 품종을 폭넓게 비교 학습할 수 있도록 링크를 제공합니다.</p>
      
      <h3>퀴즈 및 감별 사진</h3>
      <p>퀴즈에서는 텍스트 힌트 없이 수목도감의 고해상도 대표 사진(잎, 꽃, 열매, 수형 등)이 한눈에 동시 표시되어, 실제 시험처럼 오직 사진의 형태학적 특징만 보고 수목을 동정(감별)하도록 구성되어 있습니다. 사진을 클릭하면 고화질 원본으로 확대해 자세히 관찰할 수 있습니다.</p>
      
      <div style="margin-top:20px;display:flex;gap:12px;flex-wrap:wrap">
        <a class="primary" href="https://www.youtube.com/watch?v=K3PvgTi3eXI" target="_blank" rel="noreferrer">파이팅혼공 TV 강의 ↗</a>
        <a class="secondary" href="https://treeworld.co.kr/a01_01_02" target="_blank" rel="noreferrer">사이버 수목원 바로가기 ↗</a>
        <a class="secondary" href="trees.json" download="수목120-학습자료.json">정리 자료 내려받기</a>
      </div>
    </div>`;
  document.querySelector('.close').onclick = () => dialog.close();
  dialog.showModal();
};

updateCount();
navigate('study');
