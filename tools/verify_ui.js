#!/usr/bin/env node
/**
 * tools/verify_ui.js
 *
 * "조경기능사 실기 수목감별 120" Tier-1 통합 아키텍처·데이터·반응형·도메인·문서 무결성 검증 하네스
 * 모든 실패 항목에 대해 자가 치유(Self-Healing Remediation) 지침(💡 [FIX])과
 * 설계 근거 문서(📖 [REF])를 함께 출력하여 에이전트가 즉시 오류를 교정하도록 유도합니다.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const WEB_DIR = path.join(ROOT, 'web');
const DOCS_DIR = path.join(ROOT, 'docs');
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

/**
 * 자가 치유형 실패 리포터 (Self-Healing Remediation Output)
 */
function fail(msg, opts = '') {
  failed++;
  console.error(`  ❌ [FAIL] ${msg}`);
  if (typeof opts === 'string' && opts) {
    console.error(`     └─ 상세: ${opts}`);
  } else if (opts && typeof opts === 'object') {
    if (opts.detail) console.error(`     ├─ 원인: ${opts.detail}`);
    if (opts.fix) console.error(`     ├─ 💡 [FIX]: ${opts.fix}`);
    if (opts.doc) console.error(`     └─ 📖 [REF]: ${opts.doc}`);
  }
}

console.log('==============================================================');
console.log('🌿 수목 120 Agent-First 통합 하네스 검증기 (verify_ui)');
console.log('==============================================================\n');

// ---------------------------------------------------------------------------
// 1. JavaScript 문법, 데이터 동기화(Drift GC) 및 946장 사진 자산 무결성 검증
// ---------------------------------------------------------------------------
console.log('1️⃣  JavaScript 문법 · 데이터 파이프라인 동기화 · 946장 사진 무결성 검증');
try {
  execFileSync(process.execPath, ['-c', APP_JS], { stdio: 'pipe' });
  pass('web/app.js 문법 검증 통과');
} catch (err) {
  fail('web/app.js 문법 오류 발생', {
    detail: err.stderr ? err.stderr.toString().trim() : err.message,
    fix: 'npx eslint web/app.js 명령으로 문법 오류 위치를 확인하고 수정하세요.',
    doc: 'docs/harness-engineering-spec.md'
  });
}

try {
  execFileSync(process.execPath, ['-c', DATA_JS], { stdio: 'pipe' });
  pass('web/data.js 문법 검증 통과');
} catch (err) {
  fail('web/data.js 문법 오류 발생', {
    detail: err.stderr ? err.stderr.toString().trim() : err.message,
    fix: 'python3 tools/build_data.py를 실행하여 web/data.js를 재생성하세요.',
    doc: 'AGENTS.md (5절 데이터 파이프라인 및 빌드 가이드)'
  });
}

let treesFromJson = null;
try {
  treesFromJson = JSON.parse(fs.readFileSync(TREES_JSON, 'utf8'));
  if (Array.isArray(treesFromJson) && treesFromJson.length === 120) {
    pass(`web/trees.json 120종 데이터 확인 (${treesFromJson.length}종)`);
  } else {
    fail('web/trees.json 수목 개수 불일치', {
      detail: `기대값: 120, 실제값: ${Array.isArray(treesFromJson) ? treesFromJson.length : typeof treesFromJson}`,
      fix: 'python3 tools/build_data.py를 실행하여 120종 데이터를 복구하세요.',
      doc: 'AGENTS.md (3.1절 수목 데이터 객체)'
    });
  }
} catch (err) {
  fail('web/trees.json 파싱 실패', {
    detail: err.message,
    fix: 'python3 tools/build_data.py를 실행하여 정규 JSON을 재생성하세요.',
    doc: 'AGENTS.md (5절 데이터 파이프라인 및 빌드 가이드)'
  });
}

