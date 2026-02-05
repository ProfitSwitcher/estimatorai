# EstimatorAI - Local Development Setup

## Quick Start (5 minutes)

### 1. Clone & Install

```bash
# Clone repo
git clone https://github.com/yourusername/estimatorai.git
cd estimatorai

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Setup Database

**Option A: Local PostgreSQL**

```bash
# Create database
createdb estimatorai

# Run schema
psql estimatorai < docs/DATABASE_SCHEMA.sql
```

**Option B: Supabase (Recommended)**

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Copy connection string
4. Run schema in SQL Editor (docs/DATABASE_SCHEMA.sql)

### 3. Configure Environment

**Backend (.env)**

```bash
cd backend
cp .env.example .env
```

Edit `.env`:
```bash
PORT=3001
DATABASE_URL=postgresql://postgres:password@localhost:5432/estimatorai
OPENAI_API_KEY=sk-...your-key...
JWT_SECRET=your-secret-here
STRIPE_SECRET_KEY=sk_test_...
FRONTEND_URL=http://localhost:3000
```

**Frontend (.env.local)**

```bash
cd ../frontend
cp .env.example .env.local
```

Edit `.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_...
```

### 4. Run Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Getting OpenAI API Key

1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up/login
3. Go to API Keys section
4. Create new secret key
5. Copy to `.env` file
6. Add billing info (pay-as-you-go)

**Cost estimate:** ~$0.10-0.50 per estimate depending on complexity

## Getting Stripe Keys (for testing)

1. Go to [stripe.com](https://stripe.com)
2. Sign up
3. Dashboard → Developers → API Keys
4. Copy test keys (pk_test_... and sk_test_...)
5. Use test credit card: 4242 4242 4242 4242

## Testing

### Test Estimate Generation

```bash
# Register user
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com", "password":"password123", "name":"Test User"}'

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com", "password":"password123"}'

# Generate estimate (use token from login)
curl -X POST http://localhost:3001/api/estimates/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Kitchen remodel: 12x15 room, new cabinets, granite counters, new appliances",
    "projectType": "residential"
  }'
```

### Test with Photos

```bash
# Use frontend UI:
1. Go to http://localhost:3000/estimate
2. Click camera icon
3. Upload project photos
4. Describe project
5. Click Send

# AI will analyze photos + description
```

## Troubleshooting

### Database Connection Error

```bash
# Check PostgreSQL is running
psql -l

# Check connection string format
DATABASE_URL=postgresql://user:password@localhost:5432/database
```

### OpenAI API Error

- Verify API key is correct
- Check billing is enabled
- Ensure you have credits ($5 minimum)
- Check OpenAI status page

### Port Already in Use

```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Or change port in backend/.env
PORT=3002
```

### CORS Error

- Verify FRONTEND_URL in backend/.env matches frontend URL
- Check backend server is running
- Clear browser cache

## Development Tips

### Hot Reload

Both servers auto-reload on file changes:
- Backend: `nodemon` watches `.js` files
- Frontend: Next.js Fast Refresh

### Database Migrations

```bash
# Add new column example
psql estimatorai -c "ALTER TABLE estimates ADD COLUMN new_field VARCHAR(255);"

# Best practice: Create migration files
# backend/migrations/003_add_new_field.sql
```

### Testing AI Prompts

Edit `backend/services/estimateAI.js` → `systemPrompt` to adjust AI behavior

### Debugging

```bash
# Backend logs
cd backend
npm run dev

# Frontend logs
cd frontend
npm run dev

# Database queries
psql estimatorai
SELECT * FROM estimates ORDER BY created_at DESC LIMIT 10;
```

## Next Steps

1. ✅ Get it running locally
2. Customize pricing rules in `estimateAI.js`
3. Adjust UI styling in `frontend/app/`
4. Test with real construction projects
5. Deploy to production (see DEPLOYMENT.md)

## Resources

- [Next.js Docs](https://nextjs.org/docs)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Stripe API Docs](https://stripe.com/docs/api)

---

Need help? Open an issue on GitHub or contact support.
