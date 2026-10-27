# 🧭 모던 SPA 핵심 사용성 원칙 및 아키텍처 설계 명세 (`spa-usability-spec.md`)

본 문서는 **"조경기능사 실기 수목감별 120"** 단일 페이지 애플리케이션(SPA)이 네이티브 앱 수준의 조작성과 웹 표준 접근성·안정성을 동시에 달성하기 위해 수립한 **모던 SPA 6대 핵심 사용성 원칙(Core SPA Usability Principles)** 조사 결과와 기술적 설계 결정(Architecture Decision Record)을 기록합니다.

---

## 1. 배경 및 목적 (Context & Goal)

- **배경**:
  - SPA는 전체 HTML 문서를 다시 로드하지 않고 자바스크립트로 뷰(`#main`)와 다이얼로그(`#detail`)를 동적 교체하므로 화면 전환 속도가 매우 빠릅니다.
  - 그러나 브라우저가 전통적인 다중 페이지 웹(MPA)에서 기본 제공하던 **URL 주소 동기화, 뒤로 가기/앞으로 가기 히스토리 스택, 탭 제목(`document.title`) 갱신, 포커스 및 스크롤 위치 복원, 작성 중인 폼 이탈 경고**가 자동으로 작동하지 않는 구조적 특성이 있습니다.
- **목적**:
  1. W3C WAI-ARIA, WHATWG HTML History API 표준, Nielsen Norman Group(NN/g) 및 Google `web.dev`의 SPA UX 원칙을 조사하여 6대 핵심 사용성 기준으로 정립합니다.
  2. 외부 라우터 라이브러리 없이 **Zero-Dependency & Offline-First** 철학을 보존하면서 6대 사용성 원칙을 완벽히 충족하는 바닐라 JS 아키텍처를 구현합니다.

---

## 2. 모던 SPA 6대 핵심 사용성 원칙 조사 결과 (Domain Research & References)

| 원칙 번호 | 핵심 사용성 원칙 | 표준 근거 및 사용자 기대 행동 | 미적용 시 발생하는 대표적 UX 결함 |
|---|---|---|---|
| **원칙 1** | **URL·히스토리 양방향 동기화 및 딥링크**<br>*(URL Sync, History API & Deep Linking)* | WHATWG HTML History API (`pushState`, `replaceState`, `popstate`) | 모바일에서 '뒤로 가기' 제스처 시 이전 화면이나 모달이 닫히지 않고 **웹앱 전체에서 즉시 이탈**함. 새로고침(`F5`) 시 항상 첫 화면으로 초기화됨 |
| **원칙 2** | **동적 문서 제목 및 접근성 맥락 전환**<br>*(Dynamic Title, ARIA Current & Focus)* | WCAG 2.1 SC 2.4.2 (Page Titled), WAI-ARIA `aria-current="page"`, `aria-live` | 모든 화면의 브라우저 탭 제목이 동일하고, 모달을 닫았을 때 열었던 수목 카드로 키보드 포커스가 복귀하지 않음 |
| **원칙 3** | **진행 중 학습/시험 세션 이탈 보호**<br>*(Unsaved Session & Navigation Guard)* | NN/g Error Prevention Heuristic (실수 방지 원칙), `beforeunload` | 20문항 실전 모의고사나 퀴즈 풀이 도중 실수로 상단 내비게이션 탭을 클릭하거나 새로고침하면 **작성 중이던 답안이 경고 없이 증발**함 |
| **원칙 4** | **스크롤 복원 및 검색/필터 즉시 초기화**<br>*(Scroll Restoration & Filter Reset)* | NN/g User Control and Freedom, State Persistence | 120종 도감 스크롤 탐색 중 다른 탭을 다녀오면 맨 위로 초기화됨. 검색어 원클릭 삭제(`×`) 및 빈 결과 초기화 수단 부재 |
| **원칙 5** | **전 뷰 키보드 단축키 일관성**<br>*(Keyboard-First Ergonomics)* | W3C Keyboard Accessible (WCAG 2.1.1) | 정답 오버레이는 `Enter`로 넘어가지만 정작 4지선다 문제에서는 마우스 클릭이 강제되어 키보드 학습 흐름(Flow)이 끊김 |
| **원칙 6** | **체감 성능(프리로드) 및 오프라인 복원력**<br>*(Preloading & Offline Resilience)* | Core Web Vitals (LCP / INP), Offline-First Design | 2~4초 단위로 전환되는 모의고사/퀴즈에서 다음 문제 사진 로딩 지연 발생 가능. 연속 토스트 알림 시 이전 타이머가 새 알림을 조기 종료시킴 |

---

## 3. 설계 결정 및 구현 매핑 (Design Decisions & Implementation Mapping)

### 3.1. 왜 Path 라우팅(`/quiz`)이 아닌 Hash 라우팅(`#quiz`, `#tree-001`)인가?
- 본 프로젝트는 GitHub Pages(`https://unizune.github.io/tree120/`) 온라인 배포뿐만 아니라, 인터넷이 없는 환경에서 압축을 풀어 `index.html`을 직접 여는 **`file://` 프로토콜 및 로컬 내장 서버(`python3 -m http.server`)** 환경을 모두 100% 지원해야 합니다.
- Path 기반 History API(`/tree/1`)는 서버 측 Rewrite 설정이 없으면 새로고침 시 `404 File Not Found`를 발생시키고 `file://` 환경에서 동작하지 않습니다.
- 따라서 모든 실행 환경에서 서버 설정 없이 100% 동작하는 **해시 라우팅(`#study`, `#quiz`, `#exam`, `#wrong`, `#stats`, `#tree-001`~`#tree-120`)**을 채택하고, `history.pushState` / `replaceState`와 결합했습니다.