// Drift GC: web/trees.json === web/data.js (window.TREES) 깊은 동등성 검사
if (treesFromJson) {
  try {
    const dataSandbox = { window: {} };
    vm.createContext(dataSandbox);
    vm.runInContext(fs.readFileSync(DATA_JS, 'utf8'), dataSandbox);
    const treesFromDataJs = JSON.parse(JSON.stringify(dataSandbox.window.TREES));
    assert.deepStrictEqual(treesFromJson, treesFromDataJs);
    pass('web/trees.json ↔ web/data.js(window.TREES) 100% 동기화 확인 (Drift 없음)');
  } catch (err) {
    fail('web/trees.json과 web/data.js(window.TREES) 간 데이터 불일치(Drift) 감지', {
      detail: err.message.split('\n')[0],
      fix: 'python3 tools/build_data.py를 실행하여 web/data.js 및 학습노트 산출물을 동기화하세요.',
      doc: 'AGENTS.md (10.8절 데이터 동기화 빌드 검증)'
    });
  }

  // 스키마 및 946장 사진 파일 실존 여부 전수 검증
  const requiredFields = [
    'id', 'name', 'start', 'source', 'aliases', 'points', 'caution',
    'images', 'treeworldUrl', 'scientificName', 'family', 'features4',
    'morphology', 'wikiKoUrl', 'wikiEnUrl', 'natureUrl'
  ];
  const validTags = new Set(['잎', '꽃', '열매', '줄기·수형', '겨울눈', '새순', '기타']);
  const schemaErrors = [];
  const missingImages = [];
  let totalPhotoCount = 0;

  treesFromJson.forEach((t, idx) => {
    const expectedId = idx + 1;
    if (t.id !== expectedId) schemaErrors.push(`ID 불일치: 기대값 ${expectedId}, 실제 ${t.id}`);
    for (const field of requiredFields) {
      if (!(field in t)) schemaErrors.push(`${t.id}번(${t.name}) 필수 필드 누락: ${field}`);
    }
    if (!Array.isArray(t.points) || t.points.length !== 3) {
      schemaErrors.push(`${t.id}번(${t.name}) points 개수 오류: ${t.points?.length}`);
    }
    if (!Array.isArray(t.features4) || t.features4.length !== 4) {
      schemaErrors.push(`${t.id}번(${t.name}) features4 개수 오류: ${t.features4?.length}`);
    }
    if (!Array.isArray(t.images) || t.images.length < 4) {
      schemaErrors.push(`${t.id}번(${t.name}) 사진 수 부족: ${t.images?.length}`);
    } else {
      for (const im of t.images) {
        totalPhotoCount++;
        if (!validTags.has(im.tag)) {
          schemaErrors.push(`${t.id}번(${t.name}) 비표준 부위 태그: ${im.tag}`);
        }
        const imgPath = path.join(WEB_DIR, im.src || '');
        if (!im.src || !fs.existsSync(imgPath)) {
          missingImages.push(`web/${im.src} (수목 #${t.id} ${t.name})`);
        }
      }
    }
  });

  if (schemaErrors.length === 0) {
    pass('120종 수목 스키마(필수 필드 16개, 감별포인트 3개, 4대 특징, 5대 부위 태그) 무결성 확인');
  } else {
    fail('수목 데이터 스키마 위반 감지', {
      detail: schemaErrors.slice(0, 3).join('; '),
      fix: 'research/ 원본 데이터를 점검하고 python3 tools/build_data.py를 실행하세요.',
      doc: 'AGENTS.md (3.1절 수목 데이터 객체)'
    });
  }

  if (missingImages.length === 0 && totalPhotoCount >= 900) {
    pass(`수목 실물 도감 사진 전수 실존 확인 (총 ${totalPhotoCount}장 디스크 파일 검증 완료)`);
  } else {
    fail('참조된 수목 도감 사진 파일 누락 또는 수량 이상', {
      detail: missingImages.length ? `누락 파일: ${missingImages.slice(0, 3).join(', ')}` : `사진 수: ${totalPhotoCount}장`,
      fix: 'web/assets/ 내 이미지 파일 존재 여부를 확인하고 python3 tools/build_data.py를 실행하세요.',
      doc: 'AGENTS.md (2절 디렉토리 구조)'
    });
  }
}

// ---------------------------------------------------------------------------
// 2. HTML 필수 메타태그, SPA 구조 및 배포본(web/) 런타임 Zero-Dependency 검증
// ---------------------------------------------------------------------------
console.log('\n2️⃣  HTML 모바일 뷰포트 · SPA 구조 · 배포본(web/) 런타임 Zero-Dependency 검증');
const html = fs.readFileSync(INDEX_HTML, 'utf8');
const css = fs.readFileSync(STYLE_CSS, 'utf8');

if (html.includes('name="viewport"') && html.includes('width=device-width') && html.includes('viewport-fit=cover')) {
  pass('모바일 viewport 메타태그(width=device-width, viewport-fit=cover) 확인');
} else {
  fail('index.html에 모바일 viewport 메타태그가 누락되었거나 불완전합니다.', {
    fix: 'web/index.html <head>에 <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">를 유지하세요.',
    doc: 'docs/mobile-responsive-spec.md'
  });
}

const navButtons = [...html.matchAll(/data-nav="([^"]+)"/g)].map(m => m[1]);
const expectedNavs = ['study', 'quiz', 'exam', 'wrong', 'stats'];
if (JSON.stringify(navButtons) === JSON.stringify(expectedNavs)) {
  pass(`상단 내비게이션 5대 탭 구조 확인 (${navButtons.join(', ')})`);
} else {
  fail('상단 내비게이션 탭 구성 불일치', {
    detail: `현재 탭: ${navButtons.join(', ')}`,
    fix: 'web/index.html의 header nav 내 5개 버튼(study, quiz, exam, wrong, stats) 구성을 복구하세요.',
    doc: 'docs/spa-usability-spec.md'
  });
}

