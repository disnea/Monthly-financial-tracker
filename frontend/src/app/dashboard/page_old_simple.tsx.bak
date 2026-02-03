'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, CreditCard, PieChart, DollarSign, Activity, Calendar, ChevronRight, Sparkles } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { useCurrency } from '@/hooks/useCurrency'
import { expenseApi, emiApi, investmentApi, budgetApi } from '@/lib/api'
import { toast } from 'sonner'
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, Area, AreaChart } from 'recharts'
import Link from 'next/link'

export default function DashboardPage() {
  const { currency, symbol, format } = useCurrency()
  const user = useAuthStore((state) => state.user)
  const token = useAuthStore((state) => state.token)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated())
  const [loading, setLoading] = useState(true)
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

      // Process expense categories
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
    { month: 'Jan', expenses: 45000, income: 85000, investments: 25000 },
    { month: 'Feb', expenses: 52000, income: 85000, investments: 28000 },
    { month: 'Mar', expenses: 48000, income: 90000, investments: 32000 },
    { month: 'Apr', expenses: 55000, income: 90000, investments: 30000 },
    { month: 'May', expenses: 58000, income: 95000, investments: 35000 },
    { month: 'Jun', expenses: 51000, income: 95000, investments: 38000 },
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

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  const quickActions = [
    { label: 'Add Expense', href: '/dashboard/expenses', icon: Wallet, color: 'from-indigo-500 to-purple-600' },
    { label: 'Track EMI', href: '/dashboard/emi', icon: CreditCard, color: 'from-blue-500 to-cyan-600' },
    { label: 'View Budgets', href: '/dashboard/budgets', icon: PieChart, color: 'from-amber-500 to-orange-600' },
    { label: 'Investments', href: '/dashboard/investments', icon: TrendingUp, color: 'from-emerald-500 to-teal-600' },
  ]

  return (
    <div className="space-y-6">
      {/* Modern Light Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm -mx-8 -mt-8 px-8 py-6 mb-6">
        <div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg ring-4 ring-indigo-100">
                {user?.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
                  {getGreeting()}, {user?.full_name?.split(' ')[0] || 'there'}!
                </h1>
                <p className="text-slate-600 text-sm mt-1 flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 shadow-xl text-white min-w-[220px]">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4" />
                <p className="text-xs font-semibold uppercase tracking-wider opacity-90">Net Worth</p>
              </div>
              <p className="text-3xl font-bold">
                {format((displayStats.investmentValue - displayStats.totalExpenses) + displayStats.budgetTotal)}
              </p>
              <div className="flex items-center gap-1 text-xs mt-2 opacity-90">
                <TrendingUp className="h-3 w-3" />
                <span>Updated now</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link href={action.href} key={action.label}>
                  <Button 
                    variant="outline"
                    className="w-full h-auto py-3 px-4 rounded-xl border-slate-200 hover:border-slate-300 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center text-white shadow-sm group-hover:scale-110 transition-transform`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="text-sm font-semibold text-slate-900">{action.label}</p>
                        <ChevronRight className="h-3 w-3 text-slate-400 inline" />
                      </div>
                    </div>
                  </Button>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">Loading dashboard...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: 'Total Expenses',
                  value: format(displayStats.totalExpenses),
                  subtitle: `${displayStats.expenseCount} transactions`,
                  icon: Wallet,
                  gradient: 'from-rose-500 to-pink-600',
                  bgGradient: 'from-rose-50 to-pink-50'
                },
                {
                  title: 'Active EMIs',
                  value: `${displayStats.emiCount} Loans`,
                  subtitle: `${format(displayStats.emiMonthly)}/month`,
                  icon: CreditCard,
                  gradient: 'from-blue-500 to-cyan-600',
                  bgGradient: 'from-blue-50 to-cyan-50'
                },
                {
                  title: 'Investments',
                  value: format(displayStats.investmentValue),
                  subtitle: `${displayStats.investmentReturn >= 0 ? '+' : ''}${displayStats.investmentReturn.toFixed(1)}% return`,
                  icon: TrendingUp,
                  gradient: 'from-emerald-500 to-teal-600',
                  bgGradient: 'from-emerald-50 to-teal-50'
                },
                {
                  title: 'Budget Used',
                  value: format(displayStats.budgetUsed),
                  subtitle: `of ${format(displayStats.budgetTotal)}`,
                  icon: PieChart,
                  gradient: 'from-amber-500 to-orange-600',
                  bgGradient: 'from-amber-50 to-orange-50'
                },
              ].map((stat, index) => {
                const Icon = stat.icon
                return (
                  <Card key={index} className="border-none shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group rounded-2xl">
                    <div className={`absolute inset-0 bg-gradient-to-br ${stat.bgGradient} opacity-50`}></div>
                    <CardContent className="p-6 relative z-10">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform`}>
                          <Icon className="h-6 w-6" />
                        </div>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-2">{stat.title}</h3>
                      <p className="text-3xl font-bold text-slate-900 mb-1">{stat.value}</p>
                      <p className="text-xs text-slate-500">{stat.subtitle}</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Expense Breakdown */}
              <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-slate-200/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                      <PieChart className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900">Expense Breakdown</CardTitle>
                      <CardDescription className="text-xs">Spending by category</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {expensePieData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <RechartsPie>
                        <Pie
                          data={expensePieData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
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
                                  <p className="font-semibold text-sm text-slate-900">{payload[0].payload.name}</p>
                                  <p className="text-lg font-bold text-slate-700">{format(payload[0].value as number)}</p>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Legend 
                          verticalAlign="bottom"
                          height={36}
                          iconType="circle"
                          wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }}
                        />
                      </RechartsPie>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                        <PieChart className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-slate-600 font-medium">No expense data</p>
                      <p className="text-sm text-slate-500">Add expenses to see breakdown</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Monthly Trend */}
              <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-slate-200/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md">
                      <Activity className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-900">Monthly Trends</CardTitle>
                      <CardDescription className="text-xs">Income vs expenses</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <ResponsiveContainer width="100%" height={280}>
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
                      <XAxis 
                        dataKey="month" 
                        stroke="#94a3b8" 
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis 
                        stroke="#94a3b8" 
                        style={{ fontSize: '12px' }}
                        tickFormatter={(value) => `${(value/1000)}k`}
                      />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3">
                                <p className="font-semibold text-sm text-slate-900 mb-2">{payload[0].payload.month}</p>
                                {payload.map((entry: any) => (
                                  <div key={entry.name} className="flex items-center justify-between gap-3 text-xs">
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
                </CardContent>
              </Card>
            </div>

            {/* Recent Expenses */}
            <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-rose-50 to-pink-50 border-b border-slate-200/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white shadow-md">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900">Recent Expenses</CardTitle>
                    <CardDescription className="text-xs">Latest 5 transactions</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                {recentExpenses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                      <Wallet className="h-8 w-8 text-slate-400" />
                    </div>
                    <p className="text-slate-600 font-medium">No recent expenses</p>
                    <p className="text-sm text-slate-500">Start tracking your spending</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentExpenses.map((exp, idx) => (
                      <div key={exp.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white font-bold text-sm">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-slate-900">{exp.description}</p>
                            <p className="text-xs text-slate-500">{new Date(exp.transaction_date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <p className="font-bold text-rose-600">{format(exp.amount)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
    </div>
  )
}
