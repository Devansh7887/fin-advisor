'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, MessageSquare, TrendingUp, LogOut, BarChart3, LineChart, Newspaper, Target, Bell } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated, user, logout } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, router])

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/dashboard" className="text-xl font-bold text-primary">
                FinAdvisor
              </Link>
              
              <div className="hidden md:flex space-x-4">
                <NavLink href="/dashboard" icon={<LayoutDashboard size={18} />}>
                  Dashboard
                </NavLink>
                <NavLink href="/dashboard/portfolio" icon={<TrendingUp size={18} />}>
                  Portfolio
                </NavLink>
                <NavLink href="/dashboard/analytics" icon={<BarChart3 size={18} />}>
                  Analytics
                </NavLink>
                <NavLink href="/dashboard/patterns" icon={<LineChart size={18} />}>
                  Patterns
                </NavLink>
                <NavLink href="/dashboard/news" icon={<Newspaper size={18} />}>
                  News
                </NavLink>
                <NavLink href="/dashboard/goals" icon={<Target size={18} />}>
                  Goals
                </NavLink>
                <NavLink href="/dashboard/notifications" icon={<Bell size={18} />}>
                  Alerts
                </NavLink>
                <NavLink href="/dashboard/chat" icon={<MessageSquare size={18} />}>
                  Chat
                </NavLink>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user?.name}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut size={16} />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-primary transition-colors"
    >
      {icon}
      {children}
    </Link>
  )
}
