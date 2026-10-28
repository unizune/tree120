# AGENTS.md — 개발 에이전트를 위한 프로젝트 가이드

본 문서는 **"조경기능사 실기 수목감별 120"** 웹 애플리케이션의 아키텍처, 데이터 파이프라인, 상태 관리, UI/UX 규칙 및 개발/테스트 가이드를 다룹니다. AI 에이전트 또는 후속 개발자가 프로젝트를 이해하고 신속하게 기능 추가 및 유지보수를 수행할 수 있도록 작성되었습니다.

---

## 1. 프로젝트 개요

- **목적**: 국가기술자격 조경기능사 및 나무의사 2차 실기 시험 대비 120종 수목 실전 감별 학습 웹 앱.
- **핵심 철학**:
  - **Runtime Zero-Dependency & Offline-First**: 배포 결과물(`web/`, `dist/`)은 외부 런타임 프레임워크(React, Vue 등), CDN이나 빌드 번들러 없이 순수 바닐라 HTML/CSS/JS로 동작하며, 인터넷 연결 없이도 로컬 환경에서 100% 작동합니다. (단, 개발·검증 환경인 루트 `devDependencies`에서는 ESLint, Stylelint, Playwright, Axe 등 에이전트 하네스 검증 도구를 적극 활용합니다.)
  - **Zero-Hint 실전 감별**: 퀴즈 출제 시 형태적 텍스트 단서(스포일러)를 철저히 배제하고, 실물 도감 사진의 형태만 관찰하여 동정(Identification)하도록 유도.
  - **데이터 연계성**: 사이버 수목원(treeworld.co.kr) 공공 식물 데이터 및 파이팅혼공TV 유튜브 실기 강의 기반.

---

## 2. 디렉토리 구조

