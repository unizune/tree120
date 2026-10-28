# 🛡️ 브랜치 보호 전략 및 PR 기반 개발 워크플로우 명세 (Branching Strategy & PR Protection Spec)

본 문서는 **"조경기능사 실기 수목감별 120"** 프로젝트에서 `main` 브랜치를 영구적인 무장애 안정 상태(Evergreen Production-Ready)로 유지하기 위한 **PR 기반 브랜치 전략(PR-Gated GitHub Flow)**, 3중 안전망 아키텍처 및 세부 운영 규칙을 정의합니다.

---

## 1. 배경 및 목적 (Context & Goal)

- **배경**:
  - 본 웹 앱은 `main` 브랜치에 코드가 푸시되는 즉시 GitHub Actions(`deploy-pages.yml`)를 통해 GitHub Pages 프로덕션 환경에 무중단 자동 배포(CD)됩니다.
  - 또한 버전 태그(`v*.*.*`)가 푸시되면 `release.yml`이 동작하여 120종 946장 사진이 포함된 오프라인 학습 패키지 ZIP을 자동으로 빌드 및 배포합니다.
  - 기존의 단일 브랜치 직접 푸시(Direct-to-Main) 방식은 속도는 빠르나, 문법 오류, `trees.json` ↔ `data.js` 동기화 누락, 불완전한 작업 상태 등이 검증 없이 라이브 환경에 즉각 배포될 위험이 있었습니다.
- **목적**:
  - `main` 브랜치에 대한 직접적인 커밋 및 푸시를 원천 차단.
  - 모든 변경 사항을 독립된 단기 피처 브랜치(Topic Branch)에서 작업하고, **Pull Request (PR)**와 **자동화된 CI 품질 게이트(Quality Gate)**를 통과한 검증된 코드만 `main`에 Squash Merge되도록 강제.
  - 장애 발생 시 단 1개의 커밋 단위(`git revert`)로 즉시 롤백 가능한 깔끔한 선형 히스토리(Linear History) 구축.

---

## 2. 브랜치 전략 비교 및 선정 근거 (Senior Engineering Rationale)

10년차 이상의 시니어 엔지니어링 표준에서 지속적 배포(Continuous Deployment) 웹 애플리케이션의 브랜치 전략을 검토한 결과입니다:

| 비교 항목 | Direct-to-Main (기존 방식) | Git Flow (`develop` + `release/*`) | **PR-Gated GitHub Flow (본 프로젝트 채택)** |
|---|---|---|---|
| **기본 모델** | `main`에 직접 푸시 | `develop`에서 개발 후 정기 `release` 브랜치를 거쳐 `main` 병합 | **`main`은 항상 배포 가능한 상태(Evergreen)**, 모든 변경은 `feature/*` → PR → `main` |
| **적합한 환경** | 1인 초기 프로토타이핑 | 분기/반기 단위 정기 패키지 출시 (레거시 SI/패키지) | **상시 웹 배포(GitHub Pages) + 수시 태그 릴리즈(v*.*.*)** |
| **`main` 브랜치 안정성** | ❌ 취약 (오류 즉시 배포) | ⚠️ 중간 (`develop`과 `main` 간 대규모 싱크 충돌 위험) | ✅ **최상 (CI 검증 및 리뷰 완료된 PR만 반영)** |
| **운영 오버헤드** | 없음 | ❌ 높음 (이중 PR, `develop` 역병합 지옥, 브랜치 관리 피로) | ✅ **최적 (단일 기준점 `main` + 단기 브랜치 자동 삭제)** |
| **롤백(Revert) 용이성** | ❌ 어려움 (중간 커밋 혼재) | ⚠️ 중간 (복잡한 브랜치 트리) | ✅ **최상 (Squash Merge로 PR당 1 커밋 원자적 롤백 가능)** |

