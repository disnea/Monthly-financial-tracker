'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, CreditCard, PieChart, 
  DollarSign, Activity, Calendar, ChevronRight, Sparkles, Eye, EyeOff,
  Download, RefreshCw, Bell, Settings, Plus, ArrowRight, TrendingDown,
  Target, Clock, AlertCircle, CheckCircle2, Banknote, HeartHandshake, AlertTriangle,
  ArrowUp, ArrowDown, Minus, Info, CalendarClock, Receipt
} from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { useCurrency } from '@/hooks/useCurrency'
import { expenseApi, emiApi, investmentApi, budgetApi, borrowingApi, incomeApi, lendingApi, netWorthApi, aiApi } from '@/lib/api'
import { toast } from 'sonner'
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar, LineChart, Line, ComposedChart } from 'recharts'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { NetWorthSparkline, NetWorthMicroSparkline } from '@/components/charts/NetWorthSparkline'
import { HealthScoreIndicator, HealthScoreBadge } from '@/components/charts/HealthScoreIndicator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ExpenseResponse } from '@/types/finance'

type ExpensePieSlice = {
  id: string
  name: string
  value: number
  color: string
}

const DEFAULT_CATEGORY_COLOR = '#64748b'

// ── Skeleton Components ─────────────────────────────────────────────
const SkeletonPulse = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse rounded-lg bg-slate-200 dark:bg-slate-700", className)} />
)

const StatCardSkeleton = () => (
  <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
    <CardContent className="p-6">
      <div className="flex items-center justify-between mb-4">
        <SkeletonPulse className="w-12 h-12 rounded-xl" />
        <SkeletonPulse className="w-16 h-5 rounded-md" />
      </div>
      <SkeletonPulse className="w-24 h-4 mb-3" />
      <SkeletonPulse className="w-32 h-8 mb-2" />
      <SkeletonPulse className="w-40 h-3" />
    </CardContent>
  </Card>
)

const ChartSkeleton = () => (
  <Card className="border border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl bg-white dark:bg-slate-900">
    <CardHeader className="border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-3">
        <SkeletonPulse className="w-10 h-10 rounded-xl" />
        <div>
          <SkeletonPulse className="w-40 h-5 mb-2" />
          <SkeletonPulse className="w-56 h-3" />
        </div>
      </div>
    </CardHeader>
    <CardContent className="pt-6">
      <SkeletonPulse className="w-full h-[240px] rounded-xl" />
      <div className="flex gap-4 mt-4">
        <SkeletonPulse className="w-24 h-4" />
        <SkeletonPulse className="w-24 h-4" />
      </div>
    </CardContent>
  </Card>
)

const HeroSkeleton = () => (
  <Card className="border shadow-lg rounded-3xl bg-white dark:bg-slate-900 dark:border-slate-800">
    <CardContent className="p-8">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-4">
            <SkeletonPulse className="w-14 h-14 rounded-2xl" />
            <div className="flex-1">
              <SkeletonPulse className="w-56 h-7 mb-2" />
              <SkeletonPulse className="w-36 h-4" />
            </div>
          </div>
          <div className="rounded-2xl p-5 bg-slate-50 dark:bg-slate-800">
            <SkeletonPulse className="w-20 h-4 mb-4" />
            <SkeletonPulse className="w-48 h-10 mb-4" />
            <SkeletonPulse className="w-full h-[60px] rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:w-[420px]">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonPulse key={i} className={cn("h-[100px] rounded-xl", i === 6 && "col-span-2")} />
          ))}
        </div>
      </div>
    </CardContent>
  </Card>
)

