# 📱 모바일 반응형 UI 설계 기준 및 레이아웃 결함 포스트모템 (`mobile-responsive-spec.md`)

본 문서는 **"조경기능사 실기 수목감별 120"** 단일 페이지 애플리케이션(SPA)의 모바일 반응형 레이아웃 깨짐 장애에 대한 **원인 분석(Root Cause Analysis)**, **전 뷰(5대 탭 + 모달) 반응형 설계 규격**, 그리고 동일한 문제가 재발하지 않도록 구축한 **4중 방어 아키텍처(Defensive CSS · 자동 검증 도구 · CI 배포 게이트 · 개발 규칙)**의 설계 근거를 기록합니다.

---

## 1. 배경 및 목적 (Context & Goal)

- **배경**: 20선 실전 모의고사(`exam`) 탭 및 히어로 액션 버튼 그룹(`.intro-actions`) 추가 이후, 모바일 뷰포트(`360px`~`430px`)에서 상단 내비게이션 우측 탭(`학습 통계`)이 잘리고 히어로 섹션(`.intro`)의 좌측 제목 영역이 약 `100px` 폭으로 압축되며 우측 버튼이 화면 밖으로 돌출되는 레이아웃 붕괴 현상이 발생했습니다.
- **목적**:
  1. 모바일 레이아웃이 깨진 직접적·구조적 원인을 규명하고 전 뷰(`study`, `quiz`, `exam`, `wrong`, `stats` 및 `#detail`, `#quiz-overlay`)의 반응형 UI를 완벽히 복구합니다.
  2. 향후 새로운 기능이나 버튼을 추가하더라도 모바일 화면이 절대 깨지지 않도록 **코드 구조, 자동화 테스트(`tools/verify_ui.js`), CI/CD 배포 차단 게이트**를 체계화합니다.

---

## 2. 장애 포스트모템 및 원인 분석 (Root Cause Analysis)

### 2.1. 직접적 원인 1: `.intro` 가로 Flex 컨테이너와 `.intro-actions` 폭(100%)의 충돌
1. `web/style.css`에서 `.intro`는 데스크톱 기준으로 `display: flex; align-items: center; justify-content: space-between; gap: 24px;`로 선언되어 기본값이 **`flex-direction: row; flex-wrap: nowrap;`** 상태였습니다.
2. 초기 설계 시에는 `.intro` 우측에 작은 단일 버튼(`.intro > .primary`) 하나만 존재했기 때문에, `@media (max-width: 760px)`에서도 `.intro`에 `flex-direction: column`을 지정하지 않고 가로 배치를 유지하고 있었습니다.
3. 이후 실전 모의고사 기능을 도입하면서 `.intro` 내부 우측 요소를 `<div class="intro-actions">`로 변경하여 2개의 버튼(`실전 모의고사 20선`, `랜덤 퀴즈 풀기`)을 배치했고, 기본 스타일에 `flex-shrink: 0`, 모바일 미디어 쿼리에 `.intro-actions { width: 100%; margin-top: 12px; }`를 부여했습니다.
4. **충돌 메커니즘**:
   - 부모 `.intro`가 줄바꿈 없는 가로 배치(`flex-direction: row; flex-wrap: nowrap`)인 상태에서 자식 `.intro-actions`가 `width: 100%; flex-shrink: 0;`을 갖게 되면서, `.intro-actions`가 부모 전체 너비(100%)를 차지한 채 좌측 텍스트 `<div>`의 **오른편에 나란히** 배치되었습니다.
   - 이로 인해 좌측 텍스트 블록(`flex-shrink: 1`)은 최소 폭(~100px, 한 줄에 한글 3~4글자)으로 압축되었고, 우측 `.intro-actions`는 화면 오른쪽 밖으로 밀려 나갔습니다.

### 2.2. 직접적 원인 2: 상단 내비게이션(`header nav`) 5번째 탭 추가에 따른 가용 폭 초과
- 기존 4개 탭(`수목 도감`, `랜덤 퀴즈`, `오답 복습 0`, `학습 통계`)일 때는 모바일 `gap: 16px`, `font-size: 14px` 설정으로 약 `310px`를 차지하여 `375px` 화면에 여유 있게 들어왔습니다.
- 5번째 탭(`실전 모의고사`)이 추가되면서 5개 탭의 필요 너비가 약 `405px`로 증가했고, `360px`~`390px` 모바일 기기에서 마지막 탭인 `학습 통계`가 `학습 통`으로 잘린 채 스크롤바가 숨겨져(`scrollbar-width: none`) 레이아웃이 깨진 것처럼 보였습니다.

### 2.3. 구조적·프로세스적 원인
1. **초기 CSS 단일 행 압축(Minification)과 미디어 쿼리 파편화**:
   - `web/style.css` 상단 1~4행이 한 줄에 최대 4,900자 이상 압축되어 있어, 하단에 새 기능을 추가할 때 상단 3행에 숨어 있던 `.intro` 모바일 규칙(`flex-direction: column` 누락)을 인지하기 어려웠습니다.
2. **방어적 CSS(Defensive CSS) 및 한글 타이포그래피 보호 부재**:
   - `html, body`에 `overflow-x: hidden`이 없고, 한글 제목(`h1`, `h2`, `h3`) 및 설명문에 `word-break: keep-all`이 적용되지 않아 어절 중간에서 글자가 쪼개졌습니다.
3. **모바일 반응형 자동 검증 부재**:
   - 기존 검증 명령이 `node -c web/app.js`와 CSS 중괄호 개수 검사만 수행하여, 모바일 레이아웃 붕괴가 발생한 상태로 GitHub Pages에 배포되었습니다.

