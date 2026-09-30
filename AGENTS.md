# AGENTS.md — 개발 에이전트를 위한 프로젝트 가이드

본 문서는 **"조경기능사 실기 수목감별 120"** 웹 애플리케이션의 아키텍처, 데이터 파이프라인, 상태 관리, UI/UX 규칙 및 개발/테스트 가이드를 다룹니다. AI 에이전트 또는 후속 개발자가 프로젝트를 이해하고 신속하게 기능 추가 및 유지보수를 수행할 수 있도록 작성되었습니다.

---

## 1. 프로젝트 개요

- **목적**: 국가기술자격 조경기능사 및 나무의사 2차 실기 시험 대비 120종 수목 실전 감별 학습 웹 앱.
- **핵심 철학**:
  - **Zero-Dependency & Offline-First**: 외부 런타임 프레임워크(React, Vue 등)나 빌드 번들러 없이 순수 바닐라 HTML/CSS/JS로 동작하며, 인터넷 연결 없이도 로컬 환경에서 100% 작동.
  - **Zero-Hint 실전 감별**: 퀴즈 출제 시 형태적 텍스트 단서(스포일러)를 철저히 배제하고, 실물 도감 사진의 형태만 관찰하여 동정(Identification)하도록 유도.
  - **데이터 연계성**: 사이버 수목원(treeworld.co.kr) 공공 식물 데이터 및 파이팅혼공TV 유튜브 실기 강의 기반.

---

## 2. 디렉토리 구조

```
조경기능사 실기/
├── AGENTS.md                         # 본 개발자/에이전트 가이드
├── web/                              # 배포 및 실행용 프론트엔드 루트
│   ├── index.html                    # 메인 단일 HTML 문서 (SPA 구조)
│   ├── style.css                     # 전체 스타일시트 (반응형, 모바일, 오버레이, 애니메이션)
│   ├── app.js                        # 핵심 비즈니스 로직, 상태 관리, 뷰 렌더러
│   ├── data.js                       # 120종 수목 데이터 (window.TREES 전역 객체)
│   ├── trees.json                    # 120종 원본 JSON 데이터
│   └── assets/                       # 수목 실물 사진 467장 (001-1.jpg ~ 120-4.jpg)
├── tools/                            # 데이터 수집 및 파이프라인 도구
│   ├── fetch_treeworld.py            # 사이버 수목원 데이터 크롤러 및 매퍼
│   ├── download_treeworld_photos.py  # 수목 도감 사진 다운로더 & 리사이저 (sips 활용)
│   └── build_data.py                 # 최종 trees.json, data.js, md, csv 빌드 스크립트
├── research/                         # 데이터 원본 및 크롤링 결과물
│   ├── treeworld_data.json           # 사이버 수목원 수집 데이터
│   ├── treeworld_images_manifest.json# 사진 매니페스트
│   └── assets_video_backup/          # 원본 영상 캡처 사진 백업본 (317장)
├── dist/                             # 배포용 패키지
│   ├── 조경기능사_수목감별120_학습패키지/      # 무설치 오프라인 배포 폴더
│   └── 조경기능사_수목감별120_학습패키지.zip  # 배포용 단일 ZIP 파일 (82MB)
├── 수목120-학습노트.md                # 120종 텍스트 정리 노트
└── 수목120-학습자료.csv                # 120종 스프레드시트 데이터
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
  aliases: string[];          // 이명/유사 표기 (예: ["배롱나무", "백일홍"])
  points: string[];           // 핵심 감별 포인트 3가지
  caution: string;            // 주의사항 및 혼동 수목 비교
  scientificName: string;     // 학명 (예: "Viburnum dilatatum Thunb.")
  family: string;             // 과명 (예: "Adoxaceae 연복초과")
  treeworldUrl: string;       // 사이버 수목원 도감 원문 URL
  wikiKoUrl: string;          // 한국어 위키백과 문서 URL
  wikiEnUrl: string;          // 영문 Wikipedia 문서 URL
  images: TreeImage[];        // 도감 실물 사진 목록 (보통 2~4장)
  morphology: {               // 4대 형태학적 상세 특징
    leaf: string;             // 잎 특징
    flower: string;           // 꽃 특징
    fruit: string;            // 열매 특징
    stem: string;             // 줄기/수형 특징
  };
}

interface TreeImage {
  src: string;                // 상대 경로 (예: "assets/001-1.jpg")
  tag: string;                // 부위 구분 ("잎" | "꽃" | "열매" | "수형" | "줄기")
  desc: string;               // 해당 부위 형태학적 상세 캡션
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

### 4.1. 단일 페이지 애플리케이션 (SPA) 라우팅
`app.js`의 `navigate(viewName)` 함수가 뷰 전환을 제어합니다:
- `study`: 전체 120종 수목 도감 그리드 뷰 (검색, 번호대 필터, 모달 상세 보기).
- `quiz`: 퀴즈 설정(출제 범위, 4지선다/직접 쓰기, 문항 수) 및 실전 퀴즈 풀이.
- `wrong`: 오답 노트 전용 뷰 (현재 틀린 수목만 집중 학습).
- `stats`: 종합 학습 통계 대시보드 (정답률, 마스터 진도율, 취약 수목 Top 8, 응시 이력).

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

### 4.4. 모바일 반응형 규칙
- `<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">` 설정.
- 터치 딜레이 방지를 위해 모든 인터랙티브 요소에 `touch-action: manipulation` 적용.
- 모바일 Safari 인풋 포커스 시 자동 줌(Zoom-in) 방지를 위해 폰트 크기 `16px` 이상 유지.
- iPhone 하단 홈 바 영역 침범 방지를 위해 `env(safe-area-inset-bottom)` 및 `min(88vh, 88dvh)` 적용.

