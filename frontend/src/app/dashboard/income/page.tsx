'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ConfirmDialog } from '@/components/ui/alert-dialog'
import {
  Plus, Search, Calendar, Edit, Trash2, X, 
  Banknote, Briefcase, TrendingUp, Gift, Home, MoreHorizontal,
  RefreshCw, DollarSign, ArrowUpRight, Repeat
} from 'lucide-react'
import { toast } from 'sonner'
import { incomeApi, Income } from '@/lib/api'
import { useCurrency } from '@/hooks/useCurrency'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/error-utils'

const sourceIcons: Record<string, any> = {
  'salary': Briefcase,
  'freelance': Banknote,
  'dividends': TrendingUp,
  'rental': Home,
  'gift': Gift,
  'other': MoreHorizontal,
}

const sourceColors: Record<string, string> = {
  'salary': 'from-blue-500 to-indigo-600',
  'freelance': 'from-emerald-500 to-teal-600',
  'dividends': 'from-purple-500 to-violet-600',
  'rental': 'from-amber-500 to-orange-600',
  'gift': 'from-pink-500 to-rose-600',
  'other': 'from-slate-500 to-slate-600',
}

const sourceBadgeColors: Record<string, string> = {
  'salary': 'bg-blue-100 text-blue-700',
  'freelance': 'bg-emerald-100 text-emerald-700',
  'dividends': 'bg-purple-100 text-purple-700',
  'rental': 'bg-amber-100 text-amber-700',
  'gift': 'bg-pink-100 text-pink-700',
  'other': 'bg-slate-100 text-slate-700',
}

