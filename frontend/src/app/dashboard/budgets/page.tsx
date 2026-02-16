'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, PieChart, TrendingUp, AlertTriangle, Target, Trash2, Edit,
  Calendar, DollarSign, TrendingDown, CheckCircle2, Clock, X,
  Utensils, Car, Home, Heart, Film, ShoppingBag, Zap, Search
} from 'lucide-react'
import { toast } from 'sonner'
import { budgetApi, Budget } from '@/lib/api'
import { useCurrency } from '@/hooks/useCurrency'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/error-utils'
import { Progress } from '@/components/ui/progress'
import { ConfirmDialog } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface BudgetWithStats extends Budget {
  spent?: number
  remaining?: number
  percentage_used?: number
  category_name?: string
}

const categoryIcons: Record<string, any> = {
  'Food & Dining': Utensils,
  'Transportation': Car,
  'Shopping': ShoppingBag,
  'Utilities': Home,
  'Healthcare': Heart,
  'Entertainment': Film,
  'Bills': Zap,
  'default': Target
}

const categoryColors: Record<string, string> = {
  'Food & Dining': 'from-orange-500 to-red-500',
  'Transportation': 'from-blue-500 to-cyan-500',
  'Shopping': 'from-purple-500 to-pink-500',
  'Utilities': 'from-green-500 to-emerald-500',
  'Healthcare': 'from-red-500 to-rose-500',
  'Entertainment': 'from-pink-500 to-fuchsia-500',
  'Bills': 'from-yellow-500 to-amber-500',
  'default': 'from-slate-500 to-slate-600'
}

