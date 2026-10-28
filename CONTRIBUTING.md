# 🤝 기여 가이드라인 (Contributing Guidelines)

"조경기능사 실기 수목감별 120" 프로젝트에 관심을 가져주셔서 감사합니다!  
본 문서는 수목 데이터 교정, 기능 제안, 코드 개선, 버그 수정 등 프로젝트에 기여하고자 하는 모든 개발자 및 기여자를 위한 표준 작업 가이드라인과 커밋 규칙(BP)을 다룹니다.

---

## 🧭 목차
1. [핵심 원칙 (Core Principles)](#1-핵심-원칙-core-principles)
2. [기여 유형 (Ways to Contribute)](#2-기여-유형-ways-to-contribute)
3. [로컬 개발 환경 설정 (Getting Started)](#3-로컬-개발-환경-설정-getting-started)
4. [Git 브랜치 전략 및 워크플로우](#4-git-브랜치-전략-및-워크플로우)
5. [커밋 메시지 컨벤션 (Commit Convention)](#5-커밋-메시지-컨벤션-commit-convention)
6. [수목 데이터 수정 및 동기화 가이드](#6-수목-데이터-수정-및-동기화-가이드)
7. [품질 검증 및 테스트 체크리스트](#7-품질-검증-및-테스트-체크리스트)
8. [오프라인 패키징 및 릴리즈 프로세스](#8-오프라인-패키징-및-릴리즈-프로세스)

---

## 1. 핵심 원칙 (Core Principles)

모든 코드와 데이터 변경은 다음의 프로젝트 기본 철학을 반드시 준수해야 합니다:

1. **Runtime Zero-Dependency (배포 결과물 외부 의존성 없음)**:
   - 배포 대상인 `web/` 및 오프라인 패키지(`dist/`)에는 외부 프레임워크(React, Vue 등)나 외부 CDN 라이브러리(jQuery, Bootstrap, Lodash 등)를 절대로 추가하지 않습니다.
   - 브라우저만으로 100% 실행 가능한 순수 바닐라 HTML5, CSS3, ES6+ JS 환경을 유지하며, 루트 `devDependencies`는 코드 품질 검증 하네스(ESLint, Stylelint, Playwright, Axe) 용도로만 사용합니다.
2. **Zero-Hint 실전 감별 (힌트 배제)**:
   - 퀴즈 문제 풀이 화면에는 학명, 과명, 텍스트 형태 설명 등 스포일러가 될 수 있는 어떠한 텍스트 단서도 미리 노출되어서는 안 됩니다.
   - 오직 실물 도감 사진의 형태적 특징만 관찰하여 동정(Identification)하도록 유도합니다.
3. **Offline-First (오프라인 완벽 구동)**:
   - 인터넷 연결이 없는 상태에서도 120종 도감 열람, 랜덤 퀴즈, 오답 노트, 통계가 온전히 동작해야 합니다.
4. **저장소 경량화 (No Heavy Binaries in Git)**:
   - 82MB ZIP 파일이나 `dist/` 빌드 산출물, 임시 캡처 프레임은 Git 저장소에 커밋하지 않고, GitHub Releases 자산으로 분리 관리합니다.
5. **변경 근거 문서화 (Documentation-First in `docs/`)**:
   - 모든 기능 추가, 실제 시험 규정 반영, 채점 및 UI/UX 동작 변경 시 그 조사 결과와 설계 근거를 반드시 [`docs/`](docs/README.md) 하위에 문서화하여 코드와 함께 유지합니다.

---

## 2. 기여 유형 (Ways to Contribute)

- **수목학 데이터 오류 교정**:
  - 오탈자, 학명 최신화, 과명 표기 오류, 형태학적 설명(잎/꽃/열매/수형) 보완.
- **도감 사진 품질 개선**:
  - 식별 부위(잎, 꽃, 열매, 수형, 수피)가 명확한 고화질 도감 사진 제보 또는 매핑 보완.
- **UI/UX 및 접근성 개선**:
  - 모바일 터치 사용성 개선, 키보드 단축키 지원, 반응형 레이아웃 및 다크/라이트 테마 최적화.
- **성능 최적화**:
  - 이미지 지연 로딩 최적화, 캔버스 애니메이션 메모리 누수 방지.
- **문서화**:
  - 학습노트 보완, README, 가이드라인 오탈자 수정.

---

## 3. 로컬 개발 환경 설정 (Getting Started)

NPM 설치나 빌드 과정 없이 바로 개발을 시작할 수 있습니다.

```bash
# 1. 저장소 클론
git clone https://github.com/unizune/tree120.git
cd tree120

# 2. 로컬 브랜치 보호 Git 훅 활성화 (main 직접 커밋/푸시 방지)
./tools/install_hooks.sh

# 3. 로컬 웹 서버 실행 (Python 3 내장 서버 사용)
python3 -m http.server 8080 -d web

# 4. 브라우저 접속
# http://localhost:8080
```

> **단순 열람**: `web/index.html` 파일을 더블 클릭하여 기본 웹 브라우저에서 바로 열 수도 있습니다.

---

## 4. Git 브랜치 전략 및 워크플로우 (PR-Gated GitHub Flow)

본 프로젝트는 `main` 브랜치를 영구적인 무장애 배포 브랜치(Evergreen)로 유지하기 위해 **PR-Gated GitHub Flow**를 전면 적용합니다. (상세 설계 근거: [`docs/branching-strategy-spec.md`](docs/branching-strategy-spec.md))

> [!IMPORTANT]
> **`main` 브랜치 직접 커밋/푸시 절대 금지**:  
> 저장소 관리자와 외부 기여자 모두 예외 없이 `main`에 직접 푸시할 수 없습니다. 모든 변경 사항은 반드시 작업 브랜치에서 PR을 오픈하고, GitHub Actions **`CI Quality Gate`**를 통과한 후 **Squash Merge**로 반영되어야 합니다.

### 4.1. 표준 작업 절차 (Step-by-Step)
1. **작업 브랜치 생성**:
   ```bash
   git checkout main && git pull origin main
   git checkout -b feat/your-feature-name
   # 또는 버그 수정 시: git checkout -b fix/issue-name
   ```
2. **코드 및 데이터 수정 후 로컬 검증**:
   - `npm run verify:fast` (ESLint + Stylelint + verify_ui 39개 불변식)
   - `npm run verify:e2e` (Playwright E2E 검증)
3. **커밋 및 원격 브랜치 푸시**:
   - `git add .`
   - `git commit -m "feat(scope): 변경 내용"` (Conventional Commits 준수)
   - `git push origin feat/your-feature-name`
4. **Pull Request (PR) 생성**:
   - GitHub 웹 또는 `gh pr create` 명령으로 PR을 오픈합니다.
   - PR 템플릿의 설계 근거 문서 링크와 체크리스트를 작성합니다.
5. **CI Quality Gate 자동 검증 통과 및 Squash Merge**:
   - `.github/workflows/ci.yml`의 모든 자동화 검증이 Pass되면 검토 후 Squash Merge합니다.
   - 머지 완료 후 작업 브랜치는 자동 삭제됩니다.

---

## 5. 커밋 메시지 컨벤션 (Commit Convention)

본 프로젝트는 [Conventional Commits](https://www.conventionalcommits.org/) 표준을 따르며, **원자적(Atomic) 커밋**을 지향합니다.

### 5.1. 기본 구조
```
<type>(<scope>): <subject>

[본문 (선택 사항 - 변경 이유, 배경 설명)]
```

### 5.2. 타입 목록 (Type)
| 타입 | 용도 | 설명 |
|---|---|---|
| `feat` | 기능 추가 | 새로운 기능, 퀴즈 모드, 옵션 추가 |
| `fix` | 버그 수정 | 렌더링 에러, 계산 오류, 터치 버그 등 수정 |
| `data` | 데이터 수정 | 수목 데이터(학명, 과명, 형태설명), 이미지 매핑 수정 |
| `docs` | 문서 | README, CONTRIBUTING, AGENTS, 학습노트 수정 |
| `style` | 코드 스타일 | 포맷팅, 세미콜론, CSS 여백 조정 (로직 영향 없음) |
| `refactor`| 리팩토링 | 코드 구조 개선, 함수 분리 (기능 변경 없음) |
| `perf` | 성능 개선 | 렌더링 최적화, 메모리 절약, 로딩 속도 개선 |
| `ci` | CI/CD | GitHub Actions 워크플로우(Pages, Release) 수정 |
| `chore` | 잡무/도구 | 패키징 스크립트, .gitignore, 템플릿 수정 |

### 5.3. 자주 사용하는 스코프 (Scope)
- `trees`: 120종 수목 데이터 (`trees.json`, `data.js`)
- `study`: 도감 그리드 및 상세 모달
- `quiz`: 단기 학습용 랜덤 감별 퀴즈
- `exam`: 20선 실전 모의고사 모드
- `wrong`: 오답 노트
- `stats`: 학습 통계 대시보드
- `overlay`: 퀴즈 결과 오버레이 및 파티클
- `image`: 도감 사진 및 썸네일
- `pages`: GitHub Pages 배포 설정
- `package`: 오프라인 배포 패키지

### 5.4. 작성 규칙
- 제목은 한국어 또는 영어 명령문 형태로 간결하게 작성합니다 (50자 이내).
- 마침표(`.`)로 끝맺지 않습니다.
- 하나의 커밋에는 연관된 하나의 작업만 담습니다.

---

## 6. 수목 데이터 수정 및 동기화 가이드

수목 데이터(`web/trees.json`)를 수동으로 수정하거나 새 도감 데이터를 반영할 경우, **반드시 데이터 동기화 스크립트를 실행**해야 브라우저 실행 파일(`web/data.js`)에 동기화됩니다.

```bash
# 1. web/trees.json 수정 후 동기화 스크립트 실행
python3 tools/build_data.py
```
- 스크립트 실행 시 다음 파일들이 자동으로 갱신됩니다:
  - `web/data.js` (`window.TREES` 전역 객체)
  - `docs/수목120-학습노트.md`
  - `docs/수목120-학습자료.csv`

---

## 7. 품질 검증 및 테스트 체크리스트

코드를 커밋하거나 PR을 제출하기 전 반드시 다음 2-Tier 통합 하네스 검증을 수행하십시오 (로컬 Pre-commit 훅 및 GitHub Actions 배포 파이프라인에서도 동일하게 검증됩니다):

```bash
# 1. Tier-1 Fast 검증 (ESLint + Stylelint + 데이터/문서/반응형/도메인 무결성)
npm run verify:fast

# 2. Tier-2 실제 브라우저 E2E 및 접근성 검증 (Playwright + Axe-core)
npm run verify:e2e

# 3. 전체 하네스 일괄 검증 (Tier-1 + Tier-2)
npm test
```

### ✅ 사전 점검 체크리스트
- [ ] `npm test` (`verify:fast` + `verify:e2e`)의 모든 하네스 검증 항목을 통과했는가?
- [ ] 기능/사양 변경에 대한 조사 결과 및 설계 근거가 [`docs/`](docs/README.md) 하위에 문서화되고 `docs/README.md` 인덱스에 등록되었는가?
- [ ] 배포 결과물(`web/`)에 외부 런타임 CDN이 유입되지 않았는가?
- [ ] 퀴즈 및 모의고사 풀이 화면에 학명, 과명 등의 힌트 스포일러가 없는가?
- [ ] 모바일 뷰포트(`360px`~`430px`)에서 가로 넘침이 없고 터치 타깃(최소 44px 이상)이 확보되었는가?
- [ ] Canvas 애니메이션이나 전역 이벤트 리스너의 `cleanup` 로직이 누락되지 않았는가?
- [ ] ZIP 파일이나 `dist/`, `node_modules/` 폴더가 Git 스테이지에 포함되지 않았는가?

---

## 8. 오프라인 패키징 및 릴리즈 프로세스

### 8.1. 로컬 패키지 원클릭 빌드
```bash
chmod +x tools/build_package.sh
./tools/build_package.sh
# -> dist/조경기능사_수목감별120_학습패키지.zip (82MB) 생성 완료
```

### 8.2. 공식 릴리즈 자동 배포
새 버전을 배포할 때는 태그를 생성하여 푸시하면 GitHub Actions가 자동으로 빌드하여 Release에 등록합니다:

```bash
git tag v1.0.1
git push origin v1.0.1
```
- [GitHub Releases](https://github.com/unizune/tree120/releases)에서 새 버전의 다운로드 패키지가 자동 발행됩니다.

---

함께 더 나은 조경기능사 학습 도구를 만들어가는 데 기여해 주셔서 진심으로 감사드립니다! 🌿
