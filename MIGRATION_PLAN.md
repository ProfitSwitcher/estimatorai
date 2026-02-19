# EstimatorAI - Production Migration Plan

**Date:** February 18, 2026  
**Task:** HiveMind Ops Task #16  
**Author:** Product Lead Agent

---

## Executive Summary

This plan migrates EstimatorAI from a split Express backend + Next.js frontend architecture to a unified Next.js 14 application with API routes. This modernizes the stack, reduces complexity, and prepares for production deployment.

### Key Changes
- ✅ Unify into single Next.js app (delete Express backend)
- ✅ Implement NextAuth.js for authentication
- ✅ Add Stripe subscriptions (Free/Pro/Team tiers)
- ✅ Update to GPT-4o models (text + vision)
- ✅ Wire Supabase PostgreSQL database
- ✅ Modernize all API routes as Next.js API handlers

---

## Current Architecture (Problems)

```
estimatorai/
├── backend/                     ❌ Separate Express server
│   ├── server.js               ❌ Port 3001, separate deployment
│   ├── routes/
│   │   ├── auth.js            ❌ JWT auth (incomplete)
│   │   └── estimates.js       ❌ Estimate API
│   ├── services/
│   │   ├── estimateAI.js      ❌ Uses outdated OpenAI models
│   │   ├── pdfService.js      
│   │   └── servicebookIntegration.js
│   ├── middleware/auth.js     ❌ Custom JWT middleware
│   └── db/index.js            ❌ Direct pg client, no connection
│
└── frontend/                    ❌ Needs to be root
    ├── app/
    │   ├── page.tsx            Landing page
    │   ├── estimate/page.tsx   Chat UI
    │   └── login/page.tsx      Incomplete auth
    └── package.json            Next.js 14

Issues:
- Two separate deployments (frontend + backend)
- No working authentication
- No payment integration
- Outdated OpenAI models (gpt-4-vision-preview, gpt-4-turbo-preview)
- No database connection configured
- CORS complexity between apps
```

---

## Target Architecture (Solution)

```
estimatorai/
├── app/                        ✅ Next.js 14 App Router (root)
│   ├── (auth)/
│   │   ├── login/page.tsx     ✅ NextAuth login
│   │   └── register/page.tsx  ✅ New registration
│   ├── estimate/
│   │   └── page.tsx           ✅ Updated chat UI
│   ├── dashboard/
│   │   └── page.tsx           ✅ User estimates list
│   ├── api/                   ✅ Next.js API routes
│   │   ├── auth/[...nextauth]/route.ts  ✅ NextAuth handler
│   │   ├── estimates/
│   │   │   ├── generate/route.ts        ✅ AI estimation
│   │   │   ├── [id]/route.ts            ✅ Get/update/delete
│   │   │   └── [id]/pdf/route.ts        ✅ PDF export
│   │   ├── webhooks/stripe/route.ts     ✅ Stripe events
│   │   └── servicebook/sync/route.ts    ✅ ServiceBook push
│   ├── page.tsx               ✅ Landing (keep existing)
│   └── layout.tsx             ✅ Root layout
│
├── lib/                       ✅ Shared utilities
│   ├── auth.ts               ✅ NextAuth config
│   ├── db.ts                 ✅ Supabase client
│   ├── openai.ts             ✅ OpenAI client (gpt-4o)
│   ├── stripe.ts             ✅ Stripe client
│   └── services/
│       ├── estimateAI.ts     ✅ Migrated AI logic
│       ├── pdfService.ts     ✅ Migrated PDF logic
│       └── servicebook.ts    ✅ Migrated integration
│
├── components/               ✅ React components
│   ├── auth/
│   ├── estimate/
│   └── ui/
│
├── middleware.ts             ✅ NextAuth session check
├── next.config.js            ✅ Configuration
└── package.json              ✅ Unified dependencies

Benefits:
- Single deployment (Vercel)
- Built-in authentication
- API routes co-located with frontend
- Automatic serverless scaling
- Edge-ready
```

---

