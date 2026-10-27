#!/usr/bin/env node
/**
 * tools/verify_ui.js
 *
 * "조경기능사 실기 수목감별 120" 통합 UI·반응형·데이터·SPA 런타임 무결성 자동 검증 도구
 * 외부 NPM 의존성 없이 순수 Node.js 표준 모듈만으로 동작하며,
 * 로컬 개발 환경 및 GitHub Actions CI/CD 게이트에서 실행됩니다.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const WEB_DIR = path.join(ROOT, 'web');
const INDEX_HTML = path.join(WEB_DIR, 'index.html');
const STYLE_CSS = path.join(WEB_DIR, 'style.css');
const APP_JS = path.join(WEB_DIR, 'app.js');
const DATA_JS = path.join(WEB_DIR, 'data.js');
const TREES_JSON = path.join(WEB_DIR, 'trees.json');

let passed = 0;
let failed = 0;

function pass(msg) {
  passed++;
  console.log(`  ✅ [PASS] ${msg}`);
}

function fail(msg, detail = '') {
  failed++;
  console.error(`  ❌ [FAIL] ${msg}`);
  if (detail) console.error(`     └─ ${detail}`);
}

console.log('==============================================================');
console.log('🌿 수목 120 SPA · UI 및 모바일 반응형 무결성 검증 (verify_ui)');
console.log('==============================================================\n');

// ---------------------------------------------------------------------------
// 1. JavaScript 문법 및 데이터 동기화 검증
// ---------------------------------------------------------------------------
console.log('1️⃣  JavaScript 문법 및 수목 데이터(120종) 검증');
try {
  execFileSync(process.execPath, ['-c', APP_JS], { stdio: 'pipe' });
  pass('web/app.js 문법 검증 통과');
} catch (err) {
  fail('web/app.js 문법 오류 발생', err.stderr ? err.stderr.toString().trim() : err.message);
}

try {
  execFileSync(process.execPath, ['-c', DATA_JS], { stdio: 'pipe' });
  pass('web/data.js 문법 검증 통과');
} catch (err) {
  fail('web/data.js 문법 오류 발생', err.stderr ? err.stderr.toString().trim() : err.message);
}

try {
  const trees = JSON.parse(fs.readFileSync(TREES_JSON, 'utf8'));
  if (Array.isArray(trees) && trees.length === 120) {
    pass(`web/trees.json 120종 데이터 확인 (${trees.length}종)`);
  } else {
    fail('web/trees.json 수목 개수 불일치', `기대값: 120, 실제값: ${Array.isArray(trees) ? trees.length : typeof trees}`);
  }
} catch (err) {
  fail('web/trees.json 파싱 실패', err.message);
}

// ---------------------------------------------------------------------------
// 2. HTML 필수 메타태그 및 구조 검증
// ---------------------------------------------------------------------------
console.log('\n2️⃣  HTML 모바일 뷰포트 및 SPA 구조 검증');
const html = fs.readFileSync(INDEX_HTML, 'utf8');

if (html.includes('name="viewport"') && html.includes('width=device-width') && html.includes('viewport-fit=cover')) {
  pass('모바일 viewport 메타태그(width=device-width, viewport-fit=cover) 확인');
} else {
  fail('index.html에 모바일 viewport 메타태그가 누락되었거나 불완전합니다.');
}

const navButtons = [...html.matchAll(/data-nav="([^"]+)"/g)].map(m => m[1]);
const expectedNavs = ['study', 'quiz', 'exam', 'wrong', 'stats'];
if (JSON.stringify(navButtons) === JSON.stringify(expectedNavs)) {
  pass(`상단 내비게이션 5대 탭 구조 확인 (${navButtons.join(', ')})`);
} else {
  fail('상단 내비게이션 탭 구성 불일치', `현재 탭: ${navButtons.join(', ')}`);
}

// ---------------------------------------------------------------------------
// 3. CSS 구문, 가독성(Minified 방지) 및 중괄호 검증
// ---------------------------------------------------------------------------
console.log('\n3️⃣  CSS 문법 및 코드 가독성(단일 행 압축 금지) 검증');
const css = fs.readFileSync(STYLE_CSS, 'utf8');
const cssLines = css.split('\n');

let braceOpen = 0;
let braceError = null;
for (let i = 0; i < css.length; i++) {
  if (css[i] === '{') braceOpen++;
  else if (css[i] === '}') braceOpen--;
  if (braceOpen < 0) {
    braceError = `닫는 중괄호 초과 (index: ${i})`;
    break;
  }
}
if (!braceError && braceOpen !== 0) {
  braceError = `열린 중괄호 미종결 (잔여: ${braceOpen}개)`;
}

if (!braceError) {
  pass(`web/style.css 중괄호 짝 맞춤 검증 통과 (총 ${cssLines.length}행)`);
} else {
  fail('web/style.css 중괄호 불일치 오류', braceError);
}

const MAX_LINE_LEN = 500;
const overlyLongLines = [];
cssLines.forEach((line, idx) => {
  if (line.length > MAX_LINE_LEN) {
    overlyLongLines.push(`${idx + 1}행 (${line.length}자)`);
  }
});

if (overlyLongLines.length === 0) {
  pass(`단일 행 과도 압축(>${MAX_LINE_LEN}자) 없음 확인 — 모든 미디어 쿼리 가시성 확보`);
} else {
  fail(
    `web/style.css에 ${MAX_LINE_LEN}자를 초과하는 압축(Minified) 라인이 존재합니다.`,
    `해당 행: ${overlyLongLines.join(', ')} (유지보수 및 미디어 쿼리 누락 방지를 위해 멀티라인으로 포맷팅하세요)`
  );
}

// ---------------------------------------------------------------------------
// 4. 모바일 반응형 핵심 CSS 불변식(Invariants) 정적 분석
// ---------------------------------------------------------------------------
console.log('\n4️⃣  모바일 반응형 핵심 CSS 불변식(Invariants) 검증');

/**
 * 특정 @media 조건 블록 내부의 텍스트만 모두 추출합니다.
 */
