#!/bin/bash

echo "🚀 EstimatorAI GitHub Setup"
echo ""

# Get GitHub username
echo "Enter your GitHub username:"
read GITHUB_USER

# Initialize git
cd "$(dirname "$0")"
git init
git branch -M main
git add .
git commit -m "Initial commit - EstimatorAI MVP"

echo ""
echo "✅ Local git initialized and files committed"
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Go to https://github.com/new"
echo "2. Repository name: estimatorai"
echo "3. Description: EstimatorAI - AI-powered construction estimating"
echo "4. Public or Private (your choice)"
echo "5. DON'T initialize with README"
echo "6. Click 'Create repository'"
echo ""
echo "Then run:"
echo ""
echo "  git remote add origin https://github.com/$GITHUB_USER/estimatorai.git"
echo "  git push -u origin main"
echo ""
echo "Or paste the commands GitHub shows you after creating the repo!"