## Phase 1: Foundation Setup

### 1.1 Restructure Directories
```bash
# Move frontend to root
cd /Users/alvis/.openclaw/workspace/estimatorai
cp -r frontend/* .
rm -rf frontend/

# Archive backend (keep for reference during migration)
mv backend backend_OLD

# Create new directories
mkdir -p lib/services
mkdir -p components/{auth,estimate,ui}
mkdir -p app/api/estimates
mkdir -p app/(auth)/{login,register}
mkdir -p app/dashboard
```

### 1.2 Install Dependencies
```json
// package.json additions
{
  "dependencies": {
    // Existing Next.js deps stay
    "next": "14.0.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    
    // Add new deps
    "next-auth": "^4.24.5",
    "@auth/supabase-adapter": "^0.3.0",
    "@supabase/supabase-js": "^2.38.4",
    "stripe": "^14.5.0",
    "openai": "^4.26.0",
    "pdfkit": "^0.14.0",
    "bcrypt": "^5.1.1",
    "zod": "^3.22.4",
    "date-fns": "^3.0.0",
    
    // UI (already have most)
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-tabs": "^1.0.4",
    "lucide-react": "^0.298.0",
    "tailwindcss-animate": "^1.0.7"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/bcrypt": "^5.0.2",
    "typescript": "^5"
  }
}
```

### 1.3 Environment Variables
```bash
# .env.local
# Database (Supabase)
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>

# OpenAI
OPENAI_API_KEY=sk-...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Pricing Tiers (Product IDs)
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_TEAM_MONTHLY=price_...

# Optional: ServiceBook Integration
SERVICEBOOK_APP_ID=
SERVICEBOOK_API_KEY=
```

---

## Phase 2: Database Setup (Supabase)

### 2.1 Create Supabase Project
1. Go to https://supabase.com/dashboard
2. Create new project: "estimatorai-prod"
3. Get connection string and keys
4. Add to `.env.local`

### 2.2 Run Database Schema
```bash
# Apply existing schema
psql $DATABASE_URL < docs/DATABASE_SCHEMA.sql

# Add NextAuth tables (if using database sessions)
# OR use JWT sessions (recommended for simplicity)
```

### 2.3 Create Supabase Client
```typescript
// lib/db.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const supabase = createClient(supabaseUrl, supabaseServiceKey)

// For client-side use (public anon key)
export const createClientComponentClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

---

## Phase 3: Authentication (NextAuth.js)

### 3.1 NextAuth Configuration
```typescript
// lib/auth.ts
import NextAuth, { type NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcrypt'
import { supabase } from './db'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('email', credentials.email)
          .single()

        if (error || !user) return null

        const valid = await bcrypt.compare(credentials.password, user.password_hash)
        if (!valid) return null

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          subscriptionTier: user.subscription_tier,
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.subscriptionTier = user.subscriptionTier
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.subscriptionTier = token.subscriptionTier as string
      }
      return session
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
}
```

### 3.2 NextAuth API Route
```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

### 3.3 Middleware (Protect Routes)
```typescript
// middleware.ts
export { default } from 'next-auth/middleware'

export const config = {
  matcher: ['/estimate/:path*', '/dashboard/:path*', '/api/estimates/:path*']
}
```

### 3.4 Auth Pages
```typescript
// app/(auth)/login/page.tsx
'use client'
import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('Invalid email or password')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold mb-6">Login to EstimatorAI</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-3 border rounded"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-3 border rounded"
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700"
          >
            Sign In
          </button>
        </form>
        <p className="mt-4 text-center text-sm">
          Don't have an account?{' '}
          <a href="/register" className="text-blue-600 hover:underline">
            Register
          </a>
        </p>
      </div>
    </div>
  )
}

// app/(auth)/register/page.tsx
// Similar structure with bcrypt.hash() for password
// Insert into database via API route
```

---

## Phase 4: Migrate AI Services

