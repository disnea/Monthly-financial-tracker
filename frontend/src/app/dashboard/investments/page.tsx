'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, TrendingUp, TrendingDown, DollarSign, Calendar, BarChart3, Trash2, RefreshCw, Activity, BarChart2, LineChart, Edit, X } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { toast } from 'sonner'
import { useCurrency } from '@/hooks/useCurrency'
import { investmentApi, investmentApiClient, Investment } from '@/lib/api'
import StockSearch from '@/components/stocks/StockSearch'
import TimeframeSelector from '@/components/stocks/TimeframeSelector'
import StockChart from '@/components/stocks/StockChartWrapper'
import { ConfirmDialog } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/error-utils'

interface StockQuote {
  symbol: string
  price: number
  change: number
  change_percent: number
  high: number
  low: number
  open: number
  previous_close: number
}

interface StockProfile {
  symbol: string
  name: string
  industry: string
  marketCap: number
  currency: string
  exchange: string
}

export default function InvestmentsPage() {
  const { currency, symbol, format } = useCurrency()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  
  // Stock monitor state
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL')
  const [selectedName, setSelectedName] = useState('Apple Inc.')
  const [stockQuote, setStockQuote] = useState<StockQuote | null>(null)
  const [stockProfile, setStockProfile] = useState<StockProfile | null>(null)
  const [chartData, setChartData] = useState<any[]>([])
  const [timeframe, setTimeframe] = useState('1week')
  const [chartType, setChartType] = useState<'candlestick' | 'line' | 'area'>('line')
  const [loadingStock, setLoadingStock] = useState(false)
  
  const [formData, setFormData] = useState<Investment>({
    investment_type: 'Stocks',
    asset_name: '',
    quantity: 0,
    purchase_price: 0,
    currency: currency,
    purchase_date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchInvestments()
  }, [])

  const fetchInvestments = async () => {
    try {
      const response = await investmentApi.list()
      // ALWAYS show real API data if authenticated
      setInvestments(response || [])
    } catch (error: any) {
      toast.error('Failed to fetch investments')
      setInvestments([])
    } finally {
      setLoading(false)
    }
  }

  // Fetch stock data using axios investmentApiClient (consistent with rest of app)
  const fetchStockData = async (stockSymbol: string) => {
    setLoadingStock(true)
    try {
      const [quoteRes, profileRes] = await Promise.all([
        investmentApiClient.get(`/stocks/${stockSymbol}/quote`),
        investmentApiClient.get(`/stocks/${stockSymbol}/profile`)
      ])

      setStockQuote(quoteRes.data)
      setStockProfile(profileRes.data)
      
      await fetchChartData(stockSymbol, timeframe)
    } catch (error: any) {
      toast.error(`Failed to fetch stock data: ${error.response?.data?.detail || error.message}`)
    } finally {
      setLoadingStock(false)
    }
  }

  const fetchChartData = async (stockSymbol: string, tf: string) => {
    try {
      let params = ''
      if (tf === '1day' || tf === '1week' || tf === '1month' || tf === '3month' || tf === '6month') {
        params = 'interval=daily&outputsize=compact'
      } else if (tf === '1year') {
        params = 'interval=weekly&outputsize=compact'
      } else {
        params = 'interval=monthly&outputsize=compact'
      }

      const response = await investmentApiClient.get(`/stocks/${stockSymbol}/history?${params}`)
      const result = response.data
      
      if (result.error) {
        setChartData([])
        return
      }
      
      let chartData = result.data && Array.isArray(result.data) ? result.data : Array.isArray(result) ? result : null
      
      if (chartData && chartData.length > 0) {
        const sliceMap: Record<string, number> = {
          '1day': 5, '1week': 7, '1month': 30, '3month': 60, '6month': 100, '1year': 52
        }
        setChartData(chartData.slice(-(sliceMap[tf] || 100)))
      } else {
        setChartData([])
      }
    } catch (error) {
      setChartData([])
    }
  }

  // Initial load and handle stock/timeframe changes
  useEffect(() => {
    if (selectedSymbol) {
      fetchStockData(selectedSymbol)
    }
  }, [selectedSymbol])

  useEffect(() => {
    if (selectedSymbol && timeframe) {
      fetchChartData(selectedSymbol, timeframe)
    }
  }, [timeframe])

  const handleStockSelect = (symbol: string, name: string) => {
    setSelectedSymbol(symbol)
    setSelectedName(name)
  }

  const handleEdit = (investment: Investment) => {
    setEditingInvestment(investment)
    setFormData({
      investment_type: investment.investment_type,
      asset_name: investment.asset_name,
      asset_symbol: investment.asset_symbol,
      quantity: investment.quantity,
      purchase_price: investment.purchase_price,
      currency: investment.currency,
      purchase_date: investment.purchase_date.split('T')[0]
    })
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!formData.asset_name || !formData.quantity || !formData.purchase_price) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      if (editingInvestment && editingInvestment.id) {
        await investmentApi.update(editingInvestment.id, formData)
        toast.success('Investment updated successfully!')
      } else {
        await investmentApi.create(formData)
        toast.success('Investment added successfully!')
      }
      setShowForm(false)
      setEditingInvestment(null)
      setFormData({
        investment_type: 'Stocks',
        asset_name: '',
        quantity: 0,
        purchase_price: 0,
        currency: currency,
        purchase_date: new Date().toISOString().split('T')[0]
      })
      fetchInvestments()
    } catch (error: any) {
      console.error('Failed to save investment:', error)
      toast.error(getErrorMessage(error) || `Failed to ${editingInvestment ? 'update' : 'add'} investment`)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await investmentApi.delete(id)
      toast.success('Investment deleted successfully!')
      fetchInvestments()
    } catch (error: any) {
      toast.error('Failed to delete investment')
    } finally {
      setDeleteTarget(null)
    }
  }

  const totalInvested = investments.reduce((sum, inv) => sum + (inv.purchase_price * inv.quantity), 0)
  const currentValue = investments.reduce((sum, inv) => sum + (inv.current_value ?? inv.purchase_price * inv.quantity), 0)
  const totalProfitLoss = currentValue - totalInvested
  const totalProfitLossPercentage = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Investments & Market Monitor</h1>
          <p className="text-muted-foreground">Track stocks in real-time and manage your portfolio</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="rounded-xl">
          <Plus className="h-4 w-4 mr-2" />
          Add Investment
        </Button>
      </div>

      {/* Portfolio Summary Stats */}
      {investments.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="rounded-2xl border-none shadow-md dark:bg-slate-900">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 mb-1">Total Invested</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{format(totalInvested)}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-none shadow-md dark:bg-slate-900">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 mb-1">Current Value</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white">{format(currentValue)}</p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-none shadow-md dark:bg-slate-900">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 mb-1">Total P&L</p>
              <p className={`text-xl font-bold ${totalProfitLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {totalProfitLoss >= 0 ? '+' : ''}{format(totalProfitLoss)}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border-none shadow-md dark:bg-slate-900">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 mb-1">Returns</p>
              <p className={`text-xl font-bold ${totalProfitLossPercentage >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {totalProfitLossPercentage >= 0 ? '+' : ''}{totalProfitLossPercentage.toFixed(2)}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TradingView-Style Stock Monitor */}
      <Card className="border-slate-700 bg-slate-900 rounded-3xl overflow-hidden shadow-2xl">
        <CardContent className="p-6 space-y-6">
          {/* Search and Timeframe */}
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex-1 max-w-md">
              <StockSearch onSelectStock={handleStockSelect} currentSymbol={selectedSymbol} />
            </div>
            <TimeframeSelector selected={timeframe} onSelect={setTimeframe} />
          </div>

          {/* Stock Header */}
          {stockQuote && stockProfile && (
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between p-6 bg-slate-800/50 rounded-2xl border border-slate-700">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-3xl font-bold text-white">{selectedSymbol}</h2>
                  <Badge className="bg-slate-700 text-slate-300 rounded-lg">{stockProfile.exchange}</Badge>
                </div>
                <p className="text-slate-400 mb-3">{selectedName}</p>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span>{stockProfile.industry}</span>
                  <span>•</span>
                  <span>Mkt Cap: {symbol}{(stockProfile.marketCap / 1000).toFixed(2)}B</span>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-5xl font-bold text-white mb-2">
                  {symbol}{stockQuote.price.toFixed(2)}
                </div>
                <div className={`flex items-center gap-2 text-lg font-semibold ${stockQuote.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {stockQuote.change >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                  <span>{stockQuote.change >= 0 ? '+' : ''}{stockQuote.change.toFixed(2)}</span>
                  <span>({stockQuote.change_percent >= 0 ? '+' : ''}{stockQuote.change_percent.toFixed(2)}%)</span>
                </div>
                <div className="flex gap-4 mt-3 text-xs text-slate-400">
                  <div>H: <span className="text-white">{symbol}{stockQuote.high.toFixed(2)}</span></div>
                  <div>L: <span className="text-white">{symbol}{stockQuote.low.toFixed(2)}</span></div>
                  <div>O: <span className="text-white">{symbol}{stockQuote.open.toFixed(2)}</span></div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchStockData(selectedSymbol)}
                  className="bg-slate-700 hover:bg-slate-600 text-white rounded-xl"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingStock ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          )}

          {/* Chart Type Selector */}
          <div className="flex gap-2">
            <Button
              variant={chartType === 'candlestick' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setChartType('candlestick')}
              className={`rounded-xl ${chartType === 'candlestick' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
            >
              <BarChart2 className="h-4 w-4 mr-2" />
              Candlestick
            </Button>
            <Button
              variant={chartType === 'line' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setChartType('line')}
              className={`rounded-xl ${chartType === 'line' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
            >
              <LineChart className="h-4 w-4 mr-2" />
              Line
            </Button>
            <Button
              variant={chartType === 'area' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setChartType('area')}
              className={`rounded-xl ${chartType === 'area' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'}`}
            >
              <Activity className="h-4 w-4 mr-2" />
              Area
            </Button>
          </div>

          {/* Chart */}
          <div className="w-full h-[500px]">
            {loadingStock ? (
              <div className="h-full flex items-center justify-center bg-slate-800 rounded-xl">
                <div className="text-center">
                  <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <div className="text-slate-400">Loading chart data...</div>
                </div>
              </div>
            ) : (
              <StockChart data={chartData} symbol={selectedSymbol} chartType={chartType} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Portfolio Summary */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="border border-slate-200/60 dark:border-slate-700/60 shadow-xl hover:shadow-2xl transition-all duration-500 bg-gradient-to-br from-white via-slate-50/30 to-blue-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Total Invested</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{format(totalInvested)}</div>
            <p className="text-xs text-slate-500 mt-1">Initial investment</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/60 dark:border-slate-700/60 shadow-xl hover:shadow-2xl transition-all duration-500 bg-gradient-to-br from-white via-slate-50/30 to-indigo-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Current Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{format(currentValue)}</div>
            <p className="text-xs text-slate-500 mt-1">Market value</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/60 dark:border-slate-700/60 shadow-xl hover:shadow-2xl transition-all duration-500 bg-gradient-to-br from-white via-slate-50/30 to-emerald-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Total P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${totalProfitLoss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {totalProfitLoss >= 0 ? '+' : ''}{format(totalProfitLoss)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {totalProfitLoss >= 0 ? 'Profit' : 'Loss'}
            </p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/60 dark:border-slate-700/60 shadow-xl hover:shadow-2xl transition-all duration-500 bg-gradient-to-br from-white via-slate-50/30 to-violet-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Return %</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${totalProfitLossPercentage >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {totalProfitLossPercentage >= 0 ? '+' : ''}{totalProfitLossPercentage.toFixed(2)}%
            </div>
            <p className="text-xs text-slate-500 mt-1">Overall return</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading investments...</div>
      ) : investments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Investments</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add your first investment to start tracking your portfolio
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Investment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {investments.map((investment) => (
            <Card key={investment.id} className="hover:shadow-2xl transition-all duration-500 border border-slate-200/60 dark:border-slate-700/60 shadow-xl bg-gradient-to-br from-white via-slate-50/30 to-emerald-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 rounded-2xl">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">{investment.asset_name}</CardTitle>
                    <CardDescription className="text-slate-600 dark:text-slate-400 font-medium">{investment.asset_symbol}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl shadow-lg ${investment.unrealized_gain_loss && investment.unrealized_gain_loss >= 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-rose-500 to-pink-600'}`}>
                      {investment.unrealized_gain_loss && investment.unrealized_gain_loss >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-white" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-white" />
                      )}
                    </div>
                    <Badge variant="outline" className="rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 font-semibold">{investment.investment_type}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <div>
                    <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Quantity</Label>
                    <p className="font-bold text-slate-900 dark:text-white">{investment.quantity}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Purchase Price</Label>
                    <p className="font-bold text-slate-900 dark:text-white">{format(investment.purchase_price)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Current Price</Label>
                    <p className="font-bold text-indigo-600">{format(investment.current_price || 0)}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Value</Label>
                    <p className="font-bold text-indigo-600">{format(investment.current_value || 0)}</p>
                  </div>
                </div>
                
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">P&L:</span>
                    <div className={`font-bold text-lg ${investment.unrealized_gain_loss && investment.unrealized_gain_loss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {investment.unrealized_gain_loss && investment.unrealized_gain_loss >= 0 ? '+' : ''}
                      {format(Math.abs(investment.unrealized_gain_loss || 0))}
                      <span className="text-sm ml-2">
                        ({investment.gain_loss_percentage?.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-lg">
                  <Calendar className="h-3.5 w-3.5 mr-2" />
                  Purchased: {new Date(investment.purchase_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                </div>

                {investment.notes && (
                  <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    {investment.notes}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                    onClick={() => handleEdit(investment)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                    onClick={() => investment.id && setDeleteTarget(investment.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-2xl rounded-3xl border-none shadow-2xl max-h-[90vh] overflow-y-auto dark:bg-slate-900">
            <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-slate-800 dark:to-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                    {editingInvestment ? 'Edit Investment' : 'Add Investment'}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {editingInvestment ? 'Update your investment details' : 'Add a new investment to your portfolio'}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => {
                  setShowForm(false)
                  setEditingInvestment(null)
                }} className="rounded-xl">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Investment Type</Label>
                <Select
                  value={formData.investment_type}
                  onValueChange={(val) => setFormData({...formData, investment_type: val})}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Stocks">Stocks</SelectItem>
                    <SelectItem value="Mutual Fund">Mutual Fund</SelectItem>
                    <SelectItem value="ETF">ETF</SelectItem>
                    <SelectItem value="Bonds">Bonds</SelectItem>
                    <SelectItem value="Gold">Gold</SelectItem>
                    <SelectItem value="FD">Fixed Deposit</SelectItem>
                    <SelectItem value="Crypto">Cryptocurrency</SelectItem>
                    <SelectItem value="Real Estate">Real Estate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Asset Name *</Label>
                <Input 
                  placeholder="Apple Inc." 
                  value={formData.asset_name}
                  onChange={(e) => setFormData({...formData, asset_name: e.target.value})}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Asset Symbol (Optional)</Label>
                <Input 
                  placeholder="AAPL" 
                  value={formData.asset_symbol || ''}
                  onChange={(e) => setFormData({...formData, asset_symbol: e.target.value})}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  placeholder="10" 
                  value={formData.quantity || ''}
                  onChange={(e) => setFormData({...formData, quantity: parseFloat(e.target.value) || 0})}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Purchase Price *</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  placeholder="150.00" 
                  value={formData.purchase_price || ''}
                  onChange={(e) => setFormData({...formData, purchase_price: parseFloat(e.target.value) || 0})}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Purchase Date</Label>
                <Input 
                  type="date" 
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Notes (Optional)</Label>
                <Input 
                  placeholder="Long-term investment" 
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="rounded-xl"
                />
              </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setShowForm(false)
                    setEditingInvestment(null)
                  }}
                  className="flex-1 rounded-xl"
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700"
                  onClick={handleSubmit}
                >
                  {editingInvestment ? 'Save Changes' : 'Add Investment'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Investment"
        description="Are you sure you want to delete this investment? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />
    </div>
  )
}
