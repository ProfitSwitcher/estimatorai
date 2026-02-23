// app/pricing/page.tsx
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const plans = [
  {
    key: 'free',
    name: 'Free',
    price: 0,
    priceLabel: '$0',
    period: 'forever',
    description: 'Perfect for getting started with AI estimating.',
    highlighted: false,
    badge: null,
    features: [
      '5 AI-generated estimates',
      'PDF export',
      'Basic project templates',
      'Email support',
    ],
    cta: 'Get Started Free',
    ctaHref: '/register',
    ctaStyle: 'outline',
  },
  {
    key: 'pro',
    name: 'Pro',
    price: 49,
    priceLabel: '$49',
    period: '/month',
    description: 'For solo contractors who want to win every bid.',
    highlighted: true,
    badge: 'Most Popular',
    features: [
      'Unlimited AI estimates',
      'PDF export & branded proposals',
      'AI learning (adapts to your rates)',
      'Business Advisor AI',
      'All project templates',
      'Priority email support',
    ],
    cta: 'Start Pro',
    ctaHref: null,
    ctaPlan: 'pro',
    ctaStyle: 'primary',
  },
  {
    key: 'team',
    name: 'Team',
    price: 99,
    priceLabel: '$99',
    period: '/month',
    description: 'For growing construction businesses with a crew.',
    highlighted: false,
    badge: null,
    features: [
      'Everything in Pro',
      'Up to 5 team seats',
      'AI Phone Assistant included',
      '24/7 lead capture & qualification',
      'Shared estimate library',
      'Phone + priority support',
    ],
    cta: 'Start Team',
    ctaHref: null,
    ctaPlan: 'team',
    ctaStyle: 'secondary',
  },
]

export default function PricingPage() {
  const router = useRouter()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleCheckout = async (plan: string) => {
    setLoadingPlan(plan)
    setError(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else if (data.error === 'Unauthorized') {
        router.push('/login?next=/pricing')
      } else {
        setError(data.error || 'Something went wrong. Please try again.')
      }
    } catch (e) {
      setError('Network error. Please try again.')
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-100">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            BuilderMindAI
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium transition">
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="text-center pt-12 pb-10 px-4">
        <span className="inline-block mb-4 px-4 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold tracking-wide">
          Simple, Transparent Pricing
        </span>
        <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
          Win More Jobs.
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {' '}Pay Less Than One Bid.
          </span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Start free, upgrade when you're ready. Cancel anytime — no lock-in, no hidden fees.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-6xl mx-auto px-4 pb-20">
        {error && (
          <div className="mb-6 mx-auto max-w-md bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={`relative flex flex-col rounded-2xl shadow-lg overflow-hidden transition-transform hover:-translate-y-1 hover:shadow-xl ${
                plan.highlighted
                  ? 'bg-gradient-to-b from-blue-600 to-purple-700 text-white ring-4 ring-blue-400 scale-105'
                  : 'bg-white text-gray-900'
              }`}
            >
              {/* Badge */}
              {plan.badge && (
                <div className="absolute top-0 right-0 bg-yellow-400 text-yellow-900 text-xs font-black px-4 py-1.5 rounded-bl-xl tracking-wider uppercase">
                  {plan.badge}
                </div>
              )}

              <div className="p-8 flex flex-col flex-1">
                {/* Plan Name */}
                <h2
                  className={`text-xl font-bold mb-1 ${
                    plan.highlighted ? 'text-blue-100' : 'text-gray-500'
                  }`}
                >
                  {plan.name}
                </h2>

                {/* Price */}
                <div className="flex items-end gap-1 mb-3">
                  <span
                    className={`text-5xl font-black ${
                      plan.highlighted ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {plan.priceLabel}
                  </span>
                  <span
                    className={`text-lg mb-1 ${
                      plan.highlighted ? 'text-blue-200' : 'text-gray-400'
                    }`}
                  >
                    {plan.period}
                  </span>
                </div>

                {/* Description */}
                <p
                  className={`text-sm mb-6 ${
                    plan.highlighted ? 'text-blue-100' : 'text-gray-500'
                  }`}
                >
                  {plan.description}
                </p>

                {/* Features */}
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <span
                        className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          plan.highlighted
                            ? 'bg-white/20 text-white'
                            : 'bg-blue-100 text-blue-600'
                        }`}
                      >
                        ✓
                      </span>
                      <span
                        className={`text-sm ${
                          plan.highlighted ? 'text-blue-50' : 'text-gray-700'
                        }`}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                {plan.ctaHref ? (
                  <Link href={plan.ctaHref}>
                    <button
                      className={`w-full py-3.5 rounded-xl font-bold text-base transition ${
                        plan.highlighted
                          ? 'bg-white text-blue-700 hover:bg-blue-50'
                          : plan.ctaStyle === 'outline'
                          ? 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50'
                          : 'bg-gray-800 text-white hover:bg-gray-900'
                      }`}
                    >
                      {plan.cta}
                    </button>
                  </Link>
                ) : (
                  <button
                    onClick={() => plan.ctaPlan && handleCheckout(plan.ctaPlan)}
                    disabled={loadingPlan === plan.ctaPlan}
                    className={`w-full py-3.5 rounded-xl font-bold text-base transition disabled:opacity-60 ${
                      plan.highlighted
                        ? 'bg-white text-blue-700 hover:bg-blue-50'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                    }`}
                  >
                    {loadingPlan === plan.ctaPlan ? 'Redirecting...' : plan.cta}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Trust signals */}
        <div className="mt-16 text-center">
          <p className="text-gray-500 text-sm mb-6">Trusted by contractors across the US</p>
          <div className="flex flex-wrap justify-center gap-8 text-gray-400 text-sm">
            <span className="flex items-center gap-2">🔒 Secure payments via Stripe</span>
            <span className="flex items-center gap-2">↩️ Cancel anytime, no penalties</span>
            <span className="flex items-center gap-2">💳 No credit card for free plan</span>
            <span className="flex items-center gap-2">🚀 Instant access after signup</span>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {[
              {
                q: 'Can I upgrade or downgrade anytime?',
                a: 'Yes. Upgrade instantly and get prorated credit. Downgrade at end of billing period.',
              },
              {
                q: 'What happens when I hit 5 estimates on the free plan?',
                a: "You'll be prompted to upgrade to Pro for unlimited estimates. Your existing estimates stay safe.",
              },
              {
                q: 'What is the AI Phone Assistant?',
                a: 'A dedicated phone number with an AI that answers calls 24/7, qualifies leads, and captures project details — included free with Team.',
              },
              {
                q: 'Do you offer refunds?',
                a: "If you're not satisfied within 7 days of your first payment, contact us for a full refund.",
              },
            ].map(({ q, a }) => (
              <div key={q} className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-2">{q}</h3>
                <p className="text-gray-600 text-sm">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