### 4.1 Update OpenAI Service to GPT-4o
```typescript
// lib/services/estimateAI.ts
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface EstimateRequest {
  description: string
  photos?: string[]
  projectType?: string
  location?: string
  pricingRules?: any
}

export async function generateEstimate(request: EstimateRequest) {
  const { description, photos = [], pricingRules } = request

  // Step 1: Analyze photos if provided (using gpt-4o for vision)
  let photoAnalysis = null
  if (photos.length > 0) {
    photoAnalysis = await analyzePhotos(photos)
  }

  // Step 2: Generate estimate using gpt-4o
  const estimate = await callOpenAI(description, photoAnalysis, pricingRules)

  // Step 3: Calculate totals
  const subtotal = estimate.lineItems.reduce((sum, item) => sum + item.total, 0)
  const tax = subtotal * (pricingRules?.taxRate || 0.08)
  const total = subtotal + tax

  return {
    ...estimate,
    subtotal,
    tax,
    total,
  }
}

async function analyzePhotos(photos: string[]) {
  const messages: any[] = [
    {
      role: 'system',
      content: `You are a construction estimator analyzing project photos. 
                Extract: room dimensions, materials visible, condition, damage, 
                existing fixtures, and cost-relevant details.`
    },
    {
      role: 'user',
      content: [
        { type: 'text', text: 'Analyze these construction project photos:' },
        ...photos.map(url => ({
          type: 'image_url',
          image_url: { url, detail: 'high' }
        }))
      ]
    }
  ]

  const response = await openai.chat.completions.create({
    model: 'gpt-4o', // ✅ Updated from gpt-4-vision-preview
    messages,
    max_tokens: 1500
  })

  return response.choices[0].message.content
}

async function callOpenAI(
  description: string,
  photoAnalysis: string | null,
  pricingRules: any
) {
  const systemPrompt = `You are an expert construction estimator. Generate detailed, accurate estimates.

Output format (JSON):
{
  "projectTitle": "Brief project name",
  "summary": "2-3 sentence overview",
  "lineItems": [
    {
      "category": "Labor|Materials|Equipment|Permits",
      "description": "Specific task/item",
      "quantity": number,
      "unit": "sq ft|linear ft|hours|each",
      "rate": number,
      "total": number,
      "notes": "clarifications"
    }
  ],
  "assumptions": ["list of assumptions"],
  "recommendations": ["optional suggestions"],
  "timeline": "estimated duration"
}`

  const userPrompt = `
Project Description:
${description}

${photoAnalysis ? `Photo Analysis:\n${photoAnalysis}\n` : ''}

Generate a detailed estimate with all labor, materials, permits, equipment, disposal.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o', // ✅ Updated from gpt-4-turbo-preview
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3
  })

  return JSON.parse(response.choices[0].message.content || '{}')
}
```

### 4.2 Migrate PDF Service
```typescript
// lib/services/pdfService.ts
import PDFDocument from 'pdfkit'

export async function generateEstimatePDF(estimate: any): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 })
    const chunks: Buffer[] = []

    doc.on('data', chunk => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    // Header
    doc.fontSize(24).text('Construction Estimate', { align: 'center' })
    doc.moveDown()
    doc.fontSize(14).text(estimate.project_title, { align: 'center' })
    doc.moveDown(2)

    // Line items table
    doc.fontSize(12).text('Line Items', { underline: true })
    doc.moveDown()

    const lineItems = JSON.parse(estimate.line_items)
    lineItems.forEach((item: any, idx: number) => {
      doc.fontSize(10)
        .text(`${idx + 1}. ${item.description}`, { continued: true })
        .text(`$${item.total.toFixed(2)}`, { align: 'right' })
      doc.fontSize(8)
        .fillColor('gray')
        .text(`   ${item.quantity} ${item.unit} × $${item.rate}`)
        .fillColor('black')
      doc.moveDown(0.5)
    })

    // Totals
    doc.moveDown()
    doc.fontSize(12)
      .text(`Subtotal: $${estimate.subtotal}`, { align: 'right' })
      .text(`Tax: $${estimate.tax}`, { align: 'right' })
      .fontSize(14)
      .text(`Total: $${estimate.total}`, { align: 'right' })

    doc.end()
  })
}
```

### 4.3 Migrate ServiceBook Integration
```typescript
// lib/services/servicebook.ts
import axios from 'axios'