if (html.includes('class="skip-link"') && html.includes('aria-current="page"') && html.includes('id="route-announcer"')) {
  pass('SPA 접근성 마크업(.skip-link, aria-current="page", #route-announcer) 확인');
} else {
  fail('index.html에 SPA 접근성 마크업(.skip-link, aria-current="page", #route-announcer) 중 일부가 누락되었습니다.', {
    fix: 'web/index.html에 스킵 링크와 #route-announcer(aria-live="polite")를 유지하세요.',
    doc: 'docs/spa-usability-spec.md (원칙 2)'
  });
}

// 배포 결과물(web/) Runtime Zero-Dependency 가드
const hasExternalScriptOrCss = /<(script|link)\b[^>]*(src|href)\s*=\s*["']https?:\/\//i.test(html);
const hasExternalCssImport = /@import\s+(url\()?["']?https?:\/\//i.test(css);
const hasNodeModulesInWeb = fs.existsSync(path.join(WEB_DIR, 'node_modules')) || fs.existsSync(path.join(WEB_DIR, 'package.json'));

if (!hasExternalScriptOrCss && !hasExternalCssImport && !hasNodeModulesInWeb) {
  pass('배포 결과물(web/) 100% Runtime Zero-Dependency & Offline-First 격리 확인');
} else {
  fail('배포 결과물(web/) 내부에 외부 런타임 CDN 또는 패키지 파일이 감지되었습니다.', {
    detail: `externalHtml=${hasExternalScriptOrCss}, externalCss=${hasExternalCssImport}, webPkg=${hasNodeModulesInWeb}`,
    fix: 'web/ 내부에서는 외부 http/https 스크립트·폰트·스타일시트 및 package.json을 제거하여 오프라인 독립 실행을 보장하세요.',
    doc: 'docs/harness-engineering-spec.md (1.2절 결과물 Zero-Dependency 원칙)'
  });
}

// ---------------------------------------------------------------------------
// 3. CSS 구문, 가독성(Minified 방지) 및 중괄호 검증
// ---------------------------------------------------------------------------
console.log('\n3️⃣  CSS 문법 및 코드 가독성(단일 행 압축 금지) 검증');
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
  fail('web/style.css 중괄호 불일치 오류', {
    detail: braceError,
    fix: 'npx stylelint "web/**/*.css" 명령으로 중괄호 오류 위치를 확인하세요.',
    doc: 'docs/mobile-responsive-spec.md'
  });
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
  fail(`web/style.css에 ${MAX_LINE_LEN}자를 초과하는 압축(Minified) 라인이 존재합니다.`, {
    detail: `해당 행: ${overlyLongLines.join(', ')}`,
    fix: '유지보수 및 미디어 쿼리 누락 방지를 위해 해당 CSS 라인을 멀티라인으로 포맷팅하세요.',
    doc: 'docs/mobile-responsive-spec.md (3.2절 방어적 CSS 5대 원칙)'
  });
}

// ---------------------------------------------------------------------------
// 4. 모바일 반응형 핵심 CSS 불변식(Invariants) 정적 분석
// ---------------------------------------------------------------------------
console.log('\n4️⃣  모바일 반응형 핵심 CSS 불변식(Invariants) 검증');

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

if (/overflow-x\s*:\s*hidden/.test(css)) {
  pass('전역 가로 넘침 방지(html, body { overflow-x: hidden }) 적용 확인');
} else {
  fail('전역 overflow-x: hidden 규칙이 누락되었습니다.', {
    fix: 'web/style.css의 html, body 규칙에 overflow-x: hidden; max-width: 100%;를 추가하세요.',
    doc: 'docs/mobile-responsive-spec.md (3.2절)'
  });
}

if (/word-break\s*:\s*keep-all/.test(css)) {
  pass('한글 어절 보호(word-break: keep-all) 타이포그래피 규칙 확인');
} else {
  fail('word-break: keep-all 규칙이 누락되어 한글 제목이 음절 단위로 쪼개질 수 있습니다.', {
    fix: 'web/style.css 제목 및 본문 셀렉터에 word-break: keep-all; overflow-wrap: break-word;를 적용하세요.',
    doc: 'docs/mobile-responsive-spec.md (3.2절)'
  });
}

const introInMobileMatch = mobile760Css.match(/\.intro\s*\{([^}]+)\}/);
if (introInMobileMatch && /flex-direction\s*:\s*column/.test(introInMobileMatch[1])) {
  pass('모바일(@media max-width: 760px) .intro { flex-direction: column } 수직 스택 확인');
} else {
  fail('모바일(@media max-width: 760px)에서 .intro에 flex-direction: column이 없습니다!', {
    detail: '.intro-actions(width: 100%)와 좌측 제목 블록이 가로로 충돌하여 화면이 깨집니다.',
    fix: '@media (max-width: 760px) 내부의 .intro 규칙에 flex-direction: column; align-items: stretch;를 지정하세요.',
    doc: 'docs/mobile-responsive-spec.md (2.1절 원인 분석)'
  });
}

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
  fail('모바일 .intro-actions 또는 내부 버튼의 반응형 폭 설정이 누락되었습니다.', {
    fix: '@media (max-width: 760px)에서 .intro-actions { width: 100% } 및 .intro-actions button { flex: 1; min-width: 0 }을 유지하세요.',
    doc: 'docs/mobile-responsive-spec.md (3.2절)'
  });
}

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
  fail('모바일 상단 nav 5개 탭 폭 최적화 스타일이 누락되어 우측 탭이 잘릴 수 있습니다.', {
    fix: '@media (max-width: 760px)에서 nav { justify-content: space-between; gap: 6px; } 및 nav button { font-size: 13.5px; }을 유지하세요.',
    doc: 'docs/mobile-responsive-spec.md (2.2절)'
  });
}

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
    fail(`${target.name}의 모바일/태블릿 단일 컬럼(grid-template-columns: 1fr) 규칙이 누락되었습니다.`, {
      fix: `web/style.css의 모바일/태블릿 미디어쿼리에서 ${target.name} { grid-template-columns: 1fr; }을 지정하세요.`,
      doc: 'docs/mobile-responsive-spec.md (3.1절 브레이크포인트)'
    });
  }
}