---

## 5. 데이터 파이프라인 및 빌드 가이드

기존 수목 데이터를 재수집하거나 필드를 변경할 경우 다음 도구를 순서대로 실행합니다:

```bash
# 1. 사이버 수목원 도감에서 120종 식물학 데이터 크롤링
python3 tools/fetch_treeworld.py

# 2. 도감 실물 고해상도 사진 다운로드 및 리사이징 (macOS sips 도구 활용)
python3 tools/download_treeworld_photos.py

# 3. web/trees.json, web/data.js, 수목120-학습노트.md 등 종합 빌드
python3 tools/build_data.py
```

> **주의**: `web/trees.json`을 수정했다면 반드시 `tools/build_data.py`를 실행하여 브라우저 로딩용 `web/data.js`(`window.TREES`)를 동기화해야 합니다.

---

## 6. 테스트 및 검증 명령

코드 수정 후 반드시 아래 검증을 수행하십시오:

```bash
# 1. JS 문법 및 린트 검증
node -c web/app.js

# 2. CSS 괄호 매칭 및 문법 검증
node -e "
const fs = require('fs');
const css = fs.readFileSync('web/style.css', 'utf8');
let open = 0;
for (let i = 0; i < css.length; i++) {
  if (css[i] === '{') open++;
  else if (css[i] === '}') open--;
  if (open < 0) throw new Error('Unmatched brace at ' + i);
}
if (open !== 0) throw new Error('Unclosed brace count: ' + open);
console.log('CSS Validated!');
"

# 3. 로컬 서버 구동 (포트 8080)
python3 -m http.server 8080 -d web
```

---

## 7. 배포 패키지 빌드 가이드

배포용 독립 패키지(`.zip`)를 재생성할 때는 다음 단계를 거칩니다:

```bash
# 1. dist 디렉토리 준비 및 web 소스 복사
mkdir -p "dist/조경기능사_수목감별120_학습패키지"
cp -R web/* "dist/조경기능사_수목감별120_학습패키지/"

# 2. 실행 스크립트 권한 부여
chmod +x "dist/조경기능사_수목감별120_학습패키지/실행하기_Mac.command"

# 3. 압축 파일 생성
cd dist && zip -r "조경기능사_수목감별120_학습패키지.zip" "조경기능사_수목감별120_학습패키지"
```

---

## 8. 에이전트 개발 지침 (Guidelines for AI Agents)

1. **외부 런타임 종속성 추가 금지**: CDN 라이브러리(jQuery, Lodash, Bootstrap 등)나 NPM 패키지를 추가하지 마십시오. 오프라인 순수 바닐라 JS 환경을 유지해야 합니다.
2. **퀴즈 힌트 정책 보존**: 퀴즈 문제 화면에 텍스트 힌트가 들어가지 않도록 주의하십시오.
3. **메모리 정리(Cleanup)**: Canvas 애니메이션 루프나 `window` 전역 이벤트 리스너를 추가할 때는 반드시 뷰 전환 시 해제되는 `cleanup` 로직을 포함하십시오.
4. **접근성 및 터치 UX**: 모바일 터치 타깃(최소 44px 이상)과 키보드 조작성을 항상 고려하십시오.