---

## 3. 모바일 반응형 설계 기준 및 브레이크포인트 명세 (Responsive Design Specifications)

### 3.1. 표준 브레이크포인트 (Breakpoints)

| 구간 | 미디어 쿼리 조건 | 대상 디바이스 | 그리드 및 레이아웃 전환 규칙 |
|---|---|---|---|
| **Wide Desktop** | `@media (min-width: 1500px)` | 대형 모니터 | `main` 좌우 패딩 `35px` 고정 (`max-width: 1440px`) |
| **Desktop (Default)** | 기본 스타일 (`> 1100px`) | 노트북 / 데스크톱 | 도감 카드 4열(`.grid`), 퀴즈/모의고사/상세모달 2열 분할 |
| **Tablet** | `@media (max-width: 1100px)` / `(max-width: 1024px)` | 태블릿 가로·세로 | 도감 카드 3열, 검색 툴바 줄바꿈(`.range { order: 3; width: 100% }`), 모의고사 워크스페이스(`.exam-workspace`) 1열 전환 |
| **Mobile** | `@media (max-width: 760px)` | 스마트폰 (`360px`~`430px`) | `.intro` 수직 스택(`flex-direction: column`), 상단 5개 탭 균등 배치, 도감 카드 2열, 모든 2열 레이아웃(`.setup`, `.quiz-layout`, `.detail-layout`) 1열 전환 |
| **Compact Mobile** | `@media (max-width: 359px)` | 초소형 기기 (`320px`) | 상단 내비게이션 탭 폰트 `12.5px` 축소 및 터치 가로 스크롤 폴백 |

### 3.2. 방어적 CSS 5대 원칙 (Defensive CSS Rules)
1. **전역 가로 넘침 차단**: `html, body { max-width: 100%; overflow-x: hidden; }`를 항상 유지합니다.
2. **한글 어절 보호 조판**: `h1, h2, h3, .intro p, .study-banner p, .exam-guide-lead, .options-row span`에 `word-break: keep-all; overflow-wrap: break-word;`를 적용하여 단어가 음절 단위로 쪼개지지 않도록 합니다.
3. **Flex/Grid 자식 최소 폭 해제**: 텍스트나 입력창을 감싸는 Flex/Grid 자식 요소(`.intro > div`, `.detail-visual`, `.detail-text`, `.setup-form`, `.question-side`, `.exam-quick-input`, `.sheet-ans-input`)에는 반드시 `min-width: 0`을 부여합니다.
4. **모바일 `.intro` 수직 적재 불변식**: `@media (max-width: 760px)`에서 `.intro`는 항상 `flex-direction: column; align-items: stretch;`를 유지하며, 하단 액션 영역(`.intro-actions`, `.intro > .primary`)만 `width: 100%`를 갖도록 합니다.
5. **단일 행 압축(Minified) CSS 금지**: `web/style.css`의 모든 규칙은 멀티라인으로 작성하며, 단일 행이 `500자`를 초과하지 않도록 관리하여 미디어 쿼리 누락을 방지합니다.

---

## 4. 재발 방지 4중 방어 체계 (4-Layer Prevention Architecture)

1. **1계층 — CSS 구조 정규화 (`web/style.css`)**:
   - 압축되어 있던 베이스 CSS(1~4행)를 멀티라인으로 완전히 풀어 가독성을 확보하고, 모바일 미디어 쿼리 우선순위를 정규화했습니다.
2. **2계층 — 무의존성 통합 검증 스크립트 (`tools/verify_ui.js`)**:
   - 외부 라이브러리 없이 순수 Node.js로 동작하는 `tools/verify_ui.js`를 통해 다음 항목을 자동 검사합니다:
     - `web/app.js`, `web/data.js` JS 문법 및 `web/trees.json` 120종 데이터 무결성
     - `web/index.html` 모바일 `viewport` 메타태그 및 5대 탭 구조
     - `web/style.css` 중괄호 짝 맞춤 및 **단일 행 500자 초과(Minified 방치) 금지**
     - 모바일 반응형 필수 불변식(`overflow-x: hidden`, `word-break: keep-all`, 모바일 `.intro { flex-direction: column }`, 상단 5개 탭 폭 최적화, `.detail-layout`·`.setup`·`.quiz-layout`·`.exam-workspace` 단일 컬럼 전환, 모바일 입력창 `16px` 이상)
3. **3계층 — GitHub Actions CI 배포 차단 게이트 (`.github/workflows/`)**:
   - [`deploy-pages.yml`](../.github/workflows/deploy-pages.yml) 및 [`release.yml`](../.github/workflows/release.yml) 워크플로우에 `node tools/verify_ui.js` 단계를 추가하여, 반응형 불변식이 깨진 코드는 GitHub Pages 배포 및 Release 패키지 생성이 즉시 차단됩니다.
4. **4계층 — 개발 가이드 및 에이전트 지침 의무화 (`AGENTS.md`, `CONTRIBUTING.md`)**:
   - 모든 코드 변경 후 커밋 전 필수 실행 명령으로 `node tools/verify_ui.js`를 등록했습니다.

---

## 5. 변경 이력 (Changelog)

| 일자 | 작성/수정 내용 | 관련 파일 |
|---|---|---|
| 2026-10-27 | 모바일 화면 깨짐 원인 분석(포스트모템), 전 뷰 반응형 복구 명세 및 4중 재발 방지 체계 수립 | `web/style.css`, `tools/verify_ui.js`, `.github/workflows/deploy-pages.yml`, `.github/workflows/release.yml` |
