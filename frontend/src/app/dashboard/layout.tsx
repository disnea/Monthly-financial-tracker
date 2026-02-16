'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { Sidebar } from '@/components/dashboard/sidebar'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  const router = useRouter()
  
  // Simple authentication check using localStorage directly
  const checkAuth = () => {
    const token = localStorage.getItem('auth_token')
    const user = localStorage.getItem('user')
    return !!token && !!user
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !checkAuth()) {
      router.push('/login')
    }
  }, [mounted, router])

  if (!mounted) {
    // Return loading placeholder that matches server render
    return (
      <div className="flex h-screen overflow-hidden">
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r dark:border-slate-800 w-64">
          <div className="p-4 border-b dark:border-slate-800">
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded animate-pulse"></div>
          </div>
          <div className="flex-1 p-3 space-y-1">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-8 bg-gray-200 dark:bg-slate-700 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
        <main className="flex-1 overflow-y-auto bg-background p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2"></div>
            <div className="h-32 bg-gray-200 dark:bg-slate-700 rounded"></div>
          </div>
        </main>
      </div>
    )
  }

  if (!checkAuth()) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      <Sheet>
        <div className="fixed top-4 left-4 z-40 md:hidden">
          <SheetTrigger asChild>
            <Button size="icon" variant="outline" className="rounded-xl bg-white dark:bg-slate-900 shadow-lg border-slate-200 dark:border-slate-700">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
        </div>
        <SheetContent side="left" className="p-0 w-72 border-0">
          <Sidebar />
        </SheetContent>
      </Sheet>

      <main className="flex-1 overflow-y-auto p-4 pt-16 md:p-8 md:pt-8 dark:text-slate-100">
        {children}
      </main>
    </div>
  )
}
