// lib/plans.ts — Shared plan config (safe for client + server import)
export const PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    estimatesLimit: 5,
  },
  PRO: {
    name: 'Pro',
    price: 4900,
    priceId: process.env.STRIPE_PRICE_PRO_MONTHLY || '',
    estimatesLimit: -1,
  },
  TEAM: {
    name: 'Team',
    price: 9900,
    priceId: process.env.STRIPE_PRICE_TEAM_MONTHLY || '',
    estimatesLimit: -1,
    seats: 5,
  },
}