function extractMediaBlocks(cssText, mediaQueryKeyword) {
  const results = [];
  const regex = /@media\s*\([^)]+\)\s*\{/g;
  let match;
  while ((match = regex.exec(cssText)) !== null) {
    const header = match[0];
    if (!header.replace(/\s+/g, '').includes(mediaQueryKeyword.replace(/\s+/g, ''))) continue;

    let depth = 1;
    let idx = match.index + header.length;
    while (idx < cssText.length && depth > 0) {
      if (cssText[idx] === '{') depth++;
      else if (cssText[idx] === '}') depth--;
      idx++;
    }
    results.push(cssText.slice(match.index + header.length, idx - 1));
  }
  return results.join('\n');
}

const mobile760Css = extractMediaBlocks(css, 'max-width:760px');
const tablet1024Css = extractMediaBlocks(css, 'max-width:1024px');

// 불변식 1: html, body 가로 스크롤 원천 차단
if (/overflow-x\s*:\s*hidden/.test(css)) {
  pass('전역 가로 넘침 방지(html, body { overflow-x: hidden }) 적용 확인');
} else {
  fail('전역 overflow-x: hidden 규칙이 누락되었습니다.');
}

// 불변식 2: 한글 어절 단위 줄바꿈(word-break: keep-all)
if (/word-break\s*:\s*keep-all/.test(css)) {
  pass('한글 어절 보호(word-break: keep-all) 타이포그래피 규칙 확인');
} else {
  fail('word-break: keep-all 규칙이 누락되어 한글 제목이 음절 단위로 쪼개질 수 있습니다.');
}

// 불변식 3: 모바일(.intro)에서 flex-direction: column 강제 (재발 방지 핵심 규칙!)
const introInMobileMatch = mobile760Css.match(/\.intro\s*\{([^}]+)\}/);
if (introInMobileMatch && /flex-direction\s*:\s*column/.test(introInMobileMatch[1])) {
  pass('모바일(@media max-width: 760px) .intro { flex-direction: column } 수직 스택 확인');
} else {
  fail(
    '모바일(@media max-width: 760px)에서 .intro에 flex-direction: column이 없습니다!',
    '.intro-actions(width: 100%)와 좌측 제목 블록이 가로로 충돌하여 화면이 깨집니다.'
  );
}

// 불변식 4: 모바일(.intro-actions 및 .intro > .primary) 너비 및 버튼 균등 분할 확인
const introActionsMobileMatch = mobile760Css.match(/\.intro-actions\s*\{([^}]+)\}/);
const introActionsBtnMobileMatch = mobile760Css.match(/\.intro-actions\s+button\s*\{([^}]+)\}/);
if (
  introActionsMobileMatch &&
  /width\s*:\s*100%/.test(introActionsMobileMatch[1]) &&
  introActionsBtnMobileMatch &&
  /flex\s*:\s*1/.test(introActionsBtnMobileMatch[1]) &&
  /min-width\s*:\s*0/.test(introActionsBtnMobileMatch[1])
) {
  pass('모바일 .intro-actions(width: 100%) 및 내부 버튼(flex: 1; min-width: 0) 균등 배치 확인');
} else {
  fail('모바일 .intro-actions 또는 내부 버튼의 반응형 폭(width: 100%, flex: 1, min-width: 0) 설정이 누락되었습니다.');
}

