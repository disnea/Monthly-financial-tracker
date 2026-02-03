'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Wallet, Calendar, TrendingUp, DollarSign, Trash2, Edit, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { expenseApi, Expense, financeApiClient } from '@/lib/api'
import { useAuthStore } from '@/lib/store'
import { useCurrency } from '@/hooks/useCurrency'

interface ExpenseWithCategory extends Expense {
  category_name?: string
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
  const [formData, setFormData] = useState({
    amount: 0,
    currency: currency,
    description: '',
    transaction_date: new Date().toISOString().split('T')[0],
    payment_method: 'UPI',
    category_id: ''
  })

  const handleBankStatementUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('currency', currency)

    setImportingStatement(true)
    try {
      const response = await financeApiClient.post('/import/bank-statement', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      toast.success(`Successfully imported ${response.data.imported_count} transactions!`)
      fetchExpenses() // Refresh the list
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to import bank statement')
    } finally {
      setImportingStatement(false)
      // Reset the file input
      e.target.value = ''
    }
  }

  // Sample expenses in INR
  const sampleExpenses: ExpenseWithCategory[] = [
    { id: '1', amount: 3250, currency: 'INR', description: 'Grocery Shopping at BigBasket', transaction_date: '2024-01-15', payment_method: 'Credit Card', category_name: 'Food & Dining' },
    { id: '2', amount: 285, currency: 'INR', description: 'Uber Ride to Office', transaction_date: '2024-01-14', payment_method: 'UPI', category_name: 'Transportation' },
    { id: '3', amount: 850, currency: 'INR', description: 'Swiggy Food Order - Dinner', transaction_date: '2024-01-14', payment_method: 'Credit Card', category_name: 'Food & Dining' },
    { id: '4', amount: 2100, currency: 'INR', description: 'Electricity Bill Payment', transaction_date: '2024-01-13', payment_method: 'Net Banking', category_name: 'Utilities' },
    { id: '5', amount: 4500, currency: 'INR', description: 'Amazon Shopping - Electronics', transaction_date: '2024-01-12', payment_method: 'Credit Card', category_name: 'Shopping' },
    { id: '6', amount: 1200, currency: 'INR', description: 'Mobile Recharge - Airtel', transaction_date: '2024-01-11', payment_method: 'UPI', category_name: 'Utilities' },
    { id: '7', amount: 2800, currency: 'INR', description: 'Movie Tickets - PVR', transaction_date: '2024-01-10', payment_method: 'Credit Card', category_name: 'Entertainment' },
    { id: '8', amount: 1500, currency: 'INR', description: 'Medicine Purchase', transaction_date: '2024-01-09', payment_method: 'Cash', category_name: 'Healthcare' },
    { id: '9', amount: 5200, currency: 'INR', description: 'Clothing - Lifestyle Store', transaction_date: '2024-01-08', payment_method: 'Debit Card', category_name: 'Shopping' },
    { id: '10', amount: 450, currency: 'INR', description: 'Ola Auto Ride', transaction_date: '2024-01-07', payment_method: 'UPI', category_name: 'Transportation' },
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
    console.log('📊 Expenses Page - fetchExpenses called')
    try {
      const response = await expenseApi.list()
      console.log('📝 Expenses Page - API response:', response)
      // Only show sample data if API returns empty or fails AND user is not authenticated
      if (response && response.length > 0) {
        setExpenses(response)
      } else if (!isAuthenticated) {
        setExpenses(sampleExpenses)
      } else {
        setExpenses([])
      }
    } catch (error: any) {
      console.error('❌ Expenses Page - Error:', error)
      // Only show sample data if not authenticated
      if (!isAuthenticated) {
        setExpenses(sampleExpenses)
      } else {
        setExpenses([])
      }
    } finally {
      console.log('✅ Expenses Page - Setting loading to false')
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
      console.error('Failed to create expense:', error)
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
      console.error('Failed to delete expense:', error)
      toast.error(error.response?.data?.detail || 'Failed to delete expense')
    }
  }

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)

  // Filter expenses by selected date (compare date strings directly to avoid timezone issues)
  const filteredExpenses = selectedDate
    ? expenses.filter(e => e.transaction_date.split('T')[0] === selectedDate)
    : expenses

  const displayedTotal = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Expenses</h1>
          <p className="text-muted-foreground">Track and manage your daily expenses</p>
        </div>
        <div className="flex gap-2">
          <label htmlFor="statement-upload">
            <Button variant="outline" disabled={importingStatement} className="rounded-xl" asChild>
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
          <Button onClick={() => setShowForm(true)} className="rounded-xl">
            <Plus className="h-4 w-4 mr-2" />
            Add Expense
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading expenses...</div>
      ) : expenses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Expenses</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add your first expense to start tracking your spending
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Compact Calendar Sidebar */}
          <div className="lg:col-span-4">
            <Card className="border border-slate-200/60 shadow-xl bg-gradient-to-br from-white via-slate-50/30 to-indigo-50/20 rounded-2xl sticky top-6">
              <CardHeader className="border-b border-slate-200/50 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 pb-3">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="rounded-lg">
                    ←
                  </Button>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="rounded-lg">
                    →
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {(() => {
                  const year = currentMonth.getFullYear()
                  const month = currentMonth.getMonth()
                  const today = new Date()
                  const firstDay = new Date(year, month, 1).getDay()
                  const daysInMonth = new Date(year, month + 1, 0).getDate()
                  
                  const expensesByDate = expenses.reduce((acc: Record<string, typeof expenses>, expense) => {
                    // Parse date string directly to avoid timezone shifts
                    const [expYear, expMonth, expDay] = expense.transaction_date.split('T')[0].split('-').map(Number)
                    if (expMonth - 1 === month && expYear === year) {
                      if (!acc[expDay]) acc[expDay] = []
                      acc[expDay].push(expense)
                    }
                    return acc
                  }, {})

                  const days = []
                  for (let i = 0; i < firstDay; i++) {
                    days.push(<div key={`empty-${i}`} className="aspect-square" />)
                  }
                  
                  for (let day = 1; day <= daysInMonth; day++) {
                    const dayExpenses = expensesByDate[day] || []
                    const dayTotal = dayExpenses.reduce((sum, e) => sum + e.amount, 0)
                    const dateStr = new Date(year, month, day).toISOString().split('T')[0]
                    const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear()
                    const isSelected = selectedDate === dateStr
                    
                    days.push(
                      <button
                        key={day}
                        onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                        className={`aspect-square p-1 rounded-lg transition-all duration-200 text-xs font-semibold ${
                          isSelected
                            ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md ring-2 ring-indigo-300'
                            : isToday 
                            ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-400' 
                            : dayExpenses.length > 0
                            ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 cursor-pointer'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex flex-col items-center justify-center h-full">
                          <span>{day}</span>
                          {dayExpenses.length > 0 && (
                            <div className="w-1 h-1 rounded-full bg-current mt-0.5" />
                          )}
                        </div>
                      </button>
                    )
                  }

                  return (
                    <>
                      <div className="grid grid-cols-7 gap-1 mb-2">
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                          <div key={i} className="text-center text-[10px] font-bold text-slate-500 py-1">
                            {day}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-1">
                        {days}
                      </div>
                    </>
                  )
                })()}
              </CardContent>
              <CardContent className="pt-0 pb-4 px-4">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-xs text-slate-500 mb-1">
                    {selectedDate ? `Selected: ${new Date(selectedDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}` : 'All Expenses'}
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{format(displayedTotal)}</div>
                  <div className="text-xs text-slate-500 mt-1">{filteredExpenses.length} transactions</div>
                  {selectedDate && (
                    <Button variant="ghost" size="sm" onClick={() => setSelectedDate(null)} className="w-full mt-2 text-xs rounded-lg">
                      Clear Filter
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Expense List */}
          <div className="lg:col-span-8 space-y-4">
            {filteredExpenses.map((expense) => (
            <Card key={expense.id} className="hover:shadow-2xl transition-all duration-500 border border-slate-200/60 shadow-lg bg-gradient-to-r from-white to-slate-50/50 rounded-2xl">
              <CardContent className="p-5">
                <div className="flex justify-between items-start">
                  <div className="space-y-2 flex-1">
                    <h4 className="font-bold text-slate-900 text-lg">{expense.description}</h4>
                    <div className="flex items-center gap-2 text-sm">
                      {expense.category_name && <Badge variant="outline" className="rounded-lg bg-blue-50 text-blue-700 border-blue-200">{expense.category_name}</Badge>}
                      <span className="text-slate-600 bg-slate-100 px-2 py-1 rounded-lg text-xs font-medium">{expense.payment_method}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(expense.transaction_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <div className="text-3xl font-bold text-rose-600">
                      {format(expense.amount)}
                    </div>
                    <div className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-1 rounded-lg">
                      {expense.currency}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => expense.id && handleDelete(expense.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add Expense</CardTitle>
              <CardDescription>
                Record your expense to track spending
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Input 
                  id="description" 
                  placeholder="What did you spend on?" 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input 
                  id="amount" 
                  type="number" 
                  step="0.01" 
                  placeholder="150.50" 
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <select 
                  id="currency" 
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
                <Label htmlFor="payment">Payment Method</Label>
                <Input 
                  id="payment" 
                  placeholder="Credit Card" 
                  value={formData.payment_method}
                  onChange={(e) => setFormData({...formData, payment_method: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input 
                  id="date" 
                  type="date" 
                  value={formData.transaction_date}
                  onChange={(e) => setFormData({...formData, transaction_date: e.target.value})}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  className="flex-1"
                  onClick={handleSubmit}
                >
                  Add Expense
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
