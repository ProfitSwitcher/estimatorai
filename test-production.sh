#!/bin/bash
# Test production EstimatorAI endpoint

BASE_URL="https://estimatorai.com"
EMAIL="test@alviselectrical.com"
PASSWORD="password"

echo "🧪 Testing EstimatorAI Production..."
echo ""

# Step 1: Get CSRF token and login
echo "1️⃣ Logging in..."
CSRF_RESPONSE=$(curl -s -c /tmp/cookies.txt "${BASE_URL}/api/auth/csrf")
CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | grep -o '"csrfToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$CSRF_TOKEN" ]; then
  echo "❌ Failed to get CSRF token"
  echo "Response: $CSRF_RESPONSE"
  exit 1
fi

# Login
LOGIN_RESPONSE=$(curl -s -b /tmp/cookies.txt -c /tmp/cookies.txt \
  -X POST "${BASE_URL}/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "email=${EMAIL}&password=${PASSWORD}&csrfToken=${CSRF_TOKEN}&json=true")

echo "Login response: ${LOGIN_RESPONSE:0:200}"
echo ""

# Step 2: Test estimate generation
echo "2️⃣ Testing estimate generation (this should take ~10-13 seconds)..."
START_TIME=$(date +%s)

ESTIMATE_RESPONSE=$(curl -s -b /tmp/cookies.txt \
  -X POST "${BASE_URL}/api/estimates/generate" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Install 3 ceiling fans in living room, dining room, and master bedroom. Need electrical boxes installed and wiring run from existing circuits.",
    "photos": [],
    "projectType": "electrical",
    "location": "US"
  }')

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "⏱️  Request took ${DURATION} seconds"
echo ""

# Parse response
if echo "$ESTIMATE_RESPONSE" | grep -q '"success":true'; then
  echo "✅ SUCCESS! Estimate generated!"
  echo ""
  echo "Response preview:"
  echo "$ESTIMATE_RESPONSE" | head -c 500
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ PRODUCTION TEST PASSED!"
  echo "The estimate generation works end-to-end!"
  exit 0
elif echo "$ESTIMATE_RESPONSE" | grep -q '"error"'; then
  echo "❌ FAILED - Got error response:"
  echo "$ESTIMATE_RESPONSE" | head -c 1000
  echo ""
  exit 1
else
  echo "⚠️  Unexpected response:"
  echo "$ESTIMATE_RESPONSE" | head -c 1000
  echo ""
  exit 1
fi
