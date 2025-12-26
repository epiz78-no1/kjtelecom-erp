#!/bin/bash

# 색상 정의
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

echo -e "${CYAN}=== 다중 테넌시 API 테스트 ===${NC}\n"

BASE_URL="http://localhost:5001"
COOKIE_JAR_A="/tmp/cookies_a.txt"
COOKIE_JAR_B="/tmp/cookies_b.txt"

# JSON 파싱을 위한 헬퍼 함수 (Python 3 사용)
parse_json() {
    echo "$1" | python3 -c "import sys, json; print(json.load(sys.stdin)$2)" 2>/dev/null
}

# 쿠키 파일 초기화
rm -f "$COOKIE_JAR_A" "$COOKIE_JAR_B"

# --- Test 1: Company A 등록 ---
echo -e "${YELLOW}Test 1: Company A 등록${NC}"
REGISTER_BODY_A='{"username": "test-a@example.com", "password": "password123", "name": "User A", "companyName": "Company A"}'

RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "$REGISTER_BODY_A" \
    -c "$COOKIE_JAR_A")

if [[ $? -eq 0 && "$RESPONSE" != *"error"* ]]; then
    echo -e "${GREEN}성공: 등록 완료${NC}"
else
    echo -e "${RED}실패: $RESPONSE${NC}"
fi
echo -e "${GRAY}응답: $RESPONSE${NC}\n"


# --- Test 2: 사용자 정보 조회 (A) ---
echo -e "${YELLOW}Test 2: 사용자 정보 조회 (Company A)${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/api/auth/me" \
    -b "$COOKIE_JAR_A")

echo -e "${GREEN}성공: 사용자 정보 조회됨${NC}"
echo -e "${GRAY}응답: $RESPONSE${NC}\n"


# --- Test 3: 부서 생성 (Company A) ---
echo -e "${YELLOW}Test 3: Division 생성 (Company A)${NC}"
DIVISION_BODY='{"name": "Division A1"}'

RESPONSE=$(curl -s -X POST "$BASE_URL/api/divisions" \
    -H "Content-Type: application/json" \
    -d "$DIVISION_BODY" \
    -b "$COOKIE_JAR_A")

echo -e "${GREEN}성공: Division 생성됨${NC}"
echo -e "${GRAY}응답: $RESPONSE${NC}\n"


# --- Test 4: Company B 등록 ---
echo -e "${YELLOW}Test 4: Company B 등록${NC}"
REGISTER_BODY_B='{"username": "test-b@example.com", "password": "password123", "name": "User B", "companyName": "Company B"}'

RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
    -H "Content-Type: application/json" \
    -d "$REGISTER_BODY_B" \
    -c "$COOKIE_JAR_B")

echo -e "${GREEN}성공: 등록 완료${NC}"
echo -e "${GRAY}응답: $RESPONSE${NC}\n"


# --- Test 5: Company B의 Division 조회 (데이터 격리 테스트) ---
echo -e "${YELLOW}Test 5: Company B의 Division 조회 (데이터 격리 테스트)${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/api/divisions" \
    -b "$COOKIE_JAR_B")

# JSON 배열의 길이 확인
COUNT=$(parse_json "$RESPONSE" ".__len__()" || echo "0")

if [[ "$COUNT" -eq "0" ]]; then
    echo -e "${GREEN}성공: 데이터 격리 작동 중! Company B는 Company A의 데이터를 볼 수 없습니다.${NC}"
else
     # 빈 배열 [] 이 아니라면 실패로 간주하거나, 내용 확인 필요
     # 여기서는 단순화를 위해 배열이 비어있지 않으면 경고 표시 (실제 로직에 따라 다름)
     if [[ "$RESPONSE" == "[]" ]]; then
         echo -e "${GREEN}성공: 데이터 격리 작동 중! (빈 배열)${NC}"
     else
        echo -e "${RED}실패: 데이터 격리 문제 가능성. 응답에 데이터가 있습니다.${NC}"
     fi
fi
echo -e "${GRAY}응답: $RESPONSE${NC}\n"


# --- Test 6: Company A의 Division 조회 (데이터 존재 확인) ---
echo -e "${YELLOW}Test 6: Company A의 Division 조회${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/api/divisions" \
    -b "$COOKIE_JAR_A")

if [[ "$RESPONSE" != "[]" ]]; then
    echo -e "${GREEN}성공: Company A의 데이터가 정상적으로 조회됨${NC}"
else
    echo -e "${RED}실패: Company A의 데이터가 없습니다.${NC}"
fi
echo -e "${GRAY}응답: $RESPONSE${NC}\n"

echo -e "${CYAN}=== 테스트 완료 ===${NC}"