const projMatch = css.match(/\.exam-projector\s*\{([^}]+)\}/);
const sheetMatch = css.match(/\.exam-answer-sheet\s*\{([^}]+)\}/);
if (projMatch && /min-width\s*:\s*0/.test(projMatch[1]) && sheetMatch && /min-width\s*:\s*0/.test(sheetMatch[1])) {
  pass('.exam-projector 및 .exam-answer-sheet에 min-width: 0 적용 확인 (그리드 가로 팽창 방지)');
} else {
  fail('.exam-projector 또는 .exam-answer-sheet에 min-width: 0이 누락되어 모바일 화면을 초과할 수 있습니다.', {
    fix: 'web/style.css의 .exam-projector 및 .exam-answer-sheet에 min-width: 0;을 추가하세요.',
    doc: 'docs/mobile-responsive-spec.md (3.2절)'
  });
}

const desktopCollage3Idx = css.indexOf('grid-template-columns: repeat(3, 1fr)');
const mobileCollage2Idx = css.lastIndexOf('.photo-collage-grid.count-9');
if (desktopCollage3Idx !== -1 && mobileCollage2Idx > desktopCollage3Idx) {
  pass('상세 모달 .photo-collage-grid 모바일 2열 미디어쿼리가 데스크톱 3열 규칙 이후에 선언됨 확인');
} else {
  fail('상세 모달 .photo-collage-grid 모바일 미디어쿼리가 데스크톱 규칙보다 앞에 있어 덮어써집니다.', {
    fix: 'web/style.css에서 .photo-collage-grid 모바일 2열 오버라이드 규칙을 데스크톱 3열 규칙 하단에 배치하세요.',
    doc: 'docs/mobile-responsive-spec.md'
  });
}

const mobileSearchInputMatch = mobile760Css.match(/\.search\s+input\s*\{([^}]+)\}/);
if (mobileSearchInputMatch && /font-size\s*:\s*16px/.test(mobileSearchInputMatch[1])) {
  pass('모바일 검색창(.search input) font-size: 16px 확인 (iOS 자동 줌 방지)');
} else {
  fail('모바일 .search input의 font-size: 16px 규칙이 누락되었습니다.', {
    fix: '@media (max-width: 760px)에서 .search input { font-size: 16px; }을 지정하세요.',
    doc: 'AGENTS.md (4.4절 모바일 반응형 규칙)'
  });
}

if (/Apple SD Gothic Neo/.test(css) && /Malgun Gothic/.test(css)) {
  pass('오프라인 대비 한국어 네이티브 시스템 폰트 폴백(Apple SD Gothic Neo, Malgun Gothic) 확인');
} else {
  fail('style.css :root에 한국어 오프라인 시스템 폰트 폴백 스택이 누락되었습니다.', {
    fix: 'web/style.css :root의 font-family에 Apple SD Gothic Neo, Malgun Gothic을 포함하세요.',
    doc: 'docs/spa-usability-spec.md (3.5절)'
  });
}

