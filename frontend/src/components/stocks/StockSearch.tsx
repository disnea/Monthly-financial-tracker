'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, TrendingUp } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

interface StockSearchProps {
  onSelectStock: (symbol: string, name: string) => void
  currentSymbol?: string
}

interface SearchResult {
  symbol: string
  name: string
  type: string
  region: string
  currency: string
}

export default function StockSearch({ onSelectStock, currentSymbol }: StockSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  // Popular stocks to show by default
  const popularStocks = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corporation' },
    { symbol: 'TSLA', name: 'Tesla, Inc.' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  ]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (query.length < 1) {
      setResults([])
      return
    }

    const searchStocks = async () => {
      setLoading(true)
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api'
        const response = await fetch(`${baseUrl}/investment/stocks/search?query=${encodeURIComponent(query)}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        })
        const data = await response.json()
        setResults(data.results || [])
      } catch (error) {
        console.error('Search error:', error)
        setResults([])
      } finally {
        setLoading(false)
      }
    }

    const debounceTimer = setTimeout(searchStocks, 300)
    return () => clearTimeout(debounceTimer)
  }, [query])

  const handleSelect = (symbol: string, name: string) => {
    onSelectStock(symbol, name)
    setQuery('')
    setShowResults(false)
    setResults([])
  }

  return (
    <div ref={searchRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          type="text"
          placeholder={currentSymbol || "Search stocks (e.g., AAPL, TSLA)"}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setShowResults(true)
          }}
          onFocus={() => setShowResults(true)}
          className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 rounded-xl h-12 text-lg font-semibold"
        />
      </div>

      {showResults && (
        <Card className="absolute top-14 left-0 right-0 z-50 bg-slate-800 border-slate-700 rounded-xl overflow-hidden shadow-2xl max-h-96 overflow-y-auto">
          {loading && (
            <div className="p-4 text-center text-slate-400">
              <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
            </div>
          )}

          {!loading && query.length === 0 && (
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp className="h-3 w-3" />
                Popular Stocks
              </div>
              {popularStocks.map((stock) => (
                <button
                  key={stock.symbol}
                  onClick={() => handleSelect(stock.symbol, stock.name)}
                  className="w-full text-left px-3 py-3 hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-white group-hover:text-indigo-400 transition-colors">
                      {stock.symbol}
                    </div>
                    <div className="text-xs text-slate-400">{stock.name}</div>
                  </div>
                  <div className="text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">→</div>
                </button>
              ))}
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="p-2">
              {results.map((result) => (
                <button
                  key={result.symbol}
                  onClick={() => handleSelect(result.symbol, result.name)}
                  className="w-full text-left px-3 py-3 hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-white group-hover:text-indigo-400 transition-colors">
                      {result.symbol}
                    </div>
                    <div className="text-xs text-slate-400">{result.name}</div>
                    <div className="text-[10px] text-slate-500 mt-1">
                      {result.type} • {result.region}
                    </div>
                  </div>
                  <div className="text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">→</div>
                </button>
              ))}
            </div>
          )}

          {!loading && query.length > 0 && results.length === 0 && (
            <div className="p-8 text-center text-slate-400">
              <div className="mb-2">No results found</div>
              <div className="text-xs text-slate-500">Try searching for another symbol</div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