// ── Mini Sparkline (inline in stat card) ────────────────────────────
const MiniSparkline = ({ data, color, height = 32 }: { data: number[]; color: string; height?: number }) => {
  if (!data.length) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 80
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - ((v - min) / range) * (height - 4) - 2}`).join(' ')
  return (
    <svg width={w} height={height} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" points={points} />
    </svg>
  )
}

export default function DashboardPage() {
  const { currency, symbol, format } = useCurrency()
  const user = useAuthStore((state) => state.user)
  const token = useAuthStore((state) => state.token)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated())
  const [loading, setLoading] = useState(true)
  const [showBalance, setShowBalance] = useState(true)
  const [dateRange, setDateRange] = useState<string>('this_month')
  const [allExpenses, setAllExpenses] = useState<ExpenseResponse[]>([])
  const [allIncomes, setAllIncomes] = useState<any[]>([])
  const [allEmis, setAllEmis] = useState<any[]>([])
  const [allBorrowings, setAllBorrowings] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalExpenses: 0,
    expenseCount: 0,
    emiCount: 0,
    emiMonthly: 0,
    investmentValue: 0,
    investmentReturn: 0,
    budgetTotal: 0,
    budgetUsed: 0,
    borrowingsOwed: 0,
    borrowingsOpen: 0,
    borrowingsOverdue: 0,
    totalIncome: 0,
    thisMonthIncome: 0,
    incomeCount: 0,
    lendingsOutstanding: 0,
    lendingsOpen: 0,
    lendingsOverdue: 0,
    netWorth: 0,
    prevMonthExpenses: 0,
    prevMonthIncome: 0,
    savingsRate: 0,
  })
  const [recentExpenses, setRecentExpenses] = useState<ExpenseResponse[]>([])
  const [expensePieData, setExpensePieData] = useState<ExpensePieSlice[]>([])
  const [monthlyTrendData, setMonthlyTrendData] = useState<any[]>([])
  const [netWorthTrend, setNetWorthTrend] = useState<any[]>([])
  const [healthScore, setHealthScore] = useState<any>(null)
  const [netWorthError, setNetWorthError] = useState<string | null>(null)
  const [isMockData, setIsMockData] = useState(false)
  const [anomalies, setAnomalies] = useState<any[]>([])
  const [incomeVsExpenseData, setIncomeVsExpenseData] = useState<any[]>([])

  // Date range helper
  const getDateRange = (range: string): { start: Date; end: Date } => {
    const now = new Date()
    switch (range) {
      case 'this_month':
        return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: new Date(now.getFullYear(), now.getMonth() + 1, 0) }
      case 'last_month': {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        return { start: lastMonth, end: new Date(now.getFullYear(), now.getMonth(), 0) }
      }
      case 'last_3_months':
        return { start: new Date(now.getFullYear(), now.getMonth() - 3, 1), end: now }
      case 'last_6_months':
        return { start: new Date(now.getFullYear(), now.getMonth() - 6, 1), end: now }
      case 'this_year':
        return { start: new Date(now.getFullYear(), 0, 1), end: now }
      case 'all_time':
        return { start: new Date(2000, 0, 1), end: now }
      default:
        return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now }
    }
  }

  const filterByDateRange = <T extends Record<string, any>>(items: T[], dateField: string): T[] => {
    const { start, end } = getDateRange(dateRange)
    return items.filter(item => {
      const d = new Date(item[dateField])
      return d >= start && d <= end
    })
  }

  useEffect(() => {
    if (isAuthenticated && token && user) {
      fetchDashboardData()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated, token, user])

  // Recalculate stats when date range changes
  useEffect(() => {
    if (allExpenses.length === 0 && allIncomes.length === 0) return
    recalculateStats()
  }, [dateRange])

  const fetchDashboardData = async () => {
    try {
      const [expenses, emis, investments, budgets, borrowings, incomes, lendings] = await Promise.all([
        expenseApi.list().catch(() => [] as ExpenseResponse[]),
        emiApi.list().catch(() => []),
        investmentApi.list().catch(() => []),
        budgetApi.list().catch(() => []),
        borrowingApi.list().catch(() => []),
        incomeApi.list().catch(() => []),
        lendingApi.list().catch(() => [])
      ])

      setAllExpenses(expenses)
      setAllIncomes(incomes)
      setAllEmis(emis)
      setAllBorrowings(borrowings)

      // Net worth data
      let netWorthData: any[] = []
      let healthData: any = null
      try {
        netWorthData = await netWorthApi.getTrend(12)
        healthData = await netWorthApi.getHealthScore()
        setNetWorthError(null)
        setIsMockData(false)
      } catch {
        netWorthData = generateMockNetWorthTrend()
        healthData = generateMockHealthScore()
        setNetWorthError(null)
        setIsMockData(true)
      }

      const filteredExpenses = filterByDateRange(expenses, 'transaction_date')
      const filteredIncomes = filterByDateRange(incomes, 'income_date')

      // Previous month calculations for trend comparison
      const now = new Date()
      const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      const prevMonthExpenses = expenses.filter((e: any) => {
        const d = new Date(e.transaction_date)
        return d >= prevStart && d <= prevEnd
      }).reduce((s: number, e: any) => s + e.amount, 0)
      const prevMonthIncome = incomes.filter((i: any) => {
        const d = new Date(i.income_date)
        return d >= prevStart && d <= prevEnd
      }).reduce((s: number, i: any) => s + i.amount, 0)

      const totalExpenses = filteredExpenses.reduce((sum: number, e: any) => sum + e.amount, 0)
      const emiMonthly = emis.reduce((sum: number, e: any) => sum + (e.monthly_emi || 0), 0)
      const investmentValue = investments.reduce((sum: number, i: any) => sum + (i.total_value || i.quantity * i.purchase_price), 0)
      const investmentCost = investments.reduce((sum: number, i: any) => sum + (i.quantity * i.purchase_price), 0)
      const investmentReturn = investmentCost > 0 ? ((investmentValue - investmentCost) / investmentCost) * 100 : 0
      const budgetTotal = budgets.reduce((sum: number, b: any) => sum + b.amount, 0)
      const budgetUsed = budgets.reduce((sum: number, b: any) => sum + (b.spent || 0), 0)
      const borrowingsOwed = borrowings.filter((b: any) => b.status !== 'closed').reduce((s: number, b: any) => s + (b.remaining_amount || 0), 0)
      const borrowingsOpen = borrowings.filter((b: any) => b.status === 'open' || b.status === 'partially_paid').length
      const borrowingsOverdue = borrowings.filter((b: any) => b.due_date && new Date(b.due_date) < new Date() && b.status !== 'closed')
      const totalIncome = filteredIncomes.reduce((s: number, i: any) => s + i.amount, 0)
      const thisMonthIncome = filteredIncomes.reduce((s: number, i: any) => s + i.amount, 0)
      const lendingsOutstanding = lendings.filter((l: any) => l.status !== 'closed').reduce((s: number, l: any) => s + (l.remaining_amount || 0), 0)
      const lendingsOpen = lendings.filter((l: any) => l.status === 'open' || l.status === 'partially_received').length
      const lendingsOverdue = lendings.filter((l: any) => l.due_date && new Date(l.due_date) < new Date() && l.status !== 'closed').length

      const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0

      const assets = investmentValue + lendingsOutstanding + thisMonthIncome
      const liabilities = borrowingsOwed + emis.reduce((sum: number, e: any) => sum + (e.remaining_amount || 0), 0)
      const calculatedNetWorth = assets - liabilities

      setStats({
        totalExpenses, expenseCount: filteredExpenses.length,
        emiCount: emis.length, emiMonthly,
        investmentValue, investmentReturn,
        budgetTotal, budgetUsed,
        borrowingsOwed, borrowingsOpen: borrowingsOpen, borrowingsOverdue: borrowingsOverdue.length,
        totalIncome, thisMonthIncome, incomeCount: filteredIncomes.length,
        lendingsOutstanding, lendingsOpen, lendingsOverdue,
        netWorth: calculatedNetWorth,
        prevMonthExpenses, prevMonthIncome, savingsRate,
      })

      setNetWorthTrend(netWorthData)
      setHealthScore(healthData)

      // Anomalies (non-blocking)
      try {
        const anomalyData = await aiApi.anomalies()
        setAnomalies(anomalyData || [])
      } catch {
        setAnomalies([])
      }

      setRecentExpenses(filteredExpenses.slice(0, 5))

      // Build income vs expense monthly comparison (last 6 months)
      if (expenses.length > 0 || incomes.length > 0) {
        const monthMap = new Map<string, { expenses: number; income: number }>()
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          monthMap.set(key, { expenses: 0, income: 0 })
        }
        expenses.forEach((e: any) => {
          const d = new Date(e.transaction_date)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          const entry = monthMap.get(key)
          if (entry) entry.expenses += e.amount
        })
        incomes.forEach((i: any) => {
          const d = new Date(i.income_date)
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          const entry = monthMap.get(key)
          if (entry) entry.income += i.amount
        })
        const chartData = Array.from(monthMap.entries()).map(([key, data]) => {
          const [y, m] = key.split('-')
          const monthName = new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('en-US', { month: 'short' })
          return { month: monthName, expenses: Math.round(data.expenses), income: Math.round(data.income), savings: Math.round(data.income - data.expenses) }
        })
        setIncomeVsExpenseData(chartData)
        setMonthlyTrendData(chartData)
      }

      // Build pie chart
      if (filteredExpenses.length > 0) {
        type CategoryAggregate = { id: string; name: string; color: string; total: number }
        const categoryMap = new Map<string, CategoryAggregate>()
        filteredExpenses.forEach((expense) => {
          const bucketId = expense.category_id ?? 'uncategorized'
          const existing = categoryMap.get(bucketId)
          const name = expense.category_name ?? 'Uncategorized'
          const color = expense.category_color ?? DEFAULT_CATEGORY_COLOR
          if (existing) { existing.total += expense.amount } else { categoryMap.set(bucketId, { id: bucketId, name, color, total: expense.amount }) }
        })
        if (categoryMap.size > 0) {
          const sorted = Array.from(categoryMap.values()).sort((a, b) => b.total - a.total)
          const top = sorted.slice(0, 5)
          const rest = sorted.slice(5)
          const otherTotal = rest.reduce((sum, item) => sum + item.total, 0)
          setExpensePieData([
            ...top,
            ...(otherTotal > 0 ? [{ id: 'other', name: 'Other', color: '#CBD5F5', total: otherTotal }] : []),
          ].map(item => ({ id: item.id, name: item.name, value: Math.round(item.total), color: item.color })))
        } else { setExpensePieData([]) }
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const recalculateStats = () => {
    const filteredExp = filterByDateRange(allExpenses, 'transaction_date')
    const filteredInc = filterByDateRange(allIncomes, 'income_date')
    const totalExpenses = filteredExp.reduce((sum: number, e: any) => sum + e.amount, 0)
    const totalIncome = filteredInc.reduce((s: number, i: any) => s + i.amount, 0)
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0

    setStats(prev => ({
      ...prev,
      totalExpenses, expenseCount: filteredExp.length,
      totalIncome, thisMonthIncome: totalIncome, incomeCount: filteredInc.length,
      savingsRate,
    }))
    setRecentExpenses(filteredExp.slice(0, 5))

    // Rebuild pie chart
    type CategoryAggregate = { id: string; name: string; color: string; total: number }
    const categoryMap = new Map<string, CategoryAggregate>()
    filteredExp.forEach((expense: any) => {
      const bucketId = expense.category_id ?? 'uncategorized'
      const existing = categoryMap.get(bucketId)
      if (existing) { existing.total += expense.amount } else {
        categoryMap.set(bucketId, { id: bucketId, name: expense.category_name ?? 'Uncategorized', color: expense.category_color ?? DEFAULT_CATEGORY_COLOR, total: expense.amount })
      }
    })
    if (categoryMap.size > 0) {
      const sorted = Array.from(categoryMap.values()).sort((a, b) => b.total - a.total)
      const top = sorted.slice(0, 5)
      const rest = sorted.slice(5)
      const otherTotal = rest.reduce((sum, item) => sum + item.total, 0)
      setExpensePieData([
        ...top,
        ...(otherTotal > 0 ? [{ id: 'other', name: 'Other', color: '#CBD5F5', total: otherTotal }] : []),
      ].map(item => ({ id: item.id, name: item.name, value: Math.round(item.total), color: item.color })))
    } else { setExpensePieData([]) }
  }

  const budgetUtilization = stats.budgetTotal > 0 ? (stats.budgetUsed / stats.budgetTotal) * 100 : 0
  const budgetRemaining = stats.budgetTotal - stats.budgetUsed

  // Compute monthly expense sparkline from all expenses (last 6 months)
  const expenseSparkline = useMemo(() => {
    if (!allExpenses.length) return []
    const now = new Date()
    const points: number[] = []
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      const total = allExpenses.filter((e: any) => {
        const d = new Date(e.transaction_date)
        return d >= start && d <= end
      }).reduce((s: number, e: any) => s + e.amount, 0)
      points.push(total)
    }
    return points
  }, [allExpenses])

  const incomeSparkline = useMemo(() => {
    if (!allIncomes.length) return []
    const now = new Date()
    const points: number[] = []
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      const total = allIncomes.filter((inc: any) => {
        const d = new Date(inc.income_date)
        return d >= start && d <= end
      }).reduce((s: number, inc: any) => s + inc.amount, 0)
      points.push(total)
    }
    return points
  }, [allIncomes])

  // Upcoming due dates (EMIs + Borrowings with due dates in next 30 days)
  const upcomingDueDates = useMemo(() => {
    const now = new Date()
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const items: { label: string; amount: number; dueDate: Date; type: string; daysLeft: number }[] = []

    allEmis.forEach((emi: any) => {
      if (emi.next_payment_date) {
        const due = new Date(emi.next_payment_date)
        if (due >= now && due <= thirtyDays) {
          items.push({ label: emi.lender_name || emi.loan_name || 'EMI Payment', amount: emi.monthly_emi || 0, dueDate: due, type: 'emi', daysLeft: Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) })
        }
      }
    })
    allBorrowings.forEach((b: any) => {
      if (b.due_date && b.status !== 'closed') {
        const due = new Date(b.due_date)
        if (due >= now && due <= thirtyDays) {
          items.push({ label: b.lender || 'Borrowing Due', amount: b.remaining_amount || 0, dueDate: due, type: 'borrowing', daysLeft: Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) })
        }
      }
    })

    return items.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()).slice(0, 5)
  }, [allEmis, allBorrowings])

  // Trend percentage helper
  const getTrendPct = (current: number, previous: number): { pct: number; direction: 'up' | 'down' | 'flat' } => {
    if (previous === 0 && current === 0) return { pct: 0, direction: 'flat' }
    if (previous === 0) return { pct: 100, direction: 'up' }
    const pct = ((current - previous) / previous) * 100
    return { pct: Math.abs(pct), direction: pct > 0.5 ? 'up' : pct < -0.5 ? 'down' : 'flat' }
  }

  const expenseTrend = getTrendPct(stats.totalExpenses, stats.prevMonthExpenses)
  const incomeTrend = getTrendPct(stats.totalIncome, stats.prevMonthIncome)

  // Check if user is brand new (empty state)
  const isNewUser = !loading && allExpenses.length === 0 && allIncomes.length === 0

  // Mock data generators
  const generateMockNetWorthTrend = (): any[] => {
    const data: any[] = []
    const baseWorth = 1800000
    const now = new Date()
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthlyGrowth = 50000 + (Math.random() - 0.5) * 40000
      const volatility = (Math.random() - 0.5) * 100000
      const trend = i < 6 ? 20000 : -5000
      const netWorth = baseWorth + (monthlyGrowth * (11 - i)) + volatility + trend
      const previousWorth = data.length > 0 ? data[data.length - 1].net_worth : netWorth
      data.push({ date: date.toISOString().split('T')[0], net_worth: Math.round(netWorth), change_percent: i > 0 ? ((netWorth - previousWorth) / previousWorth) * 100 : 0, health_score: 75 + Math.round(Math.random() * 15) })
    }
    return data
  }

  const generateMockHealthScore = () => {
    const score = 75 + Math.round(Math.random() * 15)
    return {
      overall_score: score,
      savings_score: Math.min(100, score + Math.round(Math.random() * 10 - 5)),
      debt_score: Math.min(100, score + Math.round(Math.random() * 10 - 5)),
      budget_score: Math.min(100, score + Math.round(Math.random() * 10 - 5)),
      investment_score: Math.min(100, score + Math.round(Math.random() * 10 - 5)),
      recommendations: score < 80 ? ["Increase savings rate to at least 20% of income", "Consider increasing investment contributions"] : ["Maintain excellent financial health", "Continue regular investment contributions"],
      next_milestone: score < 80 ? "Increase savings rate to 20%" : "Maintain excellent financial health"
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 18) return 'Good Afternoon'
    return 'Good Evening'
  }

  // ── New User Empty State ──────────────────────────────────────────
  if (isNewUser) {
    return (
      <div className="space-y-8">
        <Card className="border shadow-lg rounded-3xl bg-white dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-6 shadow-xl">
              {user?.full_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Welcome, {user?.full_name?.split(' ')[0] || 'there'}!
            </h1>
            <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-8">
              Your financial dashboard is ready. Start by adding your first expense or income to see your finances come alive.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
              {[
                { label: 'Add Your First Expense', href: '/dashboard/expenses', icon: Receipt, color: 'from-rose-500 to-pink-600', desc: 'Track where your money goes' },
                { label: 'Record Income', href: '/dashboard/income', icon: Banknote, color: 'from-emerald-500 to-teal-600', desc: 'Log your earnings' },
                { label: 'Set a Budget', href: '/dashboard/budgets', icon: Target, color: 'from-amber-500 to-orange-600', desc: 'Control your spending' },
              ].map(item => {
                const Icon = item.icon
                return (
                  <Link href={item.href} key={item.label}>
                    <Card className="border border-slate-200 dark:border-slate-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer rounded-2xl h-full">
                      <CardContent className="p-6 text-center">
                        <div className={cn("w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center mx-auto mb-4 shadow-lg", item.color)}>
                          <Icon className="h-7 w-7 text-white" />
                        </div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">{item.label}</h3>
                        <p className="text-xs text-slate-500">{item.desc}</p>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      {loading ? <HeroSkeleton /> : (
        <Card className="border shadow-lg rounded-3xl bg-white dark:bg-slate-900 dark:border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-full blur-3xl"></div>
          <CardContent className="p-8 relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Left: Greeting & Net Worth */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                      {getGreeting()}, {user?.full_name?.split(' ')[0] || 'there'}!
                    </h1>
                    <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-[160px] rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
                      <Calendar className="h-4 w-4 mr-2 text-indigo-500" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="this_month">This Month</SelectItem>
                      <SelectItem value="last_month">Last Month</SelectItem>
                      <SelectItem value="last_3_months">Last 3 Months</SelectItem>
                      <SelectItem value="last_6_months">Last 6 Months</SelectItem>
                      <SelectItem value="this_year">This Year</SelectItem>
                      <SelectItem value="all_time">All Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Net Worth Display */}
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-indigo-600" />
                      <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Net Worth</span>
                      {isMockData && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          <Info className="h-2.5 w-2.5" />
                          Sample Data
                        </span>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setShowBalance(!showBalance)} className="h-8 w-8 p-0">
                      {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <p className="text-4xl font-bold text-slate-900 dark:text-white">
                      {showBalance ? format(stats.netWorth) : '••••••'}
                    </p>
                    {stats.investmentReturn !== 0 && (
                      <div className={cn("flex items-center gap-1 px-2 py-1 rounded-lg", stats.investmentReturn >= 0 ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50")}>
                        {stats.investmentReturn >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                        <span className="text-sm font-semibold">{stats.investmentReturn >= 0 ? '+' : ''}{stats.investmentReturn.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                  {showBalance && (
                    <>
                      {netWorthTrend.length > 0 ? (
                        <div className="mt-6 mb-4">
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">12-Month Trend</span>
                            <div className="flex items-center gap-2">
                              <NetWorthMicroSparkline data={netWorthTrend} />
                              <span className="text-xs font-medium text-emerald-600">
                                {netWorthTrend[netWorthTrend.length - 1]?.change_percent >= 0 ? '+' : ''}{netWorthTrend[netWorthTrend.length - 1]?.change_percent?.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                          <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                            <NetWorthSparkline data={netWorthTrend} height={60} />
                          </div>
                        </div>
                      ) : netWorthError ? (
                        <div className="mt-6 mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                          <p className="text-xs text-amber-800 dark:text-amber-300">{netWorthError}</p>
                        </div>
                      ) : null}
                      
                      {healthScore && (
                        <div className="mt-4 mb-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Financial Health</span>
                            <HealthScoreBadge healthData={healthScore} />
                          </div>
                          <HealthScoreIndicator healthData={healthScore} size="sm" showRecommendations={true} className="mt-2" />
                        </div>
                      )}
                      
                      {/* Assets/Liabilities Breakdown */}
                      <div className="mt-3 text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex justify-between"><span>Assets: {format(stats.investmentValue + stats.lendingsOutstanding + stats.thisMonthIncome)}</span></div>
                        <div className="flex justify-between"><span>Liabilities: -{format(stats.borrowingsOwed + (stats.emiMonthly * (stats.emiCount > 0 ? 12 : 0)))}</span></div>
                      </div>
                    </>
                  )}
                  <p className="text-xs text-slate-500 mt-2">Assets (Investments + Income + Lendings) - Liabilities (Borrowings + EMIs)</p>
                </div>
              </div>

              {/* Right: Quick Stats Grid */}
              <div className="grid grid-cols-2 gap-4 lg:w-[420px]">
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Cash Flow</span>
                  </div>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{format(budgetRemaining)}</p>
                  <p className="text-xs text-slate-500 mt-1">Budget remaining</p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">EMI/Month</span>
                  </div>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{format(stats.emiMonthly)}</p>
                  <p className="text-xs text-slate-500 mt-1">{stats.emiCount} active loans</p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <Target className="h-4 w-4 text-amber-600" />
                    </div>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Budget Used</span>
                  </div>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{budgetUtilization.toFixed(0)}%</p>
                  <p className="text-xs text-slate-500 mt-1">{format(stats.budgetUsed)} of {format(stats.budgetTotal)}</p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Activity className="h-4 w-4 text-purple-600" />
                    </div>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Investments</span>
                  </div>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{format(stats.investmentValue)}</p>
                  <p className={cn("text-xs mt-1", stats.investmentReturn >= 0 ? "text-emerald-600" : "text-rose-600")}>{stats.investmentReturn >= 0 ? '+' : ''}{stats.investmentReturn.toFixed(1)}% return</p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Banknote className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Income</span>
                  </div>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{format(stats.thisMonthIncome)}</p>
                  <p className="text-xs text-slate-500 mt-1">{stats.incomeCount} entries</p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                      <AlertCircle className="h-4 w-4 text-teal-600" />
                    </div>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Borrowings</span>
                  </div>
                  <p className="text-xl font-bold text-slate-900 dark:text-white">{format(stats.borrowingsOwed)}</p>
                  <p className="text-xs text-slate-500 mt-1">{stats.borrowingsOpen} open{stats.borrowingsOverdue > 0 ? ` · ${stats.borrowingsOverdue} overdue` : ''}</p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                      <HeartHandshake className="h-4 w-4 text-indigo-600" />
                    </div>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Lendings</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xl font-bold text-slate-900 dark:text-white">{format(stats.lendingsOutstanding)}</p>
                      <p className="text-xs text-slate-500 mt-1">{stats.lendingsOpen} open</p>
                    </div>
                    {stats.lendingsOverdue > 0 && (
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-600">{stats.lendingsOverdue} overdue</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                {[
                  { label: 'Add Expense', href: '/dashboard/expenses', icon: Plus, color: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50' },
                  { label: 'Add Income', href: '/dashboard/income', icon: Banknote, color: 'text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-950/50 dark:hover:bg-green-900/50' },
                  { label: 'Track EMI', href: '/dashboard/emi', icon: CreditCard, color: 'text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/50' },
                  { label: 'Set Budget', href: '/dashboard/budgets', icon: Target, color: 'text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 dark:hover:bg-amber-900/50' },
                  { label: 'Investments', href: '/dashboard/investments', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/50' },
                  { label: 'Borrowings', href: '/dashboard/borrowings', icon: ArrowRight, color: 'text-teal-600 bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/50 dark:hover:bg-teal-900/50' },
                  { label: 'Lendings', href: '/dashboard/lendings', icon: HeartHandshake, color: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50' },
                ].map((action) => {
                  const Icon = action.icon
                  return (
                    <Link href={action.href} key={action.label}>
                      <Button variant="ghost" className={cn("w-full justify-start gap-2 h-auto py-3 px-4 rounded-xl transition-all", action.color)}>
                        <Icon className="h-4 w-4" />
                        <span className="text-sm font-semibold">{action.label}</span>
                        <ChevronRight className="h-3.5 w-3.5 ml-auto" />
                      </Button>
                    </Link>
                  )
                })}
              </div>
              {stats.borrowingsOverdue > 0 && (
                <div className="mt-4">
                  <Link href="/dashboard/borrowings">
                    <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 hover:bg-red-100 dark:hover:bg-red-950/50 transition-colors cursor-pointer">
                      <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-red-800 dark:text-red-300">{stats.borrowingsOverdue} overdue borrowing{stats.borrowingsOverdue > 1 ? 's' : ''}</p>
                        <p className="text-xs text-red-600">You have outstanding borrowings past their due date</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-red-400" />
                    </div>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Stats Row - Enhanced with sparklines and trends */}
      {loading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Total Expenses Card */}
          <Card className="relative border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group bg-white dark:bg-slate-900">
            <div className="absolute inset-0 bg-gradient-to-br from-rose-50 to-pink-50 opacity-30 dark:opacity-10"></div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform")}>
                  <Wallet className="h-6 w-6 text-white" />
                </div>
                <div className="flex items-center gap-2">
                  <MiniSparkline data={expenseSparkline} color="#f43f5e" />
                  {expenseTrend.direction !== 'flat' && (
                    <div className={cn("flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-semibold",
                      expenseTrend.direction === 'up' ? "text-rose-600 bg-rose-50 dark:bg-rose-950/40" : "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40"
                    )}>
                      {expenseTrend.direction === 'up' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      {expenseTrend.pct.toFixed(0)}%
                    </div>
                  )}
                </div>
              </div>
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">Total Expenses</h3>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{format(stats.totalExpenses)}</p>
              <p className="text-xs text-slate-500">{stats.expenseCount} transactions{stats.prevMonthExpenses > 0 ? ` · Last month: ${format(stats.prevMonthExpenses)}` : ''}</p>
            </CardContent>
          </Card>

          {/* Total Income Card */}
          <Card className="relative border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group bg-white dark:bg-slate-900">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50 opacity-30 dark:opacity-10"></div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Banknote className="h-6 w-6 text-white" />
                </div>
                <div className="flex items-center gap-2">
                  <MiniSparkline data={incomeSparkline} color="#10b981" />
                  {incomeTrend.direction !== 'flat' && (
                    <div className={cn("flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-xs font-semibold",
                      incomeTrend.direction === 'up' ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" : "text-rose-600 bg-rose-50 dark:bg-rose-950/40"
                    )}>
                      {incomeTrend.direction === 'up' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      {incomeTrend.pct.toFixed(0)}%
                    </div>
                  )}
                </div>
              </div>
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">Total Income</h3>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{format(stats.totalIncome)}</p>
              <p className="text-xs text-slate-500">{stats.incomeCount} entries{stats.prevMonthIncome > 0 ? ` · Last month: ${format(stats.prevMonthIncome)}` : ''}</p>
            </CardContent>
          </Card>

          {/* Savings Rate Card */}
          <Card className="relative border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group bg-white dark:bg-slate-900">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-cyan-50 opacity-30 dark:opacity-10"></div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                {stats.savingsRate > 0 ? (
                  <div className={cn("flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold",
                    stats.savingsRate >= 20 ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" :
                    stats.savingsRate >= 10 ? "text-amber-600 bg-amber-50 dark:bg-amber-950/40" :
                    "text-rose-600 bg-rose-50 dark:bg-rose-950/40"
                  )}>
                    {stats.savingsRate >= 20 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                    {stats.savingsRate >= 20 ? 'Healthy' : stats.savingsRate >= 10 ? 'Fair' : 'Low'}
                  </div>
                ) : null}
              </div>
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">Savings Rate</h3>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{stats.savingsRate.toFixed(1)}%</p>
              <p className="text-xs text-slate-500">Saving {format(Math.max(0, stats.totalIncome - stats.totalExpenses))} this period</p>
            </CardContent>
          </Card>

          {/* Budget Status Card */}
          <Card className="relative border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group bg-white dark:bg-slate-900">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-orange-50 opacity-30 dark:opacity-10"></div>
            <CardContent className="p-6 relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <div className={cn("flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold",
                  budgetUtilization >= 100 ? "text-rose-600 bg-rose-50 dark:bg-rose-950/40" :
                  budgetUtilization >= 80 ? "text-amber-600 bg-amber-50 dark:bg-amber-950/40" :
                  "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40"
                )}>
                  {budgetUtilization >= 100 ? 'Exceeded' : budgetUtilization >= 80 ? 'Near Limit' : 'On Track'}
                </div>
              </div>
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide mb-1">Budget Status</h3>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{budgetUtilization.toFixed(0)}%</p>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-2">
                <div className={cn("h-2 rounded-full transition-all duration-500",
                  budgetUtilization >= 100 ? "bg-rose-500" : budgetUtilization >= 80 ? "bg-amber-500" : "bg-emerald-500"
                )} style={{ width: `${Math.min(100, budgetUtilization)}%` }} />
              </div>
              <p className="text-xs text-slate-500 mt-2">{format(stats.budgetUsed)} of {format(stats.budgetTotal)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      {loading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Spending Breakdown Pie Chart */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl bg-white dark:bg-slate-900">
            <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                  <PieChart className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Spending Breakdown</CardTitle>
                  <CardDescription className="text-sm font-medium text-slate-700 dark:text-slate-400">By category for selected period</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {expensePieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={240}>
                    <RechartsPie>
                      <Pie data={expensePieData} cx="50%" cy="50%" labelLine={false} label={({ percent }) => `${(percent * 100).toFixed(0)}%`} outerRadius={90} innerRadius={50} fill="#8884d8" dataKey="value" paddingAngle={3}>
                        {expensePieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                      </Pie>
                      <Tooltip content={({ active, payload }) => {
                        if (active && payload && payload[0] && payload[0].value) {
                          return (<div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-3"><p className="font-semibold text-sm dark:text-white">{payload[0].payload.name}</p><p className="text-lg font-bold text-slate-700 dark:text-slate-200">{format(payload[0].value as number)}</p></div>)
                        }
                        return null
                      }} />
                    </RechartsPie>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    {expensePieData.map((cat) => (
                      <div key={cat.name} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }}></div>
                          <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{cat.name}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white flex-shrink-0">{format(cat.value)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <PieChart className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-slate-600 dark:text-slate-400 font-medium">No expense data</p>
                  <p className="text-sm text-slate-500">Start tracking to see breakdown</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Income vs Expense Comparison Chart */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl bg-white dark:bg-slate-900">
            <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
                  <Activity className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Income vs Expenses</CardTitle>
                  <CardDescription className="text-sm font-medium text-slate-600 dark:text-slate-400">Monthly comparison (last 6 months)</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {incomeVsExpenseData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={240}>
                    <ComposedChart data={incomeVsExpenseData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} tickFormatter={(value) => `${(value/1000)}k`} />
                      <Tooltip content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-3">
                              <p className="font-semibold text-sm mb-2 dark:text-white">{payload[0]?.payload?.month}</p>
                              <div className="space-y-1">
                                <p className="text-sm"><span className="text-emerald-600 font-semibold">Income:</span> {format(payload[0]?.value as number || 0)}</p>
                                <p className="text-sm"><span className="text-rose-600 font-semibold">Expenses:</span> {format(payload[1]?.value as number || 0)}</p>
                                <p className="text-sm border-t pt-1 mt-1"><span className="text-blue-600 font-semibold">Savings:</span> {format((payload[0]?.value as number || 0) - (payload[1]?.value as number || 0))}</p>
                              </div>
                            </div>
                          )
                        }
                        return null
                      }} />
                      <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} />
                      <Line type="monotone" dataKey="savings" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                  <div className="flex items-center justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-500"></div><span className="text-xs font-medium text-slate-600 dark:text-slate-400">Income</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-rose-500"></div><span className="text-xs font-medium text-slate-600 dark:text-slate-400">Expenses</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-blue-500"></div><span className="text-xs font-medium text-slate-600 dark:text-slate-400">Savings</span></div>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Activity className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-slate-600 dark:text-slate-400 font-medium">No trend data yet</p>
                  <p className="text-sm text-slate-500">Add expenses and income to see trends</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upcoming Due Dates + Recent Transactions - Side by Side */}
      {!loading && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upcoming Due Dates */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl bg-white dark:bg-slate-900">
            <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md">
                  <CalendarClock className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Upcoming Due Dates</CardTitle>
                  <CardDescription className="text-sm font-medium text-slate-600 dark:text-slate-400">Next 30 days</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {upcomingDueDates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 text-emerald-300 dark:text-emerald-600 mb-3" />
                  <p className="text-slate-600 dark:text-slate-400 font-medium">All clear!</p>
                  <p className="text-sm text-slate-500">No upcoming payments in the next 30 days</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {upcomingDueDates.map((item, idx) => (
                    <div key={idx} className={cn("flex items-center justify-between p-4 rounded-xl border transition-colors",
                      item.daysLeft <= 3 ? "bg-red-50/50 dark:bg-red-950/20 border-red-200/50 dark:border-red-800/30" :
                      item.daysLeft <= 7 ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/30" :
                      "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                    )}>
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center",
                          item.type === 'emi' ? "bg-blue-100 dark:bg-blue-900/30" : "bg-teal-100 dark:bg-teal-900/30"
                        )}>
                          {item.type === 'emi' ? <CreditCard className="h-5 w-5 text-blue-600" /> : <AlertCircle className="h-5 w-5 text-teal-600" />}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-slate-900 dark:text-white">{item.label}</p>
                          <p className="text-xs text-slate-500">
                            {item.dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            {' · '}
                            <span className={cn(
                              item.daysLeft <= 3 ? "text-red-600 font-semibold" : item.daysLeft <= 7 ? "text-amber-600 font-semibold" : ""
                            )}>
                              {item.daysLeft === 0 ? 'Due today' : item.daysLeft === 1 ? 'Due tomorrow' : `${item.daysLeft} days left`}
                            </span>
                          </p>
                        </div>
                      </div>
                      <p className="font-bold text-slate-900 dark:text-white">{format(item.amount)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Transactions */}
          <Card className="border border-slate-200 dark:border-slate-800 shadow-xl rounded-3xl bg-white dark:bg-slate-900">
            <CardHeader className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-md">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900 dark:text-white">Recent Transactions</CardTitle>
                    <CardDescription className="text-sm font-medium text-slate-600 dark:text-slate-400">Latest 5 expenses</CardDescription>
                  </div>
                </div>
                <Link href="/dashboard/expenses">
                  <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950">
                    View All <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {recentExpenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Wallet className="h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                  <p className="text-slate-600 dark:text-slate-400 font-medium">No recent transactions</p>
                  <p className="text-sm text-slate-500">Start tracking your expenses</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentExpenses.map((exp) => (
                    <div key={exp.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-md" style={{ backgroundColor: exp.category_color ?? DEFAULT_CATEGORY_COLOR }}>
                          <Wallet className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-slate-900 dark:text-white">{exp.description}</p>
                          <p className="text-xs text-slate-500">
                            {exp.category_name ?? 'Uncategorized'} · {new Date(exp.transaction_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-rose-600">{format(exp.amount)}</p>
                        <p className="text-xs text-slate-500">{exp.payment_method}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* AI Anomaly Detection */}
      {!loading && anomalies.length > 0 && (
        <Card className="border border-amber-200 dark:border-amber-800 shadow-xl rounded-3xl bg-white dark:bg-slate-900">
          <CardHeader className="border-b border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  Unusual Spending Detected
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">{anomalies.length}</Badge>
                </CardTitle>
                <CardDescription className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Transactions significantly above your category averages
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {anomalies.slice(0, 5).map((anomaly: any, idx: number) => (
                <div key={anomaly.expense_id || idx} className="flex items-center justify-between p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-slate-900 dark:text-white">{anomaly.description || 'Unknown'}</p>
                      <p className="text-xs text-slate-500">
                        {anomaly.category} · {anomaly.date} · {anomaly.multiplier}x above average
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-amber-600">{format(anomaly.amount)}</p>
                    <p className="text-xs text-slate-500">avg: {format(anomaly.category_avg)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
