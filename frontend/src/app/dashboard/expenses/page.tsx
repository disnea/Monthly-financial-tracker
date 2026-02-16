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
import { expenseApi, Expense, Category, categoryApi, financeApiClient } from '@/lib/api'
import { useCurrency } from '@/hooks/useCurrency'
import { useAuthStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/error-utils'
import { getCategoryIcon } from '@/lib/category-icons'
import { getCategoryColor } from '@/lib/category-colors'
import { ConfirmDialog } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Icon mapping from backend icon string → Lucide component
const iconMap: Record<string, any> = {
  wallet: Wallet,
  shopping: ShoppingBag,
  food: Utensils,
  transport: Car,
  utilities: Home,
  healthcare: Heart,
  entertainment: Film,
  default: Receipt,
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
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [importingStatement, setImportingStatement] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [categoriesMaster, setCategoriesMaster] = useState<Category[]>([])
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [visibleCount, setVisibleCount] = useState(50)
  const [formData, setFormData] = useState({
    amount: 0,
    currency: currency,
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
    payment_method: 'UPI',
    category_id: ''
  })

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchExpenses()
    } else {
      setExpenses([])
      setLoading(false)
    }
  }, [isAuthenticated, token])

  useEffect(() => {
    if (!isAuthenticated || !token) return
    const load = async () => {
      try {
        const cats = await categoryApi.list()
        setCategoriesMaster(cats)
      } catch (e) {
        console.error('Failed to load categories', e)
      }
    }
    load()
  }, [isAuthenticated, token])

  const fetchExpenses = async () => {
    try {
      const response = await expenseApi.list()
      setExpenses(response || [])
    } catch (error: any) {
      setExpenses([])
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense)
    setFormData({
      amount: expense.amount,
      currency: expense.currency,
      description: expense.description || '',
      transaction_date: expense.transaction_date, // it's already "YYYY-MM-DD"
      payment_method: expense.payment_method || 'UPI',
      category_id: expense.category_id || ''
    })
    setShowForm(true)
  }

  const handleSubmit = async () => {
    const errors: Record<string, string> = {}
    if (!formData.amount || formData.amount <= 0) errors.amount = 'Amount must be greater than zero'
    if (!formData.description?.trim()) errors.description = 'Description is required'
    if (!formData.transaction_date) errors.transaction_date = 'Date is required'
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }
    setFormErrors({})

    try {
      if (editingExpense && editingExpense.id) {
        await expenseApi.update(editingExpense.id, formData)
        toast.success('Expense updated successfully!')
      } else {
        await expenseApi.create(formData)
        toast.success('Expense added successfully!')
      }
      setShowForm(false)
      setEditingExpense(null)
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
      toast.error(getErrorMessage(error) || `Failed to ${editingExpense ? 'update' : 'add'} expense`)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await expenseApi.delete(id)
      toast.success('Expense deleted successfully!')
      fetchExpenses()
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Failed to delete expense')
    } finally {
      setDeleteTarget(null)
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
      toast.error(getErrorMessage(error) || 'Failed to import bank statement')
    } finally {
      setImportingStatement(false)
      e.target.value = ''
    }
  }

  // Filter expenses
  const allFilteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? true
    const matchesCategory = !selectedCategory || expense.category_id === selectedCategory
    const matchesDate = !selectedDate || expense.transaction_date.split('T')[0] === selectedDate
    return matchesSearch && matchesCategory && matchesDate
  })
  const filteredExpenses = allFilteredExpenses.slice(0, visibleCount)
  const hasMore = allFilteredExpenses.length > visibleCount

  // Group by date
  const groupedExpenses = filteredExpenses.reduce((acc, expense) => {
    const date = expense.transaction_date.split('T')[0]
    if (!acc[date]) acc[date] = []
    acc[date].push(expense)
    return acc
  }, {} as Record<string, Expense[]>)

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
  const displayedTotal = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)
  const categories = Array.from(new Set(expenses.map(e => e.category_name).filter(Boolean)))

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/20 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* Enhanced Header with Search */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 shadow-sm">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Expenses
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Track and analyze your spending patterns</p>
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
                    {importingStatement ? 'Importing...' : 'Import CSV'}
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
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Total Spent</p>
              <p className="text-2xl font-bold text-rose-600">{format(displayedTotal)}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-200/50 dark:border-blue-700/50 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Transactions</p>
              <p className="text-2xl font-bold text-blue-600">{filteredExpenses.length}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-200/50 dark:border-emerald-700/50 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Avg/Transaction</p>
              <p className="text-2xl font-bold text-emerald-600">
                {filteredExpenses.length > 0 ? format(displayedTotal / filteredExpenses.length) : format(0)}
              </p>
            </div>
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-200/50 dark:border-amber-700/50 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Categories</p>
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
              <Card className="border-none shadow-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl overflow-hidden">
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
                    <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3 block">
                      Filter by Category
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        onClick={() => setSelectedCategory(null)}
                        className={cn(
                          "cursor-pointer rounded-xl px-3 py-1.5 transition-all",
                          !selectedCategory 
                            ? "bg-indigo-600 text-white hover:bg-indigo-700" 
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                        )}
                      >
                        All
                      </Badge>
                      {categoriesMaster.map(cat => (
                        <Badge
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={cn(
                            "cursor-pointer rounded-xl px-3 py-1.5 transition-all",
                            selectedCategory === cat.id
                              ? "bg-indigo-600 text-white hover:bg-indigo-700"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                          )}
                        >
                          {cat.name}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Mini Calendar */}
                  <div>
                    <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3 block">
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
                                !isSelected && !isToday && !hasExpenses && "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
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
            className={cn(
              "fixed top-1/2 -translate-y-1/2 z-40 bg-indigo-600 text-white p-2 rounded-xl shadow-lg hover:bg-indigo-700 transition-all",
              sidebarCollapsed ? "left-4" : "left-[calc(33.333%-1rem)]"
            )}
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
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
                    <div className="flex items-center justify-between sticky top-20 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl px-6 py-3 border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl p-2">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white">
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
                        const Icon = getCategoryIcon(expense.category_icon || undefined)

                        return (
                          <Card
                            key={expense.id}
                            className="group border-none shadow-lg hover:shadow-2xl transition-all duration-300 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden"
                          >
                            <CardContent className="p-0">
                              <div className="flex items-center gap-4 p-5">
                                {/* Category Icon */}
                                <div
                                  className={cn("flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg text-white", getCategoryColor(expense.category_color || undefined))}
                                >
                                  <Icon className="h-6 w-6 text-white" />
                                </div>

                                {/* Expense Details */}
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 transition-colors">
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
                                <div className="flex gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEdit(expense)}
                                    className="rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-600"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDeleteTarget(expense.id!)}
                                    className="rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950 hover:text-rose-600"
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

          {/* Load More */}
          {hasMore && (
            <div className="flex justify-center pt-6">
              <Button
                variant="outline"
                onClick={() => setVisibleCount(prev => prev + 50)}
                className="rounded-xl px-8"
              >
                Load More ({allFilteredExpenses.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Expense"
        description="Are you sure you want to delete this expense? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />

      {/* Add Expense Modal - Centered */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300 p-4">
          <Card className="w-full max-w-2xl rounded-3xl border-none shadow-2xl animate-in zoom-in-95 duration-300 dark:bg-slate-900">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {editingExpense ? 'Edit Expense' : 'Add New Expense'}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => {
                  setShowForm(false)
                  setEditingExpense(null)
                }} className="rounded-xl">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Amount *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">{symbol}</span>
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={formData.amount || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, amount: parseFloat(e.target.value) })
                        if (formErrors.amount) setFormErrors(prev => { const n = {...prev}; delete n.amount; return n })
                      }}
                      placeholder="0.00"
                      className={cn("rounded-xl pl-8", formErrors.amount && "border-red-500 focus:ring-red-500")}
                    />
                  </div>
                  {formErrors.amount && <p className="text-xs text-red-500">{formErrors.amount}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={formData.transaction_date}
                    onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                    className={cn("rounded-xl", formErrors.transaction_date && "border-red-500")}
                  />
                  {formErrors.transaction_date && <p className="text-xs text-red-500">{formErrors.transaction_date}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description *</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value })
                    if (formErrors.description) setFormErrors(prev => { const n = {...prev}; delete n.description; return n })
                  }}
                  placeholder="What did you spend on?"
                  className={cn("rounded-xl", formErrors.description && "border-red-500 focus:ring-red-500")}
                />
                {formErrors.description && <p className="text-xs text-red-500">{formErrors.description}</p>}
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category_id || '_none'}
                  onValueChange={(val) => setFormData({ ...formData, category_id: val === '_none' ? '' : val })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Uncategorized</SelectItem>
                    {categoriesMaster.map((cat) => {
                      const Icon = getCategoryIcon(cat.icon)
                      return (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {cat.name}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(val) => setFormData({ ...formData, payment_method: val })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="Credit Card">Credit Card</SelectItem>
                    <SelectItem value="Debit Card">Debit Card</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Net Banking">Net Banking</SelectItem>
                  </SelectContent>
                </Select>
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
                  {editingExpense ? 'Save Changes' : 'Add Expense'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
