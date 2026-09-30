#!/bin/bash
set -e

# 스크립트 위치 기준으로 프로젝트 루트 찾기
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

PACKAGE_DIR="dist/조경기능사_수목감별120_학습패키지"
ZIP_NAME="조경기능사_수목감별120_학습패키지.zip"

echo "========================================================"
echo "📦 수목감별 120 오프라인 학습 패키지 빌드 시작"
echo "========================================================"

# 1. dist 디렉토리 준비
rm -rf "$PACKAGE_DIR" "dist/$ZIP_NAME"
mkdir -p "$PACKAGE_DIR"

# 2. web 정적 자산 복사
echo "▶ 웹앱 자산 복사 중..."
cp -R web/* "$PACKAGE_DIR/"

# 3. 패키지 전용 템플릿(실행기, 사용안내) 복사
echo "▶ 실행기 및 안내 문서 복사 중..."
cp tools/package_template/* "$PACKAGE_DIR/"

# 4. Mac 실행 권한 부여
chmod +x "$PACKAGE_DIR/실행하기_Mac.command"

# 5. ZIP 압축 파일 생성
echo "▶ 배포용 ZIP 압축 파일 생성 중..."
cd dist
zip -q -r "$ZIP_NAME" "조경기능사_수목감별120_학습패키지"
cd "$PROJECT_ROOT"

ZIP_SIZE=$(ls -lh "dist/$ZIP_NAME" | awk '{print $5}')
echo "========================================================"
echo "✅ 빌드 완료!"
echo "   - 패키지 폴더: $PACKAGE_DIR"
echo "   - 배포용 ZIP: dist/$ZIP_NAME ($ZIP_SIZE)"
echo "========================================================"
