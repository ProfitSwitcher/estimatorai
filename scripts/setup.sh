#!/bin/bash
# BuilderMindAI - One-Time Credential Setup
# Run this ONCE. After this, everything is autonomous.
# Usage: bash scripts/setup.sh

set -e
COLOR_GREEN="\033[0;32m"
COLOR_CYAN="\033[0;36m"
COLOR_YELLOW="\033[1;33m"
COLOR_RESET="\033[0m"

echo -e "${COLOR_CYAN}==================================${COLOR_RESET}"
echo -e "${COLOR_CYAN} BuilderMindAI - One-Time Setup   ${COLOR_RESET}"
echo -e "${COLOR_CYAN}==================================${COLOR_RESET}"
echo ""
echo "You will be asked for 6 values. Paste each and press Enter."
echo "After this, all deployments are fully autonomous."
echo ""

# Copy template to .env
cp .env.template .env

prompt_replace() {
  local key=$1
  local label=$2
  local url=$3
  echo -e "${COLOR_YELLOW}📋 $label${COLOR_RESET}"
  echo "   Get it from: $url"
  read -r -p "   Paste value: " value
  # Escape for sed
  local escaped=$(printf '%s\n' "$value" | sed -e 's/[\&/]/\\&/g')
  sed -i "s|${key}|${escaped}|g" .env
  echo -e "   ${COLOR_GREEN}✅ Saved${COLOR_RESET}"
  echo ""
}

prompt_replace \
  "REPLACE_WITH_SUPABASE_ANON_KEY" \
  "Supabase ANON Key" \
  "https://supabase.com/dashboard/project/qvoozieplmvripvbchvs/settings/api → anon public"

prompt_replace \
  "REPLACE_WITH_SUPABASE_SERVICE_ROLE_KEY" \
  "Supabase SERVICE ROLE Key" \
  "https://supabase.com/dashboard/project/qvoozieplmvripvbchvs/settings/api → service_role (secret)"

prompt_replace \
  "REPLACE_WITH_OPENAI_API_KEY" \
  "OpenAI API Key" \
  "https://platform.openai.com/api-keys"

prompt_replace \
  "REPLACE_WITH_ANTHROPIC_API_KEY" \
  "Anthropic API Key (for Expert model - or press Enter to skip)" \
  "https://console.anthropic.com/api-keys"

prompt_replace \
  "REPLACE_WITH_STRIPE_SECRET_KEY" \
  "Stripe SECRET Key" \
  "https://dashboard.stripe.com/apikeys → Secret key"

prompt_replace \
  "REPLACE_WITH_STRIPE_PUBLISHABLE_KEY" \
  "Stripe PUBLISHABLE Key" \
  "https://dashboard.stripe.com/apikeys → Publishable key"

# VERCEL_TOKEN
echo -e "${COLOR_YELLOW}📋 Vercel Token (for autonomous deploys)${COLOR_RESET}"
echo "   Get it from: https://vercel.com/account/tokens → Create Token"
read -r -p "   Paste value: " vercel_token
echo "" >> .env
echo "# --- VERCEL (for autonomous deploys) ---" >> .env
echo "VERCEL_TOKEN=$vercel_token" >> .env
echo -e "   ${COLOR_GREEN}✅ Saved${COLOR_RESET}"
echo ""

echo -e "${COLOR_CYAN}🔧 Creating Stripe products and prices...${COLOR_RESET}"
export $(cat .env | grep -v '^#' | xargs)
node scripts/setup-stripe.js

echo ""
echo -e "${COLOR_GREEN}==================================${COLOR_RESET}"
echo -e "${COLOR_GREEN} ✅ Setup Complete!               ${COLOR_RESET}"
echo -e "${COLOR_GREEN}==================================${COLOR_RESET}"
echo ""
echo "Next steps:"
echo "  1. Run the SQL migration in Supabase (see LAUNCH_CHECKLIST.md)"
echo "  2. Configure DNS for buildermindai.com to Vercel"
echo "  3. Run: ./deploy.sh"
echo ""
echo "After that, all future deployments: just run ./deploy.sh"