// ---------------------------------------------------------------------------
// 5 & 6. SPA 5대 뷰 전환 · 해시 라우팅 · 도메인 불변식(Zero-Hint & 엄격 채점) 시뮬레이션
// ---------------------------------------------------------------------------
console.log('\n5️⃣  SPA 5대 뷰 전환 · 해시 라우팅 · 세션 가드 시뮬레이션 검증');
try {
  const mainEl = { innerHTML: '', querySelector: () => createStubEl(), querySelectorAll: () => [] };
  const detailContentEl = { innerHTML: '' };
  const routeAnnouncerEl = { textContent: '' };
  const bodyChildren = [];
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
      value: '',
      textContent: '',
      innerHTML: '',
      hidden: false,
      disabled: false,
      style: {},
      dataset: {},
      classList: { toggle() {}, add() {}, remove() {} },
      addEventListener() {},
      setAttribute() {},
      removeAttribute() {},
      focus() {},
      select() {},
      scrollIntoView() {},
      remove() {},
      getAttribute: () => '',
      querySelector: () => createStubEl(),
      querySelectorAll: () => []
    };
  }

  const navBtns = expectedNavs.map(nav => {
    const attrs = {};
    return {
      dataset: { nav },
      classList: { toggle() {} },
      setAttribute(k, v) { attrs[k] = v; },
      removeAttribute(k) { delete attrs[k]; },
      getAttribute(k) { return attrs[k] || null; },
      onclick: null
    };
  });

  const historyStack = [];
  const locationObj = { hash: '' };
  let activeIntervals = 0;

  const sandbox = {
    window: {
      TREES: null,
      innerWidth: 375,
      innerHeight: 812,
      scrollY: 0,
      location: locationObj,
      history: {
        pushState(state, _, hash) {
          locationObj.hash = hash;
          historyStack.push({ mode: 'push', hash, state });
        },
        replaceState(state, _, hash) {
          locationObj.hash = hash;
          historyStack.push({ mode: 'replace', hash, state });
        }
      },
      scrollTo() {},
      addEventListener() {},
      removeEventListener() {}
    },
    localStorage: {
      getItem: () => null,
      setItem() {}
    },
    document: {
      title: '',
      activeElement: null,
      body: {
        appendChild(el) {
          bodyChildren.push(el);
        }
      },
      createElement: () => {
        const el = {
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
          remove() {
            const idx = bodyChildren.indexOf(el);
            if (idx !== -1) bodyChildren.splice(idx, 1);
          }
        };
        return el;
      },
      querySelector(sel) {
        if (sel === '#main') return mainEl;
        if (sel === '#detail') return dialogEl;
        if (sel === '#detail-content') return detailContentEl;
        if (sel === '#route-announcer') return routeAnnouncerEl;
        if (sel === '#quiz-overlay') return bodyChildren.find(c => c.id === 'quiz-overlay') || null;
        if (sel === '#confetti-canvas') return bodyChildren.find(c => c.id === 'confetti-canvas') || null;
        return createStubEl();
      },
      querySelectorAll(sel) {
        if (sel === '[data-nav]') return navBtns;
        return [];
      }
    },
    confirm: () => true,
    setTimeout: () => 1,
    clearTimeout() {},
    setInterval: () => {
      activeIntervals++;
      return activeIntervals;
    },
    clearInterval: () => {
      activeIntervals = Math.max(0, activeIntervals - 1);
    },
    requestAnimationFrame: () => 1,
    cancelAnimationFrame() {},
    console
  };

  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(DATA_JS, 'utf8'), sandbox);
  vm.runInContext(fs.readFileSync(APP_JS, 'utf8'), sandbox);

  if (
    mainEl.innerHTML.includes('class="intro"') &&
    mainEl.innerHTML.includes('class="intro-actions"') &&
    mainEl.innerHTML.includes('id="clear-search"') &&
    mainEl.innerHTML.includes('class="grid"')
  ) {
    pass('수목 도감(study) 뷰 초기 렌더링 및 #clear-search 마크업 확인');
  } else {
    fail('수목 도감(study) 뷰 마크업이 정상 생성되지 않았습니다.', {
      fix: 'web/app.js의 renderStudy() 함수를 점검하세요.',
      doc: 'docs/spa-usability-spec.md'
    });
  }

  const viewChecks = [
    { nav: 'quiz', expected: 'class="setup"', hash: '#quiz' },
    { nav: 'exam', expected: 'class="setup exam-setup"', hash: '#exam' },
    { nav: 'wrong', expected: 'REVIEW YOUR MISTAKES', hash: '#wrong' },
    { nav: 'stats', expected: 'class="stats-container"', hash: '#stats' }
  ];

  for (const vc of viewChecks) {
    sandbox.navigate(vc.nav);
    const activeBtn = navBtns.find(b => b.dataset.nav === vc.nav);
    if (
      mainEl.innerHTML.includes(vc.expected) &&
      locationObj.hash === vc.hash &&
      activeBtn.getAttribute('aria-current') === 'page' &&
      sandbox.document.title.includes('수목 120')
    ) {
      pass(`뷰 라우팅(${vc.nav}) 렌더링 및 해시(${vc.hash})·타이틀·aria-current 동기화 성공`);
    } else {
      fail(`뷰 라우팅(${vc.nav}) 또는 SPA 상태 동기화 실패`, {
        detail: `hash=${locationObj.hash}, title=${sandbox.document.title}`,
        fix: 'web/app.js의 navigate() 함수에서 해시, document.title, aria-current 갱신 로직을 확인하세요.',
        doc: 'docs/spa-usability-spec.md (원칙 1, 2)'
      });
    }
  }

  sandbox.showDetail(1);
  const firstModalHistory = historyStack[historyStack.length - 1];
  sandbox.showDetail(2);
  const secondModalHistory = historyStack[historyStack.length - 1];
  if (
    detailContentEl.innerHTML.includes('class="detail-layout"') &&
    dialogEl.open &&
    firstModalHistory.hash === '#tree-001' &&
    firstModalHistory.mode === 'push' &&
    secondModalHistory.hash === '#tree-002' &&
    secondModalHistory.mode === 'replace'
  ) {
    pass('수목 상세 모달(showDetail) #tree-001 pushState 및 연속 탐색 replaceState 확인');
  } else {
    fail('수목 상세 모달(showDetail) 히스토리 동기화 실패', {
      fix: 'web/app.js의 showDetail()에서 !wasOpen일 때 pushState, wasOpen일 때 replaceState를 호출하도록 유지하세요.',
      doc: 'docs/spa-usability-spec.md (3.2절)'
    });
  }

  // -------------------------------------------------------------------------
  // 6. 핵심 도메인 불변식 시뮬레이션 (Zero-Hint 스포일러 차단 · 엄격 채점 · 메모리 정리)
  // -------------------------------------------------------------------------
  console.log('\n6️⃣  도메인 핵심 불변식 (Zero-Hint 스포일러 방지 · 표준명 채점 · 타이머 정리) 검증');

  // 6-1) 랜덤 퀴즈(주관식 typing 모드) Zero-Hint 및 별칭(해송 -> 곰솔) 정답 인정 검증
  const gomsol = sandbox.window.TREES.find(t => t.id === 11); // 11번 곰솔 (별칭: 해송)
  sandbox.startQuiz([gomsol], 1, 'typing', '테스트');
  const quizHtml = mainEl.innerHTML;
  const quizHasSpoiler =
    quizHtml.includes(gomsol.name) ||
    quizHtml.includes(gomsol.scientificName) ||
    quizHtml.includes(gomsol.points[0]);

  if (!quizHasSpoiler && quizHtml.includes('class="quiz-photos-grid')) {
    pass('랜덤 퀴즈(startQuiz) 풀이 화면 Zero-Hint 확인 (수목명·학명·감별포인트 미노출)');
  } else {
    fail('랜덤 퀴즈 풀이 화면에 정답 스포일러 텍스트가 노출되었습니다!', {
      fix: 'web/app.js의 renderQuestion()에서 학명, 과명, 감별포인트 텍스트 노출을 제거하세요.',
      doc: 'AGENTS.md (4.2절 퀴즈 풀이 화면 규칙)'
    });
  }

  // 퀴즈 주관식에서 별칭('해송') 입력 시 정답 처리 및 오버레이 생성 확인
  sandbox.grade('해송');
  const quizOverlayEl = bodyChildren.find(c => c.id === 'quiz-overlay');
  const quizState = vm.runInContext('quiz', sandbox);
  if (quizState.answers[0]?.correct === true && quizOverlayEl && quizOverlayEl.innerHTML.includes('정답입니다!')) {
    pass('랜덤 퀴즈 주관식 별칭(해송 → 곰솔) 정답 인정 및 #quiz-overlay 생성 확인');
  } else {
    fail('랜덤 퀴즈 주관식 별칭 채점 또는 결과 오버레이 생성 실패', {
      fix: 'web/app.js의 grade() 및 showQuizFeedbackOverlay() 로직을 확인하세요.',
      doc: 'AGENTS.md (4.3절 퀴즈 결과 오버레이 규칙)'
    });
  }

  // 6-2) 실전 모의고사(startExam) Zero-Hint 및 표준명 엄격 채점 검증
  sandbox.startExam('all', 4, true);
  const examStageHtml = mainEl.innerHTML;
  const currentExamTree = vm.runInContext('exam.questions[0].tree', sandbox);
  const examHasSpoiler =
    examStageHtml.includes(currentExamTree.name) ||
    examStageHtml.includes(currentExamTree.scientificName) ||
    examStageHtml.includes('quiz-photo-badge');

  if (
    examStageHtml.includes('class="exam-workspace"') &&
    examStageHtml.includes('class="exam-answer-sheet"') &&
    !examHasSpoiler &&
    sandbox.isSessionBusy() === true
  ) {
    pass('20선 실전 모의고사(startExam) Zero-Hint(수목명·학명·부위배지 완전 배제) 및 세션 가드 확인');
  } else {
    fail('20선 실전 모의고사 Zero-Hint 위반 또는 세션 가드 실패', {
      fix: 'web/app.js의 renderExamStage()에서 부위 배지 및 수목 정보가 노출되지 않도록 유지하세요.',
      doc: 'docs/exam-simulation-spec.md (2.2절 무힌트 원칙)'
    });
  }

  // 모의고사 표준명('곰솔' -> 정답 +0.5점) vs 별칭('해송' -> 오답 0점 + 표준수종 명칭 주의 안내) 검증
  vm.runInContext(`
    exam.questions[1].tree = window.TREES.find(t => t.id === 11); // 곰솔 (별칭: 해송)
    exam.questions[2].tree = window.TREES.find(t => t.id === 11);
    exam.userAnswers[1] = '곰솔';
    exam.userAnswers[2] = '해송';
    submitExam(false);
  `, sandbox);

  const examResultHtml = mainEl.innerHTML;
  const lastHistoryRecord = vm.runInContext('quizHistory[0]', sandbox);

  if (
    lastHistoryRecord &&
    lastHistoryRecord.correct === 1 &&
    examResultHtml.includes('0.5<small> / 10.0점</small>') &&
    examResultHtml.includes('표준수종 명칭 주의 안내') &&
    examResultHtml.includes('res-alias-tag')
  ) {
    pass('실전 모의고사 표준명 엄격 채점 확인 (정식명 "곰솔" 0.5점 정답 / 별칭 "해송" 0점 오답 및 주의 안내)');
  } else {
    fail('실전 모의고사 표준수종 엄격 채점 규칙 위반', {
      detail: `correct=${lastHistoryRecord?.correct}, mode=${lastHistoryRecord?.mode}`,
      fix: 'web/app.js의 submitExam()에서 tree.name만 정답(0.5점) 처리하고 tree.aliases는 isAlias 오답으로 처리하세요.',
      doc: 'docs/exam-simulation-spec.md (2.4절 표준수종 명칭 엄격 채점)'
    });
  }

  // 6-3) 뷰 전환 시 타이머 및 오버레이 메모리 정리(Cleanup) 불변식 검증
  sandbox.startExam('all', 4, true);
  sandbox.navigate('study', { skipGuard: true });
  const timerAfterNav = vm.runInContext('examTimerId', sandbox);
  const overlayAfterNav = bodyChildren.find(c => c.id === 'quiz-overlay');
  if (timerAfterNav === null && !overlayAfterNav && activeIntervals === 0) {
    pass('뷰 전환(navigate) 시 모의고사 타이머(cleanupExamTimer) 및 오버레이(cleanupQuizOverlay) 자동 해제 확인');
  } else {
    fail('뷰 전환 후 잔여 타이머 또는 오버레이가 해제되지 않았습니다.', {
      detail: `examTimerId=${timerAfterNav}, activeIntervals=${activeIntervals}`,
      fix: 'web/app.js의 navigate() 진입 시 cleanupQuizOverlay()와 cleanupExamTimer()가 반드시 호출되도록 하세요.',
      doc: 'AGENTS.md (10.3절 메모리 정리)'
    });
  }
} catch (err) {
  fail('SPA 런타임 시뮬레이션 중 예외 발생', {
    detail: err.stack || err.message,
    fix: 'web/app.js의 런타임 예외 발생 지점을 수정하세요.',
    doc: 'docs/harness-engineering-spec.md'
  });
}

