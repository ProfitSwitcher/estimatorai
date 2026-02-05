#!/bin/bash

# EstimatorAI Quick Start Script
# Run this to set up everything automatically

echo "🚀 EstimatorAI Quick Start"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ first."
    echo "   Download from: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm first."
    exit 1
fi

echo "✅ npm $(npm --version) detected"
echo ""

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
echo "✅ Backend dependencies installed"
echo ""

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install
echo "✅ Frontend dependencies installed"
echo ""

# Create .env files if they don't exist
cd ..
if [ ! -f backend/.env ]; then
    echo "📝 Creating backend .env file..."
    cp backend/.env.example backend/.env
    echo "⚠️  IMPORTANT: Edit backend/.env and add your OpenAI API key!"
fi

if [ ! -f frontend/.env.local ]; then
    echo "📝 Creating frontend .env.local file..."
    cp frontend/.env.example frontend/.env.local
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo ""
echo "1. Get your OpenAI API key from https://platform.openai.com/api-keys"
echo "2. Edit backend/.env and add your OPENAI_API_KEY"
echo "3. Set up a PostgreSQL database (or use Supabase - free)"
echo "4. Edit backend/.env and add your DATABASE_URL"
echo ""
echo "Then run:"
echo ""
echo "  # Terminal 1 - Backend"
echo "  cd backend && npm run dev"
echo ""
echo "  # Terminal 2 - Frontend"
echo "  cd frontend && npm run dev"
echo ""
echo "  # Open http://localhost:3000"
echo ""
echo "📖 Full setup guide: docs/SETUP.md"
echo ""
echo "Need help? Check the documentation or reach out!"
echo ""
echo "Let's build something great! 🎉"
