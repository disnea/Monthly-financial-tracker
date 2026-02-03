'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, TrendingUp, TrendingDown, DollarSign, Calendar, BarChart3, Trash2, RefreshCw, Activity, BarChart2, LineChart, Edit } from 'lucide-react'
import { useAuthStore } from '@/lib/store'
import { toast } from 'sonner'
import { useCurrency } from '@/hooks/useCurrency'
import { investmentApi, Investment } from '@/lib/api'
import StockSearch from '@/components/stocks/StockSearch'
import TimeframeSelector from '@/components/stocks/TimeframeSelector'
import StockChart from '@/components/stocks/StockChartWrapper'

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

  // Sample investment data in INR
  const sampleInvestments: Investment[] = [
    {
      id: '1',
      investment_type: 'Stocks',
      asset_name: 'Reliance Industries',
      asset_symbol: 'RELIANCE',
      quantity: 50,
      purchase_price: 2450,
      currency: 'INR',
      purchase_date: '2023-06-15',
      current_price: 2680,
      current_value: 134000,
      unrealized_gain_loss: 11500,
      gain_loss_percentage: 9.38
    },
    {
      id: '2',
      investment_type: 'Mutual Fund',
      asset_name: 'HDFC Top 100 Fund',
      quantity: 200,
      purchase_price: 650,
      currency: 'INR',
      purchase_date: '2023-08-01',
      current_price: 720,
      current_value: 144000,
      unrealized_gain_loss: 14000,
      gain_loss_percentage: 10.77
    },
    {
      id: '3',
      investment_type: 'Stocks',
      asset_name: 'TCS',
      asset_symbol: 'TCS',
      quantity: 30,
      purchase_price: 3520,
      currency: 'INR',
      purchase_date: '2023-10-12',
      current_price: 3850,
      current_value: 115500,
      unrealized_gain_loss: 9900,
      gain_loss_percentage: 9.38
    },
    {
      id: '4',
      investment_type: 'ETF',
      asset_name: 'Nippon India ETF Nifty BeES',
      quantity: 100,
      purchase_price: 235,
      currency: 'INR',
      purchase_date: '2024-01-05',
      current_price: 248,
      current_value: 24800,
      unrealized_gain_loss: 1300,
      gain_loss_percentage: 5.53
    }
  ]

  useEffect(() => {
    console.log('🚀 Investments Page - useEffect called')
    fetchInvestments()
  }, [])

  const fetchInvestments = async () => {
    console.log('📊 Investments Page - fetchInvestments called')
    try {
      const response = await investmentApi.list()
      console.log('📝 Investments Page - API response:', response)
      // ALWAYS show real API data if authenticated
      setInvestments(response || [])
    } catch (error: any) {
      console.error('❌ Investments Page - Error:', error)
      toast.error('Failed to fetch investments')
      setInvestments([])
    } finally {
      console.log('✅ Investments Page - Setting loading to false')
      setLoading(false)
    }
  }

  // Fetch stock data
  const fetchStockData = async (symbol: string) => {
    setLoadingStock(true)
    try {
      const token = localStorage.getItem('auth_token')
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api'
      
      console.log('Fetching stock data for:', symbol)
      console.log('Base URL:', baseUrl)
      
      // Fetch quote and profile in parallel
      const [quoteRes, profileRes] = await Promise.all([
        fetch(`${baseUrl}/investment/stocks/${symbol}/quote`, {
          headers: { 
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${baseUrl}/investment/stocks/${symbol}/profile`, {
          headers: { 
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json'
          }
        })
      ])

      console.log('Quote response status:', quoteRes.status)
      console.log('Profile response status:', profileRes.status)

      if (!quoteRes.ok || !profileRes.ok) {
        throw new Error(`API Error: Quote ${quoteRes.status}, Profile ${profileRes.status}`)
      }

      const quote = await quoteRes.json()
      const profile = await profileRes.json()

      console.log('Quote data:', quote)
      console.log('Profile data:', profile)

      setStockQuote(quote)
      setStockProfile(profile)
      
      // Fetch historical data based on timeframe
      await fetchChartData(symbol, timeframe)
    } catch (error: any) {
      console.error('Error fetching stock data:', error)
      toast.error(`Failed to fetch stock data: ${error.message}`)
    } finally {
      setLoadingStock(false)
    }
  }

  const fetchChartData = async (symbol: string, tf: string) => {
    console.log(`📊 Fetching chart data for ${symbol} with timeframe: ${tf}`)
    try {
      const token = localStorage.getItem('auth_token')
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api'
      let url = `${baseUrl}/investment/stocks/${symbol}/history?`
      
      // Map timeframe to API params - always use compact for faster loading
      if (tf === '1day') {
        url += 'interval=daily&outputsize=compact'
      } else if (tf === '1week' || tf === '1month') {
        url += 'interval=daily&outputsize=compact'
      } else if (tf === '3month' || tf === '6month') {
        url += 'interval=daily&outputsize=compact'
      } else if (tf === '1year') {
        url += 'interval=weekly&outputsize=compact'
      } else {
        url += 'interval=monthly&outputsize=compact'
      }

      console.log(`📡 Chart API URL: ${url}`)
      const response = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      })
      console.log(`📈 Chart response status: ${response.status}`)
      
      const result = await response.json()
      console.log(`📊 Chart data received:`, result)
      console.log(`📊 Response keys:`, Object.keys(result))
      console.log(`📊 Full response:`, JSON.stringify(result, null, 2))
      
      // Check for error in response
      if (result.error) {
        console.error(`❌ API returned error: ${result.error}`)
        setChartData([])
        return
      }
      
      // Extract data - could be in result.data or result itself
      let chartData = null
      if (result.data && Array.isArray(result.data)) {
        chartData = result.data
      } else if (Array.isArray(result)) {
        chartData = result
      }
      
      console.log(`📊 Extracted chartData type:`, Array.isArray(chartData) ? 'array' : typeof chartData)
      console.log(`📊 Extracted chartData length:`, chartData?.length)
      
      if (chartData && Array.isArray(chartData) && chartData.length > 0) {
        // Filter data based on timeframe for better performance
        let filteredData = chartData
        
        if (tf === '1day') filteredData = chartData.slice(-5) // Last 5 data points
        else if (tf === '1week') filteredData = chartData.slice(-7)
        else if (tf === '1month') filteredData = chartData.slice(-30)
        else if (tf === '3month') filteredData = chartData.slice(-60) // Reduce from 90
        else if (tf === '6month') filteredData = chartData.slice(-100) // Reduce from 180
        else if (tf === '1year') filteredData = chartData.slice(-52)
        else filteredData = chartData.slice(-100) // Cap at 100 points max
        
        console.log(`✅ Setting ${filteredData.length} chart data points`)
        console.log(`📊 Sample data point:`, filteredData[0])
        setChartData(filteredData)
      } else {
        console.warn('⚠️ No chart data received or empty array')
        setChartData([])
      }
    } catch (error) {
      console.error('❌ Error fetching chart data:', error)
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
      toast.error(error.response?.data?.detail || `Failed to ${editingInvestment ? 'update' : 'add'} investment`)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this investment?')) return
    
    try {
      await investmentApi.delete(id)
      toast.success('Investment deleted successfully!')
      fetchInvestments()
    } catch (error: any) {
      console.error('Failed to delete investment:', error)
      toast.error('Failed to delete investment')
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
        <Card className="border border-slate-200/60 shadow-xl hover:shadow-2xl transition-all duration-500 bg-gradient-to-br from-white via-slate-50/30 to-blue-50/20 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Total Invested</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{format(totalInvested)}</div>
            <p className="text-xs text-slate-500 mt-1">Initial investment</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/60 shadow-xl hover:shadow-2xl transition-all duration-500 bg-gradient-to-br from-white via-slate-50/30 to-indigo-50/20 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Current Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-900">{format(currentValue)}</div>
            <p className="text-xs text-slate-500 mt-1">Market value</p>
          </CardContent>
        </Card>
        <Card className="border border-slate-200/60 shadow-xl hover:shadow-2xl transition-all duration-500 bg-gradient-to-br from-white via-slate-50/30 to-emerald-50/20 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Total P&L</CardTitle>
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
        <Card className="border border-slate-200/60 shadow-xl hover:shadow-2xl transition-all duration-500 bg-gradient-to-br from-white via-slate-50/30 to-violet-50/20 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Return %</CardTitle>
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
            <Card key={investment.id} className="hover:shadow-2xl transition-all duration-500 border border-slate-200/60 shadow-xl bg-gradient-to-br from-white via-slate-50/30 to-emerald-50/20 rounded-2xl">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900">{investment.asset_name}</CardTitle>
                    <CardDescription className="text-slate-600 font-medium">{investment.asset_symbol}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl shadow-lg ${investment.unrealized_gain_loss && investment.unrealized_gain_loss >= 0 ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-rose-500 to-pink-600'}`}>
                      {investment.unrealized_gain_loss && investment.unrealized_gain_loss >= 0 ? (
                        <TrendingUp className="h-4 w-4 text-white" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-white" />
                      )}
                    </div>
                    <Badge variant="outline" className="rounded-lg bg-blue-50 text-blue-700 font-semibold">{investment.investment_type}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl">
                  <div>
                    <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Quantity</Label>
                    <p className="font-bold text-slate-900">{investment.quantity}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Purchase Price</Label>
                    <p className="font-bold text-slate-900">{format(investment.purchase_price)}</p>
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
                
                <div className="pt-3 border-t border-slate-200">
                  <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                    <span className="text-sm font-semibold text-slate-700">P&L:</span>
                    <div className={`font-bold text-lg ${investment.unrealized_gain_loss && investment.unrealized_gain_loss >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {investment.unrealized_gain_loss && investment.unrealized_gain_loss >= 0 ? '+' : ''}
                      {format(Math.abs(investment.unrealized_gain_loss || 0))}
                      <span className="text-sm ml-2">
                        ({investment.gain_loss_percentage?.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg">
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
                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                    onClick={() => handleEdit(investment)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => investment.id && handleDelete(investment.id)}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{editingInvestment ? 'Edit Investment' : 'Add Investment'}</CardTitle>
              <CardDescription>
                {editingInvestment ? 'Update your investment details' : 'Add a new investment to your portfolio'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="investment-type">Investment Type</Label>
                <select 
                  id="investment-type" 
                  className="w-full p-2 border rounded"
                  value={formData.investment_type}
                  onChange={(e) => setFormData({...formData, investment_type: e.target.value})}
                >
                  <option value="Stocks">Stocks</option>
                  <option value="ETF">ETF</option>
                  <option value="Bonds">Bonds</option>
                  <option value="Crypto">Cryptocurrency</option>
                  <option value="Real Estate">Real Estate</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="asset-name">Asset Name *</Label>
                <Input 
                  id="asset-name" 
                  placeholder="Apple Inc." 
                  value={formData.asset_name}
                  onChange={(e) => setFormData({...formData, asset_name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="asset-symbol">Asset Symbol (Optional)</Label>
                <Input 
                  id="asset-symbol" 
                  placeholder="AAPL" 
                  value={formData.asset_symbol || ''}
                  onChange={(e) => setFormData({...formData, asset_symbol: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity *</Label>
                <Input 
                  id="quantity" 
                  type="number" 
                  step="0.01" 
                  placeholder="10" 
                  value={formData.quantity || ''}
                  onChange={(e) => setFormData({...formData, quantity: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchase-price">Purchase Price *</Label>
                <Input 
                  id="purchase-price" 
                  type="number" 
                  step="0.01" 
                  placeholder="150.00" 
                  value={formData.purchase_price || ''}
                  onChange={(e) => setFormData({...formData, purchase_price: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purchase-date">Purchase Date</Label>
                <Input 
                  id="purchase-date" 
                  type="date" 
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Input 
                  id="notes" 
                  placeholder="Long-term investment" 
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  className="flex-1"
                  onClick={handleSubmit}
                >
                  Add Investment
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
