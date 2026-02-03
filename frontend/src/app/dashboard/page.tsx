'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, CreditCard, PieChart, 
  DollarSign, Activity, Calendar, ChevronRight, Sparkles, Eye, EyeOff,
  Download, RefreshCw, Bell, Settings, Plus, ArrowRight, TrendingDown,
  Target, Clock, AlertCircle, CheckCircle2
} from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { useCurrency } from '@/hooks/useCurrency'
import { expenseApi, emiApi, investmentApi, budgetApi } from '@/lib/api'
import { toast } from 'sonner'
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip, Legend, AreaChart, Area, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export default function DashboardPage() {
  const { currency, symbol, format } = useCurrency()
  const user = useAuthStore((state) => state.user)
  const token = useAuthStore((state) => state.token)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated())
  const [loading, setLoading] = useState(true)
  const [showBalance, setShowBalance] = useState(true)
  const [stats, setStats] = useState({
    totalExpenses: 0,
    expenseCount: 0,
    emiCount: 0,
    emiMonthly: 0,
    investmentValue: 0,
    investmentReturn: 0,
    budgetTotal: 0,
    budgetUsed: 0
  })
  const [recentExpenses, setRecentExpenses] = useState<any[]>([])
  const [expensePieData, setExpensePieData] = useState<any[]>([])

  useEffect(() => {
    if (isAuthenticated && token && user) {
      fetchDashboardData()
    } else {
      setLoading(false)
    }
  }, [isAuthenticated, token, user])

  const fetchDashboardData = async () => {
    try {
      const [expenses, emis, investments, budgets] = await Promise.all([
        expenseApi.list().catch(() => []),
        emiApi.list().catch(() => []),
        investmentApi.list().catch(() => []),
        budgetApi.list().catch(() => [])
      ])

      const totalExpenses = expenses.reduce((sum: number, e: any) => sum + e.amount, 0)
      const emiMonthly = emis.reduce((sum: number, e: any) => sum + (e.monthly_emi || 0), 0)
      const investmentValue = investments.reduce((sum: number, i: any) => sum + (i.total_value || i.quantity * i.purchase_price), 0)
      const investmentCost = investments.reduce((sum: number, i: any) => sum + (i.quantity * i.purchase_price), 0)
      const investmentReturn = investmentCost > 0 ? ((investmentValue - investmentCost) / investmentCost) * 100 : 0
      const budgetTotal = budgets.reduce((sum: number, b: any) => sum + b.amount, 0)
      const budgetUsed = budgets.reduce((sum: number, b: any) => sum + (b.spent || 0), 0)

      setStats({
        totalExpenses,
        expenseCount: expenses.length,
        emiCount: emis.length,
        emiMonthly,
        investmentValue,
        investmentReturn,
        budgetTotal,
        budgetUsed
      })

      setRecentExpenses(expenses.slice(0, 5))

      if (expenses.length > 0) {
        const categoryMap = new Map<string, number>()
        const categoryColors: { [key: string]: string } = {
          'Food & Dining': '#f97316',
          'Transportation': '#3b82f6',
          'Shopping': '#a855f7',
          'Utilities': '#10b981',
          'Entertainment': '#ec4899',
          'Healthcare': '#ef4444',
          'Other': '#64748b'
        }

        expenses.forEach((expense: any) => {
          let category = expense.category_name || 'Other'
          const currentAmount = categoryMap.get(category) || 0
          categoryMap.set(category, currentAmount + expense.amount)
        })

        const pieData = Array.from(categoryMap.entries())
          .map(([name, value]) => ({
            name,
            value: Math.round(value),
            color: categoryColors[name] || '#64748b'
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 6)

        setExpensePieData(pieData)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const monthlyTrendData = [
    { month: 'Jan', income: 85000, expenses: 45000, savings: 40000 },
    { month: 'Feb', income: 85000, expenses: 52000, savings: 33000 },
    { month: 'Mar', income: 90000, expenses: 48000, savings: 42000 },
    { month: 'Apr', income: 90000, expenses: 55000, savings: 35000 },
    { month: 'May', income: 95000, expenses: 58000, savings: 37000 },
    { month: 'Jun', income: 95000, expenses: 51000, savings: 44000 },
  ]

  const sampleStats = {
    totalExpenses: 61000,
    expenseCount: 24,
    emiCount: 3,
    emiMonthly: 45000,
    investmentValue: 385000,
    investmentReturn: 12.5,
    budgetTotal: 75000,
    budgetUsed: 61000
  }

  const displayStats = stats.expenseCount > 0 ? stats : sampleStats
  const netWorth = (displayStats.investmentValue - displayStats.totalExpenses) + displayStats.budgetTotal
  const cashFlow = 95000 - displayStats.totalExpenses - displayStats.emiMonthly
  const budgetUtilization = displayStats.budgetTotal > 0 ? (displayStats.budgetUsed / displayStats.budgetTotal) * 100 : 0

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 18) return 'Good Afternoon'
    return 'Good Evening'
  }

  return (
    <div className="space-y-8">
      {/* Hero Section - Inspired by Mint/YNAB */}
      <Card className="border shadow-lg rounded-3xl bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-full blur-3xl"></div>
          
          <CardContent className="p-8 relative z-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Left: Greeting & Net Worth */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                      {getGreeting()}, {user?.full_name?.split(' ')[0] || 'there'}!
                    </h1>
                    <p className="text-sm text-slate-600 flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>

                {/* Net Worth Display */}
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl p-5 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-indigo-600" />
                      <span className="text-sm font-semibold text-slate-600 uppercase tracking-wider">Net Worth</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowBalance(!showBalance)}
                      className="h-8 w-8 p-0"
                    >
                      {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <p className="text-4xl font-bold text-slate-900">
                      {showBalance ? format(netWorth) : '••••••'}
                    </p>
                    <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                      <TrendingUp className="h-3.5 w-3.5" />
                      <span className="text-sm font-semibold">+8.2%</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">vs last month</p>
                </div>
              </div>

              {/* Right: Quick Stats Grid */}
              <div className="grid grid-cols-2 gap-4 lg:w-[420px]">
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-emerald-600" />
                    </div>
                    <span className="text-xs font-medium text-slate-600">Cash Flow</span>
                  </div>
                  <p className="text-xl font-bold text-slate-900">{format(cashFlow)}</p>
                  <p className="text-xs text-slate-500 mt-1">This month</p>
                </div>

                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                      <CreditCard className="h-4 w-4 text-blue-600" />
                    </div>
                    <span className="text-xs font-medium text-slate-600">EMI/Month</span>
                  </div>
                  <p className="text-xl font-bold text-slate-900">{format(displayStats.emiMonthly)}</p>
                  <p className="text-xs text-slate-500 mt-1">{displayStats.emiCount} active loans</p>
                </div>

                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Target className="h-4 w-4 text-amber-600" />
                    </div>
                    <span className="text-xs font-medium text-slate-600">Budget Used</span>
                  </div>
                  <p className="text-xl font-bold text-slate-900">{budgetUtilization.toFixed(0)}%</p>
                  <p className="text-xs text-slate-500 mt-1">{format(displayStats.budgetUsed)} of {format(displayStats.budgetTotal)}</p>
                </div>

                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Activity className="h-4 w-4 text-purple-600" />
                    </div>
                    <span className="text-xs font-medium text-slate-600">Investments</span>
                  </div>
                  <p className="text-xl font-bold text-slate-900">{format(displayStats.investmentValue)}</p>
                  <p className="text-xs text-emerald-600 mt-1">+{displayStats.investmentReturn.toFixed(1)}% return</p>
                </div>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Add Expense', href: '/dashboard/expenses', icon: Plus, color: 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' },
                  { label: 'Track EMI', href: '/dashboard/emi', icon: CreditCard, color: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
                  { label: 'Set Budget', href: '/dashboard/budgets', icon: Target, color: 'text-amber-600 bg-amber-50 hover:bg-amber-100' },
                  { label: 'View Investments', href: '/dashboard/investments', icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100' },
                ].map((action) => {
                  const Icon = action.icon
                  return (
                    <Link href={action.href} key={action.label}>
                      <Button 
                        variant="ghost"
                        className={cn("w-full justify-start gap-2 h-auto py-3 px-4 rounded-xl transition-all", action.color)}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="text-sm font-semibold">{action.label}</span>
                        <ChevronRight className="h-3.5 w-3.5 ml-auto" />
                      </Button>
                    </Link>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600">Loading your financial data...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Main Stats Row */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: 'Total Expenses',
                value: format(displayStats.totalExpenses),
                change: `${displayStats.expenseCount} transactions`,
                trend: 'down',
                icon: Wallet,
                color: 'from-rose-500 to-pink-600',
                bgColor: 'from-rose-50 to-pink-50'
              },
              {
                title: 'Monthly EMI',
                value: format(displayStats.emiMonthly),
                change: `${displayStats.emiCount} active loans`,
                trend: 'down',
                icon: CreditCard,
                color: 'from-blue-500 to-cyan-600',
                bgColor: 'from-blue-50 to-cyan-50'
              },
              {
                title: 'Investments',
                value: format(displayStats.investmentValue),
                change: `+${displayStats.investmentReturn.toFixed(1)}% return`,
                trend: 'up',
                icon: TrendingUp,
                color: 'from-emerald-500 to-teal-600',
                bgColor: 'from-emerald-50 to-teal-50'
              },
              {
                title: 'Budget Status',
                value: `${budgetUtilization.toFixed(0)}%`,
                change: `${format(displayStats.budgetUsed)} spent`,
                trend: budgetUtilization > 80 ? 'warning' : 'neutral',
                icon: PieChart,
                color: 'from-amber-500 to-orange-600',
                bgColor: 'from-amber-50 to-orange-50'
              },
            ].map((stat, index) => {
              const Icon = stat.icon
              return (
                <Card key={index} className="border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl overflow-hidden group bg-white">
                  <div className={cn("absolute inset-0 bg-gradient-to-br opacity-30", stat.bgColor)}></div>
                  <CardContent className="p-6 relative z-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className={cn("w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform", stat.color)}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      {stat.trend === 'up' && <ArrowUpRight className="h-5 w-5 text-emerald-600" />}
                      {stat.trend === 'down' && <ArrowDownRight className="h-5 w-5 text-rose-600" />}
                      {stat.trend === 'warning' && <AlertCircle className="h-5 w-5 text-amber-600" />}
                    </div>
                    <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-2">{stat.title}</h3>
                    <p className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</p>
                    <p className="text-xs text-slate-500">{stat.change}</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Charts Section */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Spending Breakdown */}
            <Card className="border border-slate-200 shadow-xl rounded-3xl bg-white">
              <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-purple-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                      <PieChart className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900">Spending Breakdown</CardTitle>
                      <CardDescription className="text-xs">By category this month</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {expensePieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={240}>
                      <RechartsPie>
                        <Pie
                          data={expensePieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                          outerRadius={90}
                          innerRadius={50}
                          fill="#8884d8"
                          dataKey="value"
                          paddingAngle={3}
                        >
                          {expensePieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload[0] && payload[0].value) {
                              return (
                                <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3">
                                  <p className="font-semibold text-sm">{payload[0].payload.name}</p>
                                  <p className="text-lg font-bold text-slate-700">{format(payload[0].value as number)}</p>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                      </RechartsPie>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {expensePieData.map((cat) => (
                        <div key={cat.name} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                          <span className="text-xs font-medium text-slate-700 truncate">{cat.name}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <PieChart className="h-12 w-12 text-slate-300 mb-3" />
                    <p className="text-slate-600 font-medium">No expense data</p>
                    <p className="text-sm text-slate-500">Start tracking to see breakdown</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cash Flow Trend */}
            <Card className="border border-slate-200 shadow-xl rounded-3xl bg-white">
              <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-emerald-50 to-teal-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md">
                      <Activity className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl font-bold text-slate-900">Monthly Trends</CardTitle>
                      <CardDescription className="text-sm font-medium text-slate-600">Income vs expenses</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={monthlyTrendData}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                    <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} tickFormatter={(value) => `${(value/1000)}k`} />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3">
                              <p className="font-semibold text-sm mb-2">{payload[0].payload.month}</p>
                              {payload.map((entry: any) => (
                                <div key={entry.name} className="flex items-center justify-between gap-3 text-xs mb-1">
                                  <span className="capitalize">{entry.name}:</span>
                                  <span className="font-bold">{format(entry.value)}</span>
                                </div>
                              ))}
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Area type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} fill="url(#colorIncome)" />
                    <Area type="monotone" dataKey="expenses" stroke="#f43f5e" strokeWidth={2} fill="url(#colorExpense)" />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-xs font-medium text-slate-600">Income</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                    <span className="text-xs font-medium text-slate-600">Expenses</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="border border-slate-200 shadow-xl rounded-3xl bg-white">
            <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center shadow-md">
                    <Clock className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-bold text-slate-900">Recent Transactions</CardTitle>
                    <CardDescription className="text-sm font-medium text-slate-600">Latest 5 expenses</CardDescription>
                  </div>
                </div>
                <Link href="/dashboard/expenses">
                  <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                    View All
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {recentExpenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Wallet className="h-12 w-12 text-slate-300 mb-3" />
                  <p className="text-slate-600 font-medium">No recent transactions</p>
                  <p className="text-sm text-slate-500">Start tracking your expenses</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentExpenses.map((exp, idx) => (
                    <div key={exp.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors border border-slate-200">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-slate-900">{exp.description}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(exp.transaction_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
        </>
      )}
    </div>
  )
}
