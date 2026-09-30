#!/bin/bash
cd "$(dirname "$0")"
echo "========================================================"
echo "    🌿 조경기능사 실기 수목감별 120 학습기 실행 중...  "
echo "========================================================"
echo ""

# Find local IP
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "127.0.0.1")

echo "▶ PC(Mac) 브라우저 접속: http://localhost:8080"
echo "▶ 스마트폰 접속 (같은 Wi-Fi): http://${LOCAL_IP}:8080"
echo ""
echo "💡 브라우저가 자동으로 열립니다. 종료하려면 이 터미널 창을 닫으세요."
echo ""

(sleep 1 && open "http://localhost:8080") &
python3 -m http.server 8080 2>/dev/null || open "index.html"
