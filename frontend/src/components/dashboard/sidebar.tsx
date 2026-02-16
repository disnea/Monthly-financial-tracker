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
  Settings,
  LogOut,
  Menu,
  ChevronRight,
  Receipt,
  Target,
  Bell,
  X,
  ChevronLeft,
  User2,
  Crown,
  Users2,
  Download,
  Banknote,
  HeartHandshake
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/ui/theme-toggle'

interface NavSection {
  title: string
  items: NavItem[]
}

interface NavItem {
  name: string
  href: string
  icon: any
  color: string
  badge?: number
  description?: string
  shortcut?: string
}

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'warning' | 'success' | 'error'
  read: boolean
  timestamp: Date
  action?: {
    label: string
    href: string
  }
}

const navigationSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { 
        name: 'Dashboard', 
        href: '/dashboard', 
        icon: LayoutDashboard, 
        color: 'text-blue-500',
        description: 'Your financial overview',
        shortcut: 'D'
      },
    ]
  },
  {
    title: 'Finance',
    items: [
      { 
        name: 'Expenses', 
        href: '/dashboard/expenses', 
        icon: Receipt, 
        color: 'text-rose-500',
        description: 'Track your spending',
        shortcut: 'E'
      },
      { 
        name: 'EMI Loans', 
        href: '/dashboard/emi', 
        icon: CreditCard, 
        color: 'text-violet-500',
        description: 'Manage loans & EMIs',
        shortcut: 'L'
      },
      { 
        name: 'Investments', 
        href: '/dashboard/investments', 
        icon: TrendingUp, 
        color: 'text-emerald-500',
        description: 'Monitor your portfolio',
        shortcut: 'I'
      },
      { 
        name: 'Budgets', 
        href: '/dashboard/budgets', 
        icon: Target, 
        color: 'text-amber-500',
        description: 'Set financial goals',
        shortcut: 'B'
      },
      { 
        name: 'Income', 
        href: '/dashboard/income', 
        icon: Banknote, 
        color: 'text-green-500',
        description: 'Track your earnings',
        shortcut: 'N'
      },
      { 
        name: 'Borrowings', 
        href: '/dashboard/borrowings', 
        icon: Users2, 
        color: 'text-teal-500',
        description: 'Track money borrowed',
        shortcut: 'R'
      },
      { 
        name: 'Lendings', 
        href: '/dashboard/lendings', 
        icon: HeartHandshake, 
        color: 'text-indigo-500',
        description: 'Track money lent out',
        shortcut: 'G'
      },
      { 
        name: 'Export', 
        href: '/dashboard/export', 
        icon: Download, 
        color: 'text-slate-500',
        description: 'Download your data',
        shortcut: 'X'
      },
    ]
  },
  {
    title: 'Account',
    items: [
      { 
        name: 'Settings', 
        href: '/dashboard/settings', 
        icon: Settings, 
        color: 'text-gray-400',
        description: 'Preferences & profile',
        shortcut: ','
      },
    ]
  }
]

