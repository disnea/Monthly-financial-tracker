'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Download, FileText, FileSpreadsheet, File, 
  Calendar, CheckCircle2, Loader2, Receipt,
  CreditCard, TrendingUp, Users2, Banknote, HeartHandshake
} from 'lucide-react'
import { toast } from 'sonner'
import { exportApiClient } from '@/lib/api'
import { getErrorMessage } from '@/lib/error-utils'
import { useCurrency } from '@/hooks/useCurrency'
import { cn } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type ExportModule = 'expenses' | 'emis' | 'investments' | 'income' | 'borrowings' | 'lendings'
type ExportFormat = 'csv' | 'excel' | 'pdf'

interface ExportOption {
  id: ExportModule
  label: string
  description: string
  icon: any
  color: string
  gradient: string
  formats: ExportFormat[]
}

const exportOptions: ExportOption[] = [
  {
    id: 'expenses',
    label: 'Expenses',
    description: 'Transaction history with categories and payment methods',
    icon: Receipt,
    color: 'text-rose-600',
    gradient: 'from-rose-500 to-pink-600',
    formats: ['csv', 'excel', 'pdf']
  },
  {
    id: 'income',
    label: 'Income',
    description: 'Earnings from salary, freelance, dividends, and more',
    icon: Banknote,
    color: 'text-green-600',
    gradient: 'from-green-500 to-emerald-600',
    formats: ['csv', 'excel', 'pdf']
  },
  {
    id: 'emis',
    label: 'EMI Loans',
    description: 'Loan details, interest rates, and payment schedules',
    icon: CreditCard,
    color: 'text-blue-600',
    gradient: 'from-blue-500 to-cyan-600',
    formats: ['csv', 'excel', 'pdf']
  },
  {
    id: 'investments',
    label: 'Investments',
    description: 'Portfolio holdings with purchase prices and current values',
    icon: TrendingUp,
    color: 'text-emerald-600',
    gradient: 'from-emerald-500 to-teal-600',
    formats: ['csv', 'excel', 'pdf']
  },
  {
    id: 'borrowings',
    label: 'Borrowings',
    description: 'Money borrowed with repayment tracking and interest',
    icon: Users2,
    color: 'text-teal-600',
    gradient: 'from-teal-500 to-cyan-600',
    formats: ['csv', 'excel', 'pdf']
  },
  {
    id: 'lendings',
    label: 'Lendings',
    description: 'Money lent to others with collection tracking',
    icon: HeartHandshake,
    color: 'text-indigo-600',
    gradient: 'from-indigo-500 to-violet-600',
    formats: ['csv', 'excel', 'pdf']
  },
]

const formatIcons: Record<ExportFormat, any> = {
  csv: FileText,
  excel: FileSpreadsheet,
  pdf: File,
}

const formatLabels: Record<ExportFormat, string> = {
  csv: 'CSV',
  excel: 'Excel',
  pdf: 'PDF',
}