> [!IMPORTANT]
> **왜 Git Flow를 쓰지 않는가?**  
> Git Flow의 원작자인 Vincent Driessen조차 웹 앱과 같이 상시 배포되는 현대적 소프트웨어에는 `develop`과 같은 영구적인 병렬 브랜치가 불필요한 마찰(Merge Drift, Double PR)만 초래한다고 밝혔습니다. 본 프로젝트는 `main` 브랜치를 단일 진실 공급원(Single Source of Truth)으로 삼는 **PR-Gated GitHub Flow**를 채택합니다.

---

## 3. 3중 안전망 아키텍처 (3-Tier Defense In Depth)

우발적인 실수나 검증되지 않은 코드가 `main`에 도달하는 것을 방지하기 위해 3단계 방어벽을 구축합니다:

```
[로컬 개발 환경]
  ├── 1. tools/git-hooks/pre-commit  : main에서 커밋 시도시 즉각 차단 + JS/CSS 문법 사전검사
  └── 2. tools/git-hooks/pre-push    : main에 직접 push 시도시 즉각 차단

[GitHub 원격 서버]
  ├── 3. GitHub Actions (ci.yml)     : PR 생성 시 JS/CSS/데이터동기화/Zero-Dependency 자동 검사
  └── 4. Branch Protection Rule      : main 직접 Push 금지, PR 필수, CI Pass 필수, Admin 예외 없음

[AI 에이전트 행동 지침]
  └── 5. AGENTS.md 7번 원칙 개정     : AI 에이전트는 무조건 feat/* 브랜치를 생성하여 작업 수행
```

### 3.1. 로컬 1차 방어: Git Hooks (`tools/git-hooks/`)
- `pre-commit`:
  - 현재 브랜치가 `main`인 경우 커밋 생성을 즉시 중단하고 피처 브랜치 생성을 안내.
  - `node -c web/app.js` 및 CSS 괄호 균형 검증.
  - `web/trees.json`을 수정했으나 `web/data.js`가 함께 스테이징되지 않은 경우 경고 및 차단.
- `pre-push`:
  - `main` 브랜치를 타깃으로 하는 직접적인 `git push origin main` 명령을 로컬에서 가로채 차단 (단, 버전 릴리즈 태그 `refs/tags/*` 푸시는 정상 허용).
- `tools/setup_git_hooks.sh`:
  - `git config core.hooksPath tools/git-hooks`를 설정하여 저장소 클론 후 1초 만에 훅을 활성화.

### 3.2. 원격 2차 방어: PR 자동화 CI 품질 게이트 (`.github/workflows/ci.yml`)
`main`을 타깃으로 열리는 모든 PR에서 자동으로 실행되며, 다음 4개 항목을 전수 검사합니다:
1. **JS 구문 검증**: `node -c web/app.js`, `node -c web/data.js`
2. **CSS 구문 검증**: `web/style.css` 괄호 균형 및 포맷 무결성 검증
3. **데이터 빌드 동기화 검증**:
   - `python3 tools/build_data.py`를 실행한 후 `git diff --exit-code`를 통해 `web/trees.json`, `web/data.js`, `docs/수목120-학습노트.md`, `docs/수목120-학습자료.csv`가 완전히 일치하는지 검증 (누군가 `trees.json`만 수정하고 `build_data.py`를 실행하지 않은 채 PR을 올리는 실수를 100% 차단)
4. **저장소 아키텍처 및 의존성 규칙 검증**:
   - `package.json`, `package-lock.json`, `node_modules` 유입 차단 (Zero-Dependency 원칙)
   - `web/index.html` 내 외부 CDN 스크립트/링크 유입 차단
   - 80MB 초과 대용량 ZIP이나 `dist/` 빌드 아티팩트 커밋 차단

### 3.3. 원격 3차 방어: GitHub Branch Protection Ruleset
- **Restrict direct pushes**: `main` 브랜치에 직접 푸시 및 웹 UI 직접 커밋 불가.
- **Require a pull request before merging**: 모든 변경은 PR을 거쳐야 함.
- **Require status checks to pass**: `CI Quality Gate` 워크플로우 통과가 필수 조건으로 등록됨.
- **Require linear history**: 머지 커밋 난립을 방지하고 깔끔한 선형 로그 유지.
- **Do not allow bypassing the above settings (`enforce_admins: true`)**: 저장소 관리자(Admin)도 예외 없이 동일 규칙 적용.

