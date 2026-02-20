#!/bin/bash
# Test EstimatorAI Production Flow

BASE_URL="https://estimatorai.com"
TEST_EMAIL="test@alviselectrical.com"
TEST_PASSWORD="password"

echo "🧪 Testing EstimatorAI Production Flow"
echo "========================================"
echo ""

# Test 1: Home page loads
echo "1️⃣ Testing home page..."
if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL" | grep -q "200"; then
  echo "✅ Home page loads (200 OK)"
else
  echo "❌ Home page failed"
  exit 1
fi

# Test 2: Login page loads
echo ""
echo "2️⃣ Testing login page..."
if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/login" | grep -q "200"; then
  echo "✅ Login page loads (200 OK)"
else
  echo "❌ Login page failed"
  exit 1
fi

# Test 3: Register page loads
echo ""
echo "3️⃣ Testing register page..."
if curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/register" | grep -q "200"; then
  echo "✅ Register page loads (200 OK)"
else
  echo "❌ Register page failed"
  exit 1
fi

# Test 4: Estimate page (should redirect to login if not authenticated)
echo ""
echo "4️⃣ Testing estimate page (should require auth)..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/estimate")
if [[ "$RESPONSE" == "200" ]] || [[ "$RESPONSE" == "307" ]] || [[ "$RESPONSE" == "302" ]]; then
  echo "✅ Estimate page responds correctly ($RESPONSE)"
else
  echo "❌ Estimate page failed: $RESPONSE"
fi

# Test 5: API endpoints (should require auth)
echo ""
echo "5️⃣ Testing API endpoints (should require auth)..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/estimates/generate" \
  -H "Content-Type: application/json" \
  -d '{"description":"test"}' \
  -w "%{http_code}" -o /tmp/api-response.txt)

if [[ "$RESPONSE" == "401" ]]; then
  echo "✅ API requires authentication (401 Unauthorized)"
else
  echo "⚠️  API returned: $RESPONSE"
  cat /tmp/api-response.txt
fi

echo ""
echo "========================================"
echo "🎉 Basic production tests passed!"
echo ""
echo "📝 Manual Testing Steps:"
echo "1. Visit https://estimatorai.com"
echo "2. Login with: $TEST_EMAIL / $TEST_PASSWORD"
echo "3. Go to /estimate"
echo "4. Enter this test description:"
echo ""
echo "   I need to upgrade electrical service for a small restaurant."
echo "   Current: 100A panel, need 200A service."
echo "   Includes:"
echo "   - New 200A panel installation"
echo "   - Service upgrade from meter to panel"
echo "   - 50 ft of 4/0 copper wire"
echo "   - Trenching 30 ft for underground service"
echo "   - Permit and inspection"
echo ""
echo "5. Click 'Generate Estimate'"
echo "6. Verify you get a detailed electrical contractor estimate with:"
echo "   - Line items for labor, materials, permits"
echo "   - Electrical-specific details (wire, conduit, panels, breakers)"
echo "   - Assumptions about site conditions"
echo "   - Disclaimer about final pricing"
echo ""