export async function pushToServiceBook(
  estimate: any,
  apiKey: string,
  appId: string
): Promise<string> {
  const knackUrl = `https://api.knack.com/v1/objects/object_1/records`

  const payload = {
    // Map EstimatorAI fields to Knack fields
    field_1: estimate.project_title,
    field_2: estimate.description,
    field_3: estimate.total,
    field_4: JSON.stringify(estimate.line_items),
  }

  const response = await axios.post(knackUrl, payload, {
    headers: {
      'X-Knack-Application-Id': appId,
      'X-Knack-REST-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
  })

  return response.data.id
}
```

---

## Phase 5: API Routes Migration

### 5.1 Estimate Generation API
```typescript
// app/api/estimates/generate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/db'
import { generateEstimate } from '@/lib/services/estimateAI'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const body = await req.json()
    const { description, photos, projectType, location } = body

    // Get user pricing rules
    const { data: user } = await supabase
      .from('users')
      .select('pricing_rules')
      .eq('id', userId)
      .single()

    // Generate AI estimate
    const estimate = await generateEstimate({
      description,
      photos,
      projectType,
      location,
      pricingRules: user?.pricing_rules,
    })

    // Save to database
    const { data: saved, error } = await supabase
      .from('estimates')
      .insert({
        user_id: userId,
        project_title: estimate.projectTitle,
        description,
        line_items: estimate.lineItems,
        subtotal: estimate.subtotal,
        tax: estimate.tax,
        total: estimate.total,
        status: 'draft',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      estimateId: saved.id,
      estimate,
    })
  } catch (error: any) {
    console.error('Error generating estimate:', error)
    return NextResponse.json(
      { error: 'Failed to generate estimate' },
      { status: 500 }
    )
  }
}
```

### 5.2 Get/Update/Delete Estimate
```typescript
// app/api/estimates/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('estimates')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', session.user.id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({ estimate: data })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { lineItems, projectTitle, status } = body

  // Recalculate totals if line items changed
  let updates: any = {}
  if (projectTitle) updates.project_title = projectTitle
  if (status) updates.status = status
  if (lineItems) {
    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0)
    const tax = subtotal * 0.08
    updates.line_items = lineItems
    updates.subtotal = subtotal
    updates.tax = tax
    updates.total = subtotal + tax
  }

  const { error } = await supabase
    .from('estimates')
    .update(updates)
    .eq('id', params.id)
    .eq('user_id', session.user.id)

  if (error) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('estimates')
    .delete()
    .eq('id', params.id)
    .eq('user_id', session.user.id)

  if (error) {
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

### 5.3 PDF Export API
```typescript
// app/api/estimates/[id]/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabase } from '@/lib/db'
import { generateEstimatePDF } from '@/lib/services/pdfService'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: estimate, error } = await supabase
    .from('estimates')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', session.user.id)
    .single()

  if (error || !estimate) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const pdfBuffer = await generateEstimatePDF(estimate)

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${estimate.project_title}-estimate.pdf"`,
    },
  })
}
```

---

## Phase 6: Stripe Integration

### 6.1 Stripe Setup
```typescript
// lib/stripe.ts
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
})