// ---------------------------------------------------------------------------
// 7. 문서 정합성(System of Record) · 마크다운 링크 무결성 · Git 바이너리 가드
// ---------------------------------------------------------------------------
console.log('\n7️⃣  문서 정합성(docs/ 인덱스 & 로컬 링크) 및 Git 바이너리 가드 검증');

// 7-1) docs/ 내 모든 .md 파일이 docs/README.md 인덱스에 등록되어 있는지 확인
const docsReadme = fs.readFileSync(path.join(DOCS_DIR, 'README.md'), 'utf8');
const docFiles = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith('.md') && f !== 'README.md');
const unindexedDocs = docFiles.filter(f => !docsReadme.includes(f));

if (unindexedDocs.length === 0) {
  pass(`docs/ 설계 및 학습 문서 전수 인덱스 등록 확인 (${docFiles.length}개 문서)`);
} else {
  fail('docs/README.md 인덱스에 등록되지 않은 문서가 존재합니다.', {
    detail: `미등록 문서: ${unindexedDocs.join(', ')}`,
    fix: 'docs/README.md의 문서 목록(Index) 표에 새 문서를 추가하세요.',
    doc: 'docs/README.md (문서화 원칙)'
  });
}

// 7-2) 핵심 마크다운 문서의 로컬 파일 링크 무결성 검증
const mdTargets = [
  path.join(ROOT, 'README.md'),
  path.join(ROOT, 'AGENTS.md'),
  path.join(ROOT, 'CONTRIBUTING.md'),
  ...fs.readdirSync(DOCS_DIR).filter(f => f.endsWith('.md')).map(f => path.join(DOCS_DIR, f))
];

