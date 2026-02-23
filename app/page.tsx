// app/page.tsx
import Link from 'next/link'

const features = [
  {
    icon: '⚡',
    title: 'Estimates in Minutes',
    description: 'Upload photos or describe your project. Our AI generates detailed, accurate estimates faster than any spreadsheet.',
  },
  {
    icon: '🧠',
    title: 'AI That Learns Your Business',
    description: 'The more you use it, the smarter it gets. BuilderMindAI adapts to your labor rates, margins, and preferences.',
  },
  {
    icon: '📞',
    title: '24/7 AI Phone Assistant',
    description: 'Never miss a lead. Your AI answers calls, qualifies prospects, and captures project details around the clock.',
  },
  {
    icon: '📄',
    title: 'Professional Proposals',
    description: 'One-click branded PDF proposals that impress clients and close deals — no design skills needed.',
  },
  {
    icon: '💼',
    title: 'Business Advisor AI',
    description: 'Get expert guidance on pricing strategy, growth, exit planning, and operational efficiency.',
  },
  {
    icon: '🔒',
    title: 'Built for Contractors',
    description: 'Every feature is purpose-built for construction pros — from GCs to specialty trades.',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <span className="text-2xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          BuilderMindAI
        </span>
        <div className="hidden md:flex items-center gap-8 text-gray-600 font-medium">
          <Link href="/pricing" className="hover:text-blue-600 transition">Pricing</Link>
          <Link href="/blog" className="hover:text-blue-600 transition">Blog</Link>
          <Link href="/login" className="hover:text-blue-600 transition">Sign In</Link>
          <Link
            href="/register"
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold shadow-sm"
          >
            Get Started Free
          </Link>
        </div>
        {/* Mobile nav */}
        <div className="flex md:hidden items-center gap-3">
          <Link href="/pricing" className="text-gray-600 text-sm font-medium">Pricing</Link>
          <Link href="/blog" className="text-gray-600 text-sm font-medium">Blog</Link>
          <Link
            href="/register"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-7xl mx-auto px-6 pt-16 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-6">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
          AI-Powered Construction Estimating
        </div>

        <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-6 leading-tight">
          BuilderMindAI
          <span className="block bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Win More Jobs, Faster.
          </span>
        </h1>

        <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-3xl mx-auto leading-relaxed">
          AI-Powered Estimating for Contractors — Generate accurate quotes in minutes,
          impress clients with professional proposals, and never miss a lead again.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
          <Link href="/register">
            <button className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-bold text-lg shadow-lg hover:from-blue-700 hover:to-purple-700 transition duration-300 w-full sm:w-auto">
              Start Free — No Credit Card
            </button>
          </Link>
          <Link href="/pricing">
            <button className="px-8 py-4 bg-white text-gray-800 rounded-xl font-bold text-lg shadow-md hover:bg-gray-50 border border-gray-200 transition duration-300 w-full sm:w-auto">
              View Pricing →
            </button>
          </Link>
        </div>

        {/* Social proof bar */}
        <div className="flex flex-wrap justify-center gap-8 text-gray-500 text-sm">
          <span className="flex items-center gap-2">✅ Free plan, always</span>
          <span className="flex items-center gap-2">✅ Setup in under 2 minutes</span>
          <span className="flex items-center gap-2">✅ Used by contractors nationwide</span>
          <span className="flex items-center gap-2">✅ Cancel anytime</span>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-6 pb-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
            Everything a contractor needs to
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> close more deals</span>
          </h2>
          <p className="text-gray-500 text-lg max-w-2xl mx-auto">
            Stop losing jobs to slower competitors. BuilderMindAI puts principal-level estimating in your hands.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-1 transition-all duration-300"
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-500 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 py-16 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            Ready to win more bids?
          </h2>
          <p className="text-blue-100 text-lg mb-8">
            Join contractors already using BuilderMindAI to estimate faster and close more jobs.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="/register">
              <button className="px-8 py-4 bg-white text-blue-700 rounded-xl font-bold text-lg hover:bg-blue-50 transition shadow-lg w-full sm:w-auto">
                Get Started Free
              </button>
            </Link>
            <Link href="/pricing">
              <button className="px-8 py-4 bg-blue-500/30 text-white border border-white/30 rounded-xl font-bold text-lg hover:bg-blue-500/50 transition w-full sm:w-auto">
                See Pricing
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <span className="text-lg font-black bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            BuilderMindAI
          </span>
          <div className="flex gap-6 text-sm">
            <Link href="/pricing" className="hover:text-white transition">Pricing</Link>
            <Link href="/login" className="hover:text-white transition">Sign In</Link>
            <Link href="/register" className="hover:text-white transition">Register</Link>
          </div>
          <p className="text-xs text-gray-600">© 2026 BuilderMindAI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