export const PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    estimatesLimit: 5,
  },
  PRO: {
    name: 'Pro',
    price: 4900, // $49.00 in cents
    priceId: process.env.STRIPE_PRICE_PRO_MONTHLY!,
    estimatesLimit: -1, // unlimited
  },
  TEAM: {
    name: 'Team',
    price: 9900, // $99.00 in cents
    priceId: process.env.STRIPE_PRICE_TEAM_MONTHLY!,
    estimatesLimit: -1,
    seats: 5,
  },
}
```

### 6.2 Create Checkout Session API
```typescript
// app/api/stripe/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { stripe, PLANS } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { plan } = await req.json() // 'pro' or 'team'
  const priceId = plan === 'pro' ? PLANS.PRO.priceId : PLANS.TEAM.priceId

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
    cancel_url: `${process.env.NEXTAUTH_URL}/dashboard?canceled=true`,
    client_reference_id: session.user.id,
  })

  return NextResponse.json({ url: checkoutSession.url })
}
```

### 6.3 Stripe Webhook Handler
```typescript
// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabase } from '@/lib/db'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }

  // Handle events
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.client_reference_id

      // Update user subscription
      await supabase
        .from('users')
        .update({
          subscription_tier: 'pro', // Determine from price_id
          subscription_status: 'active',
          stripe_customer_id: session.customer,
        })
        .eq('id', userId)
      break
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      const status = subscription.status === 'active' ? 'active' : 'canceled'

      await supabase
        .from('users')
        .update({
          subscription_status: status,
          subscription_tier: status === 'active' ? 'pro' : 'free',
        })
        .eq('stripe_customer_id', customerId)
      break
    }
  }

  return NextResponse.json({ received: true })
}
```

---

## Phase 7: Update Frontend UI

### 7.1 Update Estimate Chat UI
```typescript
// app/estimate/page.tsx
'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import axios from 'axios'

