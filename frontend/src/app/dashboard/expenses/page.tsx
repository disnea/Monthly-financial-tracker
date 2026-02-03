'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, Wallet, Calendar, TrendingUp, DollarSign, Trash2, Edit, Upload, 
  Search, Filter, ChevronLeft, ChevronRight, Receipt, ShoppingBag, 
  Utensils, Car, Home, Heart, Film, ChevronDown, X, Eye
} from 'lucide-react'
import { toast } from 'sonner'
import { expenseApi, Expense, financeApiClient } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { useCurrency } from '@/hooks/useCurrency'
import { cn } from '@/lib/utils'

interface ExpenseWithCategory extends Expense {
  category_name?: string
}

const categoryIcons: Record<string, any> = {
  'Food & Dining': Utensils,
  'Transportation': Car,
  'Shopping': ShoppingBag,
  'Utilities': Home,
  'Healthcare': Heart,
  'Entertainment': Film,
  'default': Receipt
}

const categoryColors: Record<string, string> = {
  'Food & Dining': 'bg-orange-500',
  'Transportation': 'bg-blue-500',
  'Shopping': 'bg-purple-500',
  'Utilities': 'bg-green-500',
  'Healthcare': 'bg-red-500',
  'Entertainment': 'bg-pink-500',
  'default': 'bg-gray-500'
}

