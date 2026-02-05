'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, DollarSign, Activity, PieChart } from 'lucide-react'
import Link from 'next/link'
import { portfolioAPI } from '@/lib/api'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalValue: 0,
    totalHoldings: 0,
    totalGainLoss: 0,
    totalGainLossPercent: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      console.log('📊 Loading dashboard data...');
      const portfolios = await portfolioAPI.getPortfolios();
      console.log('📊 Portfolios received:', portfolios);
      
      let totalValue = 0;
      let totalHoldings = 0;
      let totalCost = 0;
      
      portfolios.forEach((portfolio: any) => {
        console.log(`📊 Processing portfolio: ${portfolio.name}`, {
          totalValue: portfolio.totalValue,
          totalCost: portfolio.totalCost,
          holdings: portfolio.holdings?.length
        });
        totalValue += Number(portfolio.totalValue || 0);
        totalCost += Number(portfolio.totalCost || 0);
        totalHoldings += portfolio.holdings?.length || 0;
      });
      
      const totalGainLoss = totalValue - totalCost;
      const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
      
      console.log('📊 Dashboard stats calculated:', {
        totalValue,
        totalHoldings,
        totalGainLoss,
        totalGainLossPercent
      });
      
      setStats({
        totalValue,
        totalHoldings,
        totalGainLoss,
        totalGainLossPercent,
      });
    } catch (error) {
      console.error('❌ Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-600">
          Welcome to your AI-powered financial advisory platform
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Portfolio Value"
          value={loading ? "..." : `$${stats.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<DollarSign className="text-blue-600" />}
          change={loading ? "" : `${stats.totalGainLossPercent >= 0 ? '+' : ''}${stats.totalGainLossPercent.toFixed(2)}%`}
        />
        <StatCard
          title="Holdings"
          value={loading ? "..." : stats.totalHoldings.toString()}
          icon={<PieChart className="text-purple-600" />}
        />
        <StatCard
          title="Today's Change"
          value={loading ? "..." : `$${stats.totalGainLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<Activity className="text-green-600" />}
          change={loading ? "" : `${stats.totalGainLossPercent >= 0 ? '+' : ''}${stats.totalGainLossPercent.toFixed(2)}%`}
        />
        <StatCard
          title="Total Return"
          value={loading ? "..." : `$${stats.totalGainLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={<TrendingUp className="text-orange-600" />}
          change={loading ? "" : `${stats.totalGainLossPercent >= 0 ? '+' : ''}${stats.totalGainLossPercent.toFixed(2)}%`}
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href="/dashboard/portfolio">
              <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
                <TrendingUp size={24} />
                <span>Manage Portfolio</span>
              </Button>
            </Link>
            <Link href="/dashboard/chat">
              <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
                <MessageSquare size={24} />
                <span>AI Financial Advisor</span>
              </Button>
            </Link>
            <Link href="/dashboard/analytics">
              <Button variant="outline" className="w-full h-24 flex flex-col gap-2">
                <Activity size={24} />
                <span>Market Analysis</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Getting Started */}
      <Card>
        <CardHeader>
          <CardTitle>Getting Started</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h3 className="font-semibold mb-1">Create Your First Portfolio</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Add your investment holdings to track performance
                </p>
                <Link href="/dashboard/portfolio">
                  <Button size="sm">Add Portfolio</Button>
                </Link>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-lg">
              <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h3 className="font-semibold mb-1">Chat with AI Advisor</h3>
                <p className="text-sm text-gray-600 mb-2">
                  Get personalized financial advice powered by Gemini AI
                </p>
                <Link href="/dashboard/chat">
                  <Button size="sm">Start Chat</Button>
                </Link>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-green-50 rounded-lg">
              <div className="bg-green-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h3 className="font-semibold mb-1">Explore Market Data</h3>
                <p className="text-sm text-gray-600">
                  Access real-time quotes and technical indicators
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  change,
}: {
  title: string
  value: string
  icon: React.ReactNode
  change?: string
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">{title}</span>
          {icon}
        </div>
        <div className="text-2xl font-bold mb-1">{value}</div>
        {change && (
          <span className={`text-sm ${change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
            {change}
          </span>
        )}
      </CardContent>
    </Card>
  )
}

function MessageSquare({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  )
}
