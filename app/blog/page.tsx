import { Metadata } from 'next'
import Link from 'next/link'
import { articles } from '@/lib/content/articles'

export const metadata: Metadata = {
  title: 'Contractor Estimating Blog | BuilderMind AI',
  description: 'Expert guides on contractor estimating, pricing, and business growth. Learn how to estimate HVAC, plumbing, electrical, roofing, and general contracting jobs.',
  keywords: 'contractor estimating, contractor pricing, HVAC estimate, plumbing estimate, electrical estimate, roofing estimate',
  openGraph: {
    title: 'Contractor Estimating Blog | BuilderMind AI',
    description: 'Expert guides on contractor estimating, pricing, and business growth.',
    url: 'https://buildermindai.com/blog',
    siteName: 'BuilderMind AI',
    type: 'website',
  }
}

const categories = ['All', 'HVAC', 'Plumbing', 'Electrical', 'Roofing', 'Business', 'Technology', 'Tools', 'General Contracting', 'Estimating']

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-gradient-to-b from-gray-900 to-gray-950 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 text-orange-400 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <span>📋</span> Contractor Resource Library
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Estimating Guides for Contractors
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            Free guides to help you estimate jobs faster, price for profit, and win more bids.
          </p>
          <div className="mt-8">
            <Link 
              href="/register"
              className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Try AI Estimating Free →
            </Link>
          </div>
        </div>
      </div>

      {/* Articles Grid */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <Link key={article.slug} href={`/blog/${article.slug}`}>
              <article className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-orange-500/50 hover:bg-gray-800/50 transition-all group cursor-pointer h-full flex flex-col">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-medium bg-orange-500/10 text-orange-400 px-2 py-1 rounded">
                    {article.category}
                  </span>
                  <span className="text-xs text-gray-500">{article.readTime}</span>
                </div>
                <h2 className="text-lg font-semibold text-white group-hover:text-orange-400 transition-colors mb-3 flex-1">
                  {article.title}
                </h2>
                <p className="text-sm text-gray-400 line-clamp-3">
                  {article.description}
                </p>
                <div className="mt-4 text-orange-500 text-sm font-medium group-hover:gap-2 flex items-center gap-1 transition-all">
                  Read guide <span>→</span>
                </div>
              </article>
            </Link>
          ))}
        </div>

        {/* CTA Banner */}
        <div className="mt-16 bg-gradient-to-r from-orange-500/10 to-orange-600/10 border border-orange-500/20 rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">Stop Writing Estimates by Hand</h2>
          <p className="text-gray-400 mb-6 max-w-xl mx-auto">
            BuilderMind AI generates professional contractor estimates in 60 seconds. Free to try — no credit card required.
          </p>
          <Link 
            href="/register"
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3 rounded-lg transition-colors text-lg"
          >
            Start Estimating Free →
          </Link>
        </div>
      </div>
    </div>
  )
}
