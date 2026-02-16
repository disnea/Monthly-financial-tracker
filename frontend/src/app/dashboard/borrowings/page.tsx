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
  Plus, Users2, Search, Calendar, Edit, Trash2, X, CheckCircle2,
  AlertCircle, Clock, Eye, RotateCcw, Lock, CreditCard, ArrowRight
} from 'lucide-react'
import { toast } from 'sonner'
import { borrowingApi, Borrowing, BorrowingRepayment } from '@/lib/api'
import { useCurrency } from '@/hooks/useCurrency'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/error-utils'

export default function BorrowingsPage() {
  const { currency, symbol, format } = useCurrency()
  const [borrowings, setBorrowings] = useState<Borrowing[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingBorrowing, setEditingBorrowing] = useState<Borrowing | null>(null)
  const [selectedBorrowing, setSelectedBorrowing] = useState<(Borrowing & { repayments?: BorrowingRepayment[] }) | null>(null)
  const [showRepaymentForm, setShowRepaymentForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleteRepaymentTarget, setDeleteRepaymentTarget] = useState<{ borrowingId: string; repaymentId: string; amount: number } | null>(null)
  const [editingRepayment, setEditingRepayment] = useState<BorrowingRepayment | null>(null)

  const [formData, setFormData] = useState<Borrowing>({
    lender_name: '',
    lender_contact: '',
    principal_amount: 0,
    currency: currency,
    interest_rate: 0,
    interest_type: 'none',
    borrowed_date: new Date().toISOString().split('T')[0],
    due_date: null,
    purpose: '',
    notes: ''
  })

  const [repaymentData, setRepaymentData] = useState<BorrowingRepayment>({
    amount: 0,
    repayment_date: new Date().toISOString().split('T')[0],
    payment_method: 'UPI',
    reference_number: '',
    note: '',
    close_borrowing: false
  })

  useEffect(() => { fetchBorrowings() }, [])

  const fetchBorrowings = async () => {
    try {
      const data = await borrowingApi.list()
      setBorrowings(data || [])
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Failed to fetch borrowings')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.lender_name || !formData.principal_amount || !formData.borrowed_date) {
      toast.error('Please fill in all required fields')
      return
    }
    try {
      if (editingBorrowing?.id) {
        await borrowingApi.update(editingBorrowing.id, formData)
        toast.success('Borrowing updated')
      } else {
        await borrowingApi.create(formData)
        toast.success(`Borrowing from ${formData.lender_name} added successfully`)
      }
      fetchBorrowings()
      resetForm()
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Failed to save borrowing')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await borrowingApi.delete(deleteTarget)
      toast.success('Borrowing and all repayments deleted')
      fetchBorrowings()
      if (selectedBorrowing?.id === deleteTarget) setSelectedBorrowing(null)
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Failed to delete borrowing')
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleViewDetails = async (b: Borrowing) => {
    try {
      const detail = await borrowingApi.get(b.id!)
      setSelectedBorrowing(detail)
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Failed to load borrowing details')
    }
  }

  const handleRecordRepayment = async () => {
    if (!selectedBorrowing?.id || !repaymentData.amount || !repaymentData.repayment_date) {
      toast.error('Please fill in all required fields')
      return
    }
    try {
      if (editingRepayment?.id) {
        await borrowingApi.updateRepayment(selectedBorrowing.id, editingRepayment.id, repaymentData)
        toast.success('Repayment updated')
      } else {
        await borrowingApi.createRepayment(selectedBorrowing.id, repaymentData)
        toast.success(`Repayment of ${format(repaymentData.amount)} recorded`)
      }
      const detail = await borrowingApi.get(selectedBorrowing.id)
      setSelectedBorrowing(detail)
      setShowRepaymentForm(false)
      setEditingRepayment(null)
      setRepaymentData({ amount: 0, repayment_date: new Date().toISOString().split('T')[0], payment_method: 'UPI', reference_number: '', note: '', close_borrowing: false })
      fetchBorrowings()
    } catch (error: any) {
      toast.error(getErrorMessage(error) || `Failed to ${editingRepayment ? 'update' : 'record'} repayment`)
    }
  }

  const handleEditRepayment = (r: BorrowingRepayment) => {
    setEditingRepayment(r)
    setRepaymentData({
      amount: r.amount,
      repayment_date: r.repayment_date.split('T')[0],
      payment_method: r.payment_method || 'UPI',
      reference_number: r.reference_number || '',
      note: r.note || '',
      close_borrowing: false
    })
    setShowRepaymentForm(true)
  }

  const handleDeleteRepayment = async () => {
    if (!deleteRepaymentTarget) return
    try {
      await borrowingApi.deleteRepayment(deleteRepaymentTarget.borrowingId, deleteRepaymentTarget.repaymentId)
      toast.success('Repayment deleted')
      const detail = await borrowingApi.get(deleteRepaymentTarget.borrowingId)
      setSelectedBorrowing(detail)
      fetchBorrowings()
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Failed to delete repayment')
    } finally {
      setDeleteRepaymentTarget(null)
    }
  }

  const handleClose = async (id: string) => {
    try {
      await borrowingApi.close(id)
      toast.success('Borrowing marked as fully repaid')
      fetchBorrowings()
      if (selectedBorrowing?.id === id) {
        const detail = await borrowingApi.get(id)
        setSelectedBorrowing(detail)
      }
    } catch (error: any) { toast.error(getErrorMessage(error) || 'Failed to close borrowing') }
  }

  const handleReopen = async (id: string) => {
    try {
      await borrowingApi.reopen(id)
      toast.success('Borrowing reopened')
      fetchBorrowings()
      if (selectedBorrowing?.id === id) {
        const detail = await borrowingApi.get(id)
        setSelectedBorrowing(detail)
      }
    } catch (error: any) { toast.error(getErrorMessage(error) || 'Failed to reopen borrowing') }
  }

  const handleEdit = (b: Borrowing) => {
    setEditingBorrowing(b)
    setFormData({
      lender_name: b.lender_name,
      lender_contact: b.lender_contact || '',
      principal_amount: b.principal_amount,
      currency: b.currency,
      interest_rate: b.interest_rate,
      interest_type: b.interest_type,
      borrowed_date: b.borrowed_date,
      due_date: b.due_date || null,
      purpose: b.purpose || '',
      notes: b.notes || ''
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingBorrowing(null)
    setFormData({ lender_name: '', lender_contact: '', principal_amount: 0, currency, interest_rate: 0, interest_type: 'none', borrowed_date: new Date().toISOString().split('T')[0], due_date: null, purpose: '', notes: '' })
  }

  // Filters
  const filtered = borrowings.filter(b => {
    const matchSearch = b.lender_name.toLowerCase().includes(searchQuery.toLowerCase()) || (b.purpose || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchStatus = statusFilter === 'all' || b.status === statusFilter
    return matchSearch && matchStatus
  })

  // Stats
  const totalOwed = borrowings.filter(b => b.status !== 'closed').reduce((s, b) => s + (b.remaining_amount || 0), 0)
  const openCount = borrowings.filter(b => b.status === 'open' || b.status === 'partially_paid').length
  const overdueCount = borrowings.filter(b => b.due_date && new Date(b.due_date) < new Date() && b.status !== 'closed').length
  const totalRepaid = borrowings.reduce((s, b) => s + (b.total_repaid || 0), 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50/20 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 shadow-sm">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">Borrowings</h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Track money borrowed and repayment progress</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Search lender..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 rounded-xl border-slate-200 focus:border-teal-500" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] rounded-xl border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="partially_paid">Partial</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setShowForm(true)} className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-lg">
                <Plus className="h-4 w-4 mr-2" /> New Borrowing
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-gradient-to-br from-rose-500/10 to-pink-500/10 border border-rose-200/50 dark:border-rose-700/50 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Total Owed</p>
              <p className="text-2xl font-bold text-rose-600">{format(totalOwed)}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-200/50 dark:border-blue-700/50 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Open</p>
              <p className="text-2xl font-bold text-blue-600">{openCount} borrowings</p>
            </div>
            <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-200/50 dark:border-red-700/50 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-200/50 dark:border-emerald-700/50 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Repaid</p>
              <p className="text-2xl font-bold text-emerald-600">{format(totalRepaid)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">Loading borrowings...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Card className="max-w-md border-none shadow-2xl">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-full flex items-center justify-center mb-6">
                  <Users2 className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-2">{searchQuery ? 'No borrowings found' : 'No Borrowings Yet'}</h3>
                <p className="text-slate-600 text-center mb-6 max-w-sm">
                  {searchQuery ? 'Try adjusting your search criteria.' : 'Track money borrowed from friends, family, or others. Record repayments and stay on top of obligations.'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setShowForm(true)} className="rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600">
                    <Plus className="h-4 w-4 mr-2" /> Add Borrowing
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((b) => {
              const repaidPercent = b.principal_amount > 0 ? Math.min(((b.total_repaid || 0) / b.principal_amount) * 100, 100) : 0
              const isOverdue = b.due_date && new Date(b.due_date) < new Date() && b.status !== 'closed'
              const isClosed = b.status === 'closed'

              return (
                <Card key={b.id} className={cn(
                  "group border-none shadow-xl hover:shadow-2xl transition-all duration-300 rounded-3xl overflow-hidden cursor-pointer",
                  isOverdue && "ring-2 ring-red-400",
                  isClosed && "opacity-75"
                )} onClick={() => handleViewDetails(b)}>
                  <div className={cn("p-6 text-white relative overflow-hidden", isClosed ? "bg-gradient-to-br from-slate-400 to-slate-500" : "bg-gradient-to-br from-teal-500 to-emerald-600")}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                          <Users2 className="h-5 w-5" />
                        </div>
                        <div className="flex items-center gap-2">
                          {isOverdue && <Badge className="bg-red-500 text-white border-none rounded-full text-xs">OVERDUE</Badge>}
                          <Badge className={cn("border-none rounded-full text-xs capitalize", isClosed ? "bg-slate-600 text-white" : "bg-white/20 text-white")}>
                            {b.status?.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      <h3 className="text-lg font-bold">Borrowed from {b.lender_name}</h3>
                      {b.purpose && <p className="text-white/70 text-sm mt-1">{b.purpose}</p>}
                    </div>
                  </div>

                  <CardContent className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Principal</p>
                        <p className="text-base font-bold text-slate-900 dark:text-white">{format(b.principal_amount)}</p>
                      </div>
                      <div className={cn("rounded-xl p-3", isClosed ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-rose-50 dark:bg-rose-950/30")}>
                        <p className={cn("text-[10px] uppercase tracking-wider mb-1", isClosed ? "text-emerald-600" : "text-rose-600")}>
                          {isClosed ? 'Fully Repaid' : 'Remaining'}
                        </p>
                        <p className={cn("text-base font-bold", isClosed ? "text-emerald-600" : "text-rose-600")}>
                          {format(b.remaining_amount || 0)}
                        </p>
                      </div>
                    </div>

                    {b.interest_rate > 0 && (
                      <p className="text-xs text-slate-500">Interest: {b.interest_rate}% p.a. ({b.interest_type})</p>
                    )}

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">{repaidPercent.toFixed(0)}% repaid</span>
                        <span className="text-slate-500">{format(b.total_repaid || 0)} of {format(b.principal_amount)}</span>
                      </div>
                      <Progress value={repaidPercent} className="h-2" />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{new Date(b.borrowed_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      {b.due_date && (
                        <span className={cn(isOverdue ? "text-red-600 font-semibold" : "")}>
                          Due: {new Date(b.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          {isOverdue && ' ⚠️'}
                        </span>
                      )}
                      {!b.due_date && <span>No deadline set</span>}
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950 rounded-xl text-xs" onClick={() => handleViewDetails(b)}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> Details
                      </Button>
                      <Button variant="ghost" size="sm" className="text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950 rounded-xl text-xs" onClick={() => handleEdit(b)}>
                        <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-xl text-xs" onClick={() => setDeleteTarget(b.id!)}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-2xl rounded-3xl border-none shadow-2xl max-h-[90vh] overflow-y-auto dark:bg-slate-900">
            <CardHeader className="border-b dark:border-slate-700 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-slate-800 dark:to-slate-800">
              <div className="flex items-center justify-between">
                <CardTitle>{editingBorrowing ? 'Edit Borrowing' : 'Add New Borrowing'}</CardTitle>
                <Button variant="ghost" size="icon" onClick={resetForm} className="rounded-xl"><X className="h-5 w-5" /></Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Lender Name *</Label>
                  <Input placeholder="Rahul, Mom, Company..." value={formData.lender_name} onChange={(e) => setFormData({ ...formData, lender_name: e.target.value })} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Contact (optional)</Label>
                  <Input placeholder="+91 98765..." value={formData.lender_contact || ''} onChange={(e) => setFormData({ ...formData, lender_contact: e.target.value })} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Amount Borrowed *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{symbol}</span>
                    <Input type="number" min="0.01" placeholder="50000" value={formData.principal_amount || ''} onChange={(e) => setFormData({ ...formData, principal_amount: parseFloat(e.target.value) || 0 })} className="rounded-xl pl-8" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Date Borrowed *</Label>
                  <Input type="date" value={formData.borrowed_date} onChange={(e) => setFormData({ ...formData, borrowed_date: e.target.value })} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" value={formData.due_date || ''} onChange={(e) => setFormData({ ...formData, due_date: e.target.value || null })} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Interest Rate (% p.a.)</Label>
                  <Input type="number" step="0.1" min="0" placeholder="0" value={formData.interest_rate || ''} onChange={(e) => setFormData({ ...formData, interest_rate: parseFloat(e.target.value) || 0 })} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Interest Type</Label>
                  <Select value={formData.interest_type} onValueChange={(val) => setFormData({ ...formData, interest_type: val })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      <SelectItem value="simple">Simple</SelectItem>
                      <SelectItem value="compound">Compound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Purpose</Label>
                  <Input placeholder="Trip, Renovation, Emergency..." value={formData.purpose || ''} onChange={(e) => setFormData({ ...formData, purpose: e.target.value })} className="rounded-xl" />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Notes</Label>
                  <Input placeholder="Additional notes..." value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="rounded-xl" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={resetForm} className="rounded-xl">Cancel</Button>
                <Button onClick={handleSubmit} className="flex-1 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600">
                  {editingBorrowing ? 'Save Changes' : 'Add Borrowing'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Borrowing Detail Modal */}
      {selectedBorrowing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-3xl rounded-3xl border-none shadow-2xl max-h-[90vh] overflow-y-auto dark:bg-slate-900">
            <CardHeader className="border-b dark:border-slate-700 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-slate-800 dark:to-slate-800 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Borrowing from {selectedBorrowing.lender_name}</CardTitle>
                  <CardDescription className="capitalize">Status: {selectedBorrowing.status?.replace('_', ' ')}</CardDescription>
                </div>
                <div className="flex gap-2">
                  {selectedBorrowing.status !== 'closed' && (
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={() => handleClose(selectedBorrowing.id!)}>
                      <Lock className="h-4 w-4 mr-1" /> Mark Closed
                    </Button>
                  )}
                  {selectedBorrowing.status === 'closed' && (
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={() => handleReopen(selectedBorrowing.id!)}>
                      <RotateCcw className="h-4 w-4 mr-1" /> Reopen
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => setSelectedBorrowing(null)} className="rounded-xl"><X className="h-5 w-5" /></Button>
                </div>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                  <p className="text-xs text-slate-600 dark:text-slate-400">Original</p>
                  <p className="text-lg font-bold dark:text-white">{format(selectedBorrowing.principal_amount)}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                  <p className="text-xs text-slate-600 dark:text-slate-400">Interest</p>
                  <p className="text-lg font-bold text-amber-600">
                    {selectedBorrowing.interest_rate > 0 ? `${selectedBorrowing.interest_rate}% ${selectedBorrowing.interest_type}` : 'None'}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                  <p className="text-xs text-slate-600 dark:text-slate-400">Repaid</p>
                  <p className="text-lg font-bold text-emerald-600">{format(selectedBorrowing.total_repaid || 0)}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                  <p className="text-xs text-slate-600 dark:text-slate-400">Remaining</p>
                  <p className="text-lg font-bold text-rose-600">{format(selectedBorrowing.remaining_amount || 0)}</p>
                </div>
              </div>

              {/* Progress */}
              <div className="mt-3">
                <Progress value={Math.min(((selectedBorrowing.total_repaid || 0) / Math.max(selectedBorrowing.principal_amount, 1)) * 100, 100)} className="h-2" />
                <p className="text-xs text-slate-500 mt-1">
                  {Math.min(((selectedBorrowing.total_repaid || 0) / Math.max(selectedBorrowing.principal_amount, 1)) * 100, 100).toFixed(0)}% repaid
                </p>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Details */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">Borrowed on:</span> <span className="font-medium">{new Date(selectedBorrowing.borrowed_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
                <div><span className="text-slate-500">Due date:</span> <span className="font-medium">{selectedBorrowing.due_date ? new Date(selectedBorrowing.due_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'No deadline set'}</span></div>
                {selectedBorrowing.purpose && <div><span className="text-slate-500">Purpose:</span> <span className="font-medium">{selectedBorrowing.purpose}</span></div>}
                {selectedBorrowing.lender_contact && <div><span className="text-slate-500">Contact:</span> <span className="font-medium">{selectedBorrowing.lender_contact}</span></div>}
              </div>

              {/* Repayment History */}
              <div>
                <h4 className="font-semibold text-lg mb-3">Repayment History</h4>
                {(!selectedBorrowing.repayments || selectedBorrowing.repayments.length === 0) ? (
                  <p className="text-slate-500 text-sm py-4">No repayments recorded yet. Record your first repayment.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedBorrowing.repayments.map((r) => (
                      <div key={r.id} className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          <div>
                            <p className="font-semibold text-emerald-800">{format(r.amount)}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(r.repayment_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                              {r.payment_method && ` · ${r.payment_method}`}
                            </p>
                            {r.note && <p className="text-xs text-slate-400 mt-0.5">&ldquo;{r.note}&rdquo;</p>}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="text-teal-600 hover:bg-teal-50 rounded-xl"
                            onClick={() => handleEditRepayment(r)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-rose-500 hover:bg-rose-50 rounded-xl"
                            onClick={() => setDeleteRepaymentTarget({ borrowingId: selectedBorrowing.id!, repaymentId: r.id!, amount: r.amount })}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Record Repayment */}
              {selectedBorrowing.status !== 'closed' && !showRepaymentForm && (
                <Button onClick={() => setShowRepaymentForm(true)} className="w-full rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600">
                  <Plus className="h-4 w-4 mr-2" /> Record Repayment
                </Button>
              )}

              {showRepaymentForm && (
                <Card className="rounded-2xl border-teal-200 bg-teal-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{editingRepayment ? 'Edit Repayment' : 'Record Repayment'}</CardTitle>
                    <CardDescription>Borrowing from {selectedBorrowing.lender_name} · {format(selectedBorrowing.remaining_amount || 0)} left</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Amount *</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{symbol}</span>
                          <Input type="number" min="0.01" value={repaymentData.amount || ''} onChange={(e) => setRepaymentData({ ...repaymentData, amount: parseFloat(e.target.value) || 0 })} className="rounded-xl pl-8" />
                        </div>
                        {repaymentData.amount > 0 && (
                          <p className="text-xs text-slate-500">Remaining after: {format(Math.max(0, (selectedBorrowing.remaining_amount || 0) - repaymentData.amount))}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Date *</Label>
                        <Input type="date" value={repaymentData.repayment_date} onChange={(e) => setRepaymentData({ ...repaymentData, repayment_date: e.target.value })} className="rounded-xl" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Payment Method</Label>
                        <Select value={repaymentData.payment_method || 'UPI'} onValueChange={(val) => setRepaymentData({ ...repaymentData, payment_method: val })}>
                          <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="UPI">UPI</SelectItem>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                            <SelectItem value="Card">Card</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Reference #</Label>
                        <Input placeholder="TXN123456" value={repaymentData.reference_number || ''} onChange={(e) => setRepaymentData({ ...repaymentData, reference_number: e.target.value })} className="rounded-xl" />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Note</Label>
                        <Input placeholder="Monthly payment..." value={repaymentData.note || ''} onChange={(e) => setRepaymentData({ ...repaymentData, note: e.target.value })} className="rounded-xl" />
                      </div>
                      <div className="col-span-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={repaymentData.close_borrowing} onChange={(e) => setRepaymentData({ ...repaymentData, close_borrowing: e.target.checked })} className="w-4 h-4 rounded" />
                          <span className="text-sm">This completes the borrowing (marks as &ldquo;closed&rdquo;)</span>
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" onClick={() => { setShowRepaymentForm(false); setEditingRepayment(null) }} className="rounded-xl">Cancel</Button>
                      <Button onClick={handleRecordRepayment} className="flex-1 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600">{editingRepayment ? 'Update Repayment' : 'Record Repayment'}</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Borrowing"
        description="Delete this borrowing? This will also delete all repayment records. This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
      <ConfirmDialog
        open={!!deleteRepaymentTarget}
        onOpenChange={(open) => !open && setDeleteRepaymentTarget(null)}
        title="Delete Repayment"
        description={`Delete this repayment of ${deleteRepaymentTarget ? format(deleteRepaymentTarget.amount) : ''}? Your outstanding balance will increase.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteRepayment}
      />
    </div>
  )
}
