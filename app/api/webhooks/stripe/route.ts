// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getStripe, PLANS } from '@/lib/stripe'
import { supabase } from '@/lib/db'
import Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    console.error('Stripe webhook signature missing.')
    return NextResponse.json({ error: 'Stripe signature missing' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    console.error(`Webhook signature verification failed: \${err.message}`)
    return NextResponse.json({ error: err.message }, { status: 400 })
  }

  // Get the user ID from the event or related objects
  const userId = event.account // For connected accounts
    ? (event.data.object as any).account // Adjust based on event type
    : (event.data.object as any).client_reference_id || (event.data.object as any).customer // Fallback to customer if client_reference_id missing

  if (!userId) {
    console.error('Could not determine user ID from Stripe event.')
    return NextResponse.json({ error: 'User ID not found' }, { status: 400 })
  }

  // Handle events
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const customerId = session.customer as string
      let subscriptionTier = PLANS.FREE.name // Default to free

      // Determine subscription tier based on price ID
      if (session.metadata?.plan === 'pro') {
        subscriptionTier = PLANS.PRO.name
      } else if (session.metadata?.plan === 'team') {
        subscriptionTier = PLANS.TEAM.name
      }
      // Ensure we use the correct price ID if metadata is not reliably available
      if (session.line_items?.data[0]?.price?.id === PLANS.PRO.priceId) {
        subscriptionTier = PLANS.PRO.name
      } else if (session.line_items?.data[0]?.price?.id === PLANS.TEAM.priceId) {
        subscriptionTier = PLANS.TEAM.name
      }


      await supabase
        .from('users')
        .update({
          subscription_tier: subscriptionTier,
          subscription_status: 'active',
          stripe_customer_id: customerId,
        })
        .eq('id', userId)
      console.log(`Checkout session completed for user \${userId}, setting tier to \${subscriptionTier}`)
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string
      let newStatus = subscription.status
      let newTier = PLANS.FREE.name // Default to free

      if (newStatus === 'active' || newStatus === 'trialing') {
        // Check the subscription details for the price ID to determine tier
        if (subscription.items.data.some(item => item.price.id === PLANS.PRO.priceId)) {
          newTier = PLANS.PRO.name
        } else if (subscription.items.data.some(item => item.price.id === PLANS.TEAM.priceId)) {
          newTier = PLANS.TEAM.name
        }
      } else {
        newStatus = 'canceled' // Treat anything else as canceled
        newTier = PLANS.FREE.name
      }

      await supabase
        .from('users')
        .update({
          subscription_tier: newTier,
          subscription_status: newStatus,
        })
        .eq('stripe_customer_id', customerId)
        .eq('id', userId) // Ensure we are updating the correct user
      console.log(`Subscription updated for user \${userId}: status=\${newStatus}, tier=\${newTier}`)
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      const customerId = subscription.customer as string

      await supabase
        .from('users')
        .update({
          subscription_tier: PLANS.FREE.name,
          subscription_status: 'canceled',
        })
        .eq('stripe_customer_id', customerId)
        .eq('id', userId)
      console.log(`Subscription deleted for user \${userId}`)
      break
    }

    // Add other event handlers as needed (e.g., invoice.payment_failed)
  }

  return NextResponse.json({ received: true })
}