export default function ExpensesPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated())
  const token = useAuthStore((state) => state.token)
  const { currency, symbol, format } = useCurrency()
  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [importingStatement, setImportingStatement] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [formData, setFormData] = useState({
    amount: 0,
    currency: currency,
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
    payment_method: 'UPI',
    category_id: ''
  })

  // Sample expenses
  const sampleExpenses: ExpenseWithCategory[] = [
    { id: '1', amount: 3250, currency: 'INR', description: 'Grocery Shopping at BigBasket', transaction_date: '2024-01-15', payment_method: 'Credit Card', category_name: 'Food & Dining' },
    { id: '2', amount: 285, currency: 'INR', description: 'Uber Ride to Office', transaction_date: '2024-01-14', payment_method: 'UPI', category_name: 'Transportation' },
    { id: '3', amount: 850, currency: 'INR', description: 'Swiggy Food Order - Dinner', transaction_date: '2024-01-14', payment_method: 'Credit Card', category_name: 'Food & Dining' },
    { id: '4', amount: 2100, currency: 'INR', description: 'Electricity Bill Payment', transaction_date: '2024-01-13', payment_method: 'Net Banking', category_name: 'Utilities' },
    { id: '5', amount: 4500, currency: 'INR', description: 'Amazon Shopping - Electronics', transaction_date: '2024-01-12', payment_method: 'Credit Card', category_name: 'Shopping' },
    { id: '6', amount: 1200, currency: 'INR', description: 'Mobile Recharge - Airtel', transaction_date: '2024-01-11', payment_method: 'UPI', category_name: 'Utilities' },
    { id: '7', amount: 2800, currency: 'INR', description: 'Movie Tickets - PVR', transaction_date: '2024-01-10', payment_method: 'Credit Card', category_name: 'Entertainment' },
    { id: '8', amount: 1500, currency: 'INR', description: 'Medicine Purchase', transaction_date: '2024-01-09', payment_method: 'Cash', category_name: 'Healthcare' },
  ]

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchExpenses()
    } else {
      setExpenses([])
      setLoading(false)
    }
  }, [isAuthenticated, token])

  const fetchExpenses = async () => {
    try {
      const response = await expenseApi.list()
      if (response && response.length > 0) {
        setExpenses(response)
      } else if (!isAuthenticated) {
        setExpenses(sampleExpenses)
      } else {
        setExpenses([])
      }
    } catch (error: any) {
      if (!isAuthenticated) {
        setExpenses(sampleExpenses)
      } else {
        setExpenses([])
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.amount || !formData.description) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      await expenseApi.create(formData)
      toast.success('Expense added successfully!')
      setShowForm(false)
      setFormData({
        amount: 0,
        currency: currency,
        description: '',
        transaction_date: new Date().toISOString().split('T')[0],
        payment_method: 'UPI',
        category_id: ''
      })
      fetchExpenses()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to add expense')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return
    
    try {
      await expenseApi.delete(id)
      toast.success('Expense deleted successfully!')
      fetchExpenses()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to delete expense')
    }
  }

  const handleBankStatementUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }

    const formDataUpload = new FormData()
    formDataUpload.append('file', file)
    formDataUpload.append('currency', currency)

    setImportingStatement(true)
    try {
      const response = await financeApiClient.post('/import/bank-statement', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      toast.success(`Successfully imported ${response.data.imported_count} transactions!`)
      fetchExpenses()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to import bank statement')
    } finally {
      setImportingStatement(false)
      e.target.value = ''
    }
  }

  // Filter expenses
  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? true
    const matchesCategory = !selectedCategory || expense.category_name === selectedCategory
    const matchesDate = !selectedDate || expense.transaction_date.split('T')[0] === selectedDate
    return matchesSearch && matchesCategory && matchesDate
  })

  // Group by date
  const groupedExpenses = filteredExpenses.reduce((acc, expense) => {
    const date = expense.transaction_date.split('T')[0]
    if (!acc[date]) acc[date] = []
    acc[date].push(expense)
    return acc
  }, {} as Record<string, ExpenseWithCategory[]>)

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const displayedTotal = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const categories = Array.from(new Set(expenses.map(e => e.category_name).filter(Boolean)))

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/20">
      {/* Enhanced Header with Search */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Expenses
              </h1>
              <p className="text-slate-600 text-sm mt-1">Track and analyze your spending patterns</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search expenses..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-xl border-slate-200 focus:border-indigo-500"
                />
              </div>

              <label htmlFor="statement-upload">
                <Button variant="outline" disabled={importingStatement} className="rounded-xl border-slate-200" asChild>
                  <span className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    {importingStatement ? 'Importing...' : 'Import'}
                  </span>
                </Button>
                <input
                  id="statement-upload"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleBankStatementUpload}
                  disabled={importingStatement}
                />
              </label>

              <Button 
                onClick={() => setShowForm(true)} 
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-gradient-to-br from-rose-500/10 to-pink-500/10 border border-rose-200/50 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-600 mb-1">Total Spent</p>
              <p className="text-2xl font-bold text-rose-600">{format(displayedTotal)}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-200/50 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-600 mb-1">Transactions</p>
              <p className="text-2xl font-bold text-blue-600">{filteredExpenses.length}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-200/50 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-600 mb-1">Avg/Transaction</p>
              <p className="text-2xl font-bold text-emerald-600">
                {filteredExpenses.length > 0 ? format(displayedTotal / filteredExpenses.length) : format(0)}
              </p>
            </div>
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-200/50 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-600 mb-1">Categories</p>
              <p className="text-2xl font-bold text-amber-600">{categories.length}</p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 px-6">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600">Loading expenses...</p>
          </div>
        </div>
      ) : expenses.length === 0 ? (
        <div className="flex items-center justify-center py-12 px-6">
          <Card className="max-w-md border-none shadow-2xl">
            <CardContent className="flex flex-col items-center justify-center py-10">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-6">
                <Wallet className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-2">No Expenses Yet</h3>
              <p className="text-slate-600 text-center mb-6 max-w-sm">
                Start tracking your spending by adding your first expense or importing from your bank statement
              </p>
              <Button onClick={() => setShowForm(true)} className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600">
                <Plus className="h-4 w-4 mr-2" />
                Add First Expense
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex gap-4 p-4 md:gap-6 md:p-6">
          {/* Sliding Sidebar */}
          <div
            className={cn(
              "transition-all duration-500 ease-in-out",
              sidebarCollapsed ? "w-0 opacity-0" : "w-80 opacity-100"
            )}
          >
            <div className={cn(
              "sticky top-24 transition-transform duration-500",
              sidebarCollapsed && "translate-x-[-100%]"
            )}>
              <Card className="border-none shadow-2xl bg-white/90 backdrop-blur-xl rounded-3xl overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white pb-6">
                  <div className="flex items-center justify-between mb-4">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                      className="text-white hover:bg-white/20 rounded-xl"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <CardTitle className="text-lg font-bold">
                      {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                      className="text-white hover:bg-white/20 rounded-xl"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Total for month */}
                  <div className="text-center">
                    <p className="text-white/80 text-xs mb-1">Total This Month</p>
                    <p className="text-3xl font-bold">{format(totalExpenses)}</p>
                  </div>
                </CardHeader>
                
                <CardContent className="p-6">
                  {/* Category Filter */}
                  <div className="mb-6">
                    <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3 block">
                      Filter by Category
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        onClick={() => setSelectedCategory(null)}
                        className={cn(
                          "cursor-pointer rounded-xl px-3 py-1.5 transition-all",
                          !selectedCategory 
                            ? "bg-indigo-600 text-white hover:bg-indigo-700" 
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        )}
                      >
                        All
                      </Badge>
                      {categories.map(category => (
                        <Badge
                          key={category}
                          onClick={() => setSelectedCategory(category || null)}
                          className={cn(
                            "cursor-pointer rounded-xl px-3 py-1.5 transition-all",
                            selectedCategory === category
                              ? "bg-indigo-600 text-white hover:bg-indigo-700"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          )}
                        >
                          {category}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Mini Calendar */}
                  <div>
                    <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3 block">
                      Quick Date Select
                    </Label>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs">
                      {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                        <div key={i} className="font-semibold text-slate-400 p-2">{day}</div>
                      ))}
                      {(() => {
                        const year = currentMonth.getFullYear()
                        const month = currentMonth.getMonth()
                        const firstDay = new Date(year, month, 1).getDay()
                        const daysInMonth = new Date(year, month + 1, 0).getDate()
                        const today = new Date()
                        
                        const expensesByDate = expenses.reduce((acc: Record<number, typeof expenses>, expense) => {
                          const [expYear, expMonth, expDay] = expense.transaction_date.split('T')[0].split('-').map(Number)
                          if (expMonth - 1 === month && expYear === year) {
                            if (!acc[expDay]) acc[expDay] = []
                            acc[expDay].push(expense)
                          }
                          return acc
                        }, {})

                        const days = []
                        // Empty cells for days before month starts
                        for (let i = 0; i < firstDay; i++) {
                          days.push(<div key={`empty-${i}`} className="p-2"></div>)
                        }
                        
                        // Days of the month
                        for (let day = 1; day <= daysInMonth; day++) {
                          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                          const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year
                          const isSelected = selectedDate === dateStr
                          const hasExpenses = expensesByDate[day]
                          const dayTotal = hasExpenses?.reduce((sum, e) => sum + e.amount, 0) || 0

                          days.push(
                            <button
                              key={day}
                              onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                              className={cn(
                                "relative p-2 rounded-xl transition-all hover:scale-110",
                                isSelected && "bg-indigo-600 text-white font-bold shadow-lg",
                                !isSelected && isToday && "bg-indigo-100 text-indigo-600 font-semibold",
                                !isSelected && !isToday && hasExpenses && "bg-rose-50 text-rose-600 font-medium",
                                !isSelected && !isToday && !hasExpenses && "text-slate-400 hover:bg-slate-50"
                              )}
                            >
                              {day}
                              {hasExpenses && (
                                <div className={cn(
                                  "absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full",
                                  isSelected ? "bg-white" : "bg-rose-500"
                                )} />
                              )}
                            </button>
                          )
                        }
                        return days
                      })()}
                    </div>
                  </div>

                  {/* Clear Filters */}
                  {(selectedDate || selectedCategory) && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedDate(null)
                        setSelectedCategory(null)
                      }}
                      className="w-full mt-6 rounded-xl border-slate-200"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear Filters
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Sidebar Toggle Button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="fixed left-0 top-1/2 -translate-y-1/2 z-40 bg-indigo-600 text-white p-3 rounded-r-xl shadow-lg hover:bg-indigo-700 transition-all"
          >
            {sidebarCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
          </button>

          {/* Main Content - Timeline View */}
          <div className="flex-1 space-y-6">
            {Object.entries(groupedExpenses)
              .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
              .map(([date, dayExpenses]) => {
                const dayTotal = dayExpenses.reduce((sum, e) => sum + e.amount, 0)
                const dateObj = new Date(date + 'T00:00:00')
                
                return (
                  <div key={date} className="space-y-3">
                    {/* Date Header */}
                    <div className="flex items-center justify-between sticky top-20 z-20 bg-white/80 backdrop-blur-xl rounded-2xl px-6 py-3 border border-slate-200/50 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl p-2">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900">
                            {dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                          </h3>
                          <p className="text-xs text-slate-500">{dayExpenses.length} transactions</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 mb-0.5">Daily Total</p>
                        <p className="text-lg font-bold text-rose-600">{format(dayTotal)}</p>
                      </div>
                    </div>

                    {/* Expense Cards */}
                    <div className="space-y-3">
                      {dayExpenses.map((expense) => {
                        const Icon = categoryIcons[expense.category_name || 'default'] || categoryIcons.default
                        const colorClass = categoryColors[expense.category_name || 'default'] || categoryColors.default

                        return (
                          <Card
                            key={expense.id}
                            className="group border-none shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] bg-white rounded-2xl overflow-hidden"
                          >
                            <CardContent className="p-0">
                              <div className="flex items-center gap-4 p-5">
                                {/* Category Icon */}
                                <div className={cn("flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg", colorClass)}>
                                  <Icon className="h-6 w-6 text-white" />
                                </div>

                                {/* Expense Details */}
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                                    {expense.description}
                                  </h4>
                                  <div className="flex items-center gap-3 mt-1">
                                    <Badge variant="secondary" className="text-xs rounded-lg">
                                      {expense.category_name || 'Uncategorized'}
                                    </Badge>
                                    <span className="text-xs text-slate-500">
                                      {expense.payment_method}
                                    </span>
                                  </div>
                                </div>

                                {/* Amount */}
                                <div className="text-right flex-shrink-0">
                                  <p className="text-xl font-bold text-rose-600">
                                    {format(expense.amount)}
                                  </p>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDelete(expense.id!)}
                                    className="rounded-xl hover:bg-rose-50 hover:text-rose-600"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Add Expense Modal - Centered */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300 p-4">
          <Card className="w-full max-w-2xl rounded-3xl border-none shadow-2xl animate-in zoom-in-95 duration-300">
            <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-purple-50">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Add New Expense
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} className="rounded-xl">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount *</Label>
                  <Input
                    type="number"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                    placeholder="0.00"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={formData.transaction_date}
                    onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description *</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What did you spend on?"
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full p-2 border rounded-xl"
                >
                  <option value="UPI">UPI</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="Cash">Cash</option>
                  <option value="Net Banking">Net Banking</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                >
                  Add Expense
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