const brokenLinks = [];
const mdLinkRegex = /\[[^\]]*\]\(([^)]+)\)/g;

for (const mdFile of mdTargets) {
  const content = fs.readFileSync(mdFile, 'utf8');
  const baseDir = path.dirname(mdFile);
  let match;
  while ((match = mdLinkRegex.exec(content)) !== null) {
    const rawTarget = match[1].trim().split(/\s+/)[0];
    if (
      !rawTarget ||
      rawTarget.startsWith('http://') ||
      rawTarget.startsWith('https://') ||
      rawTarget.startsWith('mailto:') ||
      rawTarget.startsWith('#') ||
      rawTarget.startsWith('file://') ||
      rawTarget.startsWith('conversation://')
    ) {
      continue;
    }
    const cleanRel = rawTarget.split('#')[0];
    if (!cleanRel) continue;
    // GitHub repo relative UI paths like ../../releases
    if (cleanRel === '../../releases') continue;

    const resolvedPath = path.resolve(baseDir, cleanRel);
    if (!fs.existsSync(resolvedPath)) {
      brokenLinks.push(`${path.relative(ROOT, mdFile)} -> ${rawTarget}`);
    }
  }
}

if (brokenLinks.length === 0) {
  pass(`마크다운 문서(${mdTargets.length}개) 내 모든 로컬 파일·이미지 링크 무결성 확인`);
} else {
  fail('마크다운 문서 내에 존재하지 않는 로컬 파일 링크가 있습니다.', {
    detail: brokenLinks.slice(0, 5).join(', '),
    fix: '깨진 상대 경로 링크를 실제 파일 경로에 맞게 수정하세요.',
    doc: 'docs/harness-engineering-spec.md (4절 문서 정합성)'
  });
}

