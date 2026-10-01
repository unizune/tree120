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

1. **Zero-Dependency (외부 의존성 없음)**:
   - 외부 프레임워크(React, Vue 등), 번들러(Webpack, Vite 등), 외부 CDN 라이브러리(jQuery, Bootstrap, Lodash 등)를 절대로 추가하지 않습니다.
   - 브라우저만으로 100% 실행 가능한 순수 바닐라 HTML5, CSS3, ES6+ JS 환경을 유지합니다.
2. **Zero-Hint 실전 감별 (힌트 배제)**:
   - 퀴즈 문제 풀이 화면에는 학명, 과명, 텍스트 형태 설명 등 스포일러가 될 수 있는 어떠한 텍스트 단서도 미리 노출되어서는 안 됩니다.
   - 오직 실물 도감 사진의 형태적 특징만 관찰하여 동정(Identification)하도록 유도합니다.
3. **Offline-First (오프라인 완벽 구동)**:
   - 인터넷 연결이 없는 상태에서도 120종 도감 열람, 랜덤 퀴즈, 오답 노트, 통계가 온전히 동작해야 합니다.
4. **저장소 경량화 (No Heavy Binaries in Git)**:
   - 82MB ZIP 파일이나 `dist/` 빌드 산출물, 임시 캡처 프레임은 Git 저장소에 커밋하지 않고, GitHub Releases 자산으로 분리 관리합니다.

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

# 2. 로컬 웹 서버 실행 (Python 3 내장 서버 사용)
python3 -m http.server 8080 -d web

# 3. 브라우저 접속
# http://localhost:8080
```

> **단순 열람**: `web/index.html` 파일을 더블 클릭하여 기본 웹 브라우저에서 바로 열 수도 있습니다.

---

## 4. Git 브랜치 전략 및 워크플로우

### 4.1. 메인 저장소 관리자
- 본 프로젝트는 오버헤드를 최소화하기 위해 **`main` 단독 브랜치 (Trunk-based)**로 운용합니다.
- `main` 브랜치에 코드가 푸시되면 자동으로 GitHub Pages에 웹앱이 무중단 배포됩니다.

### 4.2. 외부 기여자 (Pull Request)
1. 본 저장소를 개인 GitHub 계정으로 **Fork**합니다.
2. 기능별 작업 브랜치를 생성합니다:
   ```bash
   git checkout -b feature/quiz-hint-option
   # 또는 버그 수정 시
   git checkout -b fix/mobile-overlay-scroll
   ```
3. 작업을 완료하고 검증 명령을 통과한 후 커밋합니다.
4. 개인 Fork 저장소에 푸시 후, `main` 브랜치를 대상으로 **Pull Request (PR)**를 생성합니다.
5. PR 설명에 변경 이유와 테스트 결과를 상세히 기재합니다.

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
- `quiz`: 실전 모의 감별 퀴즈
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
  - `수목120-학습노트.md`
  - `수목120-학습자료.csv`

---

## 7. 품질 검증 및 테스트 체크리스트

코드를 커밋하거나 PR을 제출하기 전 반드시 다음 검증을 수행하십시오:

```bash
# 1. JavaScript 문법 검증
node -c web/app.js

# 2. CSS 문법 및 괄호 매칭 검증
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
console.log('✅ CSS 검증 통과!');
"
```

### ✅ 사전 점검 체크리스트
- [ ] 외부 CDN이나 npm 의존성이 추가되지 않았는가?
- [ ] 퀴즈 풀이 화면에 학명, 과명 등의 힌트 스포일러가 없는가?
- [ ] 모바일 터치 타깃(최소 44px 이상)이 확보되었는가?
- [ ] Canvas 애니메이션이나 전역 이벤트 리스너의 `cleanup` 로직이 누락되지 않았는가?
- [ ] 82MB ZIP 파일이나 `dist/` 폴더가 Git 스테이지에 포함되지 않았는가?

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
