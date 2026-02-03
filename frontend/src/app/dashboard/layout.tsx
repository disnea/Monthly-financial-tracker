'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store'
import { Sidebar } from '@/components/dashboard/sidebar'

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
    console.log('🏠 Dashboard Layout - mounted:', mounted)
    console.log('📦 localStorage token:', token ? 'EXISTS' : 'MISSING')
    console.log('👤 localStorage user:', user ? 'EXISTS' : 'MISSING')
    return !!token && !!user
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && !checkAuth()) {
      console.log('🔄 Redirecting to login - not authenticated')
      router.push('/login')
    } else if (mounted && checkAuth()) {
      console.log('✅ User authenticated, staying on dashboard')
    }
  }, [mounted, router])

  if (!mounted) {
    // Return loading placeholder that matches server render
    return (
      <div className="flex h-screen overflow-hidden">
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
        <main className="flex-1 overflow-y-auto bg-background p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
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
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8 min-w-0">
        {children}
      </main>
    </div>
  )
}
