#!/bin/bash
BASE_URL="http://localhost:5001"
COOKIE_FILE="cookies.txt"

echo "Testing API Routes on $BASE_URL"

# Login
echo "1. Logging in..."
curl -s -c $COOKIE_FILE -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}'
echo ""

# Inventory
echo "2. Testing GET /api/inventory..."
curl -v -b $COOKIE_FILE "$BASE_URL/api/inventory"
echo ""

# Incoming
echo "3. Testing GET /api/incoming..."
curl -v -b $COOKIE_FILE "$BASE_URL/api/incoming"
echo ""

# Outgoing
echo "4. Testing GET /api/outgoing..."
curl -v -b $COOKIE_FILE "$BASE_URL/api/outgoing"
echo ""

# Optical Cables
echo "5. Testing GET /api/optical-cables..."
curl -v -b $COOKIE_FILE "$BASE_URL/api/optical-cables"
echo ""

echo "Done."
rm $COOKIE_FILE
