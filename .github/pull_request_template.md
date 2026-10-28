## 📌 PR 개요 및 목적 (Summary & Goal)
<!-- 이 PR에서 해결하려는 문제, 추가된 기능 또는 개선 사항을 간략히 설명해 주세요. -->

- **작업 유형**: `[feat / fix / data / docs / style / refactor / perf / ci / chore]`
- **관련 이슈 / 논의**: 

---

## 📚 관련 설계 근거 문서 (Documentation-First)
<!-- 본 변경의 도메인/기술적 근거가 기록된 docs/ 하위 마크다운 문서를 링크해 주세요. -->
- 근거 문서: [`docs/...`](docs/README.md)

---

## 🛠️ 주요 변경 사항 (Key Changes)
<!-- 주요 코드, 데이터, 스타일 등의 변경 내역을 요약해 주세요. -->
- 
- 
- 

---

## ✅ 사전 품질 검증 체크리스트 (Quality Checklist)
<!-- PR을 제출하기 전 로컬에서 모든 항목을 점검하고 체크([x])해 주세요. -->

- [ ] **브랜치 격리**: `main` 브랜치에 직접 커밋하지 않고 피처 브랜치(`feat/*`, `fix/*`, `data/*` 등)에서 작업했는가?
- [ ] **하네스 검증 통과**: `npm run verify:fast` (ESLint + Stylelint + verify_ui 39개 불변식)가 100% 통과했는가?
- [ ] **실제 브라우저 E2E 검증**: `npm run verify:e2e` (Playwright Chromium + Axe 접근성 감사)를 통과했는가?
- [ ] **데이터 파이프라인 동기화**: `web/trees.json` 수정 시 `python3 tools/build_data.py`를 실행하여 `web/data.js` 및 학습문서와 일치시켰는가?
- [ ] **Runtime Zero-Dependency**: 배포 결과물(`web/`)에 외부 CDN 라이브러리나 런타임 프레임워크가 추가되지 않았는가?
- [ ] **Zero-Hint 실전 원칙**: 퀴즈 및 모의고사 문제 풀이 화면에 학명, 과명 등 스포일러 단서가 노출되지 않는가?
- [ ] **모바일 반응형 & 접근성**: 모바일 터치 타깃(최소 44px) 및 수직 스택 레이아웃 불변식이 유지되는가?
- [ ] **저장소 경량화**: `dist/` 빌드 폴더나 대용량 `.zip` 파일이 Git 추적에 포함되지 않았는가?
