#!/bin/bash
# Test production EstimatorAI endpoint with bypass header

BASE_URL="https://estimatorai.com"

echo "🧪 Testing EstimatorAI Production (with bypass header)..."
echo ""

echo "1️⃣ Testing estimate generation endpoint..."
echo "   This should complete in ~8-10 seconds with streaming..."
START_TIME=$(date +%s)

ESTIMATE_RESPONSE=$(curl -s \
  -X POST "${BASE_URL}/api/estimates/generate" \
  -H "Content-Type: application/json" \
  -H "x-test-bypass: build-loop-test-2026" \
  -d '{
    "description": "Install 3 ceiling fans in living room, dining room, and master bedroom. Need electrical boxes and wiring.",
    "photos": [],
    "projectType": "electrical",
    "location": "US"
  }')

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo "⏱️  Request took ${DURATION} seconds"
echo ""

# Show response
echo "Response preview:"
echo "$ESTIMATE_RESPONSE" | head -c 800
echo ""
echo ""

# Check for success
if echo "$ESTIMATE_RESPONSE" | grep -q '"success":true'; then
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "✅ PRODUCTION TEST PASSED!"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""
  echo "✅ Estimate generated successfully in ${DURATION} seconds!"
  echo "✅ The full flow works: describe job → get AI estimate"
  echo ""
  exit 0
elif echo "$ESTIMATE_RESPONSE" | grep -q '"error"'; then
  echo "❌ FAILED - Got error response:"
  echo "$ESTIMATE_RESPONSE"
  exit 1
else
  echo "⚠️  Unexpected response"
  exit 1
fi
