'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Hero Section */}
      <div className="container mx-auto px-6 py-16">
        <nav className="flex justify-between items-center mb-16">
          <div className="text-2xl font-bold text-blue-600">EstimatorAI</div>
          <div className="space-x-4">
            <Link href="/login" className="text-gray-700 hover:text-blue-600">
              Login
            </Link>
            <Link 
              href="/estimate" 
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Try Free
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <div className="text-center max-w-4xl mx-auto mb-20">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Generate Construction Estimates in
            <span className="text-blue-600"> 2 Minutes</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            AI-powered estimating tool that analyzes your photos and descriptions
            to create detailed, accurate estimates instantly.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/estimate"
              className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 shadow-lg"
            >
              Start Free Trial
            </Link>
            <Link
              href="#demo"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-50 shadow-lg"
            >
              Watch Demo
            </Link>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            No credit card required • 5 free estimates
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <div className="bg-white p-8 rounded-xl shadow-md">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold mb-3">AI-Powered</h3>
            <p className="text-gray-600">
              GPT-4 analyzes your project description and photos to generate
              accurate line-item estimates.
            </p>
          </div>
          <div className="bg-white p-8 rounded-xl shadow-md">
            <div className="text-4xl mb-4">📸</div>
            <h3 className="text-xl font-semibold mb-3">Photo Analysis</h3>
            <p className="text-gray-600">
              Upload project photos and our AI extracts dimensions, materials,
              and scope automatically.
            </p>
          </div>
          <div className="bg-white p-8 rounded-xl shadow-md">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold mb-3">Lightning Fast</h3>
            <p className="text-gray-600">
              What used to take 3 hours now takes 2 minutes. Focus on winning
              jobs, not paperwork.
            </p>
          </div>
        </div>

        {/* How It Works */}
        <div className="text-center mb-20">
          <h2 className="text-3xl font-bold mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Describe Your Project</h3>
              <p className="text-gray-600">
                Chat with the AI about your project. Upload photos if you have them.
              </p>
            </div>
            <div>
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">AI Generates Estimate</h3>
              <p className="text-gray-600">
                Our AI analyzes everything and creates a detailed line-item estimate.
              </p>
            </div>
            <div>
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Review & Send</h3>
              <p className="text-gray-600">
                Adjust pricing, export to PDF, and send to your client.
              </p>
            </div>
          </div>
        </div>

        {/* Social Proof */}
        <div className="bg-white rounded-xl p-12 mb-20 text-center">
          <h2 className="text-3xl font-bold mb-8">Trusted by Contractors</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">10x</div>
              <p className="text-gray-600">Faster than manual estimating</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">$220</div>
              <p className="text-gray-600">Average savings per estimate</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">95%</div>
              <p className="text-gray-600">Accuracy rate</p>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div id="pricing" className="text-center mb-20">
          <h2 className="text-3xl font-bold mb-12">Simple Pricing</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free */}
            <div className="bg-white rounded-xl p-8 shadow-md">
              <h3 className="text-2xl font-bold mb-2">Free</h3>
              <div className="text-4xl font-bold mb-6">$0</div>
              <ul className="text-left space-y-3 mb-8">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  5 estimates/month
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  PDF export
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Basic features
                </li>
              </ul>
              <Link
                href="/estimate"
                className="block w-full bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300"
              >
                Start Free
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-blue-600 text-white rounded-xl p-8 shadow-xl transform scale-105">
              <div className="bg-yellow-400 text-blue-900 text-xs font-bold px-3 py-1 rounded-full inline-block mb-2">
                MOST POPULAR
              </div>
              <h3 className="text-2xl font-bold mb-2">Pro</h3>
              <div className="text-4xl font-bold mb-6">
                $49<span className="text-lg">/mo</span>
              </div>
              <ul className="text-left space-y-3 mb-8">
                <li className="flex items-start">
                  <span className="text-blue-200 mr-2">✓</span>
                  Unlimited estimates
                </li>
                <li className="flex items-start">
                  <span className="text-blue-200 mr-2">✓</span>
                  Photo analysis
                </li>
                <li className="flex items-start">
                  <span className="text-blue-200 mr-2">✓</span>
                  Custom pricing rules
                </li>
                <li className="flex items-start">
                  <span className="text-blue-200 mr-2">✓</span>
                  Email support
                </li>
              </ul>
              <Link
                href="/estimate"
                className="block w-full bg-white text-blue-600 py-3 rounded-lg hover:bg-blue-50 font-semibold"
              >
                Start 14-Day Trial
              </Link>
            </div>

            {/* Team */}
            <div className="bg-white rounded-xl p-8 shadow-md">
              <h3 className="text-2xl font-bold mb-2">Team</h3>
              <div className="text-4xl font-bold mb-6">
                $99<span className="text-lg">/mo</span>
              </div>
              <ul className="text-left space-y-3 mb-8">
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Everything in Pro
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  5 team members
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Shared pricing library
                </li>
                <li className="flex items-start">
                  <span className="text-green-500 mr-2">✓</span>
                  Priority support
                </li>
              </ul>
              <Link
                href="/estimate"
                className="block w-full bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300"
              >
                Start Trial
              </Link>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-blue-600 text-white rounded-xl p-12 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Save Hours?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Join contractors who are already using AI to win more jobs.
          </p>
          <Link
            href="/estimate"
            className="inline-block bg-white text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50"
          >
            Start Free Trial
          </Link>
        </div>

        {/* Footer */}
        <footer className="mt-20 text-center text-gray-600">
          <p>&copy; 2024 EstimatorAI. Built by contractors, for contractors.</p>
          <div className="mt-4 space-x-4">
            <Link href="/privacy" className="hover:text-blue-600">Privacy</Link>
            <Link href="/terms" className="hover:text-blue-600">Terms</Link>
            <Link href="/contact" className="hover:text-blue-600">Contact</Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
