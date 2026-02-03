'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Calculator, Calendar, DollarSign, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { emiApi, EMI } from '@/lib/api'
import { useCurrency } from '@/hooks/useCurrency'

export default function EMIPage() {
  const { currency, symbol, format } = useCurrency()
  const [emis, setEmis] = useState<EMI[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState<EMI>({
    loan_type: '',
    lender_name: '',
    principal_amount: 0,
    currency: currency,
    interest_rate: 0,
    tenure_months: 0,
    start_date: new Date().toISOString().split('T')[0]
  })

  // Sample EMI data in INR
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
      start_date: '2023-01-15'
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
      start_date: '2023-06-01'
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
      start_date: '2024-01-10'
    }
  ]

  useEffect(() => {
    console.log('🚀 EMI Page - useEffect called')
    fetchEMIs()
  }, [])

  const fetchEMIs = async () => {
    console.log('📊 EMI Page - fetchEMIs called')
    try {
      const response = await emiApi.list()
      console.log('📝 EMI Page - API response:', response)
      // ALWAYS show real API data
      setEmis(response || [])
    } catch (error: any) {
      console.error('❌ EMI Page - Error:', error)
      toast.error('Failed to fetch EMI loans')
      setEmis([])
    } finally {
      console.log('✅ EMI Page - Setting loading to false')
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.loan_type || !formData.lender_name || !formData.principal_amount || !formData.interest_rate || !formData.tenure_months) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      await emiApi.create(formData)
      toast.success('EMI loan added successfully!')
      setShowForm(false)
      setFormData({
        loan_type: '',
        lender_name: '',
        principal_amount: 0,
        currency: 'USD',
        interest_rate: 0,
        tenure_months: 0,
        start_date: new Date().toISOString().split('T')[0]
      })
      fetchEMIs()
    } catch (error: any) {
      console.error('Failed to create EMI:', error)
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
      console.error('Failed to delete EMI:', error)
      toast.error('Failed to delete EMI loan')
    }
  }

  return (
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className="text-3xl font-bold">EMI Loans</h1>
          <p className="text-muted-foreground">Manage your loan EMIs and track payments</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="rounded-xl">
          <Plus className="h-4 w-4 mr-2" />
          Add EMI Loan
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading EMI loans...</div>
      ) : emis.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No EMI Loans</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add your first EMI loan to start tracking your payments
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add EMI Loan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {emis.map((emi) => (
            <Card key={emi.id} className="hover:shadow-2xl transition-all duration-500 border border-slate-200/60 shadow-xl bg-gradient-to-br from-white via-slate-50/30 to-violet-50/20 rounded-2xl">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900">{emi.loan_type}</CardTitle>
                    <CardDescription className="text-slate-600 font-medium">{emi.lender_name}</CardDescription>
                  </div>
                  <Badge variant="secondary" className="rounded-lg bg-violet-100 text-violet-700 font-semibold">{emi.currency}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl">
                  <div>
                    <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Principal</Label>
                    <p className="font-bold text-slate-900 text-lg">
                      {format(emi.principal_amount)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Interest Rate</Label>
                    <p className="font-semibold">{emi.interest_rate}%</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Monthly EMI</Label>
                    <p className="font-semibold text-green-600">
                      {format(emi.monthly_emi || 0)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Tenure</Label>
                    <p className="font-semibold">{emi.tenure_months} months</p>
                  </div>
                </div>
                
                <div className="pt-2 border-t">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Amount:</span>
                    <span className="font-semibold">
                      {format(emi.total_amount || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Interest:</span>
                    <span className="font-semibold text-orange-600">
                      {format(emi.total_interest || 0)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 mr-1" />
                    Started: {new Date(emi.start_date).toLocaleDateString()}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => emi.id && handleDelete(emi.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add EMI Loan</CardTitle>
              <CardDescription>
                Enter your loan details to calculate EMI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="loan-type">Loan Type *</Label>
                <Input 
                  id="loan-type" 
                  placeholder="Home Loan, Car Loan, etc." 
                  value={formData.loan_type}
                  onChange={(e) => setFormData({...formData, loan_type: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lender">Lender Name *</Label>
                <Input 
                  id="lender" 
                  placeholder="Bank name" 
                  value={formData.lender_name}
                  onChange={(e) => setFormData({...formData, lender_name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="principal">Principal Amount *</Label>
                <Input 
                  id="principal" 
                  type="number" 
                  placeholder="5000000" 
                  value={formData.principal_amount || ''}
                  onChange={(e) => setFormData({...formData, principal_amount: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interest">Interest Rate (%) *</Label>
                <Input 
                  id="interest" 
                  type="number" 
                  step="0.1" 
                  placeholder="8.5" 
                  value={formData.interest_rate || ''}
                  onChange={(e) => setFormData({...formData, interest_rate: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenure">Tenure (months) *</Label>
                <Input 
                  id="tenure" 
                  type="number" 
                  placeholder="240" 
                  value={formData.tenure_months || ''}
                  onChange={(e) => setFormData({...formData, tenure_months: parseInt(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input 
                  id="start-date" 
                  type="date" 
                  value={formData.start_date}
                  onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  className="flex-1"
                  onClick={handleSubmit}
                >
                  Add Loan
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
