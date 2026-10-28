# 📚 프로젝트 설계 및 변경 근거 문서 (`docs/`)

본 디렉토리(`docs/`)는 **"조경기능사 실기 수목감별 120"** 프로젝트의 모든 기능 추가, 실제 시험 규정 조사 결과, 아키텍처 결정, 데이터 및 UI/UX 변경에 대한 **근거(Rationale & Decision Record)**를 체계적으로 기록·보존하는 공간입니다.

---

## 📌 문서화 원칙 (Documentation-First Policy)

1. **모든 변경에는 근거가 있어야 합니다**:
   - 새로운 기능을 추가하거나 기존 동작(타이머, 채점 기준, UI 흐름, 수목 데이터 등)을 변경할 때는 반드시 **"왜 이렇게 설계/변경했는가?"**에 대한 도메인 근거 또는 기술적 근거를 `docs/` 하위에 문서로 남깁니다.
2. **코드와 문서의 동기화**:
   - 기능이나 사양이 수정될 경우(예: 시험 환경 일치를 위한 일시정지 제거 등), 코드 수정과 함께 해당 `docs/` 문서의 설계 결정 내역도 같은 커밋 또는 작업 단위로 즉시 갱신합니다.
3. **표준 문서 구성 요소**:
   - **배경 및 목적 (Context & Goal)**
   - **도메인 조사 결과 / 참고 기준 (Domain Research & References)**
   - **설계 결정 및 구현 매핑 (Design Decisions & Implementation Mapping)**
   - **변경 이력 (Changelog)**

---

## 🗂️ 문서 목록 (Index)

| 문서 파일 | 주제 및 내용 요약 | 최초 작성일 | 최근 수정일 |
|---|---|---|---|
| [branching-strategy-spec.md](branching-strategy-spec.md) | **브랜치 보호 전략 및 PR 기반 개발 워크플로우 명세** (`main` 직접 커밋/푸시 금지, PR-Gated GitHub Flow, 3중 안전망 아키텍처 및 CI Quality Gate 자동화) | 2026-10-28 | 2026-10-28 |
| [webp-migration-spec.md](webp-migration-spec.md) | **수목 도감 사진 WebP 전면 전환 엔지니어링 명세** (181MB ➔ 126MB 초고화질 q90 + sharp_yuv 시각적 무손실 최적화, 24개 사진 EXIF 정방향 회전 Bake-in 교정, 110개 비표준 ICC sRGB 매칭, Zero-Dependency 파이프라인) | 2026-10-28 | 2026-10-28 |
| [harness-engineering-spec.md](harness-engineering-spec.md) | **AI 에이전틱 하네스 엔지니어링 설계 명세** (`Agent = Model + Harness` 원칙, 결과물 Zero-Dependency와 개발 하네스 분리, Tier-1 정적/드리프트 센서 & Tier-2 Playwright/Axe 실제 브라우저 E2E 아키텍처, 자가 치유형 에러 프로토콜) | 2026-10-28 | 2026-10-28 |
| [spa-usability-spec.md](spa-usability-spec.md) | **모던 SPA 6대 핵심 사용성 원칙 및 아키텍처 설계 명세** (해시 라우팅·History API 양방향 동기화, 모달 `pushState`/`replaceState` 하이브리드 전략, 활성 세션 보호 가드, 키보드 단축키 및 프리로드) | 2026-10-27 | 2026-10-27 |
| [mobile-responsive-spec.md](mobile-responsive-spec.md) | **모바일 반응형 UI 설계 기준 및 레이아웃 결함 포스트모템** (`.intro` 및 상단 5대 탭 깨짐 원인 분석, 브레이크포인트 규격, 방어적 CSS 5대 원칙 및 `tools/verify_ui.js` 4중 재발 방지 아키텍처) | 2026-10-27 | 2026-10-27 |
| [exam-simulation-spec.md](exam-simulation-spec.md) | **조경기능사 실기 수목감별 실제 시험 진행 규정 및 20선 실전 모의고사 설계 근거** (사진 제시 방식, 1·2차 노출 시간, 주관식 답안지 및 10점 만점 엄격 채점 기준) | 2026-10-26 | 2026-10-26 |
| [수목120-학습노트.md](수목120-학습노트.md) | **120종 수목 감별 종합 텍스트 학습 노트** (학명, 과명, 946장 부위별 사진, 핵심 감별 포인트 3가지, 4대 형태 특징 및 도감 링크) | 2026-10-04 | 2026-10-26 |
| [수목120-학습자료.csv](수목120-학습자료.csv) | **120종 수목 감별 스프레드시트 데이터셋** (엑셀/구글 시트 호환 UTF-8 BOM CSV) | 2026-10-04 | 2026-10-26 |