export default function BudgetsPage() {
  const { currency, symbol, format } = useCurrency()
  const [budgets, setBudgets] = useState<BudgetWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingBudget, setEditingBudget] = useState<BudgetWithStats | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [formData, setFormData] = useState<Budget>({
    name: '',
    amount: 0,
    currency: currency,
    period: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchBudgets()
  }, [])

  const fetchBudgets = async () => {
    try {
      const response = await budgetApi.list()
      setBudgets(response || [])
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Failed to fetch budgets')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (budget: BudgetWithStats) => {
    setEditingBudget(budget)
    setFormData({
      name: budget.name,
      amount: budget.amount,
      currency: budget.currency,
      period: budget.period || 'monthly',
      start_date: budget.start_date?.split('T')[0] || new Date().toISOString().split('T')[0],
      end_date: budget.end_date?.split('T')[0] || new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
      category_id: budget.category_id
    })
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.amount) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      if (editingBudget && editingBudget.id) {
        await budgetApi.update(editingBudget.id, formData)
        toast.success('Budget updated successfully!')
      } else {
        await budgetApi.create(formData)
        toast.success('Budget added successfully!')
      }
      setShowForm(false)
      setEditingBudget(null)
      setFormData({
        name: '',
        amount: 0,
        currency: currency,
        period: 'monthly',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]
      })
      fetchBudgets()
    } catch (error: any) {
      toast.error(getErrorMessage(error) || `Failed to ${editingBudget ? 'update' : 'add'} budget`)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await budgetApi.delete(id)
      toast.success('Budget deleted successfully!')
      fetchBudgets()
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Failed to delete budget')
    } finally {
      setDeleteTarget(null)
    }
  }

  const totalBudget = budgets.reduce((sum, budget) => sum + budget.amount, 0)
  const totalSpent = budgets.reduce((sum, budget) => sum + (budget.spent || 0), 0)
  const totalRemaining = totalBudget - totalSpent
  const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0

  const filteredBudgets = budgets.filter(budget =>
    budget.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    budget.category_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const onTrackBudgets = budgets.filter(b => (b.percentage_used || 0) < 80).length
  const nearLimitBudgets = budgets.filter(b => (b.percentage_used || 0) >= 80 && (b.percentage_used || 0) < 100).length
  const exceededBudgets = budgets.filter(b => (b.percentage_used || 0) >= 100).length

  const getStatusColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500'
    if (percentage >= 90) return 'bg-orange-500'
    if (percentage >= 80) return 'bg-yellow-500'
    if (percentage >= 60) return 'bg-blue-500'
    return 'bg-emerald-500'
  }

  const getIcon = (name: string) => {
    const Icon = categoryIcons[name] || categoryIcons.default
    return Icon
  }

  const getGradient = (name: string) => {
    return categoryColors[name] || categoryColors.default
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/20 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* Enhanced Header */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 shadow-sm">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                Budget Tracker
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Plan your spending and stay on track</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search budgets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-xl border-slate-200"
                />
              </div>
              <Button 
                onClick={() => setShowForm(true)} 
                className="rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Budget
              </Button>
            </div>
          </div>

          {/* Overall Progress */}
          <div className="mt-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/50 dark:border-amber-700/30 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Overall Budget Health</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{format(totalSpent)} of {format(totalBudget)} spent</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-amber-600">{overallPercentage.toFixed(1)}%</p>
                <p className="text-xs text-slate-500">Used</p>
              </div>
            </div>
            <Progress value={overallPercentage} className="h-3 mb-4" />
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-3 border border-emerald-200/50 dark:border-emerald-700/30">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">On Track</span>
                </div>
                <p className="text-2xl font-bold text-emerald-600">{onTrackBudgets}</p>
              </div>
              <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-3 border border-yellow-200/50 dark:border-yellow-700/30">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Near Limit</span>
                </div>
                <p className="text-2xl font-bold text-yellow-600">{nearLimitBudgets}</p>
              </div>
              <div className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-3 border border-red-200/50 dark:border-red-700/30">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Exceeded</span>
                </div>
                <p className="text-2xl font-bold text-red-600">{exceededBudgets}</p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-200/50 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Total Budget</p>
              <p className="text-xl font-bold text-blue-600">{format(totalBudget)}</p>
            </div>
            <div className="bg-gradient-to-br from-rose-500/10 to-pink-500/10 border border-rose-200/50 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Total Spent</p>
              <p className="text-xl font-bold text-rose-600">{format(totalSpent)}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-200/50 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Remaining</p>
              <p className="text-xl font-bold text-emerald-600">{format(totalRemaining)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-amber-200 border-t-amber-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">Loading budgets...</p>
            </div>
          </div>
        ) : filteredBudgets.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Card className="max-w-md border-none shadow-2xl">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center mb-6">
                  <Target className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-2">
                  {searchQuery ? 'No budgets found' : 'No Budgets Yet'}
                </h3>
                <p className="text-slate-600 text-center mb-6 max-w-sm">
                  {searchQuery 
                    ? 'Try adjusting your search criteria'
                    : 'Create your first budget to start tracking your spending and reach your financial goals'
                  }
                </p>
                {!searchQuery && (
                  <Button onClick={() => setShowForm(true)} className="rounded-xl bg-gradient-to-r from-amber-600 to-orange-600">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Budget
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredBudgets.map((budget) => {
              const Icon = getIcon(budget.name)
              const gradient = getGradient(budget.name)
              const percentage = budget.percentage_used || 0
              const statusColor = getStatusColor(percentage)
              const isOverBudget = percentage >= 100
              const isNearLimit = percentage >= 80 && percentage < 100

              return (
                <Card 
                  key={budget.id} 
                  className="group border-none shadow-xl hover:shadow-2xl transition-all duration-300 bg-white dark:bg-slate-900 rounded-3xl overflow-hidden"
                >
                  {/* Header with Icon */}
                  <div className={cn("bg-gradient-to-br p-6 text-white relative overflow-hidden", gradient)}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
                    
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <Badge className="bg-white/20 text-white border-white/30 rounded-full capitalize">
                          {budget.period}
                        </Badge>
                      </div>
                      <h3 className="text-xl font-bold mb-1">{budget.name}</h3>
                      <p className="text-white/80 text-sm">{budget.category_name || 'General'}</p>
                    </div>
                  </div>

                  <CardContent className="p-6 space-y-4">
                    {/* Circular Progress or Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Progress</span>
                          <span className="text-lg font-bold text-slate-900 dark:text-white">{percentage.toFixed(1)}%</span>
                        </div>
                        <div className="relative h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className={cn("h-full transition-all duration-500", statusColor)}
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Amount Details */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Budget</p>
                        <p className="text-base font-bold text-slate-900 dark:text-white">{format(budget.amount)}</p>
                      </div>
                      <div className={cn("rounded-xl p-3", isOverBudget ? "bg-red-50 dark:bg-red-950/30" : "bg-emerald-50 dark:bg-emerald-950/30")}>
                        <p className={cn("text-[10px] font-semibold uppercase tracking-wider mb-1", isOverBudget ? "text-red-700 dark:text-red-400" : "text-emerald-700 dark:text-emerald-400")}>
                          {isOverBudget ? 'Over By' : 'Remaining'}
                        </p>
                        <p className={cn("text-base font-bold", isOverBudget ? "text-red-600" : "text-emerald-600")}>
                          {format(Math.abs(budget.remaining || 0))}
                        </p>
                      </div>
                    </div>

                    {/* Spent Amount */}
                    <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/80 rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Spent</span>
                        <span className="text-lg font-bold text-slate-900 dark:text-white">{format(budget.spent || 0)}</span>
                      </div>
                    </div>

                    {/* Date Range + Remaining Days */}
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(budget.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date(budget.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                      {(() => {
                        const daysLeft = Math.max(0, Math.ceil((new Date(budget.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                        return (
                          <span className={cn("font-semibold", daysLeft <= 3 ? "text-red-600" : daysLeft <= 7 ? "text-amber-600" : "text-slate-600")}>
                            {daysLeft === 0 ? 'Ended' : `${daysLeft}d left`}
                          </span>
                        )
                      })()}
                    </div>

                    {/* Warnings */}
                    {isOverBudget && (
                      <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-3 rounded-xl border border-red-200 dark:border-red-800/50">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        <span className="font-semibold">Budget exceeded!</span>
                      </div>
                    )}
                    {isNearLimit && !isOverBudget && (
                      <div className="flex items-center gap-2 text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/30 p-3 rounded-xl border border-yellow-200 dark:border-yellow-800/50">
                        <Clock className="h-4 w-4 flex-shrink-0" />
                        <span className="font-semibold">Approaching limit</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950 rounded-xl font-semibold"
                        onClick={() => handleEdit(budget)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-xl font-semibold"
                        onClick={() => budget.id && setDeleteTarget(budget.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Enhanced Modal */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Budget"
        description="Are you sure you want to delete this budget? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-2xl rounded-3xl border-none shadow-2xl max-h-[90vh] overflow-y-auto dark:bg-slate-900">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-slate-800 dark:to-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                    {editingBudget ? 'Edit Budget' : 'Create New Budget'}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {editingBudget ? 'Update your budget details' : 'Set up a new spending limit to track'}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => {
                  setShowForm(false)
                  setEditingBudget(null)
                }} className="rounded-xl">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Budget Name *</Label>
                  <Input 
                    placeholder="Monthly Groceries, Rent, Entertainment..." 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Budget Amount *</Label>
                  <Input 
                    type="number" 
                    step="0.01" 
                    placeholder="500.00" 
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Period</Label>
                  <Select
                    value={formData.period}
                    onValueChange={(val) => setFormData({...formData, period: val})}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input 
                    type="date" 
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input 
                    type="date" 
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setEditingBudget(null)
                  }}
                  className="flex-1 rounded-xl"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit}
                  className="flex-1 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
                >
                  {editingBudget ? 'Update Budget' : 'Create Budget'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