```
조경기능사 실기/
├── AGENTS.md                         # 본 개발자/에이전트 가이드
├── README.md                         # GitHub 저장소 메인 소개 및 사용 가이드
├── CONTRIBUTING.md                   # 기여 가이드라인, 커밋 컨벤션 및 품질 검증 기준
├── package.json                      # 개발·검증 전용 2-Tier 하네스 설정 (devDependencies)
├── eslint.config.mjs                 # JS AST 정적 분석 규칙 (ESLint v9)
├── stylelint.config.mjs              # CSS AST 정적 분석 규칙 (Stylelint)
├── playwright.config.js              # 실제 헤드리스 브라우저 E2E 하네스 설정
├── .gitignore                        # Git 추적 제외 목록 (dist, node_modules, OS 임시 파일 등)
├── .github/workflows/                # GitHub Actions CI/CD 워크플로우
│   ├── deploy-pages.yml              # GitHub Pages 웹앱 자동 배포 워크플로우
│   └── release.yml                   # 태그 푸시 시 오프라인 패키지 자동 빌드 & 릴리즈
├── docs/                             # 모든 기능·규칙·설계 변경 근거 및 학습 문서 아카이브
│   ├── README.md                     # 문서화 원칙(Documentation-First) 및 문서 인덱스
│   ├── webp-migration-spec.md        # 수목 도감 사진 WebP 전면 전환 엔지니어링 명세
│   ├── harness-engineering-spec.md   # AI 에이전틱 2-Tier 하네스 엔지니어링 아키텍처 명세
│   ├── spa-usability-spec.md         # 모던 SPA 6대 핵심 사용성 원칙 및 라우팅/세션 보호 설계 명세
│   ├── mobile-responsive-spec.md     # 모바일 반응형 UI 설계 기준 및 재발 방지 아키텍처
│   ├── exam-simulation-spec.md       # 조경기능사 수목감별 실제 시험 규정 및 모의고사 설계 근거
│   ├── 수목120-학습노트.md            # 120종 텍스트 정리 노트
│   └── 수목120-학습자료.csv            # 120종 스프레드시트 데이터
├── web/                              # 배포 및 실행용 프론트엔드 루트 (Pages 배포 대상 · 100% 무의존성)
│   ├── index.html                    # 메인 단일 HTML 문서 (SPA 구조)
│   ├── style.css                     # 전체 스타일시트 (반응형, 모바일, 오버레이, 애니메이션)
│   ├── app.js                        # 핵심 비즈니스 로직, 상태 관리, 뷰 렌더러
│   ├── data.js                       # 120종 수목 데이터 (window.TREES 전역 객체)
│   ├── trees.json                    # 120종 원본 JSON 데이터
│   └── assets/                       # 수목 실물 사진 946장 (treeworld 467장 + nature 479장)
│       └── nature/                   # 국가생물종지식정보시스템 고화질 사진 479장
├── tests/                            # Tier-2 실제 브라우저 E2E 및 접근성 검증 스위트
│   └── harness.spec.js               # Playwright 모바일 좌표·SPA 라우팅·Zero-Hint·Axe 감사
├── tools/                            # 데이터 수집, 검증 및 패키징 도구
│   ├── verify_ui.js                  # Tier-1 데이터 동기화·반응형·도메인·문서 자가치유 검증기
│   ├── convert_to_webp.py            # 도감 사진 WebP 일괄 변환 및 색공간/회전 정규화기
│   ├── install_hooks.sh              # Git pre-commit 하네스 훅 자동 설치 스크립트
│   ├── fetch_nature.py               # 국가생물종지식정보시스템 식물도감 URL 매퍼
│   ├── fetch_nature_gallery.py       # 국가생물종지식정보시스템 갤러리 이미지 & 메타 수집기
│   ├── label_nature_photos.py        # 5대 부위 레이블러 & 스마트 큐레이터
│   ├── download_nature_photos.py     # 국가생물종 사진 다운로더 & sips 웹 최적화기
│   ├── fetch_wikipedia.py            # 한국어/영문 위키백과 문서 매퍼
│   ├── fetch_treeworld.py            # 사이버 수목원 데이터 크롤러 및 매퍼
│   ├── download_treeworld_photos.py  # 수목 도감 사진 다운로더 & 리사이저 (sips 활용)
│   ├── build_data.py                 # 최종 trees.json, data.js, md, csv 빌드 스크립트
│   ├── build_package.sh              # 오프라인 패키지(ZIP) 원클릭 빌드 스크립트
│   └── package_template/             # 오프라인 패키지 동봉 실행기(Mac/Win) 및 안내문
├── research/                         # 데이터 원본 및 크롤링 결과물
│   ├── nature_data.json              # 국가생물종지식정보시스템 매핑 데이터
│   ├── nature_images_manifest.json   # 국가생물종 4,270장 전수 갤러리 메타데이터
│   ├── nature_curated_manifest.json  # 5대 부위 레이블링 완료 엄선 사진 479장 매니페스트
│   ├── treeworld_data.json           # 사이버 수목원 수집 데이터
│   ├── wikipedia_data.json           # 위키백과 수집 데이터
│   ├── treeworld_images_manifest.json# 사이버수목원 사진 매니페스트
│   └── assets_video_backup/          # 원본 영상 캡처 사진 백업본 (317장)
└── dist/                             # 로컬 빌드 산출물 (.gitignore로 관리, Releases 배포)
    ├── 조경기능사_수목감별120_학습패키지/      # 무설치 오프라인 배포 폴더
    └── 조경기능사_수목감별120_학습패키지.zip  # 배포용 단일 ZIP 파일
```

---

## 3. 데이터 스키마 및 상태 관리

### 3.1. 수목 데이터 객체 (`window.TREES` / `trees.json`)
각 수목 객체는 다음과 같은 정규 스키마를 가집니다:

```typescript
interface Tree {
  id: number;                 // 수목 번호 (1 ~ 120)
  name: string;               // 표준 한국어 수목명 (예: "가막살나무")
  start: number;              // 원본 강의 영상 시작 초 (초 단위)
  source: string;             // 원본 영상 URL
  sourceTitle: string;        // 원본 강의 제목
  creator: string;            // 강의 제작자
  aliases: string[];          // 이명/유사 표기 (예: ["해송"])
  points: string[];           // 핵심 감별 포인트 3가지
  caution: string;            // 주의사항 및 혼동 수목 비교
  scientificName: string;     // 학명 (예: "Viburnum dilatatum Thunb.")
  family: string;             // 과명 (예: "Adoxaceae (연복초과) / 인동과")
  englishName: string;        // 영명 (예: "Linden viburnum")
  folkNames: string;          // 지방명/이명 텍스트
  natureUrl: string;          // 국가생물종지식정보시스템 식물도감 원문 URL
  treeworldUrl: string;       // 사이버 수목원 도감 원문 URL
  wikiKoUrl: string;          // 한국어 위키백과 문서 URL
  wikiEnUrl: string;          // 영문 Wikipedia 문서 URL
  images: TreeImage[];        // 도감 실물 사진 목록 (수종당 6~9장, 총 946장)
  features4: {                // 4대 감별 지표 요약 배열 (잎, 꽃, 열매, 줄기·수형)
    part: string;
    icon: string;
    desc: string;
  }[];
  morphology: {               // 4대 형태학적 상세 특징 객체
    leaf: Record<string, string>;
    flower: Record<string, string>;
    fruit: Record<string, string>;
    stem: Record<string, string>;
  };
}

interface TreeImage {
  src: string;                // 상대 경로 (예: "assets/001-1.webp" 또는 "assets/nature/nature_001_01.webp")
  tag: string;                // 부위 구분 ("잎" | "꽃" | "열매" | "줄기·수형" | "기타")
  desc: string;               // 해당 부위 형태학적 상세 캡션
  source?: string;            // 사진 출처 ("국가생물종지식정보시스템" | "사이버수목원")
  author?: string;            // 촬영자/기관 (예: "국립수목원(이동혁)")
  date?: string;              // 촬영 일자 (예: "2019-09-23")
  location?: string;          // 촬영 장소 (예: "전북 정읍시 내장산")
}
```

### 3.2. LocalStorage 지속성 스키마
애플리케이션은 사용자의 학습 및 퀴즈 데이터를 브라우저 `localStorage`에 자동 영속화합니다:

| 키 | 타입 | 설명 |
|---|---|---|
| `tree120-progress` | `Record<number, { wrong: boolean, attempts: number }>` | 수목별 오답 여부 플래그 및 누적 응시 횟수 |
| `tree120-tree-stats` | `Record<number, { attempts: number, correct: number, wrong: number, lastSeen: string }>` | 수목별 상세 정오답 누적 통계 및 최근 풀이 시각 |
| `tree120-history` | `QuizSessionRecord[]` | 최근 퀴즈 세션 이력 (날짜, 모드, 점수, 중도종료 등) |

---

## 4. UI/UX 및 아키텍처 규칙

