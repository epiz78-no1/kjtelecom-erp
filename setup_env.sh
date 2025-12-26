#!/bin/bash

# 색상 정의
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== macOS 개발 환경 설정 스크립트 ===${NC}"

# 1. Homebrew 확인 및 설치
if ! command -v brew &> /dev/null; then
    echo -e "${YELLOW}Homebrew가 설치되어 있지 않습니다. 설치를 시작합니다...${NC}"
    echo -e "${YELLOW}설치 과정 중 비밀번호 입력이 필요할 수 있습니다.${NC}"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Path 설정 (Apple Silicon / Intel 분기 처리)
    if [[ -f /opt/homebrew/bin/brew ]]; then
        eval "$(/opt/homebrew/bin/brew shellenv)"
    elif [[ -f /usr/local/bin/brew ]]; then
        eval "$(/usr/local/bin/brew shellenv)"
    fi
else
    echo -e "${GREEN}Homebrew가 이미 설치되어 있습니다.${NC}"
fi

# 2. Node.js 확인 및 설치
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js가 설치되어 있지 않습니다. Homebrew를 통해 설치합니다...${NC}"
    brew install node
else
    echo -e "${GREEN}Node.js가 이미 설치되어 있습니다. ($(node -v))${NC}"
fi

# 3. 의존성 설치
if [ -f "package.json" ]; then
    echo -e "${YELLOW}프로젝트 의존성을 설치합니다 (npm install)...${NC}"
    npm install
else
    echo -e "${RED}package.json을 찾을 수 없습니다. 올바른 디렉토리에서 실행해주세요.${NC}"
fi

echo -e "${GREEN}=== 설정 완료 ===${NC}"
echo -e "${GREEN}이제 'npm run dev'로 서버를 실행하거나 './test-api.sh'로 테스트를 진행할 수 있습니다.${NC}"