### 3.2. 상세 모달(`#detail`)의 `pushState` vs `replaceState` 하이브리드 전략
- **문제 상황**: 사용자가 도감 목록(`#study`)에서 `001. 가막살나무`를 클릭해 모달을 연 뒤, 모달 내부의 `→` 버튼으로 `002` → `003` → ... → `015`까지 15개의 수목을 연속 탐색했다고 가정합니다. 만약 매 수목 이동마다 `pushState`를 호출하면, 사용자가 모달을 닫기 위해 브라우저 '뒤로 가기'를 눌렀을 때 **15번을 연속으로 뒤로 가야만** 목록으로 돌아갈 수 있는 심각한 히스토리 오염(History Pollution)이 발생합니다.
- **해결 설계**:
  1. 목록에서 모달을 **최초로 열 때(`!wasOpen`)**만 `history.pushState(..., '#tree-001')`를 호출하여 히스토리 엔트리를 1개 생성합니다.
  2. 모달이 이미 열린 상태에서 **이전/다음 수목이나 드롭다운으로 이동할 때(`wasOpen`)**는 `history.replaceState(..., '#tree-002')`로 현재 모달 히스토리 엔트리를 덮어씁니다.
  3. 결과적으로 사용자는 모달 안에서 몇 개의 수목을 탐색하든 **모바일/브라우저 '뒤로 가기' 단 한 번으로 즉시 모달을 닫고 목록으로 복귀**할 수 있으며, 닫힌 시점에 마지막으로 보던 수목 카드(`[data-tree="${closedTreeId}"]`)로 포커스와 스크롤 위치가 자동 동기화됩니다.

### 3.3. 진행 중 학습/시험 세션 보호 가드 (`isSessionBusy`)
- 다음 두 조건 중 하나에 해당할 때 세션을 **활성 상태(`isSessionBusy() === true`)**로 판정합니다:
  1. **실전 모의고사 진행 중**: `view === 'exam' && exam && exam.phase !== 'done'`
  2. **랜덤 퀴즈 풀이 진행 중**: `view === 'quiz' && quiz && !quiz.recorded && quiz.answers.length > 0 && quiz.index < quiz.questions.length`
- 활성 상태에서 다른 상단 탭이나 브랜드 로고를 클릭하면 `confirmNavigationIfBusy()`가 확인 대화상자를 표시하며, 브라우저 새로고침/닫기 시에는 `beforeunload` 이벤트가 발동하여 답안 증발 사고를 예방합니다.

### 3.4. 전 뷰 키보드 단축키 매핑표

| 화면 / 컨텍스트 | 입력 키 | 동작 설명 |
|---|---|---|
| **전역 (키보드 탐색)** | `Tab` (초기 진입) | 상단 좌측 `.skip-link`(`본문 바로가기`) 노출 → `Enter` 시 헤더를 건너뛰고 `#main`으로 이동 |
| **수목 도감 (`study` / `wrong`)** | `/` | 검색창(`#search`)으로 즉시 포커스 이동 및 기존 검색어 전체 선택 |
| **수목 상세 모달 (`#detail`)** | `←` / `→` | 이전 번호 수목 / 다음 번호 수목으로 즉시 전환 |
| **수목 상세 모달 (`#detail`)** | `Escape` | 상세 모달 닫기 및 해당 수목 카드로 포커스 복원 |
| **랜덤 퀴즈 (4지선다 풀이 중)** | `1`, `2`, `3`, `4` | 1~4번 보기 즉시 선택 및 채점 |
| **랜덤 퀴즈 (4지선다 풀이 중)** | `0` | '잘 모르겠어요' 즉시 선택 |
| **랜덤 퀴즈 (정오답 오버레이)** | `Enter` / `Space` / `→` / `Escape` | 다음 문제로 즉시 이동 (마지막 문제인 경우 결과 화면으로 이동) |
| **실전 모의고사 (`exam` 답안지)** | `Enter` / `↓` / `↑` | 우측 1~20번 답안지 칸 간 상하 빠른 이동 및 빠른 입력창(`#exam-quick-input`) 확정 |

### 3.5. 체감 성능(다음 문항 프리로드) 및 오프라인 시스템 폰트 폴백
- **백그라운드 이미지 프리로드(`preloadImages`)**:
  - 퀴즈(`renderQuestion`) 및 실전 모의고사(`renderExamStage`, `updateExamQuestionUI`)에서 현재 문항이 렌더링되는 즉시 다음 문항(`index + 1`)의 부위별 사진 4장을 `new Image()`로 백그라운드 프리로드하여 슬라이드 전환 시 이미지 지연(Blank Frame)을 제거했습니다.
  - 상세 모달(`showDetail`)에서도 인접한 이전/다음 수목(`id - 1`, `id + 1`)의 대표 사진을 프리로드합니다.
- **오프라인 시스템 폰트 폴백**:
  - `:root`의 `font-family`에 `'Noto Sans KR', 'Pretendard', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', '맑은 고딕', system-ui, sans-serif`를 지정하여, 오프라인 패키지 실행 시 외부 웹폰트 연결 없이도 OS 내장 고품질 한글 산세리프 폰트로 즉각 렌더링됩니다.

---

## 4. 변경 이력 (Changelog)

| 일자 | 작성/수정 내용 | 관련 파일 |
|---|---|---|
| 2026-10-27 | 모던 SPA 6대 핵심 사용성 원칙 조사, 해시 라우팅·세션 가드·키보드 단축키·프리로드 구현 및 자동 검증 추가 | `web/index.html`, `web/app.js`, `web/style.css`, `tools/verify_ui.js`, `docs/spa-usability-spec.md` |