### 4.1. 단일 페이지 애플리케이션 (SPA) 라우팅 및 사용성 원칙 (상세 명세: [`docs/spa-usability-spec.md`](docs/spa-usability-spec.md))
`app.js`의 `navigate(viewName, opts)` 및 `handleRouteFromHash()` 함수가 URL 해시(`#study`, `#quiz`, `#exam`, `#wrong`, `#stats`, `#tree-001`~`#tree-120`)와 History API(`pushState`/`replaceState`/`popstate`)를 양방향 동기화합니다:
- `study`: 전체 120종 수목 도감 그리드 뷰 (검색, `/` 단축키, 원클릭 검색어 지우기 `#clear-search`, 번호대 필터, 스크롤 위치 복원, 모달 상세 보기).
- `quiz`: 퀴즈 설정(출제 범위, 4지선다/직접 쓰기, 문항 수) 및 단기 학습용 랜덤 퀴즈 풀이 (4지선다 `1`~`4`, `0` 숫자 단축키 및 다음 문항 사진 프리로드).
- `exam`: 실제 시험 환경과 동일한 20선 실전 모의고사 (부위별 4장 순차 슬라이드, 1·2차 회전 타이머, 일시정지 불가 연속 진행, 1~20번 주관식 답안지 및 10점 만점 엄격 채점 · 상세 근거는 [`docs/exam-simulation-spec.md`](docs/exam-simulation-spec.md) 참조).
- `wrong`: 오답 노트 전용 뷰 (현재 틀린 수목만 집중 학습).
- `stats`: 종합 학습 통계 대시보드 (정답률, 마스터 진도율, 취약 수목 Top 8, 응시 이력).
- **SPA 핵심 사용성 보장**:
  - 뷰 및 상세 모달 전환 시 `document.title`, `#route-announcer`(`aria-live`), 활성 탭 `aria-current="page"` 동적 갱신.
  - 상세 모달 최초 오픈 시 `pushState(#tree-XXX)`, 모달 내 연속 이동 시 `replaceState`를 사용하여 뒤로 가기 1회로 모달 닫기 및 트리거 카드 포커스 복원.
  - 활성 퀴즈/모의고사 진행 중(`isSessionBusy()`) 실수로 탭을 전환하거나 새로고침(`beforeunload`)할 때 세션 보호 가드 작동.

### 4.2. 퀴즈 풀이 화면 규칙 (엄격 준수)
1. **Zero-Text Spoiler**: 문제 풀이 화면에는 학명, 과명, 텍스트 형태 설명을 절대로 미리 노출하지 않습니다. 오직 사진 그리드와 문제 질문만 표시해야 합니다.
2. **All-in-One 사진 동시 노출**: 사진은 썸네일 클릭 전환 방식이 아닌, 2열 반응형 그리드(`.quiz-photos-grid`)로 한 화면에 모두 노출됩니다.
3. **고화질 확대 지원**: 사진을 클릭/터치하면 상세 다이얼로그(`#detail`)를 통해 확대 사진을 열람할 수 있어야 합니다.

### 4.3. 퀴즈 결과 오버레이 & 애니메이션 규칙
1. **정중앙 블러 오버레이**: 정답/오답 제출 시 결과는 문제 하단에 렌더링하지 않고, 화면 정중앙의 `#quiz-overlay` 모달로 띄웁니다.
2. **정답 축하 애니메이션**: 정답 시 자체 캔버스 파티클 엔진(`triggerConfetti()`)을 호출하여 75개의 파티클 폭죽을 터뜨리고, 배지 바운스 효과를 부여합니다.
3. **키보드 & 터치 접근성**:
   - 오버레이가 뜨면 자동으로 `#overlay-next` 버튼에 포커스.
   - `Enter`, `Space`, `→(오른쪽 화살표)` 키 입력 또는 바깥 배경 클릭 시 즉시 다음 문제(`advanceQuiz()`)로 전환.
   - `cleanupQuizOverlay()`를 통해 뷰 전환이나 퀴즈 종료 시 잔여 이벤트 리스너와 캔버스를 메모리 누수 없이 즉시 정리.

### 4.4. 모바일 반응형 규칙 (상세 명세: [`docs/mobile-responsive-spec.md`](docs/mobile-responsive-spec.md))
- `<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">` 설정 및 `html, body { overflow-x: hidden; max-width: 100%; }` 유지.
- `@media (max-width: 760px)`에서 `.intro`는 반드시 `flex-direction: column; align-items: stretch;`로 수직 적재하여 우측 액션 버튼(`.intro-actions`, `.intro > .primary`)이 좌측 제목 영역을 압박하지 않도록 보존.
- 상단 5대 내비게이션 탭(`nav`)은 `360px` 이상 모바일 화면에서 우측 탭(`학습 통계`)이 잘리지 않도록 `justify-content: space-between; gap: 6px; font-size: 13.5px;` 유지.
- 한글 제목 및 설명문(`h1~h3, .intro p` 등)에 `word-break: keep-all; overflow-wrap: break-word;` 적용 및 CSS 단일 행 과도 압축(>500자 Minified) 금지.
- 터치 딜레이 방지를 위해 모든 인터랙티브 요소에 `touch-action: manipulation` 적용.
- 모바일 Safari 인풋 포커스 시 자동 줌(Zoom-in) 방지를 위해 폰트 크기 `16px` 이상 유지.
- iPhone 하단 홈 바 영역 침범 방지를 위해 `env(safe-area-inset-bottom)` 및 `min(88vh, 88dvh)` 적용.