export default function ExportPage() {
  const { format } = useCurrency()
  const [selectedModule, setSelectedModule] = useState<ExportModule>('expenses')
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('csv')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [exporting, setExporting] = useState(false)
  const [recentExports, setRecentExports] = useState<{ module: string; format: string; date: Date }[]>([])

  const currentOption = exportOptions.find(o => o.id === selectedModule)!

  const handleExport = async () => {
    setExporting(true)
    try {
      const payload: any = {
        export_type: selectedModule,
        format: selectedFormat,
      }
      if (startDate) payload.start_date = startDate
      if (endDate) payload.end_date = endDate

      const response = await exportApiClient.post(`/export/${selectedModule}`, payload, {
        responseType: 'blob',
      })

      const contentDisposition = response.headers['content-disposition']
      let filename = `${selectedModule}.${selectedFormat === 'excel' ? 'xlsx' : selectedFormat}`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename=(.+)/)
        if (match) filename = match[1]
      }

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)

      setRecentExports(prev => [
        { module: selectedModule, format: selectedFormat, date: new Date() },
        ...prev.slice(0, 4)
      ])

      toast.success(`${currentOption.label} exported as ${formatLabels[selectedFormat]} successfully!`)
    } catch (error: any) {
      toast.error(getErrorMessage(error) || `Failed to export ${currentOption.label}`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/20 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50 shadow-sm">
        <div className="p-6">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 dark:from-slate-200 dark:to-white bg-clip-text text-transparent">Export Data</h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">Download your financial data in various formats</p>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
        {/* Module Selection */}
        <div>
          <Label className="text-sm font-semibold text-slate-700 mb-3 block">Select Data to Export</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
            {exportOptions.map((option) => {
              const Icon = option.icon
              const isSelected = selectedModule === option.id

              return (
                <button
                  key={option.id}
                  onClick={() => {
                    setSelectedModule(option.id)
                    if (!option.formats.includes(selectedFormat)) {
                      setSelectedFormat(option.formats[0])
                    }
                  }}
                  className={cn(
                    "relative text-left p-5 rounded-2xl border-2 transition-all duration-200",
                    isSelected
                      ? "border-slate-900 dark:border-slate-400 bg-slate-50 dark:bg-slate-800 shadow-lg"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shadow-md bg-gradient-to-br text-white", option.gradient)}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 dark:text-white">{option.label}</h3>
                      <p className="text-xs text-slate-500 mt-1">{option.description}</p>
                      <div className="flex gap-1.5 mt-3">
                        {option.formats.map(f => (
                          <Badge key={f} variant="secondary" className="text-[10px] uppercase rounded-md">
                            {f}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <CheckCircle2 className="h-5 w-5 text-slate-900 dark:text-white" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Export Configuration */}
        <Card className="border-none shadow-xl rounded-3xl">
          <CardHeader className={cn("bg-gradient-to-r text-white rounded-t-3xl", `${currentOption.gradient}`)}>
            <CardTitle className="text-xl font-bold">Export {currentOption.label}</CardTitle>
            <CardDescription className="text-white/80">
              Configure your export settings and download
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {/* Format Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-slate-700">Export Format</Label>
              <div className="flex gap-3">
                {currentOption.formats.map((f) => {
                  const FormatIcon = formatIcons[f]
                  return (
                    <button
                      key={f}
                      onClick={() => setSelectedFormat(f)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all",
                        selectedFormat === f
                          ? "border-slate-900 dark:border-slate-400 bg-slate-50 dark:bg-slate-800 shadow-md"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                      )}
                    >
                      <FormatIcon className={cn("h-5 w-5", selectedFormat === f ? "text-slate-900 dark:text-white" : "text-slate-400")} />
                      <span className={cn("font-semibold text-sm", selectedFormat === f ? "text-slate-900 dark:text-white" : "text-slate-500")}>
                        {formatLabels[f]}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Start Date (optional)</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="pl-10 rounded-xl" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">End Date (optional)</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="pl-10 rounded-xl" />
                </div>
              </div>
            </div>

            {/* Export Button */}
            <Button
              onClick={handleExport}
              disabled={exporting}
              className={cn(
                "w-full h-14 rounded-xl text-lg font-bold shadow-lg bg-gradient-to-r hover:shadow-xl transition-all",
                currentOption.gradient
              )}
            >
              {exporting ? (
                <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Exporting...</>
              ) : (
                <><Download className="h-5 w-5 mr-2" /> Download {formatLabels[selectedFormat]}</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Exports */}
        {recentExports.length > 0 && (
          <Card className="border-none shadow-xl rounded-3xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">Recent Exports</CardTitle>
              <CardDescription>Your latest downloads this session</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentExports.map((exp, idx) => {
                  const opt = exportOptions.find(o => o.id === exp.module)
                  const Icon = opt?.icon || FileText
                  return (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br text-white", opt?.gradient || 'from-slate-500 to-slate-600')}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{opt?.label}</p>
                        <p className="text-xs text-slate-500">{exp.format.toUpperCase()} • {exp.date.toLocaleTimeString()}</p>
                      </div>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
