# 🌿 조경기능사 실기 수목감별 120

> **국가기술자격 조경기능사 및 나무의사 2차 실기 시험 대비 120종 수목 실전 감별 학습 웹 애플리케이션**

[![Deploy GitHub Pages](https://github.com/unizune/tree120/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/unizune/tree120/actions/workflows/deploy-pages.yml)
[![Build and Release Package](https://github.com/unizune/tree120/actions/workflows/release.yml/badge.svg)](https://github.com/unizune/tree120/actions/workflows/release.yml)

---

## 📖 프로젝트 소개

본 프로젝트는 조경기능사 실기 시험의 핵심 관문인 **수목감별 120종**을 스마트폰, 태블릿, PC 어디서든 효과적으로 암기하고 실전 모의고사를 치를 수 있도록 제작된 웹 애플리케이션입니다.

- **Zero-Dependency & Offline-First**: 외부 라이브러리(React/Vue/jQuery 등)나 빌드 도구 없이 바닐라 HTML/CSS/JS로 구현되어 인터넷 연결 없이도 로컬에서 100% 작동합니다.
- **Zero-Hint 실전 감별**: 문제 출제 시 형태적 텍스트 단서(스포일러)를 배제하고 실물 도감 사진의 형태만 보고 맞히는 실전 시험 환경을 제공합니다.
- **공공 데이터 연계**: 사이버 수목원(`treeworld.co.kr`) 공공 식물 데이터 및 파이팅혼공TV 유튜브 실기 강의 기반으로 검증된 데이터셋을 탑재했습니다.

---

## 🚀 바로 이용하기

- **웹에서 바로 학습 (GitHub Pages)**:
  👉 `https://unizune.github.io/tree120/` *(GitHub Pages 활성화 후 이용 가능)*
- **무설치 오프라인 패키지 다운로드 (GitHub Releases)**:
  👉 [최신 릴리즈 다운로드 (Releases)](https://github.com/unizune/tree120/releases)에서 `조경기능사_수목감별120_학습패키지.zip` 다운로드 후 압축 해제

---

## ✨ 주요 기능

1. **수목 도감 (120종)**
   - 120종 수목의 학명, 과명, 4대 형태학적 특징(잎, 꽃, 열매, 수형/줄기)
   - 467장의 부위별 실물 고해상도 사진 수록 및 고화질 확대 지원
   - 국명 검색 및 번호대별 필터링 기능
2. **랜덤 실전 퀴즈**
   - 2열 그리드 사진 동시 노출 (All-in-One)
   - 4지선다 및 주관식(직접 입력) 모드 지원
   - 정답 시 파티클 폭죽 애니메이션 및 화면 중앙 피드백 오버레이
3. **오답 복습 노트**
   - 틀린 수목만 별도 수집하여 집중 재학습
4. **학습 통계 대시보드**
   - 전체 정답률, 120종 마스터 진도율, 취약 수목 Top 8, 누적 응시 기록

---

## 💻 로컬 실행 방법

별도의 설치 과정 없이 웹 브라우저로 바로 실행할 수 있습니다.

```bash
# 1. 저장소 클론
git clone https://github.com/unizune/tree120.git
cd tree120

# 2. 로컬 웹 서버 실행 (Python 3 내장 서버 권장)
python3 -m http.server 8080 -d web

# 3. 브라우저 접속: http://localhost:8080
```

또는 `web/index.html` 파일을 더블 클릭하여 바로 열람할 수 있습니다.

---

## 🛠️ 오프라인 배포 패키지 빌드

```bash
chmod +x tools/build_package.sh
./tools/build_package.sh
```
`dist/조경기능사_수목감별120_학습패키지.zip`이 자동 생성됩니다.

---

## 📝 커밋 메시지 컨벤션 (Commit Convention)

본 프로젝트는 [Conventional Commits](https://www.conventionalcommits.org/) 표준을 따릅니다:

```
<type>(<scope>): <subject>

[본문 (선택)]
```

| 타입 (Type) | 설명 | 예시 |
|---|---|---|
| `feat` | 새로운 기능 추가 | `feat(quiz): 주관식 입력 시 자동 완성 지원` |
| `fix` | 버그 수정 | `fix(overlay): 모바일 터치 시 오버레이 중복 닫힘 수정` |
| `docs` | 문서 수정 | `docs: README 실행 방법 보완` |
| `style` | 코드 서식 및 포맷팅 (로직 변경 없음) | `style(css): 반응형 패딩 규격 정리` |
| `refactor` | 코드 리팩토링 | `refactor(app): 퀴즈 상태 관리 로직 모듈화` |
| `data` | 수목 데이터 및 이미지 수정 | `data(trees): 045번 산수유 학명 오탈자 수정` |
| `ci` | CI/CD 설정 및 워크플로우 수정 | `ci(pages): GitHub Pages 배포 설정 업데이트` |
| `chore` | 빌드, 패키징 스크립트 및 잡무 | `chore(release): 패키징 템플릿 스크립트 갱신` |

---

## 📄 라이선스 및 출처

- 본 프로그램의 수목 데이터는 산림청 국립수목원 사이버 수목원(`treeworld.co.kr`) 및 파이팅혼공TV 유튜브 실기 강의를 기반으로 학습용으로 제작되었습니다.
