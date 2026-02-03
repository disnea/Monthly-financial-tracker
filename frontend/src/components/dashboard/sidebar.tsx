'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/store'
import {
  LayoutDashboard,
  Wallet,
  CreditCard,
  TrendingUp,
  PieChart,
  Settings,
  LogOut,
  Menu,
  ChevronRight,
  Receipt,
  Target,
  User
} from 'lucide-react'
import { useState, useEffect } from 'react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, color: 'text-blue-500' },
  { name: 'Expenses', href: '/dashboard/expenses', icon: Receipt, color: 'text-rose-500' },
  { name: 'EMI Loans', href: '/dashboard/emi', icon: CreditCard, color: 'text-violet-500' },
  { name: 'Investments', href: '/dashboard/investments', icon: TrendingUp, color: 'text-emerald-500' },
  { name: 'Budgets', href: '/dashboard/budgets', icon: Target, color: 'text-amber-500' },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings, color: 'text-gray-500' },
]

export function Sidebar() {
  const [mounted, setMounted] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { user, clearAuth } = useAuthStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleLogout = () => {
    clearAuth()
    router.push('/login')
  }

  if (!mounted) {
    // Return a placeholder that matches server render
    return (
      <div className="flex flex-col h-full bg-white border-r w-64">
        <div className="p-4 border-b">
          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="flex-1 p-3 space-y-1">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-8 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-col h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl transition-all duration-300",
        collapsed ? "w-20" : "w-72"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
              <Wallet className="h-6 w-6 text-white" />
            </div>
            <div>
              <span className="font-bold text-xl bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                FinanceTracker
              </span>
              <p className="text-xs text-slate-400">Manage your wealth</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto hover:bg-slate-700/50 text-slate-300 hover:text-white"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 px-4 py-6 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon
          const isActive = mounted ? pathname === item.href : false
          
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={cn(
                  "group relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer",
                  collapsed && "justify-center px-3",
                  isActive 
                    ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 shadow-lg" 
                    : "hover:bg-slate-700/30 border border-transparent hover:border-slate-600/30"
                )}
              >
                <Icon className={cn("h-5 w-5 shrink-0", item.color, isActive && "drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]")} />
                {!collapsed && (
                  <>
                    <span className={cn(
                      "text-sm font-medium flex-1",
                      isActive ? "text-white" : "text-slate-300 group-hover:text-white"
                    )}>
                      {item.name}
                    </span>
                    {isActive && (
                      <ChevronRight className="h-4 w-4 text-blue-400 animate-pulse" />
                    )}
                  </>
                )}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl blur-xl -z-10" />
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-slate-700/50 bg-slate-900/50">
        {!collapsed && user && (
          <Link href="/dashboard/settings">
            <div className="mb-4 p-4 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700/50 shadow-lg cursor-pointer hover:bg-slate-800/80 hover:border-blue-500/30 transition-all">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg">
                  {user.full_name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{user.full_name}</p>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
            </div>
          </Link>
        )}
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={cn(
            "w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 transition-all",
            collapsed ? "justify-center px-2" : "justify-start"
          )}
        >
          <LogOut className={cn("h-5 w-5", !collapsed && "mr-3")} />
          {!collapsed && <span className="font-medium">Logout</span>}
        </Button>
      </div>
    </div>
  )
}
