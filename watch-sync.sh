#!/bin/bash

# 파일 변경 감지 및 자동 동기화 스크립트
# 사용법: ./watch-sync.sh [감시 간격(초), 기본값: 30]

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# 감시 간격 설정 (기본 30초)
INTERVAL=${1:-30}

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  🔍 파일 변경 감시 시작${NC}"
echo -e "${CYAN}  감시 간격: ${INTERVAL}초${NC}"
echo -e "${CYAN}  종료: Ctrl+C${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 마지막 커밋 해시 저장
LAST_COMMIT=$(git rev-parse HEAD)

while true; do
    # 변경사항 확인
    if [[ -n $(git status -s) ]]; then
        TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
        echo -e "${YELLOW}⚡ [${TIMESTAMP}] 변경사항 감지!${NC}"
        
        # 자동 동기화 실행
        ./auto-sync.sh "Auto-sync: ${TIMESTAMP}"
        
        if [ $? -eq 0 ]; then
            LAST_COMMIT=$(git rev-parse HEAD)
            echo -e "${GREEN}✅ 동기화 완료${NC}"
        fi
        echo ""
    else
        TIMESTAMP=$(date '+%H:%M:%S')
        echo -e "${BLUE}[${TIMESTAMP}] 변경사항 없음 - 대기 중...${NC}"
    fi
    
    # 지정된 간격만큼 대기
    sleep $INTERVAL
done
