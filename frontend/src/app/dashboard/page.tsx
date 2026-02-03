'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, CreditCard, PieChart, DollarSign, Activity } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { formatCurrency } from '@/lib/utils'
import { expenseApi, emiApi, investmentApi, budgetApi } from '@/lib/api'
import { toast } from 'sonner'
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip, Legend, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, Area, AreaChart, ScatterChart, Scatter, ZAxis } from 'recharts'

export default function DashboardPage() {
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
  const [expensePieData, setExpensePieData] = useState<any[]>([
    { name: 'Food & Dining', value: 18500, color: '#6366f1' },
    { name: 'Transportation', value: 12000, color: '#8b5cf6' },
    { name: 'Shopping', value: 15200, color: '#ec4899' },
    { name: 'Utilities', value: 8500, color: '#f59e0b' },
    { name: 'Entertainment', value: 6800, color: '#06b6d4' },
  ])

  useEffect(() => {
    // Only fetch data if user is properly authenticated
    if (isAuthenticated && token && user) {
      console.log('📊 Dashboard - User authenticated, fetching data')
      fetchDashboardData()
    } else {
      console.log('📊 Dashboard - Not authenticated, skipping data fetch')
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

      // Group expenses by category for pie chart
      if (expenses.length > 0) {
        const categoryMap = new Map<string, number>()
        const categoryColors: { [key: string]: string } = {
          'Food & Dining': '#6366f1',
          'Transportation': '#8b5cf6',
          'Shopping': '#ec4899',
          'Utilities': '#f59e0b',
          'Entertainment': '#06b6d4',
          'Healthcare': '#10b981',
          'Education': '#f97316',
          'Other': '#64748b'
        }

        expenses.forEach((expense: any) => {
          // Use category_name if available, otherwise use description to categorize
          let category = expense.category_name || 'Other'
          
          // Smart categorization based on description if no category
          if (!expense.category_name && expense.description) {
            const desc = expense.description.toLowerCase()
            if (desc.includes('food') || desc.includes('restaurant') || desc.includes('grocery') || desc.includes('swiggy') || desc.includes('zomato')) {
              category = 'Food & Dining'
            } else if (desc.includes('uber') || desc.includes('ola') || desc.includes('transport') || desc.includes('petrol') || desc.includes('fuel')) {
              category = 'Transportation'
            } else if (desc.includes('shopping') || desc.includes('amazon') || desc.includes('flipkart') || desc.includes('clothing')) {
              category = 'Shopping'
            } else if (desc.includes('electricity') || desc.includes('water') || desc.includes('internet') || desc.includes('mobile') || desc.includes('recharge')) {
              category = 'Utilities'
            } else if (desc.includes('movie') || desc.includes('entertainment') || desc.includes('netflix') || desc.includes('spotify')) {
              category = 'Entertainment'
            } else if (desc.includes('medicine') || desc.includes('doctor') || desc.includes('hospital') || desc.includes('health')) {
              category = 'Healthcare'
            }
          }

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
          .slice(0, 6) // Top 6 categories

        setExpensePieData(pieData)
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  // Chart data with realistic INR values
  const COLORS = ['#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0', '#f1f5f9']

  const monthlyTrendData = [
    { month: 'Jan', expenses: 45000, income: 85000, investments: 25000 },
    { month: 'Feb', expenses: 52000, income: 85000, investments: 28000 },
    { month: 'Mar', expenses: 48000, income: 90000, investments: 32000 },
    { month: 'Apr', expenses: 55000, income: 90000, investments: 30000 },
    { month: 'May', expenses: 58000, income: 95000, investments: 35000 },
    { month: 'Jun', expenses: 51000, income: 95000, investments: 38000 },
  ]

  // Sample data in INR when no real data exists
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

  const statCards = [
    {
      title: 'Total Expenses',
      value: `₹${displayStats.totalExpenses.toLocaleString('en-IN')}`,
      change: `${displayStats.expenseCount} transactions`,
      icon: Wallet,
      trend: 'down' as const,
      iconColor: 'text-rose-600',
      bgColor: 'bg-white border-l-4 border-rose-500'
    },
    {
      title: 'Active EMIs',
      value: `${displayStats.emiCount} Loans`,
      change: `₹${displayStats.emiMonthly.toLocaleString('en-IN')}/mo`,
      icon: CreditCard,
      trend: 'neutral' as const,
      iconColor: 'text-violet-600',
      bgColor: 'bg-white border-l-4 border-violet-500'
    },
    {
      title: 'Investment Value',
      value: `₹${displayStats.investmentValue.toLocaleString('en-IN')}`,
      change: `${displayStats.investmentReturn >= 0 ? '+' : ''}${displayStats.investmentReturn.toFixed(1)}%`,
      icon: TrendingUp,
      trend: displayStats.investmentReturn >= 0 ? 'up' as const : 'down' as const,
      iconColor: 'text-emerald-600',
      bgColor: 'bg-white border-l-4 border-emerald-500'
    },
    {
      title: 'Budget Status',
      value: `₹${displayStats.budgetUsed.toLocaleString('en-IN')}`,
      change: `of ₹${displayStats.budgetTotal.toLocaleString('en-IN')}`,
      icon: DollarSign,
      trend: 'neutral' as const,
      iconColor: 'text-blue-600',
      bgColor: 'bg-white border-l-4 border-blue-500'
    },
  ]

  // Sample recent expenses in INR
  const sampleExpenses = [
    { id: '1', description: 'Grocery Shopping at BigBasket', payment_method: 'Credit Card', amount: 3250, transaction_date: '2024-01-15' },
    { id: '2', description: 'Uber Ride to Office', payment_method: 'UPI', amount: 285, transaction_date: '2024-01-14' },
    { id: '3', description: 'Swiggy Food Order', payment_method: 'Credit Card', amount: 850, transaction_date: '2024-01-14' },
    { id: '4', description: 'Electricity Bill Payment', payment_method: 'Net Banking', amount: 2100, transaction_date: '2024-01-13' },
    { id: '5', description: 'Amazon Shopping', payment_method: 'Credit Card', amount: 4500, transaction_date: '2024-01-12' },
  ]

  const displayExpenses = recentExpenses.length > 0 ? recentExpenses : sampleExpenses

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-700">
          <p className="font-semibold text-sm mb-1">{payload[0].name}</p>
          <p className="text-xs text-slate-300">
            ₹{payload[0].value.toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {((payload[0].value / expensePieData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%
          </p>
        </div>
      )
    }
    return null
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="space-y-8">
      {/* Professional Header */}
      <div className="relative -mx-8 -mt-8 px-8 py-8 mb-8 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-b-3xl border-b border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                {user?.full_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  {getGreeting()}, {user?.full_name?.split(' ')[0] || 'there'}
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            </div>
            <p className="text-slate-400 ml-[4.5rem] text-sm">
              Your financial overview and insights
            </p>
          </div>
          
          <div className="hidden lg:block">
            <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700 shadow-lg min-w-[260px]">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Balance</p>
                  <p className="text-2xl font-bold text-white">
                    ₹{((displayStats.investmentValue - displayStats.totalExpenses) + displayStats.budgetTotal).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-3 pt-3 border-t border-slate-700">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                <span>Updated just now</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading dashboard...</div>
      ) : (
        <>
          {/* Premium Stat Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {statCards.map((stat, index) => {
              const Icon = stat.icon
              return (
                <Card key={index} className="border border-slate-200/60 shadow-xl hover:shadow-2xl transition-all duration-500 bg-gradient-to-br from-white via-slate-50/30 to-slate-100/20 backdrop-blur-sm overflow-hidden group rounded-2xl">
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-slate-100/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative z-10">
                    <CardTitle className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{stat.title}</CardTitle>
                    <div className={`p-3 rounded-2xl shadow-lg ring-4 ring-opacity-10 ${stat.iconColor === 'text-rose-600' ? 'bg-gradient-to-br from-rose-500 to-pink-600 ring-rose-500/20' : stat.iconColor === 'text-emerald-600' ? 'bg-gradient-to-br from-emerald-500 to-teal-600 ring-emerald-500/20' : stat.iconColor === 'text-blue-600' ? 'bg-gradient-to-br from-blue-500 to-indigo-600 ring-blue-500/20' : 'bg-gradient-to-br from-violet-500 to-purple-600 ring-violet-500/20'}`}>
                      <Icon className="h-5 w-5 text-white drop-shadow-lg" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="text-3xl font-bold text-slate-900 mb-2">
                      {stat.value}
                    </div>
                    <div className="flex items-center gap-2">
                      {stat.trend === 'up' && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 rounded-xl border border-emerald-200">
                          <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="text-xs font-semibold text-emerald-700">{stat.change}</span>
                        </div>
                      )}
                      {stat.trend === 'down' && (
                        <div className="flex items-center gap-1 px-2 py-1 bg-rose-50 rounded-xl border border-rose-200">
                          <ArrowDownRight className="h-3.5 w-3.5 text-rose-600" />
                          <span className="text-xs font-semibold text-rose-700">{stat.change}</span>
                        </div>
                      )}
                      {stat.trend === 'neutral' && (
                        <span className="text-xs font-medium text-slate-500 px-2 py-1 bg-slate-50 rounded-xl">{stat.change}</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Charts Section */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Expense Breakdown Pie Chart */}
            <Card className="border border-slate-200/60 shadow-2xl hover:shadow-3xl transition-all duration-500 bg-gradient-to-br from-white via-slate-50/30 to-indigo-50/20 backdrop-blur-sm rounded-3xl">
              <CardHeader className="border-b border-slate-200/50 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 backdrop-blur-md rounded-t-3xl">
                <CardTitle className="flex items-center gap-3 text-slate-800">
                  <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg ring-4 ring-indigo-500/10">
                    <PieChart className="h-5 w-5 text-white drop-shadow-lg" />
                  </div>
                  <div>
                    <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                      Expense Breakdown
                    </span>
                    <p className="text-xs text-slate-500 font-normal mt-0.5">Real-time spending analysis</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-8 pb-6 px-6">
                {expensePieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={340}>
                      <RechartsPie>
                        <defs>
                          {expensePieData.map((entry, index) => (
                            <React.Fragment key={`defs-${index}`}>
                              <radialGradient id={`gradient-${entry.name.replace(/\s+/g, '-')}`}>
                                <stop offset="0%" stopColor={entry.color} stopOpacity={1} />
                                <stop offset="50%" stopColor={entry.color} stopOpacity={0.9} />
                                <stop offset="100%" stopColor={entry.color} stopOpacity={0.75} />
                              </radialGradient>
                              <filter id={`shadow-${entry.name.replace(/\s+/g, '-')}`}>
                                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.3" floodColor={entry.color} />
                              </filter>
                            </React.Fragment>
                          ))}
                        </defs>
                        <Pie
                          data={expensePieData}
                          cx="50%"
                          cy="48%"
                          labelLine={{
                            stroke: '#94a3b8',
                            strokeWidth: 2,
                            strokeDasharray: '5 5'
                          }}
                          label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value }) => {
                            const RADIAN = Math.PI / 180
                            const radius = innerRadius + (outerRadius - innerRadius) * 0.5
                            const x = cx + radius * Math.cos(-midAngle * RADIAN)
                            const y = cy + radius * Math.sin(-midAngle * RADIAN)
                            const percentage = (percent * 100).toFixed(1)
                            
                            if (percent < 0.05) return null // Hide labels for very small slices
                            
                            return (
                              <text
                                x={x}
                                y={y}
                                fill="white"
                                textAnchor="middle"
                                dominantBaseline="central"
                                className="font-bold text-sm drop-shadow-lg"
                                style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
                              >
                                <tspan x={x} dy="-0.3em" className="text-xs font-semibold">
                                  {percentage}%
                                </tspan>
                                <tspan x={x} dy="1.2em" className="text-[10px] font-medium opacity-90">
                                  ₹{(value / 1000).toFixed(1)}k
                                </tspan>
                              </text>
                            )
                          }}
                          outerRadius={115}
                          innerRadius={55}
                          fill="#8884d8"
                          dataKey="value"
                          paddingAngle={4}
                          animationBegin={0}
                          animationDuration={1200}
                          animationEasing="ease-out"
                        >
                          {expensePieData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={`url(#gradient-${entry.name.replace(/\s+/g, '-')})`}
                              stroke="white"
                              strokeWidth={3}
                              filter={`url(#shadow-${entry.name.replace(/\s+/g, '-')})`}
                              style={{
                                filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))',
                                transition: 'all 0.3s ease'
                              }}
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload[0]) {
                              const data = payload[0].payload
                              return (
                                <div className="bg-white/95 backdrop-blur-md border-2 border-slate-200 rounded-xl shadow-2xl p-4 min-w-[160px]">
                                  <p className="font-bold text-slate-800 text-sm mb-2 pb-2 border-b border-slate-200">
                                    {data.name}
                                  </p>
                                  <div className="space-y-1.5">
                                    <p className="text-slate-700 font-semibold text-lg">
                                      ₹{data.value.toLocaleString('en-IN')}
                                    </p>
                                    <p className="text-slate-500 text-xs">
                                      {((data.value / expensePieData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}% of total
                                    </p>
                                  </div>
                                </div>
                              )
                            }
                            return null
                          }}
                        />
                        <Legend 
                          verticalAlign="bottom"
                          height={42}
                          iconType="circle"
                          iconSize={12}
                          wrapperStyle={{ 
                            fontSize: '13px',
                            fontWeight: '600',
                            paddingTop: '24px',
                            paddingBottom: '8px'
                          }}
                          formatter={(value, entry: any) => (
                            <span className="text-slate-700 hover:text-indigo-600 transition-colors cursor-default">
                              {value}
                            </span>
                          )}
                        />
                      </RechartsPie>
                    </ResponsiveContainer>
                    <div className="mt-6 pt-5 border-t-2 border-gradient-to-r from-transparent via-slate-200 to-transparent">
                      <div className="flex items-center justify-center gap-6">
                        <div className="text-center">
                          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Total Spending</p>
                          <p className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            ₹{expensePieData.reduce((sum, item) => sum + item.value, 0).toLocaleString('en-IN')}
                          </p>
                        </div>
                        <div className="h-12 w-px bg-gradient-to-b from-transparent via-slate-300 to-transparent"></div>
                        <div className="text-center">
                          <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-1">Categories</p>
                          <p className="text-2xl font-bold text-slate-700">
                            {expensePieData.length}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <PieChart className="h-10 w-10 text-slate-400" />
                    </div>
                    <p className="text-slate-600 font-medium mb-2">No expense data available</p>
                    <p className="text-sm text-slate-500">Add some expenses to see the breakdown</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Monthly Trend Area Chart */}
            <Card className="border border-slate-200/60 shadow-2xl hover:shadow-3xl transition-all duration-500 bg-gradient-to-br from-white via-slate-50/30 to-emerald-50/20 backdrop-blur-sm rounded-3xl">
              <CardHeader className="border-b border-slate-200/50 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 backdrop-blur-md rounded-t-3xl">
                <CardTitle className="flex items-center gap-3 text-slate-800">
                  <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-lg ring-4 ring-emerald-500/10">
                    <Activity className="h-5 w-5 text-white drop-shadow-lg" />
                  </div>
                  <div>
                    <span className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                      Monthly Trends
                    </span>
                    <p className="text-xs text-slate-500 font-normal mt-0.5">Income vs Expenses analysis</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-8 pb-6 px-6">
                <ResponsiveContainer width="100%" height={340}>
                  <AreaChart data={monthlyTrendData}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="50%" stopColor="#059669" stopOpacity={0.4}/>
                        <stop offset="100%" stopColor="#059669" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.8}/>
                        <stop offset="50%" stopColor="#dc2626" stopOpacity={0.4}/>
                        <stop offset="100%" stopColor="#dc2626" stopOpacity={0.1}/>
                      </linearGradient>
                      <filter id="shadow-area">
                        <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.15" />
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="5 5" stroke="#cbd5e1" strokeOpacity={0.5} />
                    <XAxis 
                      dataKey="month" 
                      stroke="#64748b" 
                      style={{ fontSize: '13px', fontWeight: '600' }}
                      tick={{ fill: '#475569' }}
                      axisLine={{ stroke: '#94a3b8', strokeWidth: 2 }}
                    />
                    <YAxis 
                      stroke="#64748b" 
                      style={{ fontSize: '13px', fontWeight: '600' }}
                      tick={{ fill: '#475569' }}
                      axisLine={{ stroke: '#94a3b8', strokeWidth: 2 }}
                      tickFormatter={(value) => `₹${(value/1000)}k`}
                    />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white/95 backdrop-blur-md border-2 border-slate-200 rounded-xl shadow-2xl p-4 min-w-[180px]">
                              <p className="font-bold text-slate-800 text-sm mb-3 pb-2 border-b border-slate-200">
                                {payload[0].payload.month}
                              </p>
                              <div className="space-y-2">
                                {payload.map((entry: any, index: number) => (
                                  <div key={index} className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-3 h-3 rounded-full ${entry.name === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                      <span className="text-xs font-medium text-slate-600 capitalize">{entry.name}</span>
                                    </div>
                                    <span className="text-sm font-bold text-slate-800">
                                      ₹{entry.value.toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Legend 
                      verticalAlign="top"
                      height={42}
                      iconType="circle"
                      iconSize={10}
                      wrapperStyle={{ 
                        fontSize: '13px',
                        fontWeight: '600',
                        paddingBottom: '20px'
                      }}
                      formatter={(value) => (
                        <span className="text-slate-700 capitalize">{value}</span>
                      )}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="income" 
                      stroke="#10b981" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#colorIncome)"
                      filter="url(#shadow-area)"
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 5, stroke: '#fff' }}
                      activeDot={{ r: 7, fill: '#10b981', stroke: '#fff', strokeWidth: 3 }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="expenses" 
                      stroke="#f43f5e" 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#colorExpense)"
                      filter="url(#shadow-area)"
                      dot={{ fill: '#f43f5e', strokeWidth: 2, r: 5, stroke: '#fff' }}
                      activeDot={{ r: 7, fill: '#f43f5e', stroke: '#fff', strokeWidth: 3 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="mt-6 pt-5 border-t-2 border-gradient-to-r from-transparent via-slate-200 to-transparent">
                  <div className="flex items-center justify-center gap-8">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                      <span className="text-xs font-medium text-slate-600">Income Trend</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                      <span className="text-xs font-medium text-slate-600">Expense Trend</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity & Investment Performance */}
          <div className="grid gap-6 md:grid-cols-1">
            <Card className="border border-slate-200/60 shadow-2xl hover:shadow-3xl transition-all duration-500 bg-gradient-to-br from-white via-slate-50/30 to-rose-50/20 backdrop-blur-sm rounded-3xl">
              <CardHeader className="border-b border-slate-200/50 bg-gradient-to-r from-rose-500/10 via-pink-500/10 to-red-500/10 backdrop-blur-md rounded-t-3xl">
                <CardTitle className="flex items-center gap-3 text-slate-800">
                  <div className="p-2.5 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl shadow-lg ring-4 ring-rose-500/10">
                    <Wallet className="h-5 w-5 text-white drop-shadow-lg" />
                  </div>
                  <div>
                    <span className="text-lg font-bold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                      Recent Expenses
                    </span>
                    <p className="text-xs text-slate-500 font-normal mt-0.5">Latest 5 transactions</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6 pb-4 px-6">
                <div className="space-y-3">
                  {displayExpenses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <Wallet className="h-10 w-10 text-slate-400" />
                      </div>
                      <p className="text-slate-600 font-medium mb-2">No recent expenses</p>
                      <p className="text-sm text-slate-500">Start tracking your spending</p>
                    </div>
                  ) : (
                    displayExpenses.map((transaction, index) => (
                      <div key={transaction.id} className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-slate-50/80 to-transparent border border-slate-200/50 hover:border-rose-200 hover:shadow-md transition-all duration-300 group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white font-bold shadow-lg ring-4 ring-rose-500/10 group-hover:scale-110 transition-transform">
                            {index + 1}
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-slate-900">{transaction.description || 'Expense'}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-md">{transaction.payment_method || 'N/A'}</span>
                              <span className="text-xs text-slate-400">{new Date(transaction.transaction_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-rose-600 block">
                            -₹{transaction.amount.toLocaleString('en-IN')}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(transaction.transaction_date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm hover:shadow-md transition-shadow bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-slate-800">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  Investment Performance
                </CardTitle>
                <CardDescription>Monthly portfolio value growth</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="investmentGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis 
                      dataKey="month" 
                      stroke="#94a3b8" 
                      style={{ fontSize: '11px' }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                    />
                    <YAxis 
                      stroke="#94a3b8" 
                      style={{ fontSize: '11px' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `₹${(value/1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: 'none', 
                        borderRadius: '6px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        color: '#fff',
                        fontSize: '12px',
                        padding: '8px 12px'
                      }}
                      labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                      formatter={(value: any) => [`₹${value.toLocaleString('en-IN')}`, 'Investment Value']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="investments" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      fill="url(#investmentGradient)"
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 4, stroke: '#fff' }}
                      activeDot={{ r: 6, strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
