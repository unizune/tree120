#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
HOOK_DIR="$PROJECT_ROOT/.git/hooks"
PRE_COMMIT="$HOOK_DIR/pre-commit"

if [ ! -d "$HOOK_DIR" ]; then
  echo "ℹ️  .git/hooks 디렉토리가 없어 Git 훅 설치를 건너뜁니다."
  exit 0
fi

cat << 'EOF' > "$PRE_COMMIT"
#!/bin/bash
set -e

echo "========================================================"
echo "🛡️  [Pre-commit Harness] 커밋 전 무결성 및 가드레일 검증"
echo "========================================================"

# 1. 대용량 산출물 및 개발 의존성 스테이징 차단 가드레일
FORBIDDEN_FILES=$(git diff --cached --name-only | grep -E '^(dist/|node_modules/|research/frames/)|\.zip$|\.tar\.gz$' || true)
if [ -n "$FORBIDDEN_FILES" ]; then
  echo "❌ [FAIL] Git 저장소에 커밋할 수 없는 대용량/빌드 파일이 스테이징되어 있습니다:"
  echo "$FORBIDDEN_FILES" | sed 's/^/   - /'
  echo "   ├─ 💡 [FIX]: git reset HEAD <파일경로> 명령으로 스테이징을 해제하세요."
  echo "   └─ 📖 [REF]: AGENTS.md (10.5절 대용량 바이너리 Git 커밋 금지)"
  exit 1
fi

# 2. Tier-1 Fast 하네스 검증 실행 (ESLint + Stylelint + verify_ui.js)
if [ -d "node_modules" ]; then
  npm run verify:fast
else
  node tools/verify_ui.js
fi

echo "✅ [Pre-commit Harness] 모든 검증을 통과했습니다."
EOF

chmod +x "$PRE_COMMIT"
echo "✅ Git pre-commit 하네스 훅 설치 완료: $PRE_COMMIT"
