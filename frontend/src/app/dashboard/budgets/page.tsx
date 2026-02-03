'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, PieChart, TrendingUp, AlertTriangle, Target, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { budgetApi, Budget } from '@/lib/api'
import { useCurrency } from '@/hooks/useCurrency'

interface BudgetWithStats extends Budget {
  spent?: number
  remaining?: number
  percentage_used?: number
  category_name?: string
}

export default function BudgetsPage() {
  const { currency, symbol, format } = useCurrency()
  const [budgets, setBudgets] = useState<BudgetWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<Budget>({
    name: '',
    amount: 0,
    currency: currency,
    period: 'monthly',
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]
  })

  useEffect(() => {
    console.log('🚀 Budgets Page - useEffect called')
    fetchBudgets()
  }, [])

  const fetchBudgets = async () => {
    console.log('📊 Budgets Page - fetchBudgets called')
    try {
      const response = await budgetApi.list()
      console.log('📝 Budgets Page - API response:', response)
      setBudgets(response || [])
    } catch (error: any) {
      console.error('❌ Budgets Page - Error:', error)
      toast.error(error.response?.data?.detail || 'Failed to fetch budgets')
    } finally {
      console.log('✅ Budgets Page - Setting loading to false')
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.amount) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      await budgetApi.create(formData)
      toast.success('Budget added successfully!')
      setShowForm(false)
      setFormData({
        name: '',
        amount: 0,
        currency: 'USD',
        period: 'monthly',
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0]
      })
      fetchBudgets()
    } catch (error: any) {
      console.error('Failed to create budget:', error)
      toast.error(error.response?.data?.detail || 'Failed to add budget')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this budget?')) return
    
    try {
      await budgetApi.delete(id)
      toast.success('Budget deleted successfully!')
      fetchBudgets()
    } catch (error: any) {
      console.error('Failed to delete budget:', error)
      toast.error('Failed to delete budget')
    }
  }

  const totalBudget = budgets.reduce((sum, budget) => sum + budget.amount, 0)
  const totalSpent = budgets.reduce((sum, budget) => sum + (budget.spent || 0), 0)
  const totalRemaining = totalBudget - totalSpent

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600 bg-red-50 border-red-200'
    if (percentage >= 80) return 'text-orange-600 bg-orange-50 border-orange-200'
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-green-600 bg-green-50 border-green-200'
  }

  const getStatusIcon = (percentage: number) => {
    if (percentage >= 80) return <AlertTriangle className="h-4 w-4" />
    if (percentage >= 60) return <TrendingUp className="h-4 w-4" />
    return <Target className="h-4 w-4" />
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-3xl font-bold">Budgets</h1>
          <p className="text-muted-foreground">Set and track your spending limits</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="rounded-xl">
          <Plus className="h-4 w-4 mr-2" />
          Add Budget
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border border-slate-200/60 shadow-xl hover:shadow-2xl transition-all duration-500 bg-gradient-to-br from-white via-slate-50/30 to-blue-50/20 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Total Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{format(totalBudget)}</div>
            <p className="text-xs text-slate-500 mt-1">Across {budgets.length} budgets</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/60 shadow-xl hover:shadow-2xl transition-all duration-500 bg-gradient-to-br from-white via-slate-50/30 to-rose-50/20 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-rose-600">{format(totalSpent)}</div>
            <p className="text-xs text-slate-500 mt-1">{((totalSpent/totalBudget) * 100).toFixed(1)}% used</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/60 shadow-xl hover:shadow-2xl transition-all duration-500 bg-gradient-to-br from-white via-slate-50/30 to-emerald-50/20 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{format(totalRemaining)}</div>
            <p className="text-xs text-slate-500 mt-1">{((totalRemaining/totalBudget) * 100).toFixed(1)}% left</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading budgets...</div>
      ) : budgets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <PieChart className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Budgets</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first budget to start tracking your spending limits
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Budget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => (
            <Card key={budget.id} className={`hover:shadow-2xl transition-all duration-500 border border-slate-200/60 shadow-xl bg-gradient-to-br from-white to-slate-50/50 rounded-2xl ${getStatusColor(budget.percentage_used || 0)}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900">{budget.name}</CardTitle>
                    <CardDescription className="text-slate-500">{budget.category_name}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
                      {getStatusIcon(budget.percentage_used || 0)}
                    </div>
                    <Badge variant="outline" className="rounded-lg">{budget.period}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-slate-700">Spent: {format(budget.spent || 0)}</span>
                    <span className="text-slate-900 font-bold">{budget.percentage_used?.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3 shadow-inner">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500 shadow-lg"
                      style={{ width: `${Math.min(budget.percentage_used || 0, 100)}%` }}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl">
                  <div>
                    <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Budget</Label>
                    <p className="font-bold text-slate-900 text-lg">{format(budget.amount)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Remaining</Label>
                    <p className="font-bold text-emerald-600 text-lg">
                      {format(budget.remaining || 0)}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">
                  <PieChart className="h-3.5 w-3.5 mr-2" />
                  {new Date(budget.start_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} - {new Date(budget.end_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>
                
                {(budget.percentage_used || 0) >= 80 && (
                  <div className="flex items-center gap-2 text-xs text-orange-700 bg-orange-50 p-3 rounded-xl border border-orange-200">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-semibold">{budget.percentage_used && budget.percentage_used >= 90 ? 'Budget nearly exceeded!' : 'Approaching budget limit'}</span>
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-rose-600 hover:text-rose-700 hover:bg-rose-50 mt-2 rounded-xl font-semibold"
                  onClick={() => budget.id && handleDelete(budget.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Budget
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add Budget</CardTitle>
              <CardDescription>
                Create a new budget to track your spending
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="budget-name">Budget Name *</Label>
                <Input 
                  id="budget-name" 
                  placeholder="Monthly Food Budget" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget-amount">Budget Amount *</Label>
                <Input 
                  id="budget-amount" 
                  type="number" 
                  step="0.01" 
                  placeholder="500.00" 
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget-currency">Currency</Label>
                <select 
                  id="budget-currency" 
                  className="w-full p-2 border rounded"
                  value={formData.currency}
                  onChange={(e) => setFormData({...formData, currency: e.target.value})}
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="INR">INR</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget-period">Period</Label>
                <select 
                  id="budget-period" 
                  className="w-full p-2 border rounded"
                  value={formData.period}
                  onChange={(e) => setFormData({...formData, period: e.target.value})}
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget-start">Start Date</Label>
                <Input 
                  id="budget-start" 
                  type="date" 
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget-end">End Date</Label>
                <Input 
                  id="budget-end" 
                  type="date" 
                  value={formData.end_date}
                  onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  className="flex-1"
                  onClick={handleSubmit}
                >
                  Add Budget
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
