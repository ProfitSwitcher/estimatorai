// app/api/stripe/checkout/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { stripe, PLANS } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { plan } = await req.json() // 'pro' or 'team'

    let priceId: string = ''
    if (plan === 'pro') {
      priceId = PLANS.PRO.priceId
    } else if (plan === 'team') {
      priceId = PLANS.TEAM.priceId
    } else {
      return NextResponse.json({ error: 'Invalid plan specified' }, { status: 400 })
    }

    if (!priceId) {
      // Fallback or error if priceId is not set (e.g., env var missing)
      console.error(`Stripe price ID for plan '\${plan}' is not configured.`)
      return NextResponse.json({ error: 'Subscription configuration error' }, { status: 500 })
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `\${process.env.NEXTAUTH_URL}/dashboard?success=true&plan=\${plan}`,
      cancel_url: `\${process.env.NEXTAUTH_URL}/dashboard?canceled=true`,
      client_reference_id: (session.user as any).id,
      // Optionally, you can add customer_update to pre-fill customer info if available
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error: any) {
    console.error('Error creating Stripe checkout session:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}