// 불변식 5: 모바일 상단 내비게이션 5개 탭 간격 및 폰트 최적화
const navInMobileMatch = mobile760Css.match(/nav\s*\{([^}]+)\}/);
const navBtnInMobileMatch = mobile760Css.match(/nav\s+button\s*\{([^}]+)\}/);
if (
  navInMobileMatch &&
  /justify-content\s*:\s*space-between/.test(navInMobileMatch[1]) &&
  navBtnInMobileMatch &&
  /font-size\s*:\s*13(\.5)?px/.test(navBtnInMobileMatch[1])
) {
  pass('모바일 상단 5개 탭(nav) 폭 맞춤(justify-content: space-between, 13.5px) 확인');
} else {
  fail('모바일 상단 nav 5개 탭 폭 최적화 스타일이 누락되어 우측 탭이 잘릴 수 있습니다.');
}

// 불변식 6: 모바일 단일 열 전환 컨테이너(.detail-layout, .setup, .quiz-layout, .exam-workspace)
const singleColTargets = [
  { name: '.detail-layout', source: mobile760Css },
  { name: '.setup', source: mobile760Css },
  { name: '.quiz-layout', source: mobile760Css },
  { name: '.exam-workspace', source: tablet1024Css + '\n' + mobile760Css }
];

for (const target of singleColTargets) {
  const escaped = target.name.replace('.', '\\.');
  const re = new RegExp(`${escaped}\\s*\\{[^}]*grid-template-columns\\s*:\\s*(1fr|minmax\\(0,\\s*1fr\\))`, 'm');
  if (re.test(target.source)) {
    pass(`반응형 단일 컬럼(1fr / minmax(0, 1fr)) 전환 확인: ${target.name}`);
  } else {
    fail(`${target.name}의 모바일/태블릿 단일 컬럼(grid-template-columns: 1fr) 규칙이 누락되었습니다.`);
  }
}

// 불변식 7: .exam-projector 및 .exam-answer-sheet 그리드 자식 min-width: 0 보호
const projMatch = css.match(/\.exam-projector\s*\{([^}]+)\}/);
const sheetMatch = css.match(/\.exam-answer-sheet\s*\{([^}]+)\}/);
if (projMatch && /min-width\s*:\s*0/.test(projMatch[1]) && sheetMatch && /min-width\s*:\s*0/.test(sheetMatch[1])) {
  pass('.exam-projector 및 .exam-answer-sheet에 min-width: 0 적용 확인 (그리드 가로 팽창 방지)');
} else {
  fail('.exam-projector 또는 .exam-answer-sheet에 min-width: 0이 누락되어 모바일 화면을 초과할 수 있습니다.');
}

// 불변식 8: 상세 모달 콜라주 그리드(.photo-collage-grid.count-5) 모바일 2열 오버라이드 순서(Cascade) 검증
const desktopCollage3Idx = css.indexOf('grid-template-columns: repeat(3, 1fr)');
const mobileCollage2Idx = css.lastIndexOf('.photo-collage-grid.count-9');
if (desktopCollage3Idx !== -1 && mobileCollage2Idx > desktopCollage3Idx) {
  pass('상세 모달 .photo-collage-grid 모바일 2열 미디어쿼리가 데스크톱 3열 규칙 이후에 선언됨 확인');
} else {
  fail('상세 모달 .photo-collage-grid 모바일 미디어쿼리가 데스크톱 규칙보다 앞에 있어 덮어써집니다.');
}

// 불변식 9: 모바일 iOS Safari 자동 줌 방지를 위한 입력창 최소 폰트 크기(>= 16px)
const mobileSearchInputMatch = mobile760Css.match(/\.search\s+input\s*\{([^}]+)\}/);
if (mobileSearchInputMatch && /font-size\s*:\s*16px/.test(mobileSearchInputMatch[1])) {
  pass('모바일 검색창(.search input) font-size: 16px 확인 (iOS 자동 줌 방지)');
} else {
  fail('모바일 .search input의 font-size: 16px 규칙이 누락되었습니다.');
}

