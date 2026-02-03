'use client'

import dynamic from 'next/dynamic'
import { ComponentType } from 'react'

interface StockChartProps {
  data: any[]
  symbol: string
  chartType?: 'candlestick' | 'line' | 'area'
}

const DynamicStockChart = dynamic<StockChartProps>(
  () => import('./StockChart').then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] flex items-center justify-center bg-slate-800 rounded-xl">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <div className="text-slate-400">Loading chart...</div>
        </div>
      </div>
    ),
  }
)

export default DynamicStockChart
