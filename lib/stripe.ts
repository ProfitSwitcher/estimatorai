// lib/stripe.ts
import Stripe from 'stripe'

// Ensure Stripe is initialized only once
let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (stripeInstance) {
    return stripeInstance
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY environment variable not set. Add it to enable payments.')
  }
  stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
  })
  return stripeInstance
}

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