// 7-3) Git 추적 목록 내 대용량 산출물(dist/, *.zip, node_modules/) 유입 차단 검사
try {
  const trackedFiles = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
  const forbiddenTracked = trackedFiles.filter(f =>
    f.startsWith('dist/') ||
    f.startsWith('node_modules/') ||
    f.startsWith('research/frames/') ||
    f.endsWith('.zip') ||
    f.endsWith('.tar.gz')
  );
  if (forbiddenTracked.length === 0) {
    pass('Git 추적 목록 내 금지된 대용량/빌드 파일(dist/, *.zip, node_modules/) 없음 확인');
  } else {
    fail('Git 추적 목록에 금지된 대용량 파일 또는 의존성 폴더가 포함되어 있습니다!', {
      detail: forbiddenTracked.slice(0, 5).join(', '),
      fix: 'git rm -r --cached <파일경로> 명령으로 Git 추적을 해제하세요.',
      doc: 'AGENTS.md (10.5절 대용량 바이너리 Git 커밋 금지)'
    });
  }
} catch {
  // Git 저장소가 아닌 환경에서는 건너뜀
}

// ---------------------------------------------------------------------------
// 최종 결과 요약
// ---------------------------------------------------------------------------
console.log('\n--------------------------------------------------------------');
if (failed === 0) {
  console.log(`🎉 모든 하네스 검증 항목(${passed}개)을 완벽히 통과했습니다!`);
  console.log('--------------------------------------------------------------');
  process.exit(0);
} else {
  console.error(`🚨 하네스 검증 실패: 통과 ${passed}개 / 실패 ${failed}개`);
  console.error('   위 💡 [FIX] 안내에 따라 문제를 수정한 뒤 다시 실행하세요.');
  console.log('--------------------------------------------------------------');
  process.exit(1);
}