---

## 5. 데이터 파이프라인 및 빌드 가이드

기존 수목 데이터를 재수집하거나 필드를 변경할 경우 다음 도구를 순서대로 실행합니다:

```bash
# 1. 사이버 수목원 도감에서 120종 식물학 데이터 크롤링
python3 tools/fetch_treeworld.py

# 2. 산림청 국가생물종지식정보시스템 도감 상세 URL 매핑
python3 tools/fetch_nature.py

# 3. 국가생물종지식정보시스템 갤러리 이미지 & 메타데이터 수집 (4,270장)
python3 tools/fetch_nature_gallery.py

# 4. 5대 부위(잎, 꽃, 열매, 줄기·수형, 기타) 레이블링 및 스마트 큐레이션 (479장)
python3 tools/label_nature_photos.py

# 5. 국가생물종 실물 사진 다운로드 및 웹 규격 최적화 (macOS sips 활용)
python3 tools/download_nature_photos.py

# 6. 위키백과(한국어/영문) 문서 URL 매핑
python3 tools/fetch_wikipedia.py

# 7. 사이버 수목원 사진 다운로드 및 리사이징
python3 tools/download_treeworld_photos.py

# 8. web/trees.json, web/data.js, docs/수목120-학습노트.md 등 종합 빌드
python3 tools/build_data.py
```

> **주의**: `web/trees.json`을 수정했다면 반드시 `tools/build_data.py`를 실행하여 브라우저 로딩용 `web/data.js`(`window.TREES`)를 동기화해야 합니다.

---

## 6. 테스트 및 검증 명령 (2-Tier Agentic Harness · 상세 명세: [`docs/harness-engineering-spec.md`](docs/harness-engineering-spec.md))

코드나 데이터를 수정한 후에는 반드시 아래 **2-Tier 하네스 검증 명령**을 실행하여 모든 정적 린터, 데이터/문서 드리프트, 실제 헤드리스 브라우저(Playwright) 반응형 좌표 및 접근성 불변식을 통과해야 합니다:

```bash
# 1. Tier-1 Fast 하네스 검증 (~1초, 코드 수정 직후 상시 및 Pre-commit 훅 자동 실행)
#    (ESLint v9 + Stylelint + tools/verify_ui.js 35개 불변식)
npm run verify:fast

# 2. Tier-2 Deep 브라우저 E2E 하네스 검증 (~5초, Playwright Chromium + Axe 접근성 감사)
npm run verify:e2e

# 3. 전체 통합 하네스 검증 (Tier-1 + Tier-2 일괄 실행 · 커밋 확정 및 CI 배포 게이트)
npm test

# 4. 로컬 서버 단독 구동 (포트 8080)
python3 -m http.server 8080 -d web
```

---

## 7. 오프라인 배포 패키지 빌드 가이드

로컬에서 배포용 독립 패키지(`.zip`)를 재생성할 때는 원클릭 패키징 스크립트를 사용합니다:

```bash
# 원클릭 패키징 스크립트 실행 (dist/ 생성 및 압축)
chmod +x tools/build_package.sh
./tools/build_package.sh
```

