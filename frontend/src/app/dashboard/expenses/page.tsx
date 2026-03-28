'use client'

import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, Wallet, Calendar, Trash2, Edit, Upload, 
  Search, Filter, ChevronLeft, ChevronRight, X, Sparkles,
  AlertCircle, RefreshCw, Loader2,
  Smartphone, CreditCard, Banknote, Globe
} from 'lucide-react'
import { toast } from 'sonner'
import { expenseApi, aiApi, Expense, Category, categoryApi, financeApiClient } from '@/lib/api'
import { useCurrency } from '@/hooks/useCurrency'
import { useAuthStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/error-utils'
import { getCategoryIcon } from '@/lib/category-icons'
import { getCategoryColor } from '@/lib/category-colors'
import { ConfirmDialog } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// ─── Constants ──────────────────────────────────────────────────────
const MAX_CSV_FILE_SIZE = 5 * 1024 * 1024

type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest'

const PAYMENT_METHOD_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'UPI': Smartphone,
  'Credit Card': CreditCard,
  'Debit Card': CreditCard,
  'Cash': Banknote,
  'Net Banking': Globe,
}

// ─── SidebarFilters (extracted to avoid re-creation every render) ──
interface SidebarFiltersProps {
  currentMonth: Date
  onMonthChange: (date: Date) => void
  selectedDate: string | null
  onDateChange: (date: string | null) => void
  selectedCategory: string | null
  onCategoryChange: (cat: string | null) => void
  categoriesMaster: Category[]
  calendarExpensesByDate: Record<number, Expense[]>
  monthlyTotal: number
  format: (n: number) => string
}

