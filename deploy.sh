#!/bin/bash
# BuilderMindAI - Autonomous Deployment Script
# Usage: ./deploy.sh
# After first-time setup, this script deploys with ZERO human input
set -e

COLOR_GREEN="\033[0;32m"
COLOR_RED="\033[0;31m"
COLOR_YELLOW="\033[1;33m"
COLOR_RESET="\033[0m"

echo -e "${COLOR_GREEN}🚀 BuilderMindAI - Autonomous Deploy${COLOR_RESET}"

# Check .env exists
if [ ! -f ".env" ]; then
  echo -e "${COLOR_RED}❌ No .env file. Run scripts/setup.sh first.${COLOR_RESET}"
  exit 1
fi

# Check for REPLACE placeholders
if grep -q 'REPLACE_WITH' .env; then
  echo -e "${COLOR_RED}❌ .env has unfilled values. Complete setup first.${COLOR_RESET}"
  grep 'REPLACE_WITH' .env
  exit 1
fi

# Load env
export $(cat .env | grep -v '^#' | xargs)

# Push env vars to Vercel
echo -e "${COLOR_YELLOW}📦 Syncing env vars to Vercel...${COLOR_RESET}"
while IFS='=' read -r key value; do
  [[ -z "$key" || "$key" == \#* ]] && continue
  vercel env rm "$key" production --yes 2>/dev/null || true
  echo "$value" | vercel env add "$key" production --token "$VERCEL_TOKEN" 2>/dev/null || true
done < .env

# Deploy to production
echo -e "${COLOR_YELLOW}🚢 Deploying to production...${COLOR_RESET}"
vercel --prod --yes --token "$VERCEL_TOKEN"

echo -e "${COLOR_GREEN}✅ Deployment complete! https://buildermindai.com${COLOR_RESET}"