- 스크립트 동작 과정:
  1. `dist/조경기능사_수목감별120_학습패키지/` 디렉토리 초기화.
  2. `web/` 내의 모든 정적 자산(HTML, CSS, JS, 946장 사진 — 사이버수목원 467장 + 국가생물종 479장)만 복사 (`node_modules` 및 `package.json` 제외).
  3. `tools/package_template/` 내의 OS별 실행기(`실행하기_Mac.command`, `실행하기_Windows.bat`) 및 `사용안내.txt` 동봉.
  4. Mac 실행기 권한 부여(`chmod +x`) 및 `dist/조경기능사_수목감별120_학습패키지.zip` 압축 생성.

> **주의**: 배포용 ZIP 파일과 `dist/` 폴더는 `.gitignore`에 의해 Git 트래킹에서 제외되며, GitHub Releases 자산으로 분리 관리됩니다.

---

## 8. Git 브랜치 전략 및 커밋 컨벤션 가이드

> **참고**: 외부 기여자 및 세부 커밋 컨벤션, PR 절차는 [CONTRIBUTING.md](CONTRIBUTING.md)에 상세히 정의되어 있습니다.

### 8.1. 브랜치 전략: `main` 단독 브랜치 운용 (Trunk-based)
- 본 프로젝트는 오버헤드를 최소화하기 위해 **`main` 단독 브랜치**로 운용합니다.
- `main` 브랜치에 코드가 푸시되면 자동으로 GitHub Pages에 웹앱이 배포됩니다.
- 대규모 리팩토링이나 실험적인 대규모 개편 시에만 임시 `feature/*` 브랜치를 생성하고, 작업 완료 후 `main`에 병합합니다.

### 8.2. 커밋 메시지 컨벤션 (Conventional Commits)
커밋 메시지는 반드시 아래 형식을 준수하여 원자적(Atomic) 단위로 작성합니다:

```
<type>(<scope>): <subject>

[본문 (선택 사항)]
```

| 타입 (`type`) | 용도 | 예시 |
|---|---|---|
| `feat` | 새로운 기능 추가 | `feat(quiz): 주관식 초성 힌트 옵션 추가` |
| `fix` | 버그 및 오류 수정 | `fix(app): Safari 모바일에서 오버레이 스크롤 잠김 해제` |
| `data` | 수목 데이터/학명/이미지 매핑 수정 | `data(trees): 012번 계수나무 학명 오탈자 수정` |
| `docs` | 문서 수정 및 보완 | `docs: AGENTS.md 작업 지침 갱신` |
| `style` | 코드 서식 및 포맷팅 (로직 변경 없음) | `style(css): 퀴즈 오버레이 모바일 여백 조정` |
| `refactor` | 코드 리팩토링 (기능 변경 없음) | `refactor(quiz): 오답 저장 로직 모듈화` |
| `perf` | 성능 개선 | `perf(image): 썸네일 렌더링 지연 로딩 최적화` |
| `ci` | CI/CD 워크플로우 수정 | `ci(pages): GitHub Pages 배포 액션 v4 적용` |
| `chore` | 빌드, 패키징 스크립트, 잡무 | `chore(package): Windows 실행 스크립트 인코딩 보완` |

---

## 9. CI/CD 및 배포 자동화 파이프라인 가이드

### 9.1. 온라인 웹앱 배포 (GitHub Pages)
- **워크플로우**: [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml)
- **동작 방식**: `main` 브랜치에 `web/**` 변경 사항이 푸시되면, GitHub Actions가 `web/` 디렉토리를 아티팩트로 추출하여 GitHub Pages(`https://unizune.github.io/tree120/`)에 즉시 무중단 배포합니다.
- **일상 개발 흐름**:
  ```bash
  # 코드 수정 후
  git add .
  git commit -m "fix(study): 도감 모달 확대 닫기 버그 수정"
  git push origin main
  # -> GitHub Pages 자동 반영 완료
  ```

