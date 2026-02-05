# EstimatorAI - AI-Powered Construction Estimating

**Standalone SaaS product for contractors to generate accurate project estimates using AI.**

## Features

### MVP (Phase 1)
- 💬 Chat-based interface for project description
- 📸 Photo upload with AI vision analysis
- 🤖 GPT-4 powered estimate generation
- 📊 Line-item breakdowns (labor + materials)
- 📄 PDF export
- 💰 Custom pricing rules per user
- 👤 User authentication & accounts

### Phase 2 (Future)
- 🔌 ServiceBook Pros integration
- 📈 Historical data learning
- 📚 RSMeans database integration
- 👥 Team collaboration
- 📱 Mobile app
- 🎨 Estimate templates

## Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- React 18
- TailwindCSS
- Shadcn UI components

**Backend:**
- Node.js + Express
- PostgreSQL (Supabase)
- OpenAI API (GPT-4 + Vision)

**Deployment:**
- Vercel (frontend)
- Railway/Render (backend + DB)
- Stripe (payments)

## Project Structure

```
estimatorai/
├── frontend/          # Next.js app
│   ├── app/          # App router pages
│   ├── components/   # React components
│   ├── lib/          # Utilities
│   └── public/       # Static assets
├── backend/          # Express API
│   ├── routes/       # API endpoints
│   ├── services/     # Business logic
│   ├── models/       # Database models
│   └── utils/        # Helpers
├── docs/             # Documentation
└── README.md
```

## Getting Started

See `/docs/SETUP.md` for installation and deployment instructions.

## Business Model

**Pricing:**
- Free: 5 estimates/month
- Pro: $49/month - Unlimited estimates
- Team: $99/month - 5 users + shared pricing rules
- Enterprise: Custom pricing

**Revenue Streams:**
1. Monthly subscriptions
2. Add-on: ServiceBook Pros integration ($20/mo)
3. Add-on: RSMeans data access ($30/mo)
4. White-label licensing for agencies

## Roadmap

**Week 1:** MVP development
**Week 2:** Beta testing with 10 contractors
**Week 3:** Launch + marketing
**Month 2:** ServiceBook Pros integration
**Month 3:** Mobile app

---

Built by Alvis Miller
