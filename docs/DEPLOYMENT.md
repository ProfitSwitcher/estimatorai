# EstimatorAI Deployment Guide

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (or Supabase account)
- OpenAI API key
- Stripe account (for payments)

## Environment Variables

### Backend (.env)

```bash
# Server
PORT=3001
NODE_ENV=production

# Database (PostgreSQL or Supabase)
DATABASE_URL=postgresql://user:password@host:5432/estimatorai

# OpenAI
OPENAI_API_KEY=sk-...

# JWT Authentication
JWT_SECRET=your_random_secret_key_here

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Frontend URL (for CORS)
FRONTEND_URL=https://estimatorai.com

# Optional: ServiceBook Integration
SERVICEBOOK_BASE_URL=https://api.knack.com/v1
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=https://api.estimatorai.com
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_live_...
```

## Setup Steps

### 1. Database Setup

```bash
# Create database
createdb estimatorai

# Run schema
psql estimatorai < docs/DATABASE_SCHEMA.sql

# OR use Supabase:
# - Create new project
# - Copy DATABASE_URL
# - Run schema in SQL Editor
```

### 2. Backend Deployment (Railway/Render)

**Option A: Railway**

```bash
cd backend
railway login
railway init
railway up

# Add environment variables in Railway dashboard
```

**Option B: Render**

1. Connect GitHub repo
2. Create new Web Service
3. Build command: `cd backend && npm install`
4. Start command: `cd backend && npm start`
5. Add environment variables

### 3. Frontend Deployment (Vercel)

```bash
cd frontend
vercel login
vercel

# Add environment variables in Vercel dashboard
```

**Or use Vercel dashboard:**
1. Import GitHub repo
2. Set root directory: `frontend/`
3. Framework: Next.js
4. Add environment variables
5. Deploy

### 4. Configure Stripe Webhooks

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://api.estimatorai.com/api/webhooks/stripe`
3. Select events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy webhook secret to `.env`

### 5. Test Deployment

```bash
# Health check
curl https://api.estimatorai.com/health

# Test estimate generation
curl -X POST https://api.estimatorai.com/api/estimates/generate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description": "Kitchen remodel", "projectType": "residential"}'
```

## Production Checklist

- [ ] Database backups configured
- [ ] SSL certificates installed
- [ ] Environment variables secured
- [ ] Error monitoring setup (Sentry)
- [ ] Rate limiting enabled
- [ ] CORS configured properly
- [ ] Stripe webhooks verified
- [ ] OpenAI API key has billing enabled
- [ ] Domain DNS configured
- [ ] Email service configured (SendGrid/Postmark)

## Scaling Considerations

### Phase 1 (MVP - 100 users)
- Vercel Hobby ($0)
- Railway Hobby ($5/mo)
- Supabase Free tier
- **Total: ~$5/mo**

### Phase 2 (1,000 users)
- Vercel Pro ($20/mo)
- Railway Pro ($20/mo)
- Supabase Pro ($25/mo)
- OpenAI API costs (~$500/mo at 1k users, 10 estimates/user)
- **Total: ~$565/mo**

### Phase 3 (10,000 users)
- Vercel Enterprise (custom)
- Dedicated PostgreSQL (RDS/Digital Ocean)
- Redis caching layer
- Load balancer
- **Total: ~$3-5k/mo**

## Monitoring

**Recommended tools:**
- **Sentry** - Error tracking
- **LogRocket** - Session replay
- **Posthog** - Analytics
- **UptimeRobot** - Uptime monitoring

## Backup Strategy

```bash
# Daily database backup (cron job)
0 2 * * * pg_dump estimatorai > backup_$(date +\%Y\%m\%d).sql

# Upload to S3
aws s3 cp backup_*.sql s3://estimatorai-backups/
```

## Support

For deployment issues:
- Check logs: `railway logs` or Render dashboard
- Database connection: Verify DATABASE_URL format
- OpenAI errors: Check API key and billing
- CORS issues: Verify FRONTEND_URL in backend .env

---

Built with ❤️ by Alvis Miller
