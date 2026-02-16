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
  AlertCircle, Clock, Eye, RotateCcw, Lock, Wallet, ArrowRight, Percent
} from 'lucide-react'
import { toast } from 'sonner'
import { lendingApi, Lending, LendingCollection } from '@/lib/api'
import { useCurrency } from '@/hooks/useCurrency'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/error-utils'

export default function LendingsPage() {
  const { currency, symbol, format } = useCurrency()
  const [lendings, setLendings] = useState<Lending[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingLending, setEditingLending] = useState<Lending | null>(null)
  const [selectedLending, setSelectedLending] = useState<(Lending & { collections?: LendingCollection[] }) | null>(null)
  const [showCollectionForm, setShowCollectionForm] = useState(false)
  const [editingCollection, setEditingCollection] = useState<LendingCollection | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleteCollectionTarget, setDeleteCollectionTarget] = useState<{ lendingId: string; collectionId: string; amount: number } | null>(null)

  const [formData, setFormData] = useState<Lending>({
    borrower_name: '',
    borrower_contact: '',
    principal_amount: 0,
    currency: currency,
    interest_rate: 0,
    interest_type: 'none',
    lent_date: new Date().toISOString().split('T')[0],
    due_date: '',
    purpose: '',
    notes: ''
  })

  const [collectionData, setCollectionData] = useState<LendingCollection>({
    amount: 0,
    collection_date: new Date().toISOString().split('T')[0],
    payment_method: 'UPI',
    reference_number: '',
    note: '',
    close_lending: false
  })

  useEffect(() => { fetchLendings() }, [])

  const fetchLendings = async () => {
    try {
      const data = await lendingApi.list()
      setLendings(data || [])
    } catch (error: any) {
      setLendings([])
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.borrower_name || !formData.principal_amount || !formData.lent_date) {
      toast.error('Please fill in all required fields')
      return
    }
    try {
      if (editingLending?.id) {
        await lendingApi.update(editingLending.id, formData)
        toast.success('Lending updated')
      } else {
        console.log('Creating lending with data:', formData)
        await lendingApi.create(formData)
        toast.success(`Lending to ${formData.borrower_name} added successfully`)
      }
      fetchLendings()
      resetForm()
    } catch (error: any) {
      toast.error(getErrorMessage(error) || 'Failed to save lending')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await lendingApi.delete(deleteTarget)
      toast.success('Lending and all collections deleted')
      fetchLendings()
      if (selectedLending?.id === deleteTarget) setSelectedLending(null)
    } catch (error: any) {
      toast.error('Failed to delete lending')
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleViewDetails = async (l: Lending) => {
    try {
      const detail = await lendingApi.get(l.id!)
      setSelectedLending(detail)
    } catch {
      toast.error('Failed to load lending details')
    }
  }

  const handleRecordCollection = async () => {
    if (!selectedLending?.id || !collectionData.amount || !collectionData.collection_date) {
      toast.error('Please fill in all required fields')
      return
    }
    try {
      if (editingCollection?.id) {
        await lendingApi.updateCollection(selectedLending.id, editingCollection.id, collectionData)
        toast.success('Collection updated')
      } else {
        await lendingApi.createCollection(selectedLending.id, collectionData)
        toast.success(`Collection of ${format(collectionData.amount)} recorded`)
      }
      const detail = await lendingApi.get(selectedLending.id)
      setSelectedLending(detail)
      setShowCollectionForm(false)
      setEditingCollection(null)
      setCollectionData({ amount: 0, collection_date: new Date().toISOString().split('T')[0], payment_method: 'UPI', reference_number: '', note: '', close_lending: false })
      fetchLendings()
    } catch (error: any) {
      toast.error(getErrorMessage(error) || `Failed to ${editingCollection ? 'update' : 'record'} collection`)
    }
  }

  const handleEditCollection = (c: LendingCollection) => {
    setEditingCollection(c)
    setCollectionData({
      amount: c.amount,
      collection_date: c.collection_date.split('T')[0],
      payment_method: c.payment_method || 'UPI',
      reference_number: c.reference_number || '',
      note: c.note || '',
      close_lending: false
    })
    setShowCollectionForm(true)
  }

  const handleDeleteCollection = async () => {
    if (!deleteCollectionTarget) return
    try {
      await lendingApi.deleteCollection(deleteCollectionTarget.lendingId, deleteCollectionTarget.collectionId)
      toast.success('Collection deleted')
      const detail = await lendingApi.get(deleteCollectionTarget.lendingId)
      setSelectedLending(detail)
      fetchLendings()
    } catch {
      toast.error('Failed to delete collection')
    } finally {
      setDeleteCollectionTarget(null)
    }
  }

  const handleClose = async (id: string) => {
    try {
      await lendingApi.close(id)
      toast.success('Lending marked as fully collected')
      fetchLendings()
      if (selectedLending?.id === id) {
        const detail = await lendingApi.get(id)
        setSelectedLending(detail)
      }
    } catch { toast.error('Failed to close lending') }
  }

  const handleReopen = async (id: string) => {
    try {
      await lendingApi.reopen(id)
      toast.success('Lending reopened')
      fetchLendings()
      if (selectedLending?.id === id) {
        const detail = await lendingApi.get(id)
        setSelectedLending(detail)
      }
    } catch { toast.error('Failed to reopen lending') }
  }

  const handleEdit = (l: Lending) => {
    setEditingLending(l)
    setFormData({
      borrower_name: l.borrower_name,
      borrower_contact: l.borrower_contact || '',
      principal_amount: l.principal_amount,
      currency: l.currency,
      interest_rate: l.interest_rate,
      interest_type: l.interest_type,
      lent_date: l.lent_date,
      due_date: l.due_date || '',
      purpose: l.purpose || '',
      notes: l.notes || ''
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingLending(null)
    setFormData({ borrower_name: '', borrower_contact: '', principal_amount: 0, currency, interest_rate: 0, interest_type: 'none', lent_date: new Date().toISOString().split('T')[0], due_date: '', purpose: '', notes: '' })
  }

  // Filters
  const filtered = lendings.filter(l => {
    const matchSearch = l.borrower_name.toLowerCase().includes(searchQuery.toLowerCase()) || (l.purpose || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchStatus = statusFilter === 'all' || l.status === statusFilter
    return matchSearch && matchStatus
  })

  // Stats
  const totalLent = lendings.filter(l => l.status !== 'closed').reduce((s, l) => s + (l.remaining_amount || 0), 0)
  const openCount = lendings.filter(l => l.status === 'open' || l.status === 'partially_received').length
  const overdueCount = lendings.filter(l => l.due_date && new Date(l.due_date) < new Date() && l.status !== 'closed').length
  const totalCollected = lendings.reduce((s, l) => s + (l.total_received || 0), 0)

  const getStatusBadge = (status: string, dueDate?: string | null) => {
    const isOverdue = dueDate && new Date(dueDate) < new Date() && status !== 'closed'
    if (isOverdue) return <Badge className="bg-red-100 text-red-700 rounded-lg">Overdue</Badge>
    if (status === 'closed') return <Badge className="bg-emerald-100 text-emerald-700 rounded-lg">Collected</Badge>
    if (status === 'partially_received') return <Badge className="bg-amber-100 text-amber-700 rounded-lg">Partial</Badge>
    return <Badge className="bg-indigo-100 text-indigo-700 rounded-lg">Open</Badge>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/20 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 shadow-sm">
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Lendings</h1>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Track money lent and collection progress</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="Search borrower..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 rounded-xl border-slate-200 focus:border-indigo-500" />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] rounded-xl border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="partially_received">Partial</SelectItem>
                  <SelectItem value="closed">Collected</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setShowForm(true)} className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-lg">
                <Plus className="h-4 w-4 mr-2" /> New Lending
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-200/50 dark:border-indigo-700/50 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Outstanding</p>
              <p className="text-2xl font-bold text-indigo-600">{format(totalLent)}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-200/50 dark:border-blue-700/50 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Open</p>
              <p className="text-2xl font-bold text-blue-600">{openCount} lendings</p>
            </div>
            <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-200/50 dark:border-red-700/50 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-200/50 dark:border-emerald-700/50 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Collected</p>
              <p className="text-2xl font-bold text-emerald-600">{format(totalCollected)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600">Loading lendings...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Card className="max-w-md border-none shadow-2xl">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-full flex items-center justify-center mb-6">
                  <Wallet className="h-10 w-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-2">No Lendings Yet</h3>
                <p className="text-slate-600 text-center mb-6 max-w-sm">
                  Track money you&apos;ve lent to others and keep tabs on collections.
                </p>
                <Button onClick={() => setShowForm(true)} className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600">
                  <Plus className="h-4 w-4 mr-2" /> Record First Lending
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((lending) => {
              const progress = lending.principal_amount > 0 ? Math.min(((lending.total_received || 0) / lending.principal_amount) * 100, 100) : 0
              const isOverdue = lending.due_date && new Date(lending.due_date) < new Date() && lending.status !== 'closed'
              const isClosed = lending.status === 'closed'
              return (
                <Card key={lending.id} className={cn(
                  "group border-none shadow-xl hover:shadow-2xl transition-all duration-300 rounded-3xl overflow-hidden cursor-pointer",
                  isOverdue && "ring-2 ring-red-400",
                  isClosed && "opacity-75"
                )} onClick={() => handleViewDetails(lending)}>
                  <div className={cn("p-6 text-white relative overflow-hidden", isClosed ? "bg-gradient-to-br from-slate-400 to-slate-500" : "bg-gradient-to-br from-indigo-500 to-violet-600")}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                          <Wallet className="h-5 w-5" />
                        </div>
                        <div className="flex items-center gap-2">
                          {isOverdue && <Badge className="bg-red-500 text-white border-none rounded-full text-xs">OVERDUE</Badge>}
                          {getStatusBadge(lending.status || 'open', lending.due_date)}
                        </div>
                      </div>
                      <h3 className="text-lg font-bold">{lending.borrower_name}</h3>
                      {lending.purpose && <p className="text-white/70 text-sm mt-1">{lending.purpose}</p>}
                    </div>
                  </div>

                  <CardContent className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3">
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Lent</p>
                        <p className="text-base font-bold text-slate-900 dark:text-white">{format(lending.principal_amount)}</p>
                      </div>
                      <div className={cn("rounded-xl p-3", isClosed ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-indigo-50 dark:bg-indigo-950/30")}>
                        <p className={cn("text-[10px] uppercase tracking-wider mb-1", isClosed ? "text-emerald-600" : "text-indigo-600")}>
                          {isClosed ? 'Collected' : 'Remaining'}
                        </p>
                        <p className={cn("text-base font-bold", isClosed ? "text-emerald-600" : "text-indigo-600")}>
                          {format(lending.remaining_amount || 0)}
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-slate-500">{progress.toFixed(0)}% collected</span>
                        <span className="text-slate-500">{format(lending.total_received || 0)} received</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{new Date(lending.lent_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      {lending.due_date && (
                        <span className={cn(isOverdue ? "text-red-600 font-semibold" : "")}>
                          Due: {new Date(lending.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                      {!lending.due_date && <span>No deadline set</span>}
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-xl text-xs" onClick={() => handleViewDetails(lending)}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> Details
                      </Button>
                      <Button variant="ghost" size="sm" className="text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950 rounded-xl text-xs" onClick={() => handleEdit(lending)}>
                        <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-xl text-xs" onClick={() => lending.id && setDeleteTarget(lending.id)}>
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

      {/* Add/Edit Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-2xl rounded-3xl border-none shadow-2xl max-h-[90vh] overflow-y-auto dark:bg-slate-900">
            <CardHeader className="border-b dark:border-slate-700 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-slate-800 dark:to-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                    {editingLending ? 'Edit Lending' : 'New Lending'}
                  </CardTitle>
                  <CardDescription>{editingLending ? 'Update lending details' : 'Record money lent to someone'}</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={resetForm} className="rounded-xl"><X className="h-5 w-5" /></Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Borrower Name *</Label>
                  <Input placeholder="John Doe" value={formData.borrower_name} onChange={(e) => setFormData({ ...formData, borrower_name: e.target.value })} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Contact</Label>
                  <Input placeholder="+91 9876543210" value={formData.borrower_contact || ''} onChange={(e) => setFormData({ ...formData, borrower_contact: e.target.value })} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Amount *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{symbol}</span>
                    <Input type="number" min="0" value={formData.principal_amount || ''} onChange={(e) => setFormData({ ...formData, principal_amount: parseFloat(e.target.value) || 0 })} className="rounded-xl pl-8" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Lent Date *</Label>
                  <Input type="date" value={formData.lent_date} onChange={(e) => setFormData({ ...formData, lent_date: e.target.value })} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" value={formData.due_date || ''} onChange={(e) => setFormData({ ...formData, due_date: e.target.value })} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Interest Rate (%)</Label>
                  <Input type="number" min="0" step="0.5" value={formData.interest_rate || ''} onChange={(e) => setFormData({ ...formData, interest_rate: parseFloat(e.target.value) || 0 })} className="rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Label>Interest Type</Label>
                  <Select value={formData.interest_type} onValueChange={(val) => setFormData({ ...formData, interest_type: val })}>
                    <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Interest</SelectItem>
                      <SelectItem value="simple">Simple</SelectItem>
                      <SelectItem value="compound">Compound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Purpose</Label>
                  <Input placeholder="Medical emergency..." value={formData.purpose || ''} onChange={(e) => setFormData({ ...formData, purpose: e.target.value })} className="rounded-xl" />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Notes</Label>
                  <Input placeholder="Additional details..." value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="rounded-xl" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={resetForm} className="flex-1 rounded-xl">Cancel</Button>
                <Button onClick={handleSubmit} className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700">
                  {editingLending ? 'Save Changes' : 'Record Lending'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lending Detail Modal */}
      {selectedLending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-3xl rounded-3xl border-none shadow-2xl max-h-[90vh] overflow-y-auto dark:bg-slate-900">
            <CardHeader className="border-b dark:border-slate-700 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-slate-800 dark:to-slate-800 sticky top-0 z-10">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl">Lending to {selectedLending.borrower_name}</CardTitle>
                  <CardDescription className="capitalize">Status: {selectedLending.status?.replace('_', ' ')}</CardDescription>
                </div>
                <div className="flex gap-2">
                  {selectedLending.status !== 'closed' && (
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={() => handleClose(selectedLending.id!)}>
                      <Lock className="h-4 w-4 mr-1" /> Mark Collected
                    </Button>
                  )}
                  {selectedLending.status === 'closed' && (
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={() => handleReopen(selectedLending.id!)}>
                      <RotateCcw className="h-4 w-4 mr-1" /> Reopen
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => setSelectedLending(null)} className="rounded-xl"><X className="h-5 w-5" /></Button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                  <p className="text-xs text-slate-600 dark:text-slate-400">Original</p>
                  <p className="text-lg font-bold dark:text-white">{format(selectedLending.principal_amount)}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                  <p className="text-xs text-slate-600 dark:text-slate-400">Interest</p>
                  <p className="text-lg font-bold text-amber-600">
                    {selectedLending.interest_rate > 0 ? `${selectedLending.interest_rate}% ${selectedLending.interest_type}` : 'None'}
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                  <p className="text-xs text-slate-600 dark:text-slate-400">Collected</p>
                  <p className="text-lg font-bold text-emerald-600">{format(selectedLending.total_received || 0)}</p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                  <p className="text-xs text-slate-600 dark:text-slate-400">Remaining</p>
                  <p className="text-lg font-bold text-rose-600">{format(selectedLending.remaining_amount || 0)}</p>
                </div>
              </div>

              <div className="mt-3">
                <Progress value={Math.min(((selectedLending.total_received || 0) / Math.max(selectedLending.principal_amount, 1)) * 100, 100)} className="h-2" />
                <p className="text-xs text-slate-500 mt-1">
                  {Math.min(((selectedLending.total_received || 0) / Math.max(selectedLending.principal_amount, 1)) * 100, 100).toFixed(0)}% collected
                </p>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">Lent on:</span> <span className="font-medium">{new Date(selectedLending.lent_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
                <div><span className="text-slate-500">Due date:</span> <span className="font-medium">{selectedLending.due_date ? new Date(selectedLending.due_date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : 'No deadline set'}</span></div>
                {selectedLending.purpose && <div><span className="text-slate-500">Purpose:</span> <span className="font-medium">{selectedLending.purpose}</span></div>}
                {selectedLending.borrower_contact && <div><span className="text-slate-500">Contact:</span> <span className="font-medium">{selectedLending.borrower_contact}</span></div>}
              </div>

              {/* Collection History */}
              <div>
                <h4 className="font-semibold text-lg mb-3">Collection History</h4>
                {(!selectedLending.collections || selectedLending.collections.length === 0) ? (
                  <p className="text-slate-500 text-sm py-4">No collections recorded yet. Record your first collection.</p>
                ) : (
                  <div className="space-y-3">
                    {selectedLending.collections.map((c) => (
                      <div key={c.id} className="flex items-center justify-between p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                        <div className="flex items-center gap-3">
                          <CheckCircle2 className="h-5 w-5 text-indigo-600" />
                          <div>
                            <p className="font-semibold text-indigo-800">{format(c.amount)}</p>
                            <p className="text-xs text-slate-500">
                              {new Date(c.collection_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                              {c.payment_method && ` · ${c.payment_method}`}
                            </p>
                            {c.note && <p className="text-xs text-slate-400 mt-0.5">&ldquo;{c.note}&rdquo;</p>}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 rounded-xl" onClick={() => handleEditCollection(c)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 rounded-xl"
                            onClick={() => setDeleteCollectionTarget({ lendingId: selectedLending.id!, collectionId: c.id!, amount: c.amount })}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Record Collection */}
              {selectedLending.status !== 'closed' && !showCollectionForm && (
                <Button onClick={() => setShowCollectionForm(true)} className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600">
                  <Plus className="h-4 w-4 mr-2" /> Record Collection
                </Button>
              )}

              {showCollectionForm && (
                <Card className="rounded-2xl border-indigo-200 bg-indigo-50/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{editingCollection ? 'Edit Collection' : 'Record Collection'}</CardTitle>
                    <CardDescription>Lending to {selectedLending.borrower_name} · {format(selectedLending.remaining_amount || 0)} remaining</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Amount *</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">{symbol}</span>
                          <Input type="number" min="0.01" value={collectionData.amount || ''} onChange={(e) => setCollectionData({ ...collectionData, amount: parseFloat(e.target.value) || 0 })} className="rounded-xl pl-8" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Date *</Label>
                        <Input type="date" value={collectionData.collection_date} onChange={(e) => setCollectionData({ ...collectionData, collection_date: e.target.value })} className="rounded-xl" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Payment Method</Label>
                        <Select value={collectionData.payment_method || 'UPI'} onValueChange={(val) => setCollectionData({ ...collectionData, payment_method: val })}>
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
                        <Input placeholder="TXN123456" value={collectionData.reference_number || ''} onChange={(e) => setCollectionData({ ...collectionData, reference_number: e.target.value })} className="rounded-xl" />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Note</Label>
                        <Input placeholder="Monthly collection..." value={collectionData.note || ''} onChange={(e) => setCollectionData({ ...collectionData, note: e.target.value })} className="rounded-xl" />
                      </div>
                      <div className="col-span-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={collectionData.close_lending} onChange={(e) => setCollectionData({ ...collectionData, close_lending: e.target.checked })} className="w-4 h-4 rounded" />
                          <span className="text-sm">This completes the lending (marks as &ldquo;collected&rdquo;)</span>
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" onClick={() => { setShowCollectionForm(false); setEditingCollection(null) }} className="rounded-xl">Cancel</Button>
                      <Button onClick={handleRecordCollection} className="flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600">{editingCollection ? 'Update Collection' : 'Record Collection'}</Button>
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
        title="Delete Lending"
        description="Delete this lending? This will also delete all collection records. This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />
      <ConfirmDialog
        open={!!deleteCollectionTarget}
        onOpenChange={(open) => !open && setDeleteCollectionTarget(null)}
        title="Delete Collection"
        description={`Delete this collection of ${deleteCollectionTarget ? format(deleteCollectionTarget.amount) : ''}? The outstanding balance will increase.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteCollection}
      />
    </div>
  )
}
