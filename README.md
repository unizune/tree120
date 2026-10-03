# 🌿 조경기능사 실기 수목감별 120

> **국가기술자격 조경기능사 및 나무의사 2차 실기 시험 대비 120종 수목 실전 감별 학습 웹 애플리케이션**

[![Deploy GitHub Pages](https://github.com/unizune/tree120/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/unizune/tree120/actions/workflows/deploy-pages.yml)
[![Build and Release Package](https://github.com/unizune/tree120/actions/workflows/release.yml/badge.svg)](https://github.com/unizune/tree120/actions/workflows/release.yml)

---

## 📖 프로젝트 소개

본 프로젝트는 조경기능사 실기 시험의 핵심 관문인 **수목감별 120종**을 스마트폰, 태블릿, PC 어디서든 효과적으로 암기하고 실전 모의고사를 치를 수 있도록 제작된 웹 애플리케이션입니다.

- **Zero-Dependency & Offline-First**: 외부 라이브러리(React/Vue/jQuery 등)나 빌드 도구 없이 바닐라 HTML/CSS/JS로 구현되어 인터넷 연결 없이도 로컬에서 100% 작동합니다.
- **Zero-Hint 실전 감별**: 문제 출제 시 형태적 텍스트 단서(스포일러)를 배제하고 실물 도감 사진의 형태만 보고 맞히는 실전 시험 환경을 제공합니다.
- **공공 데이터 연계**: 산림청 국립수목원 국가생물종지식정보시스템(`nature.go.kr`), 사이버 수목원(`treeworld.co.kr`) 공공 식물 데이터, 위키백과 및 파이팅혼공TV 유튜브 실기 강의 기반으로 검증된 데이터셋을 탑재했습니다.

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
   - **946장의 부위별 실물 고해상도 사진**(사이버수목원 467장 + 국립수목원 479장) 수록 및 고화질 확대 지원
   - 5대 부위(잎, 꽃, 열매, 줄기·수형, 기타) 필터 칩 및 사진별 촬영 메타데이터(촬영자, 일자, 장소) 지원
   - 국명 검색 및 번호대별 필터링 기능
2. **랜덤 실전 퀴즈**
   - 946장 사진 풀에서 부위별 무작위 조합 자동 출제 (Dynamic Photo Sampling)
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

## 🤝 기여하기 (Contributing)

프로젝트에 기여하고 싶으신가요? 수목 데이터 수정, UI 개선, 버그 제보 등 모든 기여를 환영합니다!  
상세한 개발 환경 설정, 커밋 컨벤션 및 품질 검증 체크리스트는 **[기여 가이드라인 (CONTRIBUTING.md)](CONTRIBUTING.md)** 문서를 확인해 주세요.

### 📝 커밋 메시지 컨벤션 요약
본 프로젝트는 [Conventional Commits](https://www.conventionalcommits.org/) 표준을 준수합니다:

```
<type>(<scope>): <subject>
```
- 주요 타입: `feat`(기능 추가), `fix`(버그 수정), `data`(수목 데이터/학명/이미지 매핑), `docs`(문서), `style`(서식), `refactor`(리팩토링), `ci`(CI/CD), `chore`(빌드/패키징)
- 자세한 스코프 및 작성 예시는 [CONTRIBUTING.md#5-커밋-메시지-컨벤션](CONTRIBUTING.md#5-커밋-메시지-컨벤션-commit-convention)을 참고하세요.

---

## 📄 라이선스 및 출처

- 본 프로그램의 수목 데이터는 산림청 국립수목원 사이버 수목원(`treeworld.co.kr`) 및 파이팅혼공TV 유튜브 실기 강의를 기반으로 학습용으로 제작되었습니다.
