// app/page.tsx (Landing Page - Basic Structure)
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-purple-200 flex items-center justify-center px-4">
      <div className="text-center max-w-3xl">
        <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6">
          EstimatorAI: Your Smart Construction Estimating Tool
        </h1>
        <p className="text-xl text-gray-700 mb-8">
          Effortlessly generate detailed construction estimates using AI. Upload photos,
          describe your project, and get accurate quotes in minutes.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-6">
          <Link href="/login">
            <button className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold text-lg shadow-lg hover:bg-blue-700 transition duration-300">
              Get Started
            </button>
          </Link>
          <Link href="/estimate">
            <button className="px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold text-lg shadow-lg hover:bg-blue-100 transition duration-300 border border-blue-600">
              Try Estimate Now
            </button>
          </Link>
        </div>
        </div>
    </div>
  )
}
