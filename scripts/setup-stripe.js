#!/usr/bin/env node
/**
 * BuilderMindAI - Stripe Auto-Setup
 * Creates products, prices, and webhook in Stripe
 * Run: node scripts/setup-stripe.js
 */
require('dotenv').config({ path: '.env' })
const Stripe = require('stripe')

const key = process.env.STRIPE_SECRET_KEY
if (!key || key.startsWith('REPLACE')) {
  console.error('❌ Set STRIPE_SECRET_KEY in .env first')
  process.exit(1)
}

const stripe = new Stripe(key, { apiVersion: '2023-10-16' })
const BASE_URL = process.env.NEXTAUTH_URL || 'https://buildermindai.com'

async function setup() {
  console.log('🔧 Setting up Stripe products...')

  // Create PRO product
  const proProd = await stripe.products.create({
    name: 'BuilderMindAI Pro',
    description: 'Unlimited AI estimates for contractors. 1 user.',
  })
  const proPrice = await stripe.prices.create({
    product: proProd.id,
    unit_amount: 4900,
    currency: 'usd',
    recurring: { interval: 'month' },
  })
  console.log(`✅ PRO price ID: ${proPrice.id}`)

  // Create TEAM product
  const teamProd = await stripe.products.create({
    name: 'BuilderMindAI Team',
    description: 'Unlimited AI estimates for teams. Up to 5 users.',
  })
  const teamPrice = await stripe.prices.create({
    product: teamProd.id,
    unit_amount: 9900,
    currency: 'usd',
    recurring: { interval: 'month' },
  })
  console.log(`✅ TEAM price ID: ${teamPrice.id}`)

  // Create webhook
  const webhook = await stripe.webhookEndpoints.create({
    url: `${BASE_URL}/api/webhooks/stripe`,
    enabled_events: [
      'checkout.session.completed',
      'customer.subscription.updated',
      'customer.subscription.deleted',
    ],
  })
  console.log(`✅ Webhook secret: ${webhook.secret}`)

  // Write to .env
  const fs = require('fs')
  let env = fs.readFileSync('.env', 'utf8')
  env = env.replace('REPLACE_AFTER_RUNNING_setup-stripe.js', proPrice.id)
         .replace(/STRIPE_PRICE_TEAM_MONTHLY=.*/, `STRIPE_PRICE_TEAM_MONTHLY=${teamPrice.id}`)
         .replace(/STRIPE_WEBHOOK_SECRET=.*/, `STRIPE_WEBHOOK_SECRET=${webhook.secret}`)
  fs.writeFileSync('.env', env)

  console.log('\n✅ .env updated with Stripe IDs')
  console.log('\n📋 Summary:')
  console.log(`  PRO ($49/mo):  ${proPrice.id}`)
  console.log(`  TEAM ($99/mo): ${teamPrice.id}`)
  console.log(`  Webhook:       ${webhook.secret}`)
}

setup().catch(e => { console.error('❌', e.message); process.exit(1) })
