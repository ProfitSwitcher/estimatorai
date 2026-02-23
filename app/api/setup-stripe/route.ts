// app/api/setup-stripe/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'

const SETUP_KEY = 'bmai-setup-2026'

export async function POST(req: NextRequest) {
  try {
    // Auth guard
    const setupKey = req.headers.get('X-Setup-Key')
    if (setupKey !== SETUP_KEY) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const stripe = getStripe()

    // ── Create or retrieve BuilderMindAI Pro product ──────────────────────────
    let proProduct
    const existingPro = await stripe.products.search({
      query: "name:'BuilderMindAI Pro'",
    })
    if (existingPro.data.length > 0) {
      proProduct = existingPro.data[0]
    } else {
      proProduct = await stripe.products.create({
        name: 'BuilderMindAI Pro',
        description: 'Unlimited AI-powered construction estimates. Win more jobs, faster.',
        metadata: { plan: 'pro' },
      })
    }

    // ── Create or retrieve BuilderMindAI Team product ─────────────────────────
    let teamProduct
    const existingTeam = await stripe.products.search({
      query: "name:'BuilderMindAI Team'",
    })
    if (existingTeam.data.length > 0) {
      teamProduct = existingTeam.data[0]
    } else {
      teamProduct = await stripe.products.create({
        name: 'BuilderMindAI Team',
        description: 'Unlimited estimates for up to 5 team members + AI Phone Assistant included.',
        metadata: { plan: 'team' },
      })
    }

    // ── Create or retrieve Pro monthly price ($49/mo) ─────────────────────────
    let proPrice
    const existingProPrices = await stripe.prices.list({
      product: proProduct.id,
      active: true,
    })
    const existingProMonthly = existingProPrices.data.find(
      (p) => p.recurring?.interval === 'month' && p.unit_amount === 4900
    )
    if (existingProMonthly) {
      proPrice = existingProMonthly
    } else {
      proPrice = await stripe.prices.create({
        product: proProduct.id,
        unit_amount: 4900, // $49.00
        currency: 'usd',
        recurring: { interval: 'month' },
        nickname: 'Pro Monthly',
      })
    }

    // ── Create or retrieve Team monthly price ($99/mo) ────────────────────────
    let teamPrice
    const existingTeamPrices = await stripe.prices.list({
      product: teamProduct.id,
      active: true,
    })
    const existingTeamMonthly = existingTeamPrices.data.find(
      (p) => p.recurring?.interval === 'month' && p.unit_amount === 9900
    )
    if (existingTeamMonthly) {
      teamPrice = existingTeamMonthly
    } else {
      teamPrice = await stripe.prices.create({
        product: teamProduct.id,
        unit_amount: 9900, // $99.00
        currency: 'usd',
        recurring: { interval: 'month' },
        nickname: 'Team Monthly',
      })
    }

    return NextResponse.json({
      success: true,
      products: {
        pro: { id: proProduct.id, name: proProduct.name },
        team: { id: teamProduct.id, name: teamProduct.name },
      },
      prices: {
        pro: {
          id: proPrice.id,
          nickname: proPrice.nickname,
          amount: proPrice.unit_amount,
          envVar: 'STRIPE_PRICE_PRO_MONTHLY',
        },
        team: {
          id: teamPrice.id,
          nickname: teamPrice.nickname,
          amount: teamPrice.unit_amount,
          envVar: 'STRIPE_PRICE_TEAM_MONTHLY',
        },
      },
      instructions: {
        step1: `Set STRIPE_PRICE_PRO_MONTHLY=${proPrice.id} in Vercel`,
        step2: `Set STRIPE_PRICE_TEAM_MONTHLY=${teamPrice.id} in Vercel`,
        step3: 'Redeploy to pick up new env vars',
      },
    })
  } catch (error: any) {
    console.error('Stripe setup error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to set up Stripe products' },
      { status: 500 }
    )
  }
}