---

## 4. 브랜치 명명 규칙 및 라이프사이클

### 4.1. 브랜치 명명 규칙 (Branch Naming Conventions)
Conventional Commits의 `type` 및 `scope`와 일치하도록 명명합니다:

| 브랜치 접두어 | 설명 | 브랜치명 예시 |
|---|---|---|
| `feat/` | 새로운 기능, 퀴즈 모드, UI 컴포넌트 추가 | `feat/quiz-timer-custom` |
| `fix/` | 버그, 렌더링 오류, 터치/스크롤 오류 수정 | `fix/safari-overlay-bounce` |
| `data/` | 수목 데이터(학명, 과명, 형태설명), 도감 사진 매핑 | `data/tree-012-katsura-update` |
| `docs/` | `docs/` 명세, 학습노트, README, 가이드라인 수정 | `docs/branching-strategy-spec` |
| `style/` | CSS 스타일, 여백, 모바일 반응형 디자인 조정 | `style/mobile-intro-padding` |
| `refactor/` | 코드 구조 개선, 모듈 분리 (기능 변경 없음) | `refactor/exam-session-state` |
| `perf/` | 성능 최적화, 이미지 지연 로딩, 메모리 누수 방지 | `perf/photo-virtual-grid` |
| `ci/` | GitHub Actions 워크플로우, 린터, 빌드 스크립트 수정 | `ci/add-pr-quality-gate` |
| `chore/` | 패키징 스크립트, .gitignore, 템플릿 등 잡무 | `chore/update-readme-badges` |

### 4.2. 일상 개발 라이프사이클 (Step-by-Step)

```bash
# 1. main 최신화
git checkout main
git pull origin main

# 2. 작업 브랜치 생성 및 체크아웃
git checkout -b feat/quiz-timer-custom

# 3. 코드/데이터 수정 및 자체 검증
node -c web/app.js
python3 tools/build_data.py
git status

# 4. 커밋 (pre-commit 훅 자동 검증 수행)
git add .
git commit -m "feat(quiz): 퀴즈 상영 시간 커스텀 설정 기능 추가"

# 5. 원격 브랜치 푸시
git push origin feat/quiz-timer-custom

# 6. GitHub PR 생성 (CLI 또는 웹)
gh pr create --title "feat(quiz): 퀴즈 상영 시간 커스텀 설정 기능 추가" --body "..."

# 7. CI Quality Gate 자동 검증 통과 대기
gh pr checks

# 8. Squash Merge 및 원격 브랜치 자동 삭제
gh pr merge --squash --delete-branch
```

---

## 5. 병합(Merge) 및 릴리즈 정책

1. **Squash & Merge 채택**:
   - 피처 브랜치에서의 자잘한 작업 커밋들(`WIP`, `fix typo` 등)은 하나로 압축(Squash)되어 `main`에는 의미 있는 단일 Conventional Commit으로 기록됩니다.
   - `git log --oneline`이 깔끔한 릴리즈 노트처럼 유지되어 추적성과 롤백이 극대화됩니다.
2. **머지 후 피처 브랜치 자동 삭제 (`delete_branch_on_merge`)**:
   - 머지가 완료된 피처 브랜치는 GitHub에서 자동으로 삭제되어 불필요한 브랜치가 누적되지 않습니다.
3. **오프라인 패키지 공식 릴리즈 (`release.yml`)**:
   - `main` 브랜치가 충분히 검증되고 새 버전 배포가 필요할 때 버전 태그를 발행합니다:
     ```bash
     git checkout main && git pull origin main
     git tag v1.0.1
     git push origin v1.0.1
     ```
   - GitHub Actions가 82MB 무설치 오프라인 ZIP을 빌드하여 GitHub Releases에 자동 등록합니다.

---

## 6. 변경 이력 (Changelog)

- **2026-10-28**: 10년차 이상 시니어 엔지니어링 표준 PR-Gated GitHub Flow 및 3중 안전망 아키텍처 최초 수립.