const SidebarFilters = memo(function SidebarFilters({
  currentMonth,
  onMonthChange,
  selectedDate,
  onDateChange,
  selectedCategory,
  onCategoryChange,
  categoriesMaster,
  calendarExpensesByDate,
  monthlyTotal,
  format,
}: SidebarFiltersProps) {
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year

  return (
    <Card className="border-none shadow-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-3xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white pb-6">
        <div className="flex items-center justify-between mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onMonthChange(new Date(year, month - 1))}
            className="text-white hover:bg-white/20 rounded-xl"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <CardTitle className="text-lg font-bold">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </CardTitle>
            {!isCurrentMonth && (
              <button
                onClick={() => onMonthChange(new Date())}
                className="text-[11px] text-white/70 hover:text-white underline mt-1 transition-colors"
              >
                Jump to today
              </button>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onMonthChange(new Date(year, month + 1))}
            className="text-white hover:bg-white/20 rounded-xl"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="text-center">
          <p className="text-white/80 text-xs mb-1">Total This Month</p>
          <p className="text-3xl font-bold tabular-nums">{format(monthlyTotal)}</p>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {/* Category Filter */}
        <div className="mb-6">
          <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3 block">
            Filter by Category
          </Label>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Category filters">
            <button
              type="button"
              onClick={() => onCategoryChange(null)}
              className={cn(
                "inline-flex items-center rounded-xl px-3 py-1.5 text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
                !selectedCategory 
                  ? "bg-indigo-600 text-white hover:bg-indigo-700" 
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              )}
            >
              All
            </button>
            {categoriesMaster.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onCategoryChange(cat.id)}
                className={cn(
                  "inline-flex items-center rounded-xl px-3 py-1.5 text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
                  selectedCategory === cat.id
                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Mini Calendar */}
        <div>
          <Label className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3 block">
            Quick Date Select
          </Label>
          <div className="grid grid-cols-7 gap-1 text-center text-xs" role="grid" aria-label="Calendar">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="font-semibold text-slate-400 p-2" role="columnheader">{day}</div>
            ))}
            {(() => {
              const days = []
              for (let i = 0; i < firstDay; i++) {
                days.push(<div key={`empty-${i}`} className="p-2"></div>)
              }
              for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year
                const isSelected = selectedDate === dateStr
                const dayExpenses = calendarExpensesByDate[day]
                const dayTotal = dayExpenses?.reduce((sum, e) => sum + e.amount, 0) || 0

                days.push(
                  <button
                    key={day}
                    onClick={() => onDateChange(isSelected ? null : dateStr)}
                    aria-label={`${new Date(year, month, day).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}${dayExpenses ? `, ${dayExpenses.length} expense${dayExpenses.length > 1 ? 's' : ''}, ${format(dayTotal)}` : ''}`}
                    aria-pressed={isSelected}
                    className={cn(
                      "relative p-2 rounded-xl transition-all hover:scale-105",
                      isSelected && "bg-indigo-600 text-white font-bold shadow-lg",
                      !isSelected && isToday && "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-semibold",
                      !isSelected && !isToday && dayExpenses && "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 font-medium",
                      !isSelected && !isToday && !dayExpenses && "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    )}
                  >
                    {day}
                    {dayExpenses && (
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
              onDateChange(null)
              onCategoryChange(null)
            }}
            className="w-full mt-6 rounded-xl border-slate-200 dark:border-slate-700"
          >
            <X className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        )}
      </CardContent>
    </Card>
  )
})

// ─── Main Page ──────────────────────────────────────────────────────
export default function ExpensesPage() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated())
  const token = useAuthStore((state) => state.token)
  const { currency, symbol, format } = useCurrency()

  // Core data
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(false)
  const [categoriesMaster, setCategoriesMaster] = useState<Category[]>([])

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState({
    amount: 0,
    currency: currency,
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
    payment_method: 'UPI',
    category_id: '',
    tags: [] as string[]
  })
  const [tagInput, setTagInput] = useState('')
  const [initialFormData, setInitialFormData] = useState(formData)

  // Filter & display state
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [sortOption, setSortOption] = useState<SortOption>('newest')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [visibleCount, setVisibleCount] = useState(50)
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Discard warning
  const [showDiscardWarning, setShowDiscardWarning] = useState(false)

  // Import state
  const [importingStatement, setImportingStatement] = useState(false)

  // AI auto-categorization
  const [aiSuggestion, setAiSuggestion] = useState<{ category_name: string | null; category_id: string | null; confidence: number } | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  // Refs
  const amountInputRef = useRef<HTMLInputElement>(null)

  // ─── Derived helpers ────────────────────────────────────────────
  const getDefaultFormData = useCallback(() => ({
    amount: 0,
    currency: currency,
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
    payment_method: 'UPI',
    category_id: '',
    tags: [] as string[]
  }), [currency])

  const resetForm = useCallback(() => {
    setShowForm(false)
    setEditingExpense(null)
    setFormData(getDefaultFormData())
    setTagInput('')
    setFormErrors({})
    setAiSuggestion(null)
    setSubmitting(false)
  }, [getDefaultFormData])

  const isFormDirty = useMemo(() => {
    return (
      formData.amount !== initialFormData.amount ||
      formData.description !== initialFormData.description ||
      formData.transaction_date !== initialFormData.transaction_date ||
      formData.payment_method !== initialFormData.payment_method ||
      formData.category_id !== initialFormData.category_id ||
      JSON.stringify(formData.tags) !== JSON.stringify(initialFormData.tags)
    )
  }, [formData, initialFormData])

  const isDateSort = sortOption === 'newest' || sortOption === 'oldest'

  // ─── Data fetching ────────────────────────────────────────────
  const fetchExpenses = useCallback(async () => {
    try {
      setFetchError(false)
      const response = await expenseApi.list()
      setExpenses(response || [])
    } catch (error: unknown) {
      setExpenses([])
      setFetchError(true)
      toast.error(getErrorMessage(error) || 'Failed to load expenses. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchExpenses()
    } else {
      setExpenses([])
      setLoading(false)
    }
  }, [isAuthenticated, token, fetchExpenses])

  useEffect(() => {
    if (!isAuthenticated || !token) return
    const load = async () => {
      try {
        const cats = await categoryApi.list()
        setCategoriesMaster(cats)
      } catch (e: unknown) {
        toast.error('Failed to load categories. Some features may be limited.')
      }
    }
    load()
  }, [isAuthenticated, token])

  // Debounced AI categorization
  useEffect(() => {
    if (!showForm || !formData.description || formData.description.length < 3) {
      setAiSuggestion(null)
      return
    }
    if (formData.category_id) return

    const timer = setTimeout(async () => {
      setAiLoading(true)
      try {
        const result = await aiApi.categorize(formData.description, formData.amount || undefined)
        if (result.category_name && result.confidence > 0) {
          setAiSuggestion(result)
        } else {
          setAiSuggestion(null)
        }
      } catch {
        setAiSuggestion(null)
      } finally {
        setAiLoading(false)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [formData.description, formData.amount, formData.category_id, showForm])

  // Auto-focus amount field when form opens
  useEffect(() => {
    if (showForm) {
      const timer = setTimeout(() => amountInputRef.current?.focus(), 100)
      return () => clearTimeout(timer)
    }
  }, [showForm])

  // ─── Memoized data ───────────────────────────────────────────
  const allFilteredExpenses = useMemo(() => expenses.filter(expense => {
    const query = searchQuery.toLowerCase()
    const matchesSearch = !query || (
      (expense.description?.toLowerCase().includes(query) ?? false) ||
      (expense.tags?.some(t => t.toLowerCase().includes(query)) ?? false)
    )
    const matchesCategory = !selectedCategory || expense.category_id === selectedCategory
    const matchesDate = !selectedDate || expense.transaction_date.split('T')[0] === selectedDate
    return matchesSearch && matchesCategory && matchesDate
  }), [expenses, searchQuery, selectedCategory, selectedDate])

  const sortedFilteredExpenses = useMemo(() => {
    const list = [...allFilteredExpenses]
    switch (sortOption) {
      case 'newest':
        return list.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
      case 'oldest':
        return list.sort((a, b) => new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime())
      case 'highest':
        return list.sort((a, b) => b.amount - a.amount)
      case 'lowest':
        return list.sort((a, b) => a.amount - b.amount)
      default:
        return list
    }
  }, [allFilteredExpenses, sortOption])

  const paginatedExpenses = useMemo(() => sortedFilteredExpenses.slice(0, visibleCount), [sortedFilteredExpenses, visibleCount])
  const hasMore = sortedFilteredExpenses.length > visibleCount

  const groupedExpenses = useMemo(() => {
    if (!isDateSort) return null
    return paginatedExpenses.reduce((acc, expense) => {
      const date = expense.transaction_date.split('T')[0]
      if (!acc[date]) acc[date] = []
      acc[date].push(expense)
      return acc
    }, {} as Record<string, Expense[]>)
  }, [paginatedExpenses, isDateSort])

  const displayedTotal = useMemo(() => paginatedExpenses.reduce((sum, expense) => sum + expense.amount, 0), [paginatedExpenses])
  const categories = useMemo(() => Array.from(new Set(expenses.map(e => e.category_name).filter(Boolean))), [expenses])

  const monthlyTotal = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    return expenses
      .filter(expense => {
        const [expYear, expMonth] = expense.transaction_date.split('T')[0].split('-').map(Number)
        return expYear === year && expMonth - 1 === month
      })
      .reduce((sum, expense) => sum + expense.amount, 0)
  }, [expenses, currentMonth])

  const calendarExpensesByDate = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    return expenses.reduce((acc: Record<number, Expense[]>, expense) => {
      const [expYear, expMonth, expDay] = expense.transaction_date.split('T')[0].split('-').map(Number)
      if (expMonth - 1 === month && expYear === year) {
        if (!acc[expDay]) acc[expDay] = []
        acc[expDay].push(expense)
      }
      return acc
    }, {})
  }, [expenses, currentMonth])

  const hasActiveFilters = !!(selectedDate || selectedCategory || searchQuery)

  // ─── Handlers ─────────────────────────────────────────────────
  const handleEdit = (expense: Expense) => {
    const editData = {
      amount: expense.amount,
      currency: expense.currency,
      description: expense.description || '',
      transaction_date: expense.transaction_date.split('T')[0],
      payment_method: expense.payment_method || 'UPI',
      category_id: expense.category_id || '',
      tags: expense.tags || []
    }
    setEditingExpense(expense)
    setFormData(editData)
    setInitialFormData(editData)
    setTagInput('')
    setFormErrors({})
    setShowForm(true)
  }

  const openAddForm = () => {
    const defaults = getDefaultFormData()
    setFormData(defaults)
    setInitialFormData(defaults)
    setEditingExpense(null)
    setFormErrors({})
    setTagInput('')
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (submitting) return

    const errors: Record<string, string> = {}
    const amount = Number(formData.amount)
    if (isNaN(amount) || amount <= 0) {
      errors.amount = !formData.amount ? 'Amount is required' : 'Amount must be greater than zero'
    }
    if (!formData.description?.trim()) errors.description = 'Description is required'
    if (!formData.transaction_date) errors.transaction_date = 'Date is required'
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }
    setFormErrors({})
    setSubmitting(true)

    try {
      if (editingExpense && editingExpense.id) {
        await expenseApi.update(editingExpense.id, formData)
        toast.success('Expense updated successfully!')
      } else {
        await expenseApi.create(formData)
        toast.success('Expense added successfully!')
      }
      resetForm()
      fetchExpenses()
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || `Failed to ${editingExpense ? 'update' : 'add'} expense`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      await expenseApi.delete(id)
      toast.success('Expense deleted successfully!')
      fetchExpenses()
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || 'Failed to delete expense')
    } finally {
      setDeleting(false)
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
    if (file.size > MAX_CSV_FILE_SIZE) {
      toast.error('File too large. Maximum size is 5MB.')
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
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || 'Failed to import bank statement')
    } finally {
      setImportingStatement(false)
      e.target.value = ''
    }
  }

  const handleFormOpenChange = (open: boolean) => {
    if (!open) {
      if (submitting) return
      if (isFormDirty) {
        setShowDiscardWarning(true)
        return
      }
      resetForm()
    }
  }

  // ─── Shared expense card renderer ─────────────────────────────
  const renderExpenseCard = (expense: Expense, showDate: boolean) => {
    const Icon = getCategoryIcon(expense.category_icon || undefined)
    const PaymentIcon = PAYMENT_METHOD_ICONS[expense.payment_method || '']

    return (
      <Card
        key={expense.id}
        className="group border-none shadow-lg hover:shadow-2xl transition-all duration-300 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden"
      >
        <CardContent className="p-0">
          <div className="flex items-center gap-3 md:gap-4 p-4 md:p-5">
            {/* Category Icon */}
            <div
              className={cn("flex-shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shadow-lg text-white", getCategoryColor(expense.category_color || undefined))}
            >
              <Icon className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>

            {/* Expense Details */}
            <div className="flex-1 min-w-0">
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <h4 className="font-semibold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-sm md:text-base cursor-default">
                    {expense.description}
                  </h4>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p>{expense.description}</p>
                </TooltipContent>
              </Tooltip>
              <div className="flex items-center gap-2 md:gap-3 mt-1 flex-wrap">
                <Badge variant="secondary" className="text-xs rounded-lg">
                  {expense.category_name || 'Uncategorized'}
                </Badge>
                {PaymentIcon && (
                  <span className="text-xs text-slate-500 hidden sm:inline-flex items-center gap-1">
                    <PaymentIcon className="h-3 w-3" />
                    {expense.payment_method}
                  </span>
                )}
                {!PaymentIcon && expense.payment_method && (
                  <span className="text-xs text-slate-500 hidden sm:inline">
                    {expense.payment_method}
                  </span>
                )}
                {expense.tags?.map((tag: string, ti: number) => (
                  <Badge key={ti} variant="outline" className="text-[10px] rounded-md px-1.5 py-0 border-indigo-200 text-indigo-600 dark:border-indigo-800 dark:text-indigo-400 hidden sm:inline-flex">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Amount + optional date */}
            <div className="text-right flex-shrink-0">
              <p className="text-lg md:text-xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                {format(expense.amount)}
              </p>
              {showDate && (
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {new Date(expense.transaction_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-1 md:gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(expense)}
                className="rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-600 min-h-[36px] min-w-[36px] md:min-h-[40px] md:min-w-[40px]"
                aria-label={`Edit expense: ${expense.description}`}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteTarget(expense.id!)}
                className="rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950 hover:text-rose-600 min-h-[36px] min-w-[36px] md:min-h-[40px] md:min-w-[40px]"
                aria-label={`Delete expense: ${expense.description}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ─── Render ───────────────────────────────────────────────────
  return (
    <TooltipProvider>
      <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/20 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 shadow-sm">
          <div className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Expenses
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Track and analyze your spending patterns</p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {/* Search */}
                <div className="relative flex-1 min-w-[140px] sm:min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search expenses or tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 rounded-xl border-slate-200 dark:border-slate-700 focus:border-indigo-500"
                    aria-label="Search expenses and tags"
                  />
                </div>

                {/* Sort */}
                <Select value={sortOption} onValueChange={(v) => setSortOption(v as SortOption)}>
                  <SelectTrigger className="w-[150px] rounded-xl border-slate-200 dark:border-slate-700" aria-label="Sort expenses">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest first</SelectItem>
                    <SelectItem value="oldest">Oldest first</SelectItem>
                    <SelectItem value="highest">Highest amount</SelectItem>
                    <SelectItem value="lowest">Lowest amount</SelectItem>
                  </SelectContent>
                </Select>

                {/* Mobile filter toggle */}
                {expenses.length > 0 && (
                  <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" className="rounded-xl border-slate-200 dark:border-slate-700 lg:hidden" aria-label="Open filters">
                        <Filter className="h-4 w-4 mr-2" />
                        Filters
                        {hasActiveFilters && (
                          <span className="ml-1.5 w-2 h-2 rounded-full bg-indigo-600" />
                        )}
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[340px] p-0 border-0 overflow-y-auto">
                      <div className="p-4">
                        <SidebarFilters
                          currentMonth={currentMonth}
                          onMonthChange={setCurrentMonth}
                          selectedDate={selectedDate}
                          onDateChange={setSelectedDate}
                          selectedCategory={selectedCategory}
                          onCategoryChange={setSelectedCategory}
                          categoriesMaster={categoriesMaster}
                          calendarExpensesByDate={calendarExpensesByDate}
                          monthlyTotal={monthlyTotal}
                          format={format}
                        />
                      </div>
                    </SheetContent>
                  </Sheet>
                )}

                <label htmlFor="statement-upload">
                  <Button variant="outline" disabled={importingStatement} className="rounded-xl border-slate-200 dark:border-slate-700" asChild>
                    <span className="cursor-pointer">
                      <Upload className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">{importingStatement ? 'Importing...' : 'Import CSV'}</span>
                      <span className="sm:hidden">{importingStatement ? '...' : 'CSV'}</span>
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
                  onClick={openAddForm}
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Add Expense</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </div>
            </div>

            {/* Quick Stats */}
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-4 md:mt-6 animate-pulse">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="rounded-xl p-3 md:p-4 bg-slate-100 dark:bg-slate-800/50">
                    <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-700 mb-2" />
                    <div className="h-7 w-20 rounded bg-slate-200 dark:bg-slate-700" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mt-4 md:mt-6">
                <div className="bg-gradient-to-br from-rose-500/10 to-pink-500/10 border border-rose-200/50 dark:border-rose-800/50 rounded-xl p-3 md:p-4" aria-label={`Total spent: ${format(displayedTotal)}`}>
                  <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                    {hasActiveFilters ? 'Filtered Total' : 'Total Spent'}
                  </p>
                  <p className="text-xl md:text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">{format(displayedTotal)}</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-200/50 dark:border-blue-800/50 rounded-xl p-3 md:p-4" aria-label={`${paginatedExpenses.length} transactions`}>
                  <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">Transactions</p>
                  <p className="text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400 tabular-nums">{paginatedExpenses.length}</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-200/50 dark:border-emerald-800/50 rounded-xl p-3 md:p-4">
                  <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">Avg/Transaction</p>
                  <p className="text-xl md:text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {paginatedExpenses.length > 0 ? format(displayedTotal / paginatedExpenses.length) : format(0)}
                  </p>
                </div>
                <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-200/50 dark:border-amber-800/50 rounded-xl p-3 md:p-4">
                  <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">Categories</p>
                  <p className="text-xl md:text-2xl font-bold text-amber-600 dark:text-amber-400 tabular-nums">{categories.length}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Content States ─────────────────────────────────────── */}
        {loading ? (
          /* Skeleton loader */
          <div className="p-4 md:p-6 animate-pulse" role="status" aria-label="Loading expenses">
            <div className="flex gap-4 md:gap-6">
              {/* Skeleton sidebar */}
              <div className="hidden lg:block w-80 flex-shrink-0">
                <div className="rounded-3xl bg-slate-200/60 dark:bg-slate-800/60 h-[480px]" />
              </div>
              {/* Skeleton content */}
              <div className="flex-1 space-y-4">
                {/* Skeleton date header */}
                <div className="flex items-center justify-between rounded-2xl bg-slate-100 dark:bg-slate-800/50 px-4 md:px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700" />
                    <div className="space-y-1.5">
                      <div className="h-4 w-36 rounded bg-slate-200 dark:bg-slate-700" />
                      <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-700" />
                    </div>
                  </div>
                  <div className="space-y-1.5 text-right">
                    <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-700 ml-auto" />
                    <div className="h-5 w-24 rounded bg-slate-200 dark:bg-slate-700" />
                  </div>
                </div>
                {/* Skeleton expense cards */}
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="rounded-2xl bg-white dark:bg-slate-900 shadow-lg p-4 md:p-5">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 rounded bg-slate-200 dark:bg-slate-700" style={{ width: `${50 + i * 8}%` }} />
                        <div className="h-3 w-1/3 rounded bg-slate-200 dark:bg-slate-700" />
                      </div>
                      <div className="h-6 w-20 rounded bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
                    </div>
                  </div>
                ))}
                {/* Second date group skeleton */}
                <div className="flex items-center justify-between rounded-2xl bg-slate-100 dark:bg-slate-800/50 px-4 md:px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700" />
                    <div className="space-y-1.5">
                      <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-700" />
                      <div className="h-3 w-16 rounded bg-slate-200 dark:bg-slate-700" />
                    </div>
                  </div>
                  <div className="space-y-1.5 text-right">
                    <div className="h-3 w-14 rounded bg-slate-200 dark:bg-slate-700 ml-auto" />
                    <div className="h-5 w-20 rounded bg-slate-200 dark:bg-slate-700" />
                  </div>
                </div>
                {[5, 6].map(i => (
                  <div key={i} className="rounded-2xl bg-white dark:bg-slate-900 shadow-lg p-4 md:p-5">
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 rounded bg-slate-200 dark:bg-slate-700" style={{ width: `${40 + i * 7}%` }} />
                        <div className="h-3 w-1/4 rounded bg-slate-200 dark:bg-slate-700" />
                      </div>
                      <div className="h-6 w-16 rounded bg-slate-200 dark:bg-slate-700 flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <span className="sr-only">Loading expenses...</span>
          </div>
        ) : fetchError && expenses.length === 0 ? (
          /* Error state */
          <div className="flex items-center justify-center py-12 px-6">
            <Card className="max-w-md border-none shadow-2xl dark:bg-slate-900">
              <CardContent className="flex flex-col items-center justify-center py-10">
                <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-orange-600 rounded-full flex items-center justify-center mb-6">
                  <AlertCircle className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">Could Not Load Expenses</h3>
                <p className="text-slate-600 dark:text-slate-400 text-center mb-6 max-w-sm">
                  We had trouble connecting to the server. Please check your connection and try again.
                </p>
                <Button 
                  onClick={() => {
                    setLoading(true)
                    fetchExpenses()
                  }} 
                  className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : expenses.length === 0 ? (
          /* Empty state */
          <div className="flex items-center justify-center py-12 px-6">
            <Card className="max-w-md border-none shadow-2xl dark:bg-slate-900">
              <CardContent className="flex flex-col items-center justify-center py-10">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-6">
                  <Wallet className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-slate-900 dark:text-white">No Expenses Yet</h3>
                <p className="text-slate-600 dark:text-slate-400 text-center mb-6 max-w-sm">
                  Start tracking your spending by adding your first expense or importing from your bank statement
                </p>
                <Button onClick={openAddForm} className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Expense
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Main content */
          <div className="flex gap-4 p-4 md:gap-6 md:p-6">
            {/* Desktop Sidebar */}
            <div
              className={cn(
                "hidden lg:block transition-all duration-300 ease-in-out",
                sidebarCollapsed ? "w-0 overflow-hidden opacity-0" : "w-80 opacity-100"
              )}
            >
              <div className="sticky top-24">
                <SidebarFilters
                  currentMonth={currentMonth}
                  onMonthChange={setCurrentMonth}
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  selectedCategory={selectedCategory}
                  onCategoryChange={setSelectedCategory}
                  categoriesMaster={categoriesMaster}
                  calendarExpensesByDate={calendarExpensesByDate}
                  monthlyTotal={monthlyTotal}
                  format={format}
                />
              </div>
            </div>

            {/* Sidebar Toggle */}
            <div className="hidden lg:flex items-start pt-4">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg hover:bg-indigo-700 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                aria-label={sidebarCollapsed ? "Expand filter sidebar" : "Collapse filter sidebar"}
              >
                {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
            </div>

            {/* Expense List */}
            <div className="flex-1 min-w-0 space-y-4">
              {/* Filtered empty state */}
              {allFilteredExpenses.length === 0 && hasActiveFilters && (
                <Card className="border-none shadow-lg dark:bg-slate-900">
                  <CardContent className="flex flex-col items-center justify-center py-10">
                    <div className="w-16 h-16 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-full flex items-center justify-center mb-4">
                      <Search className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                    </div>
                    <h3 className="text-lg font-bold mb-1 text-slate-900 dark:text-white">No matching expenses</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm text-center mb-4 max-w-sm">
                      No expenses match your current filters. Try adjusting your search or clearing filters.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery('')
                        setSelectedDate(null)
                        setSelectedCategory(null)
                      }}
                      className="rounded-xl"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear All Filters
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Date-grouped view (newest/oldest sort) */}
              {isDateSort && groupedExpenses && Object.entries(groupedExpenses)
                .sort(([a], [b]) => sortOption === 'newest'
                  ? new Date(b).getTime() - new Date(a).getTime()
                  : new Date(a).getTime() - new Date(b).getTime()
                )
                .map(([date, dayExpenses]: [string, Expense[]]) => {
                  const dayTotal = dayExpenses.reduce((sum: number, e: Expense) => sum + e.amount, 0)
                  const dateObj = new Date(date + 'T00:00:00')
                  
                  return (
                    <div key={date} className="space-y-3">
                      {/* Date Header */}
                      <div className="flex items-center justify-between sticky top-20 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl px-4 md:px-6 py-3 border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-xl p-2">
                            <Calendar className="h-4 w-4" />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm md:text-base">
                              {dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                            </h3>
                            <p className="text-xs text-slate-500">{dayExpenses.length} transaction{dayExpenses.length !== 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500 mb-0.5">Daily Total</p>
                          <p className="text-base md:text-lg font-bold text-rose-600 dark:text-rose-400 tabular-nums">{format(dayTotal)}</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {dayExpenses.map(expense => renderExpenseCard(expense, false))}
                      </div>
                    </div>
                  )
                })}

              {/* Flat view (highest/lowest sort) */}
              {!isDateSort && (
                <div className="space-y-3">
                  {paginatedExpenses.map(expense => renderExpenseCard(expense, true))}
                </div>
              )}

              {/* Load More */}
              {hasMore && (
                <div className="flex justify-center pt-6">
                  <Button
                    variant="outline"
                    onClick={() => setVisibleCount(prev => prev + 50)}
                    className="rounded-xl px-8"
                  >
                    Load More ({sortedFilteredExpenses.length - visibleCount} remaining)
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Dialogs ─────────────────────────────────────────── */}

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(open) => { if (!open && !deleting) setDeleteTarget(null) }}
          title="Delete Expense"
          description="Are you sure you want to delete this expense? This action cannot be undone."
          confirmLabel="Delete"
          variant="destructive"
          loading={deleting}
          onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
        />

        {/* Discard Changes Confirmation */}
        <ConfirmDialog
          open={showDiscardWarning}
          onOpenChange={setShowDiscardWarning}
          title="Discard changes?"
          description="You have unsaved changes. Are you sure you want to close without saving?"
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          variant="destructive"
          onConfirm={() => {
            setShowDiscardWarning(false)
            resetForm()
          }}
        />

        {/* Add/Edit Expense Form */}
        <Dialog open={showForm} onOpenChange={handleFormOpenChange}>
          <DialogContent
            hideClose
            className="max-w-2xl rounded-3xl border-none shadow-2xl p-0 gap-0 max-h-[90vh] overflow-hidden dark:bg-slate-900"
            onPointerDownOutside={(e) => { if (submitting) e.preventDefault() }}
            onEscapeKeyDown={(e) => { if (submitting) e.preventDefault() }}
          >
            {/* Header */}
            <div className="border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-800 dark:to-slate-800 px-6 py-5">
              <div className="flex items-center justify-between">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {editingExpense ? 'Edit Expense' : 'Add New Expense'}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {editingExpense ? 'Update the details of this expense.' : 'Fill in the details to record a new expense.'}
                  </DialogDescription>
                </DialogHeader>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => handleFormOpenChange(false)}
                  disabled={submitting}
                  className="rounded-xl"
                  aria-label="Close form"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Form Body */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-180px)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expense-amount">Amount *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">{symbol}</span>
                    <Input
                      ref={amountInputRef}
                      id="expense-amount"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={formData.amount || ''}
                      onChange={(e) => {
                        const val = e.target.value
                        setFormData({ ...formData, amount: val === '' ? 0 : parseFloat(val) })
                        if (formErrors.amount) setFormErrors(prev => { const n = {...prev}; delete n.amount; return n })
                      }}
                      placeholder="0.00"
                      className={cn("rounded-xl pl-8", formErrors.amount && "border-red-500 focus:ring-red-500")}
                      aria-invalid={!!formErrors.amount}
                      aria-describedby={formErrors.amount ? "amount-error" : undefined}
                      disabled={submitting}
                    />
                  </div>
                  {formErrors.amount && <p id="amount-error" className="text-xs text-red-500" role="alert">{formErrors.amount}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense-date">Date *</Label>
                  <Input
                    id="expense-date"
                    type="date"
                    value={formData.transaction_date}
                    onChange={(e) => {
                      setFormData({ ...formData, transaction_date: e.target.value })
                      if (formErrors.transaction_date) setFormErrors(prev => { const n = {...prev}; delete n.transaction_date; return n })
                    }}
                    className={cn("rounded-xl", formErrors.transaction_date && "border-red-500")}
                    aria-invalid={!!formErrors.transaction_date}
                    aria-describedby={formErrors.transaction_date ? "date-error" : undefined}
                    disabled={submitting}
                  />
                  {formErrors.transaction_date && <p id="date-error" className="text-xs text-red-500" role="alert">{formErrors.transaction_date}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expense-description">Description *</Label>
                <Input
                  id="expense-description"
                  value={formData.description}
                  onChange={(e) => {
                    setFormData({ ...formData, description: e.target.value })
                    if (formErrors.description) setFormErrors(prev => { const n = {...prev}; delete n.description; return n })
                  }}
                  placeholder="What did you spend on?"
                  className={cn("rounded-xl", formErrors.description && "border-red-500 focus:ring-red-500")}
                  aria-invalid={!!formErrors.description}
                  aria-describedby={formErrors.description ? "description-error" : undefined}
                  disabled={submitting}
                />
                {formErrors.description && <p id="description-error" className="text-xs text-red-500" role="alert">{formErrors.description}</p>}
                {/* AI Category Suggestion */}
                {(aiSuggestion || aiLoading) && !formData.category_id && (
                  <div className="flex items-center gap-2 mt-1">
                    <Sparkles className="h-3.5 w-3.5 text-purple-500 flex-shrink-0" />
                    {aiLoading ? (
                      <span className="text-xs text-slate-500">Analyzing...</span>
                    ) : aiSuggestion?.category_name ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (aiSuggestion.category_id) {
                            setFormData(prev => ({ ...prev, category_id: aiSuggestion.category_id! }))
                          }
                          setAiSuggestion(null)
                        }}
                        className="text-xs text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-300 font-medium transition-colors"
                      >
                        Suggested: <span className="underline">{aiSuggestion.category_name}</span> ({Math.round(aiSuggestion.confidence * 100)}% match) — click to apply
                      </button>
                    ) : null}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="expense-category">Category</Label>
                <Select
                  value={formData.category_id || '_none'}
                  onValueChange={(val) => setFormData({ ...formData, category_id: val === '_none' ? '' : val })}
                  disabled={submitting}
                >
                  <SelectTrigger className="rounded-xl" id="expense-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Uncategorized</SelectItem>
                    {categoriesMaster.map((cat) => {
                      const CatIcon = getCategoryIcon(cat.icon)
                      return (
                        <SelectItem key={cat.id} value={cat.id}>
                          <div className="flex items-center gap-2">
                            <CatIcon className="h-4 w-4" />
                            {cat.name}
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expense-payment">Payment Method</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(val) => setFormData({ ...formData, payment_method: val })}
                  disabled={submitting}
                >
                  <SelectTrigger className="rounded-xl" id="expense-payment">
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

              {/* Tags */}
              <div className="space-y-2">
                <Label htmlFor="expense-tags">Tags</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="rounded-lg px-2.5 py-1 text-xs gap-1.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                      {tag}
                      <button 
                        type="button" 
                        onClick={() => setFormData({ ...formData, tags: formData.tags.filter((_, i) => i !== idx) })} 
                        className="hover:text-red-500 transition-colors"
                        aria-label={`Remove tag: ${tag}`}
                        disabled={submitting}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Input
                  id="expense-tags"
                  placeholder="Add a tag and press Enter..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && tagInput.trim()) {
                      e.preventDefault()
                      const normalizedTag = tagInput.trim()
                      if (!formData.tags.some(t => t.toLowerCase() === normalizedTag.toLowerCase())) {
                        setFormData({ ...formData, tags: [...formData.tags, normalizedTag] })
                      }
                      setTagInput('')
                    }
                  }}
                  className="rounded-xl"
                  disabled={submitting}
                />
                <p className="text-xs text-slate-500">Press Enter to add tags</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => handleFormOpenChange(false)}
                  disabled={submitting}
                  className="flex-1 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {editingExpense ? 'Saving...' : 'Adding...'}
                    </>
                  ) : (
                    editingExpense ? 'Save Changes' : 'Add Expense'
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  )
}
