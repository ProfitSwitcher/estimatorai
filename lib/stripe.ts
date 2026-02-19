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

// Re-export PLANS so existing server imports still work
export { PLANS } from './plans'