### 9.2. 오프라인 패키지 배포 (GitHub Releases)
- **워크플로우**: [`.github/workflows/release.yml`](.github/workflows/release.yml)
- **동작 방식**: 버전 태그(`v*.*.*`) 푸시 시, GitHub 가상머신이 `tools/build_package.sh`를 실행하여 126MB 배포용 ZIP 패키지를 빌드하고 [GitHub Releases](../../releases)에 자산으로 자동 등록합니다.
- **새 버전 릴리즈 흐름**:
  ```bash
  # 버전 태그 생성 및 푸시
  git tag v1.0.1
  git push origin v1.0.1
  # -> GitHub Releases에 "조경기능사_수목감별120_학습패키지.zip" 자동 등록 완료
  ```

---

## 10. 에이전트 개발 및 작업 지침 (Guidelines for AI Agents)

에이전트는 코드 작성, 데이터 파이프라인 작업, 배포 관련 작업 시 다음 9대 원칙을 **반드시 준수**해야 합니다:

1. **배포 결과물(`web/`, `dist/`) 외부 런타임 종속성 추가 금지 (Runtime Zero-Dependency)**:
   - `web/` 내부에는 외부 CDN 라이브러리(jQuery, Lodash, Bootstrap, React 등)나 번들러 런타임 의존성을 절대로 추가하지 마십시오. 오프라인 순수 바닐라 JS 실행 환경을 절대 보존해야 합니다. (단, 루트 `package.json`의 `devDependencies`를 통한 테스트·린트·브라우저 검증 하네스 도구는 허용됩니다.)
2. **퀴즈 힌트 정책 보존 (Zero-Hint)**:
   - 퀴즈 및 모의고사 문제 풀이 화면에 학명, 과명, 부위 설명, 텍스트 형태 설명 등의 스포일러 단서가 미리 노출되지 않도록 유지하십시오.
3. **메모리 정리(Cleanup)**:
   - Canvas 파티클 애니메이션 루프, 모의고사 타이머(`cleanupExamTimer`), `window` 전역 이벤트 리스너를 추가할 때는 반드시 뷰 전환 시 해제되는 `cleanup` 로직을 포함하십시오.
4. **접근성 및 터치 UX**:
   - 모바일 터치 타깃(최소 44px 이상), `touch-action: manipulation`, 입력 폼 줌 방지(`font-size: 16px` 이상) 및 키보드 조작성을 항상 준수하십시오.
5. **대용량 바이너리 Git 커밋 금지**:
   - 126MB ZIP 파일이나 `dist/` 빌드 산출물, 비디오 프레임 추출 임시 파일(`research/frames/`)은 절대로 Git 저장소에 커밋하지 마십시오. 대용량 배포 파일은 GitHub Releases를 통해 관리합니다.
6. **커밋 메시지 컨벤션 준수**:
   - 변경 사항 커밋 시 반드시 [CONTRIBUTING.md](CONTRIBUTING.md)에 정의된 Conventional Commits 양식(`<type>(<scope>): <subject>`)을 따르고, 하나의 커밋에는 하나의 목적만 담는 원자적(Atomic) 커밋을 유지하십시오.
7. **`main` 단독 브랜치 기반 작업**:
   - 복잡한 브랜치 분기 없이 `main` 단독 브랜치에 직접 커밋 및 푸시하여 GitHub Pages 자동 배포가 정상 트리거되도록 하십시오.
8. **데이터 동기화 빌드 검증**:
   - `web/trees.json`을 수정했을 경우 반드시 `python3 tools/build_data.py`를 실행하여 브라우저 로딩용 `web/data.js`를 동기화하고, `node -c web/app.js`로 문법 검증을 완료한 후 커밋하십시오.
9. **모든 변경에 대한 근거 문서화 의무 (`docs/` 아카이빙)**:
   - 앞으로 모든 기능 추가, 도메인 규칙(실제 시험 기준 등) 반영, 데이터 정책 변경, UI/UX 동작 수정 시 **그 변경의 배경, 조사 결과 및 설계 근거를 반드시 [`docs/`](docs/README.md) 디렉토리 하위에 마크다운 문서로 작성하거나 최신화**해야 합니다. 근거 문서 없는 임의의 스펙 변경을 금지합니다.