export default function IncomePage() {
  const { currency, symbol, format } = useCurrency()
  const [incomes, setIncomes] = useState<Income[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingIncome, setEditingIncome] = useState<Income | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState<string>('all')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const [formData, setFormData] = useState<Income>({
    source: 'salary',
    amount: 0,
    currency: currency,
    income_date: new Date().toISOString().split('T')[0],
    description: '',
    is_recurring: false,
    recurrence_period: null,
    notes: ''
  })

  useEffect(() => { fetchIncomes() }, [])

  const fetchIncomes = async () => {
    try {
      const data = await incomeApi.list()
      setIncomes(data || [])
    } catch (error: any) {
      // Backend endpoint may not exist yet — show empty state
      setIncomes([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.amount || !formData.income_date) {
      toast.error('Please fill in amount and date')
      return
    }
    try {
      if (editingIncome?.id) {
        await incomeApi.update(editingIncome.id, formData)
        toast.success('Income updated')
      } else {
        await incomeApi.create(formData)
        toast.success('Income recorded')
      }
      fetchIncomes()
      resetForm()
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Failed to save income')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await incomeApi.delete(id)
      toast.success('Income deleted')
      fetchIncomes()
    } catch (error: any) {
      toast.error('Failed to delete income')
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleEdit = (income: Income) => {
    setEditingIncome(income)
    setFormData({
      source: income.source,
      amount: income.amount,
      currency: income.currency,
      income_date: income.income_date,
      description: income.description || '',
      is_recurring: income.is_recurring,
      recurrence_period: income.recurrence_period || null,
      notes: income.notes || ''
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingIncome(null)
    setFormData({
      source: 'salary',
      amount: 0,
      currency: currency,
      income_date: new Date().toISOString().split('T')[0],
      description: '',
      is_recurring: false,
      recurrence_period: null,
      notes: ''
    })
  }

  // Stats
  const totalIncome = incomes.reduce((s, i) => s + i.amount, 0)
  const thisMonth = incomes.filter(i => {
    const d = new Date(i.income_date)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  })
  const thisMonthTotal = thisMonth.reduce((s, i) => s + i.amount, 0)
  const recurringCount = incomes.filter(i => i.is_recurring).length
  const sources = [...new Set(incomes.map(i => i.source))]

  // Filters
  const filtered = incomes.filter(i => {
    const matchSearch = (i.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.source.toLowerCase().includes(searchQuery.toLowerCase())
    const matchSource = sourceFilter === 'all' || i.source === sourceFilter
    return matchSearch && matchSource
  }).sort((a, b) => new Date(b.income_date).getTime() - new Date(a.income_date).getTime())

  // Group by month
  const grouped = filtered.reduce((acc, income) => {
    const d = new Date(income.income_date)
    const key = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    if (!acc[key]) acc[key] = []
    acc[key].push(income)
    return acc
  }, {} as Record<string, Income[]>)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/20 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 shadow-sm">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Income</h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Track and manage all your income streams</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Search income..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 rounded-xl border-slate-200 focus:border-emerald-500" />
              </div>
              <Select value={sourceFilter} onValueChange={setSourceFilter}>
                <SelectTrigger className="w-[130px] rounded-xl border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="salary">Salary</SelectItem>
                  <SelectItem value="freelance">Freelance</SelectItem>
                  <SelectItem value="dividends">Dividends</SelectItem>
                  <SelectItem value="rental">Rental</SelectItem>
                  <SelectItem value="gift">Gift</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setShowForm(true)} className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-lg">
                <Plus className="h-4 w-4 mr-2" /> Add Income
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-200/50 dark:border-emerald-700/50 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Total Income</p>
              <p className="text-2xl font-bold text-emerald-600">{format(totalIncome)}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-200/50 dark:border-blue-700/50 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">This Month</p>
              <p className="text-2xl font-bold text-blue-600">{format(thisMonthTotal)}</p>
            </div>
            <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-200/50 dark:border-violet-700/50 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Sources</p>
              <p className="text-2xl font-bold text-violet-600">{sources.length}</p>
            </div>
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-200/50 dark:border-amber-700/50 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Recurring</p>
              <p className="text-2xl font-bold text-amber-600">{recurringCount} entries</p>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 px-6">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600">Loading income data...</p>
          </div>
        </div>
      ) : incomes.length === 0 ? (
        <div className="flex items-center justify-center py-12 px-6">
          <Card className="max-w-md border-none shadow-2xl">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mb-6">
                <Banknote className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-2">No Income Yet</h3>
              <p className="text-slate-600 text-center mb-6 max-w-sm">
                Start tracking your income from salary, freelancing, investments, and other sources.
              </p>
              <Button onClick={() => setShowForm(true)} className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600">
                <Plus className="h-4 w-4 mr-2" /> Record First Income
              </Button>
            </CardContent>
          </Card>
        </div>
        ) : (
        <div className="p-4 md:p-6 space-y-6">
          <div className="space-y-8">
            {Object.entries(grouped).map(([month, monthIncomes]) => (
              <div key={month}>
                <div className="flex items-center justify-between sticky top-20 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl px-6 py-3 border border-slate-200/50 dark:border-slate-700/50 shadow-sm mb-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-xl p-2">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">{month}</h3>
                      <p className="text-xs text-slate-500">{monthIncomes.length} entries</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 mb-0.5">Monthly Total</p>
                    <p className="text-lg font-bold text-emerald-600">{format(monthIncomes.reduce((s, i) => s + i.amount, 0))}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {monthIncomes.map((income) => {
                    const Icon = sourceIcons[income.source] || sourceIcons.other
                    const gradient = sourceColors[income.source] || sourceColors.other
                    const badgeColor = sourceBadgeColors[income.source] || sourceBadgeColors.other

                    return (
                      <Card key={income.id} className="group border-none shadow-lg hover:shadow-2xl transition-all duration-300 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                        <CardContent className="p-0">
                          <div className="flex items-center gap-4 p-5">
                        <div className={cn("flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg bg-gradient-to-br text-white", gradient)}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 transition-colors">
                              {income.description || income.source.charAt(0).toUpperCase() + income.source.slice(1)}
                          </h4>
                          <div className="flex items-center gap-3 mt-1">
                            <Badge variant="secondary" className="text-xs rounded-lg">{income.source}</Badge>
                            <span className="text-xs text-slate-500">{new Date(income.income_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            {income.is_recurring && (
                              <Badge variant="outline" className="text-[10px] gap-1 rounded-lg">
                                <Repeat className="h-2.5 w-2.5" />
                                {income.recurrence_period}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xl font-bold text-emerald-600">+{format(income.amount)}</p>
                        </div>
                        <div className="flex gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(income)} className="rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:text-emerald-600">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => income.id && setDeleteTarget(income.id)} className="rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950 hover:text-rose-600">
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
            ))}
          </div>
        </div>
        )}

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300 p-4">
          <Card className="w-full max-w-2xl rounded-3xl border-none shadow-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300 dark:bg-slate-900">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    {editingIncome ? 'Edit Income' : 'Record Income'}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {editingIncome ? 'Update the income entry details' : 'Add a new income entry to your records'}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={resetForm} className="rounded-xl">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Source *</Label>
                  <Select value={formData.source} onValueChange={(val) => setFormData({ ...formData, source: val })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="salary">Salary</SelectItem>
                      <SelectItem value="freelance">Freelance</SelectItem>
                      <SelectItem value="dividends">Dividends</SelectItem>
                      <SelectItem value="rental">Rental</SelectItem>
                      <SelectItem value="gift">Gift</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Amount *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">{symbol}</span>
                    <Input type="number" step="0.01" placeholder="50000" value={formData.amount || ''} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} className="rounded-xl pl-8" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input type="date" value={formData.income_date} onChange={(e) => setFormData({ ...formData, income_date: e.target.value })} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input placeholder="Monthly salary from..." value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="rounded-xl" />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Notes</Label>
                  <Input placeholder="Any additional notes..." value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="rounded-xl" />
                </div>
                <div className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formData.is_recurring} onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })} className="w-4 h-4 rounded" />
                  <span className="text-sm font-medium">This is a recurring income</span>
                </label>
              </div>
              {formData.is_recurring && (
                <div className="col-span-2 space-y-2">
                  <Label>Recurrence Period</Label>
                  <Select value={formData.recurrence_period || 'monthly'} onValueChange={(val) => setFormData({ ...formData, recurrence_period: val })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={resetForm} className="flex-1 rounded-xl">Cancel</Button>
                <Button onClick={handleSubmit} className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
                  {editingIncome ? 'Save Changes' : 'Record Income'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Income"
        description="Are you sure you want to delete this income entry? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  )
}
