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

let view = 'study', query = '', range = 'all', quiz = null, exam = null, examTimerId = null, detailId = null;

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
  cleanupExamTimer();
  view = v;
  document.querySelectorAll('[data-nav]').forEach(b => b.classList.toggle('active', b.dataset.nav === v));
  if (v === 'quiz') renderSetup();
  else if (v === 'exam') renderExamSetup();
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
    <div class="intro-actions">
      <button class="secondary" id="go-exam">실전 모의고사 20선</button>
      <button class="primary" id="go-quiz">${wrong ? '오답 퀴즈' : '랜덤 퀴즈 풀기'}</button>
    </div>
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

  document.querySelector('#go-exam').onclick = () => {
    navigate('exam');
    if (wrong) {
      const ep = document.querySelector('#exam-pool');
      if (ep) ep.value = 'wrong';
    }
  };
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

function formatPhotoMeta(im) {
  if (!im) return '';
  const parts = [];
  if (im.author) parts.push(`촬영: ${escapeHtml(im.author)}`);
  if (im.date) parts.push(`일자: ${escapeHtml(im.date)}`);
  if (im.location) parts.push(`장소: ${escapeHtml(im.location)}`);
  return parts.length ? parts.join(' · ') : '';
}

function showDetail(id) {
  detailId = id;
  const t = trees.find(t => t.id === id);
  if (!t) return;
  const prevT = trees.find(x => x.id === id - 1);
  const nextT = trees.find(x => x.id === id + 1);
  const initialImg = t.images[0];

  const MORPH_ICONS = {
    '잎': '🌿',
    '꽃': '🌸',
    '열매': '🍒',
    '줄기·수형': '🪵',
    '수형': '🪵',
    '줄기': '🪵',
    '가지': '🪵',
    '겨울눈': '🌱',
    '새순': '🌱',
    '기타': '🔍'
  };

  const getMorphIcon = (tag) => {
    if (!tag) return '🌿';
    if (MORPH_ICONS[tag]) return MORPH_ICONS[tag];
    if (tag.includes('꽃')) return '🌸';
    if (tag.includes('열매')) return '🍒';
    if (tag.includes('잎')) return '🌿';
    if (tag.includes('줄기') || tag.includes('수형') || tag.includes('가지') || tag.includes('수피')) return '🪵';
    if (tag.includes('겨울눈') || tag.includes('새순')) return '🌱';
    return '🔍';
  };

  const tagCounts = {};
  t.images.forEach(im => {
    const tag = im.tag || '기타';
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  });
  const tagOrder = ['잎', '꽃', '열매', '줄기·수형', '수형', '줄기', '겨울눈', '새순', '기타'];
  const uniqueTags = Object.keys(tagCounts).sort((a, b) => {
    const ia = tagOrder.indexOf(a);
    const ib = tagOrder.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

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
        <div id="photo-display-area" class="photo-display-area"></div>

        <div class="photo-filter-tabs">
          <button class="photo-filter-chip active" data-filter="all">전체 (${t.images.length})</button>
          ${uniqueTags.map(tag => `<button class="photo-filter-chip" data-filter="${escapeHtml(tag)}">${getMorphIcon(tag)} ${escapeHtml(tag)} (${tagCounts[tag]})</button>`).join('')}
        </div>

        <div class="thumbs">
          ${t.images.map((im, i) => `
            <button data-img="${i}" data-tag="${escapeHtml(im.tag)}" class="" aria-label="사진 ${i + 1} (${im.tag})">
              <div class="thumb-img-wrap">
                <img src="${im.src}" alt="">
                <span class="thumb-source-badge ${im.source === '국가생물종지식정보시스템' ? 'nature' : 'treeworld'}" title="${escapeHtml(im.source || '')}">
                  ${im.source === '국가생물종지식정보시스템' ? '🌿' : '🌳'}
                </span>
              </div>
              <span class="thumb-tag">
                <span class="thumb-morph-icon">${getMorphIcon(im.tag)}</span>
                <span>${escapeHtml(im.tag)}</span>
              </span>
            </button>
          `).join('')}
        </div>
        <p class="detail-source">산림청 국가생물종지식정보시스템 및 사이버 수목원(treeworld) 실물 사진 · 총 ${t.images.length}장<br>부위별 필터 칩이나 썸네일을 누르면 해당 부위의 고해상도 실물 사진과 해설을 관찰할 수 있습니다.</p>
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

  let currentFilter = 'all';
  // 사진이 2장 이상이면 콜라주 모드(null)로 시작, 1장이면 단일 뷰(0)
  let selectedImgIdx = t.images.length > 1 ? null : 0;

  const renderPhotoDisplay = () => {
    const displayArea = document.querySelector('#photo-display-area');
    if (!displayArea) return;

    const activeImages = t.images
      .map((im, idx) => ({ ...im, idx }))
      .filter(im => currentFilter === 'all' || im.tag === currentFilter);

    const filterName = currentFilter === 'all' ? '전체' : currentFilter;

    // 만약 선택된 이미지가 없고 매칭 사진이 2장 이상인 경우 -> 콜라주 뷰
    if (selectedImgIdx === null && activeImages.length > 1) {
      const countCls = `count-${Math.min(activeImages.length, 6)}`;
      displayArea.innerHTML = `
        <div class="photo-collage-view">
          <div class="photo-collage-header">
            <span class="collage-title">
              <span>${filterName === '전체' ? '📸' : getMorphIcon(filterName)}</span>
              <strong>${filterName === '전체' ? '전체' : `${getMorphIcon(filterName)} ${escapeHtml(filterName)}`} 사진 모아보기</strong>
              <span class="collage-count">${activeImages.length}장</span>
            </span>
            <span class="collage-hint">사진을 클릭하면 크게 확대해 볼 수 있습니다</span>
          </div>
          <div class="photo-collage-grid ${countCls}">
            ${activeImages.map(im => `
              <div class="collage-item" data-img-idx="${im.idx}" role="button" tabindex="0" title="${escapeHtml(im.tag)} 사진 크게 보기">
                <img src="${im.src}" alt="${escapeHtml(t.name)} ${escapeHtml(im.tag)}" loading="lazy">
                <div class="collage-item-overlay">
                  <span class="collage-morph-badge">${getMorphIcon(im.tag)} ${escapeHtml(im.tag)}</span>
                  <span class="collage-source-badge ${im.source === '국가생물종지식정보시스템' ? 'nature' : 'treeworld'}">
                    ${im.source === '국가생물종지식정보시스템' ? '🌿 국가생물종' : '🌳 사이버수목원'}
                  </span>
                </div>
                ${im.desc ? `<div class="collage-item-caption">${escapeHtml(im.desc)}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `;

      displayArea.querySelectorAll('.collage-item').forEach(item => {
        item.onclick = () => {
          selectedImgIdx = +item.dataset.imgIdx;
          renderPhotoDisplay();
        };
        item.onkeydown = e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selectedImgIdx = +item.dataset.imgIdx;
            renderPhotoDisplay();
          }
        };
      });
    } else {
      // 단일 이미지 확대 뷰
      const curIdx = selectedImgIdx !== null ? selectedImgIdx : (activeImages[0]?.idx ?? 0);
      const im = t.images[curIdx] || t.images[0];
      const curPos = activeImages.findIndex(x => x.idx === curIdx);
      const posLabel = curPos >= 0 ? `${curPos + 1} / ${activeImages.length}` : `1 / ${t.images.length}`;

      displayArea.innerHTML = `
        <div class="single-photo-view">
          ${activeImages.length > 1 ? `
            <div class="single-photo-top-bar">
              <button id="btn-back-to-collage" class="photo-view-toggle-btn" title="선택된 사진들을 콜라주 그리드로 모아보기">
                <span>◀</span> ${filterName === '전체' ? '📸 전체' : `${getMorphIcon(filterName)} ${escapeHtml(filterName)}`} 콜라주로 모아보기 (${activeImages.length}장)
              </button>
              <span class="single-photo-counter">${posLabel}</span>
            </div>
          ` : ''}
          <div class="single-photo-frame">
            <img id="large-photo" src="${im.src}" alt="${escapeHtml(t.name)} 감별 사진">
          </div>
          <div id="photo-caption-box" class="photo-caption-box">
            <div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px">
              <span id="photo-morph-tag" class="photo-morph-tag">${getMorphIcon(im.tag)} ${escapeHtml(im.tag || '감별 사진')}</span>
              <span id="photo-source-badge" class="photo-source-badge ${im.source === '국가생물종지식정보시스템' ? 'nature' : 'treeworld'}">
                ${im.source === '국가생물종지식정보시스템' ? '🌿 국가생물종' : '🌳 사이버수목원'}
              </span>
            </div>
            <p id="photo-morph-desc" class="photo-morph-desc" style="margin-top:6px">${escapeHtml(im.desc || t.points[Math.min(curIdx, t.points.length - 1)])}</p>
            <div id="photo-meta-info" class="photo-meta-info">${formatPhotoMeta(im)}</div>
          </div>
        </div>
      `;

      const backBtn = displayArea.querySelector('#btn-back-to-collage');
      if (backBtn) {
        backBtn.onclick = () => {
          selectedImgIdx = null;
          renderPhotoDisplay();
        };
      }
    }

    // 썸네일 상태 갱신
    document.querySelectorAll('.thumbs button[data-img]').forEach(b => {
      const idx = +b.dataset.img;
      const matches = (currentFilter === 'all' || b.dataset.tag === currentFilter);
      b.classList.toggle('hidden-by-filter', !matches);

      if (selectedImgIdx === null) {
        // 콜라주 모드
        b.classList.remove('active');
        b.classList.toggle('in-collage', matches);
      } else {
        // 단일 뷰 모드
        b.classList.toggle('active', idx === selectedImgIdx);
        b.classList.remove('in-collage');
      }
    });
  };

  document.querySelectorAll('.thumbs button[data-img]').forEach(b => {
    b.onclick = () => {
      selectedImgIdx = +b.dataset.img;
      renderPhotoDisplay();
    };
  });

  document.querySelectorAll('.photo-filter-chip').forEach(chip => {
    chip.onclick = () => {
      document.querySelectorAll('.photo-filter-chip').forEach(c => c.classList.toggle('active', c === chip));
      currentFilter = chip.dataset.filter;
      const matches = t.images.filter(im => currentFilter === 'all' || im.tag === currentFilter);
      selectedImgIdx = matches.length > 1 ? null : (matches[0] ? t.images.indexOf(matches[0]) : 0);
      renderPhotoDisplay();
    };
  });

  renderPhotoDisplay();

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
  if (dialog && dialog.open && detailId !== null && !document.querySelector('#quiz-overlay')) {
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

function sampleQuizPhotos(images, maxCount = 4) {
  if (!images || images.length <= maxCount) return images ? [...images] : [];

  const groups = {};
  for (const im of images) {
    const tag = im.tag || '기타';
    if (!groups[tag]) groups[tag] = [];
    groups[tag].push(im);
  }

  const selected = [];
  const tags = Object.keys(groups).sort(() => Math.random() - 0.5);

  // 1. 서로 다른 부위에서 1장씩 우선 선택
  for (const tag of tags) {
    if (selected.length < maxCount) {
      const pool = groups[tag];
      const picked = pool[Math.floor(Math.random() * pool.length)];
      selected.push(picked);
    }
  }

  // 2. 4장 미만인 경우 남은 사진 풀에서 랜덤 보충
  if (selected.length < maxCount) {
    const remaining = images.filter(im => !selected.includes(im)).sort(() => Math.random() - 0.5);
    while (selected.length < maxCount && remaining.length) {
      selected.push(remaining.pop());
    }
  }

  return selected.sort(() => Math.random() - 0.5);
}

function startQuiz(pool, n, mode, poolName = '전체 120종') {
  quiz = {
    poolName,
    questions: shuffle(pool).slice(0, n).map(t => ({
      tree: t,
      choices: shuffle([t, ...shuffle(trees.filter(x => x.id !== t.id)).slice(0, 3)]),
      photos: sampleQuizPhotos(t.images, 4)
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

  const qPhotos = q.photos || sampleQuizPhotos(t.images, 4);

  main.innerHTML = `
    <div class="quiz-top">
      <span class="num">QUESTION ${String(quiz.index + 1).padStart(2, '0')} / ${quiz.questions.length}</span>
      <button id="quit">퀴즈 종료</button>
    </div>
    <div class="progress" aria-label="진행률">
      <div style="width:${quiz.index / quiz.questions.length * 100}%"></div>
    </div>
    <div class="quiz-layout">
      <div class="quiz-photos-grid count-${qPhotos.length}">
        ${qPhotos.map((im, i) => `
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
      detailId = null;
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

/* ==========================================================================
   실전 수목감별 20선 모의고사 (Mock Exam)
   ========================================================================== */

function cleanupExamTimer() {
  if (examTimerId) {
    clearInterval(examTimerId);
    examTimerId = null;
  }
}

function sampleExamPhotos(images, maxCount = 4) {
  const picked = sampleQuizPhotos(images, maxCount);
  const partOrder = ['줄기·수형', '수형', '줄기', '가지', '잎', '꽃', '열매', '겨울눈', '새순', '기타'];
  return picked.sort((a, b) => {
    const ia = partOrder.indexOf(a.tag || '기타');
    const ib = partOrder.indexOf(b.tag || '기타');
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });
}

function renderExamSetup() {
  cleanupExamTimer();
  const wrongCount = wrongTrees().length;

  main.innerHTML = `
    <section class="intro">
      <div>
        <div class="eyebrow">REAL EXAM SIMULATION · 20 QUESTIONS</div>
        <h1>조경기능사 수목감별 20선 실전 모의고사</h1>
        <p>실제 국가기술자격 실기 시험장의 슬라이드 상영 방식(1·2차 회전)과 주관식 필답형 답안지 작성을 그대로 재현했습니다.</p>
      </div>
    </section>

    <div class="setup exam-setup">
      <div class="exam-guide-card">
        <div class="exam-guide-badge">NATIONAL QUALIFICATION STANDARD</div>
        <h2>실제 시험장 진행 규정 안내</h2>
        <p class="exam-guide-lead">고사장 대형 모니터/스크린 상영 환경과 동일하게 진행됩니다. 시작 전 아래 3가지 진행 방식을 숙지해 주세요.</p>

        <div class="exam-rule-list">
          <div class="exam-rule-item">
            <span class="exam-rule-icon">📽️</span>
            <div>
              <strong>1. 사진 제시 방식 (순차 슬라이드 · Zero-Hint)</strong>
              <p>한 문제당 부위별 사진 4장(수형·잎·꽃·열매)이 <strong>부위 설명 없이 1장씩 순차 자동 전환</strong>됩니다.</p>
            </div>
          </div>
          <div class="exam-rule-item">
            <span class="exam-rule-icon">⏱️</span>
            <div>
              <strong>2. 노출 시간 및 1·2차 재상영</strong>
              <p><strong>1차 본 상영</strong>(1~20번, 사진당 4초·문항당 16초)이 끝난 뒤, 못 적은 문항을 보완할 수 있도록 <strong>2차 빠른 재상영</strong>(1~20번, 사진당 2초·문항당 8초)이 한 번 더 진행됩니다.</p>
            </div>
          </div>
          <div class="exam-rule-item">
            <span class="exam-rule-icon">✒️</span>
            <div>
              <strong>3. 답안 작성 및 채점 기준 (10점 만점)</strong>
              <p>우측 <strong>1~20번 주관식 답안지</strong>에 수목명을 직접 기입합니다. 문항당 <strong>0.5점(총 10.0점 만점)</strong>이며, 큐넷 <strong>표준수종 120종 정식 명칭</strong>만 정답으로 인정됩니다.<br><small>※ 주의 예시: ‘등’(O) / ‘등나무’(X), ‘복자기’(O) / ‘복자기나무’(X)</small></p>
            </div>
          </div>
        </div>
      </div>

      <form class="setup-form" id="exam-form">
        <div class="field">
          <label for="exam-pool">출제 수목 구성 (20문항)</label>
          <select id="exam-pool">
            <option value="all">전체 120종 무작위 20선 (실전 표준)</option>
            <option value="wrong">오답 수목 우선 포함 20선 (현재 오답 ${wrongCount}종)</option>
            <option value="1-60">전반부 집중 (001–060번 중 20선)</option>
            <option value="61-120">후반부 집중 (061–120번 중 20선)</option>
          </select>
        </div>

        <fieldset class="field">
          <legend>1차 상영 사진당 노출 시간 (문항당 4장)</legend>
          <div class="options-row">
            <label><input type="radio" name="exam-speed" value="3"><span>3초 / 장<small class="opt-sub">문항당 12초 (빠름)</small></span></label>
            <label><input type="radio" name="exam-speed" value="4" checked><span>4초 / 장<small class="opt-sub">문항당 16초 (실전 표준)</small></span></label>
            <label><input type="radio" name="exam-speed" value="5"><span>5초 / 장<small class="opt-sub">문항당 20초 (여유)</small></span></label>
          </div>
        </fieldset>

        <fieldset class="field">
          <legend>2차 재상영 (전체 빠른 재확인)</legend>
          <div class="options-row">
            <label><input type="radio" name="exam-pass2" value="yes" checked><span>포함 (실전 동일)<small class="opt-sub">1차 후 2초/장 재상영</small></span></label>
            <label><input type="radio" name="exam-pass2" value="no"><span>미포함<small class="opt-sub">1차 상영 후 바로 종료</small></span></label>
          </div>
        </fieldset>

        <button class="primary" type="submit">실전 모의고사 시작하기 (20문항)</button>
        <p class="note">상영 중에도 언제든 1~20번 답안지 모든 칸을 자유롭게 작성·수정할 수 있으며, 종료 후 10점 만점 성적표와 오답 노트가 자동 생성됩니다.</p>
      </form>
    </div>
  `;

  document.querySelector('#exam-form').onsubmit = e => {
    e.preventDefault();
    const poolMode = document.querySelector('#exam-pool').value;
    const pass1Sec = Number(document.querySelector('[name="exam-speed"]:checked').value) || 4;
    const enablePass2 = document.querySelector('[name="exam-pass2"]:checked').value === 'yes';
    startExam(poolMode, pass1Sec, enablePass2);
  };
}

function startExam(poolMode, pass1Sec = 4, enablePass2 = true) {
  cleanupExamTimer();

  let selectedTrees = [];
  let poolName = '전체 120종';

  if (poolMode === 'wrong') {
    poolName = '오답 우선 20선';
    const wList = shuffle(wrongTrees());
    const others = shuffle(trees.filter(t => !progress[t.id]?.wrong));
    selectedTrees = shuffle([...wList, ...others].slice(0, 20));
  } else if (poolMode === '1-60') {
    poolName = '001–060번';
    selectedTrees = shuffle(trees.filter(t => t.id >= 1 && t.id <= 60)).slice(0, 20);
  } else if (poolMode === '61-120') {
    poolName = '061–120번';
    selectedTrees = shuffle(trees.filter(t => t.id >= 61 && t.id <= 120)).slice(0, 20);
  } else {
    poolName = '전체 120종';
    selectedTrees = shuffle(trees).slice(0, 20);
  }

  exam = {
    poolName,
    pass1Sec,
    pass2Sec: 2,
    enablePass2,
    questions: selectedTrees.map((t, idx) => ({
      qNum: idx + 1,
      tree: t,
      photos: sampleExamPhotos(t.images, 4)
    })),
    userAnswers: new Array(20).fill(''),
    phase: 'pass1', // 'pass1' | 'intermission' | 'pass2' | 'final_grace' | 'done'
    qIndex: 0,
    photoIndex: 0,
    elapsedMs: 0,
    quickTargetIdx: 0,
    isQuickComposing: false,
    isQuickDirty: false,
    startedAt: Date.now(),
    recorded: false
  };

  renderExamStage();
  startExamTicker();
  window.scrollTo(0, 0);
}

function renderExamStage() {
  const q = exam.questions[exam.qIndex];
  const curPhoto = q.photos[exam.photoIndex] || q.photos[0];

  const renderSheetRow = (i) => `
    <div class="sheet-row ${i === exam.qIndex ? 'is-current' : ''}" id="sheet-row-${i}" data-row-idx="${i}">
      <button type="button" class="sheet-num-btn" data-jump-q="${i}" title="${i + 1}번 문제 슬라이드 보기">
        ${String(i + 1).padStart(2, '0')}
      </button>
      <input
        type="text"
        class="sheet-ans-input"
        id="sheet-input-${i}"
        data-sheet-idx="${i}"
        value="${escapeHtml(exam.userAnswers[i])}"
        autocomplete="off"
        placeholder="${i + 1}번 수목명"
        aria-label="${i + 1}번 문제 답안 입력"
      >
      <span class="sheet-status-dot" id="sheet-dot-${i}" aria-hidden="true">${exam.userAnswers[i].trim() ? '✓' : ''}</span>
    </div>
  `;

  main.innerHTML = `
    <div class="exam-top-bar">
      <div class="exam-top-left">
        <span class="exam-phase-badge pass1" id="exam-phase-badge">1차 본 상영 (${exam.pass1Sec}초/장)</span>
        <span class="exam-phase-desc" id="exam-phase-desc">슬라이드가 자동 전환됩니다. 답안지에 수목명을 기입하세요.</span>
      </div>
      <div class="exam-top-actions">
        <button type="button" class="exam-ctrl-btn submit" id="exam-submit-top">답안지 제출 · 채점</button>
        <button type="button" class="exam-ctrl-btn quit" id="exam-quit-btn">중도 종료</button>
      </div>
    </div>

    <div class="exam-workspace">
      <!-- 좌측: 고사장 슬라이드 프로젝터 -->
      <section class="exam-projector" aria-label="수목감별 슬라이드 상영 화면">
        <div class="exam-projector-header">
          <div class="exam-q-title">
            <span class="exam-q-label">QUESTION</span>
            <strong id="exam-q-number">${String(exam.qIndex + 1).padStart(2, '0')}</strong>
            <small>/ 20</small>
          </div>

          <div class="exam-photo-dots" id="exam-photo-dots" role="tablist" aria-label="현재 문제 사진 순서">
            ${q.photos.map((_, idx) => `
              <button type="button" class="exam-dot-btn ${idx === exam.photoIndex ? 'active' : ''}" data-photo-step="${idx}" title="사진 ${idx + 1} 보기">
                ${idx + 1}
              </button>
            `).join('')}
          </div>

          <div class="exam-step-controls">
            <button type="button" class="exam-nav-btn" id="exam-prev-q" title="이전 문제 보기">◀ 이전</button>
            <button type="button" class="exam-nav-btn" id="exam-next-q" title="다음 문제 보기">다음 ▶</button>
          </div>
        </div>

        <div class="exam-screen" id="exam-screen">
          <img id="exam-slide-img" src="${curPhoto.src}" alt="제 ${exam.qIndex + 1}번 수목 감별 슬라이드 사진">
          <div class="exam-screen-watermark" id="exam-watermark">제 ${String(exam.qIndex + 1).padStart(2, '0')} 문항 · 사진 ${exam.photoIndex + 1}/${q.photos.length}</div>
          <button type="button" class="exam-zoom-btn" id="exam-zoom-btn" title="현재 슬라이드 크게 확대">🔍 사진 확대</button>

          <div class="exam-notice-overlay" id="exam-notice-overlay" hidden>
            <div class="exam-notice-box" id="exam-notice-box"></div>
          </div>
        </div>

        <div class="exam-timers">
          <div class="exam-timer-row">
            <span class="timer-label" id="exam-slide-timer-label">현재 사진 전환까지 ${exam.pass1Sec}.0초</span>
            <span class="timer-sub" id="exam-total-progress-label">1차 상영 · 1 / 20번</span>
          </div>
          <div class="exam-bar-track slide-track" aria-hidden="true">
            <div class="exam-bar-fill" id="exam-slide-bar" style="width:0%"></div>
          </div>
          <div class="exam-bar-track total-track" aria-hidden="true">
            <div class="exam-bar-fill total" id="exam-total-bar" style="width:5%"></div>
          </div>
        </div>

        <div class="exam-quick-bar">
          <div class="quick-bar-top">
            <label for="exam-quick-input" class="quick-bar-label" id="exam-quick-label">
              <span class="quick-num-pill" id="exam-quick-pill">01번 문항</span> 답안 빠른 입력
            </label>
            <span class="quick-sync-hint" id="exam-quick-sync-hint">우측 답안지와 실시간 연동 · Enter로 확정</span>
          </div>
          <div class="quick-bar-input-row">
            <input
              type="text"
              id="exam-quick-input"
              class="exam-quick-input"
              autocomplete="off"
              placeholder="현재 상영 중인 수목 이름을 입력 후 Enter"
              value="${escapeHtml(exam.userAnswers[0])}"
            >
            <button type="button" class="exam-quick-confirm" id="exam-quick-confirm">입력 확정 ↵</button>
          </div>
        </div>
      </section>

      <!-- 우측: 1~20번 주관식 필답형 답안지 -->
      <section class="exam-answer-sheet" aria-label="수목감별 1~20번 주관식 답안지">
        <div class="exam-sheet-header">
          <div>
            <span class="sheet-badge">ANSWER SHEET · 주관식 필답형</span>
            <h2>수목감별 실기 답안지</h2>
          </div>
          <div class="sheet-progress-pill" id="exam-filled-counter">
            작성 완료 <strong>0</strong> / 20
          </div>
        </div>

        <p class="exam-sheet-guide">
          번호 버튼을 누르면 해당 번호 슬라이드를 다시 비추며, 모든 번호 칸은 상영 중 언제든 수정할 수 있습니다.
        </p>

        <div class="exam-sheet-columns">
          <div class="exam-sheet-col">
            ${Array.from({ length: 10 }, (_, i) => renderSheetRow(i)).join('')}
          </div>
          <div class="exam-sheet-col">
            ${Array.from({ length: 10 }, (_, i) => renderSheetRow(i + 10)).join('')}
          </div>
        </div>

        <div class="exam-sheet-footer">
          <div class="sheet-caution-box">
            <strong>📌 답안 작성 유의사항</strong>
            <span>배점: 문항당 0.5점 (총 10.0점 만점) · 반드시 <b>표준수종 120선 정식 명칭</b>으로 기입하세요.</span>
          </div>
          <button type="button" class="primary exam-submit-main" id="exam-submit-bottom">
            답안지 최종 제출 및 채점하기 (10점 만점)
          </button>
        </div>
      </section>
    </div>
  `;

  // 이벤트 바인딩: 프로젝터 컨트롤
  document.querySelector('#exam-submit-top').onclick = () => confirmAndSubmitExam();
  document.querySelector('#exam-submit-bottom').onclick = () => confirmAndSubmitExam();
  document.querySelector('#exam-quit-btn').onclick = () => {
    if (confirm('실전 모의고사를 중도 종료하시겠습니까? 현재까지 작성한 답안으로 채점 결과를 확인할 수 있습니다.')) {
      const hasAny = exam.userAnswers.some(a => a.trim() !== '');
      if (hasAny) submitExam(true);
      else navigate('exam');
    }
  };

  document.querySelector('#exam-prev-q').onclick = () => jumpToExamQuestion(Math.max(0, exam.qIndex - 1));
  document.querySelector('#exam-next-q').onclick = () => jumpToExamQuestion(Math.min(19, exam.qIndex + 1));

  // 슬라이드 사진 클릭 확대 (부위 스포일러 배지 없음 · 실제 시험처럼 상영 시간 계속 진행)
  const openExamZoom = () => {
    if (!exam || exam.phase === 'intermission') return;
    detailId = null;
    const curQ = exam.questions[exam.qIndex];
    const photo = curQ.photos[exam.photoIndex] || curQ.photos[0];
    document.querySelector('#detail-content').innerHTML = `
      <div class="dialog-top">
        <span class="num" id="exam-zoom-title">제 ${String(exam.qIndex + 1).padStart(2, '0')} 문항 · 슬라이드 ${exam.photoIndex + 1}/${curQ.photos.length} 확대</span>
        <button class="close" aria-label="닫기">×</button>
      </div>
      <div style="padding:22px;text-align:center;background:#111d16">
        <img id="exam-zoom-img" src="${photo.src}" alt="슬라이드 확대 사진" style="max-width:100%;max-height:78vh;border-radius:8px;object-fit:contain;box-shadow:0 8px 28px rgba(0,0,0,0.45)">
      </div>
    `;
    document.querySelector('.close').onclick = () => dialog.close();
    dialog.showModal();
  };
  document.querySelector('#exam-slide-img').onclick = openExamZoom;
  document.querySelector('#exam-zoom-btn').onclick = openExamZoom;

  // 빠른 입력창(Quick Input) 이벤트 바인딩 (타이핑 보호 포함)
  const quickInput = document.querySelector('#exam-quick-input');
  quickInput.addEventListener('compositionstart', () => {
    if (exam) exam.isQuickComposing = true;
  });
  quickInput.addEventListener('compositionend', () => {
    if (exam) {
      exam.isQuickComposing = false;
      syncFromQuickInput();
    }
  });
  quickInput.addEventListener('input', () => {
    if (!exam) return;
    exam.isQuickDirty = true;
    syncFromQuickInput();
  });
  quickInput.addEventListener('blur', () => {
    if (!exam) return;
    exam.isQuickDirty = false;
    exam.isQuickComposing = false;
  });
  quickInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      if (e.isComposing || exam.isQuickComposing) return;
      e.preventDefault();
      syncFromQuickInput();
      exam.isQuickDirty = false;
      if (exam.quickTargetIdx !== exam.qIndex) {
        // 만약 이전 문제를 마저 적고 있었다면 현재 상영 중인 문제로 즉시 동기화
        syncQuickInputToCurrentQuestion();
        toast(`${exam.qIndex + 1}번 문항 입력창으로 이동했습니다.`);
      } else if (exam.qIndex < 19) {
        // 현재 문제를 다 적었으면 안내 토스트 표시
        toast(`${exam.quickTargetIdx + 1}번 답안이 기록되었습니다.`);
      }
    }
  });

  document.querySelector('#exam-quick-confirm').onclick = () => {
    syncFromQuickInput();
    exam.isQuickDirty = false;
    if (exam.quickTargetIdx !== exam.qIndex) {
      syncQuickInputToCurrentQuestion();
    }
    toast(`${exam.quickTargetIdx + 1}번 답안이 기록되었습니다.`);
    quickInput.focus();
  };

  // 우측 1~20번 답안지 이벤트 바인딩
  document.querySelectorAll('[data-jump-q]').forEach(btn => {
    btn.onclick = () => {
      const targetIdx = +btn.dataset.jumpQ;
      jumpToExamQuestion(targetIdx);
      const inp = document.querySelector(`#sheet-input-${targetIdx}`);
      if (inp) inp.focus();
    };
  });

  document.querySelectorAll('.sheet-ans-input').forEach(inp => {
    const idx = +inp.dataset.sheetIdx;
    inp.addEventListener('input', () => {
      if (!exam) return;
      exam.userAnswers[idx] = inp.value;
      updateSheetRowCheck(idx);
      if (exam.quickTargetIdx === idx && document.activeElement !== quickInput) {
        quickInput.value = inp.value;
      }
    });
    inp.addEventListener('keydown', e => {
      if (e.isComposing) return;
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nextInp = document.querySelector(`#sheet-input-${Math.min(19, idx + 1)}`);
        if (nextInp) nextInp.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevInp = document.querySelector(`#sheet-input-${Math.max(0, idx - 1)}`);
        if (prevInp) prevInp.focus();
      }
    });
  });

  bindPhotoDotButtons();
  updateExamFilledCount();
}

function bindPhotoDotButtons() {
  document.querySelectorAll('[data-photo-step]').forEach(btn => {
    btn.onclick = () => {
      if (!exam) return;
      if (exam.phase === 'intermission') return;
      if (exam.phase === 'final_grace') exam.phase = exam.enablePass2 ? 'pass2' : 'pass1';
      exam.photoIndex = +btn.dataset.photoStep;
      exam.elapsedMs = 0;
      updateExamSlideUI();
    };
  });
}

function syncFromQuickInput() {
  if (!exam) return;
  const quickInput = document.querySelector('#exam-quick-input');
  if (!quickInput) return;
  const targetIdx = exam.quickTargetIdx;
  exam.userAnswers[targetIdx] = quickInput.value;
  const sheetInp = document.querySelector(`#sheet-input-${targetIdx}`);
  if (sheetInp && sheetInp.value !== quickInput.value) {
    sheetInp.value = quickInput.value;
  }
  updateSheetRowCheck(targetIdx);
}

function syncQuickInputToCurrentQuestion() {
  if (!exam) return;
  const quickInput = document.querySelector('#exam-quick-input');
  const quickPill = document.querySelector('#exam-quick-pill');
  const quickHint = document.querySelector('#exam-quick-sync-hint');
  if (!quickInput) return;

  // 사용자가 빠른 입력창에서 한창 타이핑/한글 조합 중이면 포커스와 타깃 번호를 강제로 빼앗지 않음
  const isActivelyTypingQuick = document.activeElement === quickInput && (exam.isQuickComposing || exam.isQuickDirty);

  if (!isActivelyTypingQuick) {
    exam.quickTargetIdx = exam.qIndex;
    quickInput.value = exam.userAnswers[exam.qIndex] || '';
    quickInput.placeholder = `${exam.qIndex + 1}번 수목 이름을 입력 후 Enter`;
    if (quickPill) {
      quickPill.textContent = `${String(exam.qIndex + 1).padStart(2, '0')}번 문항`;
      quickPill.classList.remove('lagging');
    }
    if (quickHint) {
      quickHint.textContent = '우측 답안지와 실시간 연동 · Enter로 확정';
      quickHint.classList.remove('lagging');
    }
  } else if (exam.quickTargetIdx !== exam.qIndex) {
    // 이전 번호를 마저 타이핑 중일 때 시각적 안내만 표시
    if (quickPill) {
      quickPill.textContent = `${String(exam.quickTargetIdx + 1).padStart(2, '0')}번 작성 중`;
      quickPill.classList.add('lagging');
    }
    if (quickHint) {
      quickHint.textContent = `현재 화면은 ${String(exam.qIndex + 1).padStart(2, '0')}번 상영 중 · Enter를 누르면 ${String(exam.qIndex + 1).padStart(2, '0')}번으로 이동`;
      quickHint.classList.add('lagging');
    }
  }
}

function updateSheetRowCheck(idx) {
  const row = document.querySelector(`#sheet-row-${idx}`);
  const dot = document.querySelector(`#sheet-dot-${idx}`);
  const hasVal = (exam.userAnswers[idx] || '').trim() !== '';
  if (row) row.classList.toggle('is-filled', hasVal);
  if (dot) dot.textContent = hasVal ? '✓' : '';
  updateExamFilledCount();
}

function updateExamFilledCount() {
  const counter = document.querySelector('#exam-filled-counter');
  if (!counter || !exam) return;
  const filled = exam.userAnswers.filter(a => a.trim() !== '').length;
  counter.innerHTML = `작성 완료 <strong>${filled}</strong> / 20`;
}

function jumpToExamQuestion(targetIdx) {
  if (!exam) return;
  if (exam.phase === 'intermission' || exam.phase === 'final_grace') {
    exam.phase = exam.enablePass2 ? 'pass2' : 'pass1';
    const overlay = document.querySelector('#exam-notice-overlay');
    if (overlay) overlay.hidden = true;
  }
  exam.qIndex = targetIdx;
  exam.photoIndex = 0;
  exam.elapsedMs = 0;
  exam.isQuickDirty = false;
  updateExamQuestionUI();
}

function updateExamPhaseHeader() {
  if (!exam) return;
  const badge = document.querySelector('#exam-phase-badge');
  const desc = document.querySelector('#exam-phase-desc');
  if (!badge || !desc) return;

  badge.className = `exam-phase-badge ${exam.phase}`;
  if (exam.phase === 'pass1') {
    badge.textContent = `1차 본 상영 (${exam.pass1Sec}초/장)`;
    desc.textContent = '1번부터 20번까지 순서대로 상영됩니다. 아는 수목부터 답안지에 빠르게 기입하세요.';
  } else if (exam.phase === 'intermission') {
    badge.textContent = '2차 재상영 준비 중';
    desc.textContent = '1차 상영이 종료되었습니다. 곧 1번부터 2차 빠른 재상영(2초/장)이 시작됩니다.';
  } else if (exam.phase === 'pass2') {
    badge.textContent = `2차 빠른 재상영 (${exam.pass2Sec}초/장)`;
    desc.textContent = '놓친 문항이나 헷갈렸던 수목을 확인하여 빈칸을 채워 넣으세요.';
  } else if (exam.phase === 'final_grace') {
    badge.textContent = '최종 답안 정리 시간';
    desc.textContent = '모든 슬라이드 상영이 종료되었습니다. 오탈자를 점검하고 답안지를 제출해 주세요.';
  }
}

function updateExamSlideUI() {
  if (!exam) return;
  const q = exam.questions[exam.qIndex];
  const photo = q.photos[exam.photoIndex] || q.photos[0];

  const img = document.querySelector('#exam-slide-img');
  if (img && img.getAttribute('src') !== photo.src) {
    img.classList.remove('slide-fade');
    void img.offsetWidth;
    img.src = photo.src;
    img.alt = `제 ${exam.qIndex + 1}번 수목 감별 슬라이드 사진`;
    img.classList.add('slide-fade');
  }

  // 확대 모달이 열려 있는 동안에도 실제 슬라이드 전환에 맞춰 확대 사진 동기화
  const zoomImg = document.querySelector('#exam-zoom-img');
  const zoomTitle = document.querySelector('#exam-zoom-title');
  if (dialog && dialog.open && zoomImg) {
    zoomImg.src = photo.src;
    if (zoomTitle) {
      zoomTitle.textContent = `제 ${String(exam.qIndex + 1).padStart(2, '0')} 문항 · 슬라이드 ${exam.photoIndex + 1}/${q.photos.length} 확대`;
    }
  }

  const wm = document.querySelector('#exam-watermark');
  if (wm) {
    wm.textContent = `제 ${String(exam.qIndex + 1).padStart(2, '0')} 문항 · 사진 ${exam.photoIndex + 1}/${q.photos.length}`;
  }

  document.querySelectorAll('[data-photo-step]').forEach(btn => {
    btn.classList.toggle('active', +btn.dataset.photoStep === exam.photoIndex);
  });

  updateExamTimerUI();
}

function updateExamQuestionUI() {
  if (!exam) return;
  const q = exam.questions[exam.qIndex];

  const qNumEl = document.querySelector('#exam-q-number');
  if (qNumEl) qNumEl.textContent = String(exam.qIndex + 1).padStart(2, '0');

  const dotsContainer = document.querySelector('#exam-photo-dots');
  if (dotsContainer) {
    dotsContainer.innerHTML = q.photos.map((_, idx) => `
      <button type="button" class="exam-dot-btn ${idx === exam.photoIndex ? 'active' : ''}" data-photo-step="${idx}" title="사진 ${idx + 1} 보기">
        ${idx + 1}
      </button>
    `).join('');
    bindPhotoDotButtons();
  }

  // 답안지 현재 문항 하이라이트 갱신 (DOM 재생성 없이 클래스만 토글하여 입력 포커스 보존)
  document.querySelectorAll('.sheet-row').forEach(row => {
    row.classList.toggle('is-current', +row.dataset.rowIdx === exam.qIndex);
  });

  syncQuickInputToCurrentQuestion();
  updateExamPhaseHeader();
  updateExamSlideUI();
}

function updateExamTimerUI() {
  if (!exam) return;
  const slideBar = document.querySelector('#exam-slide-bar');
  const totalBar = document.querySelector('#exam-total-bar');
  const slideLabel = document.querySelector('#exam-slide-timer-label');
  const totalLabel = document.querySelector('#exam-total-progress-label');

  if (exam.phase === 'pass1' || exam.phase === 'pass2') {
    const secPerSlide = exam.phase === 'pass1' ? exam.pass1Sec : exam.pass2Sec;
    const durationMs = secPerSlide * 1000;
    const remainSec = Math.max(0, (durationMs - exam.elapsedMs) / 1000).toFixed(1);
    const slidePct = Math.min(100, (exam.elapsedMs / durationMs) * 100);

    const q = exam.questions[exam.qIndex];
    const totalSlidesInPass = 20 * q.photos.length;
    const currentSlideGlobal = exam.qIndex * q.photos.length + exam.photoIndex + (exam.elapsedMs / durationMs);
    const totalPct = Math.min(100, (currentSlideGlobal / totalSlidesInPass) * 100);

    if (slideBar) slideBar.style.width = `${slidePct}%`;
    if (totalBar) totalBar.style.width = `${totalPct}%`;
    if (slideLabel) slideLabel.textContent = `현재 사진 전환까지 ${remainSec}초`;
    if (totalLabel) {
      totalLabel.textContent = `${exam.phase === 'pass1' ? '1차 본 상영' : '2차 재상영'} · ${exam.qIndex + 1} / 20번 (사진 ${exam.photoIndex + 1}/${q.photos.length})`;
    }
  } else if (exam.phase === 'intermission') {
    const remainSec = Math.max(0, (3500 - exam.elapsedMs) / 1000).toFixed(1);
    if (slideBar) slideBar.style.width = `${Math.min(100, (exam.elapsedMs / 3500) * 100)}%`;
    if (slideLabel) slideLabel.textContent = `2차 재상영 시작까지 ${remainSec}초`;
    if (totalLabel) totalLabel.textContent = '1차 상영 완료 · 2차 재상영 전환 중';
  } else if (exam.phase === 'final_grace') {
    const remainSec = Math.ceil(Math.max(0, (30000 - exam.elapsedMs) / 1000));
    if (slideBar) slideBar.style.width = `${Math.min(100, (exam.elapsedMs / 30000) * 100)}%`;
    if (slideLabel) slideLabel.textContent = `자동 제출까지 ${remainSec}초 남음`;
    if (totalLabel) totalLabel.textContent = '상영 종료 · 답안 최종 점검 시간';
  }
}

function showExamScreenNotice(html, show = true) {
  const overlay = document.querySelector('#exam-notice-overlay');
  const box = document.querySelector('#exam-notice-box');
  if (!overlay || !box) return;
  if (!show) {
    overlay.hidden = true;
    box.innerHTML = '';
    return;
  }
  box.innerHTML = html;
  overlay.hidden = false;
}

function startExamTicker() {
  cleanupExamTimer();
  examTimerId = setInterval(() => {
    if (!exam || view !== 'exam') {
      cleanupExamTimer();
      return;
    }

    exam.elapsedMs += 100;

    if (exam.phase === 'pass1' || exam.phase === 'pass2') {
      const secPerSlide = exam.phase === 'pass1' ? exam.pass1Sec : exam.pass2Sec;
      const slideDurationMs = secPerSlide * 1000;

      if (exam.elapsedMs >= slideDurationMs) {
        exam.elapsedMs = 0;
        const curQ = exam.questions[exam.qIndex];

        if (exam.photoIndex + 1 < curQ.photos.length) {
          // 같은 문제의 다음 부위 사진으로 전환
          exam.photoIndex++;
          updateExamSlideUI();
        } else if (exam.qIndex + 1 < exam.questions.length) {
          // 다음 문제(1~20번)로 전환
          exam.qIndex++;
          exam.photoIndex = 0;
          updateExamQuestionUI();
        } else {
          // 20번 문제의 마지막 사진까지 완료
          if (exam.phase === 'pass1' && exam.enablePass2) {
            exam.phase = 'intermission';
            exam.elapsedMs = 0;
            updateExamPhaseHeader();
            showExamScreenNotice(`
              <span class="notice-tag">PASS 1 COMPLETE</span>
              <h3>1차 슬라이드 상영이 종료되었습니다</h3>
              <p>잠시 후 <strong>1번 문항부터 2차 빠른 재상영(사진당 ${exam.pass2Sec}초)</strong>이 시작됩니다.<br>못 적은 빈칸을 채우거나 작성한 답안을 재확인하세요.</p>
              <button type="button" class="primary" id="btn-start-pass2-now">지금 바로 2차 상영 시작 ▶</button>
            `, true);
            const btnNow = document.querySelector('#btn-start-pass2-now');
            if (btnNow) {
              btnNow.onclick = () => {
                exam.phase = 'pass2';
                exam.qIndex = 0;
                exam.photoIndex = 0;
                exam.elapsedMs = 0;
                showExamScreenNotice('', false);
                updateExamQuestionUI();
              };
            }
          } else {
            enterExamFinalGrace();
          }
        }
      } else {
        updateExamTimerUI();
      }
    } else if (exam.phase === 'intermission') {
      if (exam.elapsedMs >= 3500) {
        exam.phase = 'pass2';
        exam.qIndex = 0;
        exam.photoIndex = 0;
        exam.elapsedMs = 0;
        showExamScreenNotice('', false);
        updateExamQuestionUI();
        toast('2차 빠른 재상영(1~20번)을 시작합니다.');
      } else {
        updateExamTimerUI();
      }
    } else if (exam.phase === 'final_grace') {
      if (exam.elapsedMs >= 30000) {
        submitExam(false);
      } else {
        updateExamTimerUI();
      }
    }
  }, 100);
}

function enterExamFinalGrace() {
  if (!exam) return;
  exam.phase = 'final_grace';
  exam.elapsedMs = 0;
  updateExamPhaseHeader();
  showExamScreenNotice(`
    <span class="notice-tag final">SLIDE PRESENTATION ENDED</span>
    <h3>모든 슬라이드 상영이 종료되었습니다</h3>
    <p>30초 동안 답안지의 빈칸이나 오탈자를 최종 점검한 뒤 아래 <strong>답안지 최종 제출</strong> 버튼을 눌러주세요.<br><small>(번호 버튼을 누르면 해당 슬라이드를 다시 확인할 수 있습니다)</small></p>
    <button type="button" class="primary" id="btn-notice-submit">답안지 최종 제출 및 채점하기</button>
  `, true);
  const btnSub = document.querySelector('#btn-notice-submit');
  if (btnSub) btnSub.onclick = () => submitExam(false);
  updateExamTimerUI();
}

function confirmAndSubmitExam() {
  if (!exam) return;
  syncFromQuickInput();
  const emptyCount = exam.userAnswers.filter(a => a.trim() === '').length;
  if (emptyCount > 0 && exam.phase !== 'final_grace') {
    if (!confirm(`아직 작성하지 않은 빈칸이 ${emptyCount}문항 있습니다.\n이대로 답안지를 최종 제출하고 채점하시겠습니까?`)) {
      return;
    }
  }
  submitExam(false);
}

function submitExam(early = false) {
  if (!exam) return;
  syncFromQuickInput();
  cleanupExamTimer();
  exam.phase = 'done';

  const durationSec = Math.max(1, Math.round((Date.now() - exam.startedAt) / 1000));
  const results = exam.questions.map((q, idx) => {
    const t = q.tree;
    const rawAns = (exam.userAnswers[idx] || '').trim();
    const normAns = normalize(rawAns);
    const normStd = normalize(t.name);

    // 실제 시험 기준: 표준수종 정식 명칭(t.name)만 정답(0.5점) 인정
    const isCorrect = rawAns !== '' && normAns === normStd;
    const isAlias = !isCorrect && rawAns !== '' && (t.aliases || []).map(normalize).includes(normAns);
    const score = isCorrect ? 0.5 : 0;

    // 오답 노트 및 수목별 학습 통계 업데이트
    progress[t.id] = {
      wrong: !isCorrect,
      attempts: (Number(progress[t.id]?.attempts) || 0) + 1
    };
    if (!treeStats[t.id]) {
      treeStats[t.id] = { attempts: 0, correct: 0, wrong: 0, lastSeen: '' };
    }
    treeStats[t.id].attempts = (treeStats[t.id].attempts || 0) + 1;
    if (isCorrect) treeStats[t.id].correct = (treeStats[t.id].correct || 0) + 1;
    else treeStats[t.id].wrong = (treeStats[t.id].wrong || 0) + 1;
    treeStats[t.id].lastSeen = new Date().toISOString();

    return {
      qNum: idx + 1,
      tree: t,
      photos: q.photos,
      userAnswer: rawAns,
      correct: isCorrect,
      isAlias,
      score
    };
  });

  const correctCount = results.filter(r => r.correct).length;
  const totalScore = (correctCount * 0.5).toFixed(1);
  const percent = Math.round((correctCount / 20) * 100);

  if (!exam.recorded) {
    exam.recorded = true;
    const now = new Date();
    const dateStr = `${now.getMonth() + 1}월 ${now.getDate()}일 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    quizHistory.unshift({
      id: 'exam_' + Date.now(),
      date: dateStr,
      pool: exam.poolName || '전체 120종',
      mode: `실전 모의고사 (${totalScore}/10점)`,
      total: 20,
      correct: correctCount,
      percent,
      early
    });
    if (quizHistory.length > 50) quizHistory.pop();
  }

  save();
  renderExamResult(results, totalScore, correctCount, percent, durationSec, early);
}

function renderExamResult(results, totalScore, correctCount, percent, durationSec, early) {
  const aliasMistakes = results.filter(r => r.isAlias);
  const wrongCount = 20 - correctCount;
  const minStr = Math.floor(durationSec / 60);
  const secStr = durationSec % 60;
  const timeFormatted = minStr > 0 ? `${minStr}분 ${secStr}초` : `${secStr}초`;

  main.innerHTML = `
    <div class="result exam-result-wrap">
      <div class="score exam-score-card">
        <div class="eyebrow">${early ? 'MOCK EXAM PAUSED · 실전 모의고사 채점 결과' : 'MOCK EXAM COMPLETE · 실전 모의고사 성적표'}</div>
        <h2>조경기능사 수목감별 20선 채점 결과</h2>
        <div class="exam-score-main">
          <strong>${totalScore}<small> / 10.0점</small></strong>
        </div>
        <div class="exam-score-metrics">
          <span>정답 <b>${correctCount}</b> / 20문항 (${percent}%)</span>
          <span>·</span>
          <span>문항당 0.5점</span>
          <span>·</span>
          <span>소요 시간 ${timeFormatted}</span>
        </div>
        <p style="margin-top:10px">${wrongCount > 0 ? `틀리거나 미기입한 ${wrongCount}종의 수목을 오답 복습 노트에 자동 기록했습니다.` : '축하합니다! 20문항 모두 표준수종 명칭으로 완벽하게 감별하셨습니다!'}</p>
      </div>

      ${aliasMistakes.length > 0 ? `
        <div class="exam-alias-alert">
          <strong>⚠️ 표준수종 명칭 주의 안내 (${aliasMistakes.length}문항)</strong>
          <p>이명(별칭)으로 작성하여 오답 처리된 문항이 있습니다: ${aliasMistakes.map(r => `<b>${r.qNum}번</b> 입력 ‘${escapeHtml(r.userAnswer)}’ → 표준명 <b>‘${escapeHtml(r.tree.name)}’</b>`).join(', ')}. 실제 국가기술자격 시험에서는 반드시 표준수종 정식 명칭으로 기입해야 점수가 인정됩니다.</p>
        </div>
      ` : ''}

      <div class="result-actions">
        <button class="primary" id="exam-again">새 모의고사 응시하기</button>
        <button class="secondary" id="exam-go-wrong">오답 복습 노트 (${wrongTrees().length}종)</button>
        <button class="secondary" id="exam-go-stats">학습 통계 보기 📊</button>
      </div>

      <div class="exam-result-header">
        <h2>제출 답안지 채점 내역 (20문항)</h2>
        <div class="exam-result-filters">
          <button type="button" class="photo-filter-chip active" data-res-filter="all">전체 문항 (20)</button>
          <button type="button" class="photo-filter-chip" data-res-filter="wrong">오답·미기입 (${wrongCount})</button>
          <button type="button" class="photo-filter-chip" data-res-filter="correct">정답 (${correctCount})</button>
        </div>
      </div>

      <p class="exam-result-hint">각 문항 행을 클릭하면 해당 수목의 4대 형태 특징과 감별 포인트 도감 모달이 열립니다.</p>

      <div class="exam-result-table" id="exam-result-table">
        ${results.map(r => {
          const t = r.tree;
          const fam = t.family ? t.family.split('/')[0] : '';
          return `
            <button type="button" class="exam-result-row ${r.correct ? 'is-correct' : 'is-wrong'}" data-tree="${t.id}" data-res-state="${r.correct ? 'correct' : 'wrong'}">
              <div class="res-qnum">
                <span class="res-q-badge">${String(r.qNum).padStart(2, '0')}번</span>
                <span class="res-mark ${r.correct ? 'ok' : 'no'}">${r.correct ? 'O' : 'X'}</span>
              </div>

              <div class="res-thumbs">
                ${r.photos.slice(0, 4).map(p => `<img src="${p.src}" alt="" loading="lazy">`).join('')}
              </div>

              <div class="res-answers">
                <div class="res-user-line">
                  <span class="res-label">내 답안</span>
                  <strong class="${r.correct ? 'ans-ok' : 'ans-wrong'}">${r.userAnswer ? escapeHtml(r.userAnswer) : '(미기입)'}</strong>
                  ${r.isAlias ? '<span class="res-alias-tag">이명 주의</span>' : ''}
                </div>
                <div class="res-std-line">
                  <span class="res-label">표준 정답</span>
                  <strong class="ans-std">${escapeHtml(t.name)}</strong>
                  <small class="res-meta">NO.${pad(t.id)} · ${escapeHtml(fam)}</small>
                </div>
              </div>

              <div class="res-score">
                <span class="res-score-pill ${r.correct ? 'plus' : 'zero'}">${r.correct ? '+0.5점' : '0.0점'}</span>
                <span class="res-detail-link">도감 해설 →</span>
              </div>
            </button>
          `;
        }).join('')}
      </div>
    </div>
  `;

  document.querySelector('#exam-again').onclick = () => navigate('exam');
  document.querySelector('#exam-go-wrong').onclick = () => navigate('wrong');
  document.querySelector('#exam-go-stats').onclick = () => navigate('stats');

  document.querySelectorAll('#exam-result-table [data-tree]').forEach(row => {
    row.onclick = () => showDetail(+row.dataset.tree);
  });

  document.querySelectorAll('[data-res-filter]').forEach(chip => {
    chip.onclick = () => {
      document.querySelectorAll('[data-res-filter]').forEach(c => c.classList.toggle('active', c === chip));
      const f = chip.dataset.resFilter;
      document.querySelectorAll('#exam-result-table .exam-result-row').forEach(row => {
        const match = f === 'all' || row.dataset.resState === f;
        row.style.display = match ? '' : 'none';
      });
    };
  });

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
