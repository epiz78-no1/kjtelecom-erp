#!/bin/bash

# 자동 Git 동기화 스크립트
# 사용법: ./auto-sync.sh [커밋 메시지]

# 색상 정의
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  GitHub 자동 동기화 시작${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 현재 브랜치 확인
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${YELLOW}📍 현재 브랜치: ${CURRENT_BRANCH}${NC}"
echo ""

# 변경사항 확인
if [[ -z $(git status -s) ]]; then
    echo -e "${GREEN}✅ 변경사항이 없습니다.${NC}"
    exit 0
fi

# 변경된 파일 목록 표시
echo -e "${YELLOW}📝 변경된 파일:${NC}"
git status -s
echo ""

# 모든 변경사항 스테이징
echo -e "${BLUE}➕ 변경사항 스테이징 중...${NC}"
git add -A

# 커밋 메시지 설정
if [ -z "$1" ]; then
    # 커밋 메시지가 제공되지 않은 경우 자동 생성
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    COMMIT_MSG="Auto-sync: ${TIMESTAMP}"
else
    COMMIT_MSG="$1"
fi

# 커밋
echo -e "${BLUE}💾 커밋 중: ${COMMIT_MSG}${NC}"
git commit -m "$COMMIT_MSG"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ 커밋 실패${NC}"
    exit 1
fi

# 원격 저장소에서 최신 변경사항 가져오기
echo -e "${BLUE}⬇️  원격 저장소 변경사항 확인 중...${NC}"
git fetch origin

# Pull (rebase 방식으로)
echo -e "${BLUE}🔄 원격 변경사항 병합 중...${NC}"
git pull --rebase origin $CURRENT_BRANCH

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Pull 실패 - 충돌을 해결해주세요${NC}"
    exit 1
fi

# Push
echo -e "${BLUE}⬆️  GitHub에 푸시 중...${NC}"
git push origin $CURRENT_BRANCH

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  ✅ GitHub 동기화 완료!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${BLUE}🔗 저장소: https://github.com/epiz78-no1/kjtelecom-erp${NC}"
else
    echo -e "${RED}❌ Push 실패${NC}"
    exit 1
fi