// ---------------------------------------------------------------------------
// 5. SPA 5대 뷰(study, quiz, exam, wrong, stats) 런타임 렌더링 무결성 검증
// ---------------------------------------------------------------------------
console.log('\n5️⃣  SPA 5대 뷰 전환 및 DOM 마크업 구조 시뮬레이션 검증');
try {
  const mainEl = { innerHTML: '', querySelector: () => createStubEl(), querySelectorAll: () => [] };
  const detailContentEl = { innerHTML: '' };
  const dialogEl = {
    open: false,
    scrollTop: 0,
    showModal() { this.open = true; },
    close() { this.open = false; },
    addEventListener() {},
    getBoundingClientRect: () => ({ left: 0, right: 375, top: 0, bottom: 600 })
  };

  function createStubEl() {
    return {
      value: 'all',
      textContent: '',
      innerHTML: '',
      style: {},
      dataset: {},
      classList: { toggle() {}, add() {}, remove() {} },
      addEventListener() {},
      focus() {},
      remove() {},
      getAttribute: () => '',
      querySelector: () => createStubEl(),
      querySelectorAll: () => []
    };
  }

  const navBtns = expectedNavs.map(nav => ({
    dataset: { nav },
    classList: { toggle() {} },
    onclick: null
  }));

  const sandbox = {
    window: {
      TREES: null,
      innerWidth: 375,
      innerHeight: 812,
      scrollTo() {},
      addEventListener() {},
      removeEventListener() {}
    },
    localStorage: {
      getItem: () => null,
      setItem() {}
    },
    document: {
      activeElement: null,
      body: { appendChild() {} },
      createElement: () => ({
        id: '',
        className: '',
        innerHTML: '',
        width: 375,
        height: 812,
        getContext: () => ({
          clearRect() {},
          save() {},
          translate() {},
          rotate() {},
          scale() {},
          fillRect() {},
          restore() {}
        }),
        querySelector: () => createStubEl(),
        remove() {}
      }),
      querySelector(sel) {
        if (sel === '#main') return mainEl;
        if (sel === '#detail') return dialogEl;
        if (sel === '#detail-content') return detailContentEl;
        return createStubEl();
      },
      querySelectorAll(sel) {
        if (sel === '[data-nav]') return navBtns;
        return [];
      }
    },
    confirm: () => true,
    setTimeout: () => 1,
    setInterval: () => 1,
    clearInterval() {},
    requestAnimationFrame: () => 1,
    cancelAnimationFrame() {},
    console
  };

  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(DATA_JS, 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(APP_JS, 'utf8'), sandbox);

  // 1) 초기 study 뷰 마크업 확인
  if (mainEl.innerHTML.includes('class="intro"') && mainEl.innerHTML.includes('class="intro-actions"') && mainEl.innerHTML.includes('class="grid"')) {
    pass('수목 도감(study) 뷰 초기 렌더링 및 .intro-actions 마크업 확인');
  } else {
    fail('수목 도감(study) 뷰 마크업이 정상 생성되지 않았습니다.');
  }

  // 2) quiz, exam, wrong, stats 뷰 순차 전환 검증
  const viewChecks = [
    { nav: 'quiz', expected: 'class="setup"' },
    { nav: 'exam', expected: 'class="setup exam-setup"' },
    { nav: 'wrong', expected: 'REVIEW YOUR MISTAKES' },
    { nav: 'stats', expected: 'class="stats-container"' }
  ];

  for (const vc of viewChecks) {
    sandbox.navigate(vc.nav);
    if (mainEl.innerHTML.includes(vc.expected)) {
      pass(`뷰 라우팅(${vc.nav}) 렌더링 성공 (${vc.expected})`);
    } else {
      fail(`뷰 라우팅(${vc.nav}) 렌더링 실패`, `기대 마크업(${vc.expected}) 미발견`);
    }
  }

  // 3) 상세 도감 모달(showDetail) 및 실전 모의고사(startExam) 실행 검증
  sandbox.showDetail(1);
  if (detailContentEl.innerHTML.includes('class="detail-layout"') && dialogEl.open) {
    pass('수목 상세 모달(showDetail) 렌더링 및 다이얼로그 오픈 확인');
  } else {
    fail('수목 상세 모달(showDetail) 렌더링 실패');
  }

  sandbox.startExam('all', 4, true);
  if (mainEl.innerHTML.includes('class="exam-workspace"') && mainEl.innerHTML.includes('class="exam-answer-sheet"')) {
    pass('20선 실전 모의고사(startExam) 프로젝터 및 답안지 렌더링 확인');
  } else {
    fail('20선 실전 모의고사(startExam) 렌더링 실패');
  }
  sandbox.cleanupExamTimer();
} catch (err) {
  fail('SPA 런타임 시뮬레이션 중 예외 발생', err.stack || err.message);
}

// ---------------------------------------------------------------------------
// 최종 결과 요약
// ---------------------------------------------------------------------------
console.log('\n--------------------------------------------------------------');
if (failed === 0) {
  console.log(`🎉 모든 검증 항목(${passed}개)을 완벽히 통과했습니다!`);
  console.log('--------------------------------------------------------------');
  process.exit(0);
} else {
  console.error(`🚨 검증 실패: 통과 ${passed}개 / 실패 ${failed}개`);
  console.log('--------------------------------------------------------------');
  process.exit(1);
}
