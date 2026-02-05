'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function Home() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      setIsAuthenticated(true)
      router.push('/dashboard')
    }
  }, [router])

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Financial Advisory Platform
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            AI-powered wealth management with real-time market insights, 
            personalized portfolio analysis, and intelligent financial advice
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/auth/register">
              <Button size="lg" className="text-lg px-8">
                Get Started
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mt-16">
          <FeatureCard
            title="🤖 AI Financial Advisor"
            description="Get personalized investment advice powered by Gemini AI, tailored to your goals and risk tolerance"
          />
          <FeatureCard
            title="📊 Portfolio Management"
            description="Track your investments in real-time with comprehensive analytics and performance metrics"
          />
          <FeatureCard
            title="📈 Market Data & Insights"
            description="Access real-time stock quotes, historical data, and technical indicators"
          />
          <FeatureCard
            title="💬 Intelligent Chat"
            description="Ask questions about your portfolio, market trends, and get instant AI-powered responses"
          />
          <FeatureCard
            title="⚡ Real-time Updates"
            description="Live WebSocket connections for instant portfolio updates and market data"
          />
          <FeatureCard
            title="🎯 Risk Analysis"
            description="Understand your portfolio's risk profile with advanced analytics and recommendations"
          />
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-4">
              Ready to transform your financial future?
            </h2>
            <p className="text-xl mb-8 opacity-90">
              Join thousands of investors using AI-powered insights for smarter financial decisions
            </p>
            <Link href="/auth/register">
              <Button size="lg" variant="secondary" className="text-lg px-12">
                Start Free Today
              </Button>
            </Link>
          </div>
        </div>

        {/* Tech Stack Footer */}
        <div className="mt-16 text-center text-sm text-gray-500">
          <p>Powered by Gemini AI • Next.js • NestJS • MongoDB • Redis</p>
          <p className="mt-2">100% Free Tier • Real-time Market Data • Secure & Private</p>
        </div>
      </div>
    </main>
  )
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-shadow">
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}