export default function EstimatePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Existing state + logic
  // Update API call to use new Next.js API route

  const handleSend = async () => {
    if (!input.trim()) return

    setMessages(prev => [...prev, { role: 'user', content: input }])
    setInput('')
    setLoading(true)

    try {
      // ✅ Updated API endpoint (no port 3001, uses Next.js API route)
      const response = await axios.post('/api/estimates/generate', {
        description: input,
        photos,
        projectType: 'general',
        location: 'US'
      })

      const generatedEstimate = response.data.estimate
      setEstimate(generatedEstimate)
      setEstimateId(response.data.estimateId)

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: `Great! I've generated an estimate for "${generatedEstimate.projectTitle}"...`
        }
      ])
    } catch (error) {
      console.error('Error generating estimate:', error)
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I had trouble generating that estimate.' }
      ])
    } finally {
      setLoading(false)
    }
  }

  const downloadPDF = async () => {
    if (!estimateId) return

    try {
      // ✅ Updated PDF endpoint
      const response = await axios.get(`/api/estimates/${estimateId}/pdf`, {
        responseType: 'blob'
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${estimate.projectTitle}-estimate.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      console.error('Error downloading PDF:', error)
    }
  }

  // ... rest of component
}
```

### 7.2 Create Dashboard Page
```typescript
// app/dashboard/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import axios from 'axios'
import Link from 'next/link'

export default function DashboardPage() {
  const { data: session } = useSession()
  const [estimates, setEstimates] = useState([])

  useEffect(() => {
    loadEstimates()
  }, [])

  const loadEstimates = async () => {
    const response = await axios.get('/api/estimates')
    setEstimates(response.data.estimates)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">My Estimates</h1>
          <Link
            href="/estimate"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            New Estimate
          </Link>
        </div>

        <div className="grid gap-4">
          {estimates.map((est: any) => (
            <div key={est.id} className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold">{est.project_title}</h3>
                  <p className="text-gray-500 text-sm">
                    {new Date(est.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    ${est.total.toFixed(2)}
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    {est.status}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Link
                  href={`/estimate/${est.id}`}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  View
                </Link>
                <button
                  onClick={() => window.open(`/api/estimates/${est.id}/pdf`)}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

---

## Phase 8: Configuration & Polish

### 8.1 Next.js Config
```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['your-supabase-project.supabase.co'],
  },
  experimental: {
    serverActions: true,
  },
}

module.exports = nextConfig
```

### 8.2 TypeScript Config
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "backend_OLD"]
}
```

---

## Phase 9: Testing & Validation

### 9.1 Manual Testing Checklist
- [ ] User registration creates account in database
- [ ] Login redirects to dashboard
- [ ] Protected routes require authentication
- [ ] Estimate generation calls gpt-4o successfully
- [ ] Photo upload + analysis works
- [ ] Estimates save to database
- [ ] PDF download generates correctly
- [ ] Stripe checkout flow works (test mode)
- [ ] Webhook updates subscription status
- [ ] Dashboard displays user's estimates
- [ ] ServiceBook integration (if enabled)

### 9.2 Environment Validation
```bash
# Run this script to validate setup
node -e "
const required = [
  'DATABASE_URL',
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'OPENAI_API_KEY',
  'STRIPE_SECRET_KEY',
  'NEXT_PUBLIC_SUPABASE_URL',
];
const missing = required.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error('❌ Missing env vars:', missing);
  process.exit(1);
}
console.log('✅ All required env vars present');
"
```

---

## Phase 10: Deployment

### 10.1 Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Set environment variables in Vercel dashboard
# - All .env.local variables
# - NEXTAUTH_URL = https://your-app.vercel.app
```

### 10.2 Stripe Webhook Configuration
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: `https://your-app.vercel.app/api/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy webhook signing secret → Add to Vercel env vars

### 10.3 Post-Deployment Checks
- [ ] Landing page loads
- [ ] Login/register works
- [ ] Estimate generation works
- [ ] Stripe checkout redirects correctly
- [ ] Webhooks receive events (test with Stripe CLI)
- [ ] All API routes respond properly

---

## Phase 11: Cleanup & Documentation

### 11.1 Remove Old Backend
```bash
# After verifying everything works
rm -rf backend_OLD
```

### 11.2 Update Documentation
```bash
# Update README.md with new setup instructions
# Archive old DEPLOYMENT_GUIDE.md
# Create new DEPLOYMENT.md for unified app
```

---

## Summary of Changes

### Architecture
- ❌ Removed: Express backend (port 3001)
- ✅ Added: Next.js API routes
- ✅ Added: NextAuth.js authentication
- ✅ Added: Stripe integration
- ✅ Added: Supabase database connection

### OpenAI Models
- ❌ Old: `gpt-4-vision-preview` (deprecated)
- ❌ Old: `gpt-4-turbo-preview`
- ✅ New: `gpt-4o` (unified text + vision)

### Authentication
- ❌ Old: Custom JWT middleware
- ✅ New: NextAuth.js with credentials provider

### Database
- ❌ Old: Direct `pg` client (no connection)
- ✅ New: Supabase client with connection pooling

### Deployment
- ❌ Old: Separate backend + frontend deployments
- ✅ New: Single Vercel deployment

---

## Timeline Estimate

**Phase 1-3 (Foundation + DB + Auth):** 2-3 hours  
**Phase 4-5 (Services + API Routes):** 2-3 hours  
**Phase 6 (Stripe):** 1-2 hours  
**Phase 7 (UI Updates):** 1 hour  
**Phase 8-9 (Config + Testing):** 1-2 hours  
**Phase 10 (Deployment):** 30 minutes  

**Total:** ~8-12 hours of development work

---

## Risk Mitigation

1. **Backup before starting:**
   ```bash
   cd /Users/alvis/.openclaw/workspace
   tar -czf estimatorai-backup-$(date +%Y%m%d).tar.gz estimatorai/
   ```

2. **Keep backend_OLD until fully tested**
3. **Use Vercel preview deployments for testing**
4. **Test Stripe in test mode before production**
5. **Set up error monitoring (Sentry recommended)**

---

## Success Criteria

✅ Single unified Next.js application  
✅ Working authentication (register/login)  
✅ Estimate generation with gpt-4o  
✅ Photo analysis with gpt-4o  
✅ Database connected and saving estimates  
✅ PDF export functional  
✅ Stripe subscriptions working  
✅ All tests passing  
✅ Deployed to Vercel  
✅ No critical bugs  

---

**Status:** Ready for Phase 2 (Development)  
**Next Step:** Spawn Forge agent to implement this plan  
**Forge runTimeoutSeconds:** 300

---

*Migration plan created by Product Lead Agent*  
*Date: February 18, 2026*
