#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
HOOK_DIR="$PROJECT_ROOT/.git/hooks"
PRE_COMMIT="$HOOK_DIR/pre-commit"
PRE_PUSH="$HOOK_DIR/pre-push"

if [ ! -d "$HOOK_DIR" ]; then
  echo "ℹ️  .git/hooks 디렉토리가 없어 Git 훅 설치를 건너뜁니다."
  exit 0
fi

# -----------------------------------------------------------------------------
# 1. pre-commit 훅 생성
# -----------------------------------------------------------------------------
cat << 'EOF' > "$PRE_COMMIT"
#!/bin/bash
set -e

echo "========================================================"
echo "🛡️  [Pre-commit Harness] 커밋 전 무결성 및 가드레일 검증"
echo "========================================================"

# 1. main 브랜치 직접 커밋 방지 가드레일
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || git rev-parse --abbrev-ref HEAD 2>/dev/null || true)
if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "master" ]; then
  echo "❌ [FAIL] 'main' 브랜치에 직접 커밋할 수 없습니다!"
  echo "   ├─ 💡 [FIX]: 'git checkout -b feat/<기능명>' 명령으로 피처 브랜치를 생성해 주세요."
  echo "   ├─ 💡 [FIX]: 현재 스테이징된 변경 사항은 브랜치를 새로 만들어도 그대로 유지됩니다."
  echo "   └─ 📖 [REF]: docs/branching-strategy-spec.md (PR 기반 브랜치 보호 전략)"
  exit 1
fi

# 2. 대용량 산출물 및 개발 의존성 스테이징 차단 가드레일
FORBIDDEN_FILES=$(git diff --cached --name-only | grep -E '^(dist/|node_modules/|research/frames/)|\.zip$|\.tar\.gz$' || true)
if [ -n "$FORBIDDEN_FILES" ]; then
  echo "❌ [FAIL] Git 저장소에 커밋할 수 없는 대용량/빌드 파일이 스테이징되어 있습니다:"
  echo "$FORBIDDEN_FILES" | sed 's/^/   - /'
  echo "   ├─ 💡 [FIX]: git reset HEAD <파일경로> 명령으로 스테이징을 해제하세요."
  echo "   └─ 📖 [REF]: AGENTS.md (10.5절 대용량 바이너리 Git 커밋 금지)"
  exit 1
fi

# 3. 데이터 파이프라인 동기화 검증 (trees.json 변경 시 data.js 동반 스테이징 확인)
TREES_STAGED=$(git diff --cached --name-only | grep -E '^web/trees\.json$' || true)
DATA_STAGED=$(git diff --cached --name-only | grep -E '^web/data\.js$' || true)
if [ -n "$TREES_STAGED" ] && [ -z "$DATA_STAGED" ]; then
  echo "❌ [FAIL] web/trees.json이 수정되었으나 web/data.js가 함께 스테이징되지 않았습니다!"
  echo "   ├─ 💡 [FIX]: python3 tools/build_data.py 실행 후 git add web/data.js docs/ 명령을 수행하세요."
  echo "   └─ 📖 [REF]: AGENTS.md (10.8절 데이터 동기화 빌드 검증)"
  exit 1
fi

# 4. Tier-1 Fast 하네스 검증 실행 (ESLint + Stylelint + verify_ui.js)
if [ -d "node_modules" ]; then
  npm run verify:fast
else
  node tools/verify_ui.js
fi

echo "✅ [Pre-commit Harness] 모든 로컬 검증을 통과했습니다."
EOF

chmod +x "$PRE_COMMIT"
echo "✅ Git pre-commit 하네스 훅 설치 완료: $PRE_COMMIT"

# -----------------------------------------------------------------------------
# 2. pre-push 훅 생성 (main 직접 푸시 원천 차단)
# -----------------------------------------------------------------------------
cat << 'EOF' > "$PRE_PUSH"
#!/bin/bash
set -e

# git push 시 stdin으로 넘어오는 타깃 브랜치 감시
while read -r local_ref local_sha remote_ref remote_sha; do
  if [ "$remote_ref" = "refs/heads/main" ] || [ "$remote_ref" = "refs/heads/master" ]; then
    echo "========================================================"
    echo "🛑 [Pre-push Guard] 원격 'main' 브랜치 직접 푸시 차단"
    echo "========================================================"
    echo "❌ [FAIL] 원격 'main' 브랜치로 직접 푸시(push)할 수 없습니다!"
    echo "   ├─ 💡 [FIX]: 작업 브랜치(feat/*, fix/* 등)를 원격에 푸시하고 PR을 생성하세요."
    echo "   ├─ 💡 [CLI]: git push origin HEAD && gh pr create --base main"
    echo "   └─ 📖 [REF]: docs/branching-strategy-spec.md (PR 기반 브랜치 보호 전략)"
    exit 1
  fi
done

exit 0
EOF

chmod +x "$PRE_PUSH"
echo "✅ Git pre-push 하네스 훅 설치 완료: $PRE_PUSH"