export function Sidebar() {
  const [mounted, setMounted] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const pathname = usePathname()
  const router = useRouter()
  const { user, clearAuth } = useAuthStore()

  useEffect(() => {
    setMounted(true)
    // Fetch notifications on mount
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    // TODO: Replace with actual API call when notification service is ready
    setNotifications([])
  }

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const unreadCount = notifications.filter(n => !n.read).length

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return '✅'
      case 'warning': return '⚠️'
      case 'error': return '❌'
      default: return 'ℹ️'
    }
  }

  const formatTimestamp = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    return 'Just now'
  }

  // Keyboard shortcuts
  useEffect(() => {
    if (!mounted) return

    const handleKeyPress = (e: KeyboardEvent) => {
      // Only trigger if Ctrl/Cmd + Shift is pressed
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        const section = navigationSections.flatMap(s => s.items)
        const item = section.find(i => i.shortcut?.toLowerCase() === e.key.toLowerCase())
        
        if (item) {
          e.preventDefault()
          router.push(item.href)
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [mounted, router])

  const handleLogout = () => {
    clearAuth()
    router.push('/login')
  }

  if (!mounted) {
    return (
      <div className="flex flex-col h-full bg-white border-r w-72">
        <div className="p-4 border-b">
          <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="flex-1 p-3 space-y-1">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-col h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white shadow-2xl transition-all duration-300 ease-in-out border-r border-slate-700/50",
        collapsed ? "w-20" : "w-72"
      )}
    >
      {/* Header - Fixed alignment */}
      <div className={cn(
        "flex items-center justify-between border-b border-slate-700/50 p-4 min-h-[72px] gap-3"
      )}>
        {!collapsed ? (
          <>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg flex items-center justify-center">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="font-bold text-base bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent truncate">
                  FinanceTracker
                </h1>
                <p className="text-xs text-slate-400 truncate">Manage your wealth</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="flex-shrink-0 h-9 w-9 hover:bg-slate-700/50 text-slate-300 hover:text-white rounded-lg transition-all"
              title="Collapse sidebar"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 w-full">
            <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg flex items-center justify-center">
              <Wallet className="h-5 w-5 text-white flex-shrink-0" />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setCollapsed(!collapsed)}
              className="flex-shrink-0 h-9 w-9 hover:bg-slate-700/50 text-slate-300 hover:text-white rounded-lg transition-all"
              title="Expand sidebar"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Notifications Badge - Shows when not collapsed */}
      {!collapsed && unreadCount > 0 && (
        <div className="px-4 pt-4 relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-full bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 flex items-center gap-3 hover:bg-blue-500/20 transition-all cursor-pointer"
          >
            <Bell className="h-4 w-4 text-blue-400 flex-shrink-0" />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-xs text-slate-300 truncate">{unreadCount} new notification{unreadCount !== 1 ? 's' : ''}</p>
            </div>
            <Badge className="bg-blue-500 text-white text-xs rounded-full px-2 flex-shrink-0">
              {unreadCount}
            </Badge>
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute left-4 right-4 top-full mt-2 z-50">
              <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-[400px] flex flex-col">
                {/* Header */}
                <div className="p-3 border-b border-slate-700 flex items-center justify-between bg-slate-900/50">
                  <h3 className="text-sm font-semibold text-white">Notifications</h3>
                  <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllAsRead}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Mark all read
                      </button>
                    )}
                    <button
                      onClick={() => setShowNotifications(false)}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Notification List */}
                <div className="overflow-y-auto custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center">
                      <Bell className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                      <p className="text-sm text-slate-400">No notifications</p>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={cn(
                          "p-3 border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors",
                          !notification.read && "bg-blue-500/5"
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-lg flex-shrink-0">{getNotificationIcon(notification.type)}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <h4 className={cn(
                                "text-xs font-semibold truncate",
                                !notification.read ? "text-white" : "text-slate-300"
                              )}>
                                {notification.title}
                              </h4>
                              <span className="text-[10px] text-slate-500 flex-shrink-0">
                                {formatTimestamp(notification.timestamp)}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-2">
                              {notification.action && (
                                <Link
                                  href={notification.action.href}
                                  onClick={() => {
                                    markAsRead(notification.id)
                                    setShowNotifications(false)
                                  }}
                                  className="text-[10px] text-blue-400 hover:text-blue-300 font-medium"
                                >
                                  {notification.action.label} →
                                </Link>
                              )}
                              {!notification.read && (
                                <button
                                  onClick={() => markAsRead(notification.id)}
                                  className="text-[10px] text-slate-500 hover:text-slate-400"
                                >
                                  Mark as read
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notification Bell Icon - Shows in collapsed mode */}
      {collapsed && unreadCount > 0 && (
        <div className="flex justify-center pt-3">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 hover:bg-slate-700/50 rounded-lg transition-all group"
            title="Notifications"
          >
            <Bell className="h-5 w-5 text-blue-400" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
            
            {/* Tooltip */}
            <div className="absolute left-full ml-2 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-slate-700 top-0">
              <div className="font-medium text-xs">{unreadCount} new notification{unreadCount !== 1 ? 's' : ''}</div>
            </div>
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto custom-scrollbar">
        {navigationSections.map((section, sectionIndex) => (
          <div key={section.title} className={cn("mb-4", sectionIndex > 0 && "mt-6")}>
            {!collapsed && (
              <h3 className="px-3 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {section.title}
              </h3>
            )}
            {collapsed && sectionIndex > 0 && (
              <div className="h-px bg-slate-700/50 my-3 mx-2" />
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                
                return (
                  <Link key={item.name} href={item.href}>
                    <div
                      className={cn(
                        "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 cursor-pointer",
                        collapsed && "justify-center px-2",
                        isActive 
                          ? "bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/40 shadow-lg" 
                          : "hover:bg-slate-700/40 border border-transparent hover:border-slate-600/40"
                      )}
                    >
                      <div className={cn(
                        "flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all",
                        isActive 
                          ? "bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg" 
                          : "bg-slate-800/50 group-hover:bg-slate-700/70"
                      )}>
                        <Icon className={cn(
                          "h-4 w-4 transition-transform group-hover:scale-110",
                          isActive ? "text-white" : item.color
                        )} />
                      </div>
                      
                      {!collapsed && (
                        <div className="flex-1 min-w-0 flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "text-sm font-medium truncate",
                                isActive ? "text-white" : "text-slate-300 group-hover:text-white"
                              )}>
                                {item.name}
                              </span>
                              {item.badge && (
                                <Badge className="bg-blue-500/20 text-blue-400 text-xs border border-blue-500/30 rounded-full px-1.5 py-0">
                                  {item.badge}
                                </Badge>
                              )}
                            </div>
                            {item.description && !isActive && (
                              <p className="text-[10px] text-slate-500 group-hover:text-slate-400 transition-colors mt-0.5 truncate">
                                {item.description}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                            {item.shortcut && (
                              <kbd className={cn(
                                "hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono rounded border transition-colors",
                                isActive 
                                  ? "bg-blue-500/20 text-blue-300 border-blue-500/30" 
                                  : "bg-slate-800 text-slate-500 border-slate-700 group-hover:text-slate-400 group-hover:border-slate-600"
                              )}>
                                <span className="text-[8px]">⌘⇧</span>
                                {item.shortcut}
                              </kbd>
                            )}
                            {isActive && (
                              <ChevronRight className="h-3.5 w-3.5 text-blue-400" />
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Tooltip for collapsed state */}
                      {collapsed && (
                        <div className="absolute left-full ml-2 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-slate-700">
                          <div className="font-medium text-xs">{item.name}</div>
                          {item.description && (
                            <div className="text-[10px] text-slate-400 mt-0.5">{item.description}</div>
                          )}
                          {item.shortcut && (
                            <div className="text-[9px] text-slate-500 mt-1 font-mono">⌘⇧{item.shortcut}</div>
                          )}
                        </div>
                      )}
                      
                      {isActive && (
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-xl blur-sm -z-10" />
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Quick Help - When not collapsed */}
      {!collapsed && (
        <div className="px-4 pb-3">
          <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="h-4 w-4 text-purple-400" />
              <p className="text-xs font-semibold text-purple-300">Pro Tip</p>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Use <kbd className="px-1 py-0.5 bg-slate-800 rounded text-purple-400 font-mono">⌘⇧[Key]</kbd> for quick navigation
            </p>
          </div>
        </div>
      )}

      {/* Theme Toggle */}
      <div className="px-4 pb-2">
        <ThemeToggle collapsed={collapsed} />
      </div>

      {/* User Profile & Logout */}
      <div className="border-t border-slate-700/50 bg-slate-900/80 p-3">
        {!collapsed && user && (
          <Link href="/dashboard/settings/profile">
            <div className="mb-3 p-3 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700/50 hover:border-blue-500/30 transition-all cursor-pointer group">
              <div className="flex items-center gap-3">
                <div className="relative flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg text-sm">
                    {user.full_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate group-hover:text-blue-400 transition-colors">
                    {user.full_name || 'User'}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-slate-400 flex-shrink-0" />
              </div>
            </div>
          </Link>
        )}
        
        {collapsed && user && (
          <div className="mb-3 flex justify-center">
            <Link href="/dashboard/settings/profile">
              <div className="relative group">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg text-sm cursor-pointer hover:scale-105 transition-transform">
                  {user.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900"></div>
                
                {/* Tooltip */}
                <div className="absolute left-full ml-2 px-3 py-2 bg-slate-800 text-white text-sm rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50 border border-slate-700">
                  <div className="font-medium text-xs">{user.full_name}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">View Profile</div>
                </div>
              </div>
            </Link>
          </div>
        )}
        
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={cn(
            "w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 transition-all rounded-xl h-10",
            collapsed ? "justify-center px-0" : "justify-start"
          )}
          title="Logout"
        >
          <LogOut className={cn("h-4 w-4", !collapsed && "mr-2")} />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </Button>
      </div>
    </div>
  )
}
