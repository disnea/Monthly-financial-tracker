'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Plus, Calculator, Calendar, DollarSign, Trash2, TrendingDown, 
  TrendingUp, Clock, CheckCircle2, AlertCircle, X, PieChart,
  ChevronRight, CreditCard, Building2, Percent, CalendarDays
} from 'lucide-react'
import { toast } from 'sonner'
import { emiApi, EMI } from '@/lib/api'
import { useCurrency } from '@/hooks/useCurrency'
import { cn } from '@/lib/utils'
import { Progress } from '@/components/ui/progress'

export default function EMIPage() {
  const { currency, symbol, format } = useCurrency()
  const [emis, setEmis] = useState<EMI[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showCalculator, setShowCalculator] = useState(false)
  const [selectedEmi, setSelectedEmi] = useState<EMI | null>(null)
  const [formData, setFormData] = useState<EMI>({
    loan_type: '',
    lender_name: '',
    principal_amount: 0,
    currency: currency,
    interest_rate: 0,
    tenure_months: 0,
    start_date: new Date().toISOString().split('T')[0]
  })

  // Calculator state
  const [calcData, setCalcData] = useState({
    principal: 5000000,
    rate: 8.5,
    tenure: 240
  })

  const calculateEMI = (principal: number, rate: number, tenure: number) => {
    const monthlyRate = rate / 12 / 100
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenure)) / (Math.pow(1 + monthlyRate, tenure) - 1)
    const totalAmount = emi * tenure
    const totalInterest = totalAmount - principal
    return { emi, totalAmount, totalInterest }
  }

  const calculatedEMI = calculateEMI(calcData.principal, calcData.rate, calcData.tenure)

  const sampleEMIs: EMI[] = [
    {
      id: '1',
      loan_type: 'Home Loan',
      lender_name: 'HDFC Bank',
      principal_amount: 5000000,
      currency: 'INR',
      interest_rate: 8.5,
      tenure_months: 240,
      monthly_emi: 43391,
      total_amount: 10413840,
      total_interest: 5413840,
      start_date: '2023-01-15',
      paid_months: 18
    },
    {
      id: '2',
      loan_type: 'Car Loan',
      lender_name: 'ICICI Bank',
      principal_amount: 800000,
      currency: 'INR',
      interest_rate: 9.25,
      tenure_months: 60,
      monthly_emi: 16584,
      total_amount: 995040,
      total_interest: 195040,
      start_date: '2023-06-01',
      paid_months: 12
    },
    {
      id: '3',
      loan_type: 'Personal Loan',
      lender_name: 'SBI',
      principal_amount: 300000,
      currency: 'INR',
      interest_rate: 10.5,
      tenure_months: 36,
      monthly_emi: 9747,
      total_amount: 350892,
      total_interest: 50892,
      start_date: '2024-01-10',
      paid_months: 2
    }
  ]

  useEffect(() => {
    fetchEMIs()
  }, [])

  const fetchEMIs = async () => {
    try {
      const response = await emiApi.list()
      setEmis(response || [])
    } catch (error: any) {
      toast.error('Failed to fetch EMI loans')
      setEmis([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.loan_type || !formData.lender_name || !formData.principal_amount || !formData.interest_rate || !formData.tenure_months) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      const calculated = calculateEMI(formData.principal_amount, formData.interest_rate, formData.tenure_months)
      const dataToSubmit = {
        ...formData,
        monthly_emi: calculated.emi,
        total_amount: calculated.totalAmount,
        total_interest: calculated.totalInterest
      }
      
      await emiApi.create(dataToSubmit)
      toast.success('EMI loan added successfully!')
      setShowForm(false)
      setFormData({
        loan_type: '',
        lender_name: '',
        principal_amount: 0,
        currency: currency,
        interest_rate: 0,
        tenure_months: 0,
        start_date: new Date().toISOString().split('T')[0]
      })
      fetchEMIs()
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to add EMI loan')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this EMI loan?')) return
    
    try {
      await emiApi.delete(id)
      toast.success('EMI loan deleted successfully!')
      fetchEMIs()
    } catch (error: any) {
      toast.error('Failed to delete EMI loan')
    }
  }

  const totalPrincipal = emis.reduce((sum, emi) => sum + emi.principal_amount, 0)
  const totalMonthlyEMI = emis.reduce((sum, emi) => sum + (emi.monthly_emi || 0), 0)
  const totalInterest = emis.reduce((sum, emi) => sum + (emi.total_interest || 0), 0)

  const getLoanIcon = (type: string) => {
    if (type.toLowerCase().includes('home')) return Building2
    if (type.toLowerCase().includes('car') || type.toLowerCase().includes('vehicle')) return CreditCard
    return DollarSign
  }

  const getProgressPercentage = (emi: EMI) => {
    if (!emi.paid_months) return 0
    return (emi.paid_months / emi.tenure_months) * 100
  }

  const getRemainingMonths = (emi: EMI) => {
    return emi.tenure_months - (emi.paid_months || 0)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-purple-50/20">
      {/* Enhanced Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                EMI Loans
              </h1>
              <p className="text-slate-600 text-sm mt-1">Manage loans and track your payment schedule</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={() => setShowCalculator(true)}
                variant="outline"
                className="rounded-xl border-violet-200 hover:bg-violet-50"
              >
                <Calculator className="h-4 w-4 mr-2" />
                EMI Calculator
              </Button>
              <Button 
                onClick={() => setShowForm(true)} 
                className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-lg"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Loan
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-200/50 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-600 mb-1">Total Principal</p>
              <p className="text-2xl font-bold text-violet-600">{format(totalPrincipal)}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-200/50 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-600 mb-1">Monthly EMI</p>
              <p className="text-2xl font-bold text-blue-600">{format(totalMonthlyEMI)}</p>
            </div>
            <div className="bg-gradient-to-br from-rose-500/10 to-pink-500/10 border border-rose-200/50 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-600 mb-1">Total Interest</p>
              <p className="text-2xl font-bold text-rose-600">{format(totalInterest)}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-200/50 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-600 mb-1">Active Loans</p>
              <p className="text-2xl font-bold text-emerald-600">{emis.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">Loading EMI loans...</p>
            </div>
          </div>
        ) : emis.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Card className="max-w-md border-none shadow-2xl">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center mb-6">
                  <Calculator className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-2">No EMI Loans Yet</h3>
                <p className="text-slate-600 text-center mb-6 max-w-sm">
                  Add your loans to track EMI payments and monitor your financial obligations
                </p>
                <div className="flex gap-3">
                  <Button onClick={() => setShowCalculator(true)} variant="outline" className="rounded-xl">
                    <Calculator className="h-4 w-4 mr-2" />
                    Calculate EMI
                  </Button>
                  <Button onClick={() => setShowForm(true)} className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Loan
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {emis.map((emi) => {
              const Icon = getLoanIcon(emi.loan_type)
              const progress = getProgressPercentage(emi)
              const remaining = getRemainingMonths(emi)
              const paidAmount = (emi.paid_months || 0) * (emi.monthly_emi || 0)
              const remainingAmount = (emi.total_amount || 0) - paidAmount

              return (
                <Card 
                  key={emi.id} 
                  className="group border-none shadow-xl hover:shadow-2xl transition-all duration-300 bg-white rounded-3xl overflow-hidden hover:scale-[1.02]"
                >
                  {/* Header with Icon */}
                  <div className="bg-gradient-to-br from-violet-500 to-purple-600 p-6 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
                    
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <Badge className="bg-white/20 text-white border-white/30 rounded-full">
                          {emi.currency}
                        </Badge>
                      </div>
                      <h3 className="text-xl font-bold mb-1">{emi.loan_type}</h3>
                      <p className="text-white/80 text-sm">{emi.lender_name}</p>
                    </div>
                  </div>

                  <CardContent className="p-6 space-y-4">
                    {/* Progress Bar */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-600">Payment Progress</span>
                        <span className="text-xs font-bold text-violet-600">{progress.toFixed(1)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-slate-500">{emi.paid_months || 0} / {emi.tenure_months} months</span>
                        <span className="text-xs text-slate-500">{remaining} remaining</span>
                      </div>
                    </div>

                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1">Principal</p>
                        <p className="text-base font-bold text-slate-900">{format(emi.principal_amount)}</p>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-3">
                        <p className="text-[10px] text-emerald-700 font-semibold uppercase tracking-wider mb-1">Monthly EMI</p>
                        <p className="text-base font-bold text-emerald-600">{format(emi.monthly_emi || 0)}</p>
                      </div>
                    </div>

                    {/* Financial Details */}
                    <div className="pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500 flex items-center gap-1">
                          <Percent className="h-3 w-3" />
                          Interest Rate
                        </span>
                        <span className="font-semibold text-slate-900">{emi.interest_rate}% p.a.</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Total Interest</span>
                        <span className="font-semibold text-rose-600">{format(emi.total_interest || 0)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Remaining Amount</span>
                        <span className="font-semibold text-blue-600">{format(remainingAmount)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <button
                        onClick={() => setSelectedEmi(emi)}
                        className="text-xs font-medium text-violet-600 hover:text-violet-700 flex items-center gap-1"
                      >
                        View Schedule
                        <ChevronRight className="h-3 w-3" />
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                        onClick={() => emi.id && handleDelete(emi.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Start Date */}
                    <div className="flex items-center gap-2 text-xs text-slate-400 pt-2">
                      <CalendarDays className="h-3 w-3" />
                      Started: {new Date(emi.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Add EMI Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-2xl rounded-3xl border-none shadow-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-violet-50 to-purple-50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                    Add EMI Loan
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Enter your loan details to calculate and track EMI
                  </CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowForm(false)} className="rounded-xl">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label>Loan Type *</Label>
                  <Input 
                    placeholder="Home Loan, Car Loan, Personal Loan..." 
                    value={formData.loan_type}
                    onChange={(e) => setFormData({...formData, loan_type: e.target.value})}
                    className="rounded-xl"
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Lender Name *</Label>
                  <Input 
                    placeholder="Bank or Financial Institution" 
                    value={formData.lender_name}
                    onChange={(e) => setFormData({...formData, lender_name: e.target.value})}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Principal Amount *</Label>
                  <Input 
                    type="number" 
                    placeholder="5000000" 
                    value={formData.principal_amount || ''}
                    onChange={(e) => setFormData({...formData, principal_amount: parseFloat(e.target.value) || 0})}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Interest Rate (% p.a.) *</Label>
                  <Input 
                    type="number" 
                    step="0.1" 
                    placeholder="8.5" 
                    value={formData.interest_rate || ''}
                    onChange={(e) => setFormData({...formData, interest_rate: parseFloat(e.target.value) || 0})}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tenure (months) *</Label>
                  <Input 
                    type="number" 
                    placeholder="240" 
                    value={formData.tenure_months || ''}
                    onChange={(e) => setFormData({...formData, tenure_months: parseInt(e.target.value) || 0})}
                    className="rounded-xl"
                  />
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
              </div>

              {/* Preview Calculation */}
              {formData.principal_amount > 0 && formData.interest_rate > 0 && formData.tenure_months > 0 && (
                <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl p-4 border border-violet-200">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Calculated EMI Details:</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-slate-600">Monthly EMI</p>
                      <p className="text-lg font-bold text-violet-600">
                        {format(calculateEMI(formData.principal_amount, formData.interest_rate, formData.tenure_months).emi)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">Total Interest</p>
                      <p className="text-lg font-bold text-rose-600">
                        {format(calculateEMI(formData.principal_amount, formData.interest_rate, formData.tenure_months).totalInterest)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">Total Amount</p>
                      <p className="text-lg font-bold text-blue-600">
                        {format(calculateEMI(formData.principal_amount, formData.interest_rate, formData.tenure_months).totalAmount)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

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
                  className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                >
                  Add Loan
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* EMI Calculator Modal */}
      {showCalculator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-3xl rounded-3xl border-none shadow-2xl">
            <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-violet-50 to-purple-50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent">
                    EMI Calculator
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Calculate your monthly EMI and plan your loan
                  </CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowCalculator(false)} className="rounded-xl">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Input Section */}
                <div className="space-y-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Principal Amount ({symbol})</Label>
                    <Input
                      type="number"
                      value={calcData.principal}
                      onChange={(e) => setCalcData({...calcData, principal: parseFloat(e.target.value) || 0})}
                      className="rounded-xl text-lg font-semibold"
                    />
                    <input
                      type="range"
                      min="100000"
                      max="50000000"
                      step="100000"
                      value={calcData.principal}
                      onChange={(e) => setCalcData({...calcData, principal: parseFloat(e.target.value)})}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Interest Rate (% per annum)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={calcData.rate}
                      onChange={(e) => setCalcData({...calcData, rate: parseFloat(e.target.value) || 0})}
                      className="rounded-xl text-lg font-semibold"
                    />
                    <input
                      type="range"
                      min="1"
                      max="20"
                      step="0.1"
                      value={calcData.rate}
                      onChange={(e) => setCalcData({...calcData, rate: parseFloat(e.target.value)})}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Loan Tenure (months)</Label>
                    <Input
                      type="number"
                      value={calcData.tenure}
                      onChange={(e) => setCalcData({...calcData, tenure: parseInt(e.target.value) || 0})}
                      className="rounded-xl text-lg font-semibold"
                    />
                    <input
                      type="range"
                      min="6"
                      max="360"
                      step="6"
                      value={calcData.tenure}
                      onChange={(e) => setCalcData({...calcData, tenure: parseInt(e.target.value)})}
                      className="w-full"
                    />
                    <p className="text-xs text-slate-500 text-center">
                      {Math.floor(calcData.tenure / 12)} years {calcData.tenure % 12} months
                    </p>
                  </div>
                </div>

                {/* Results Section */}
                <div className="space-y-4">
                  <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-6 text-white">
                    <p className="text-sm opacity-90 mb-2">Monthly EMI</p>
                    <p className="text-4xl font-bold mb-4">{format(calculatedEMI.emi)}</p>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/20">
                      <div>
                        <p className="text-xs opacity-80">Principal</p>
                        <p className="text-lg font-semibold">{format(calcData.principal)}</p>
                      </div>
                      <div>
                        <p className="text-xs opacity-80">Interest</p>
                        <p className="text-lg font-semibold">{format(calculatedEMI.totalInterest)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Total Payment</span>
                      <span className="text-lg font-bold text-slate-900">{format(calculatedEMI.totalAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Total Interest</span>
                      <span className="text-lg font-bold text-rose-600">{format(calculatedEMI.totalInterest)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Interest %</span>
                      <span className="text-lg font-bold text-violet-600">
                        {((calculatedEMI.totalInterest / calcData.principal) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      setFormData({
                        ...formData,
                        principal_amount: calcData.principal,
                        interest_rate: calcData.rate,
                        tenure_months: calcData.tenure
                      })
                      setShowCalculator(false)
                      setShowForm(true)
                    }}
                    className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                  >
                    Use These Values
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
