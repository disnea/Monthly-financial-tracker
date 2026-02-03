'use client'

import { useEffect, useRef, useState } from 'react'
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time } from 'lightweight-charts'

interface StockChartProps {
  data: any[]
  symbol: string
  chartType?: 'candlestick' | 'line' | 'area'
}

export default function StockChart({ data, symbol, chartType = 'candlestick' }: StockChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick' | 'Line' | 'Area'> | null>(null)

  useEffect(() => {
    if (!chartContainerRef.current || !data || data.length === 0) return

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#0f172a' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 500,
      rightPriceScale: {
        borderColor: '#334155',
      },
      timeScale: {
        borderColor: '#334155',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#6366f1',
          width: 1,
          style: 2,
          labelBackgroundColor: '#6366f1',
        },
        horzLine: {
          color: '#6366f1',
          width: 1,
          style: 2,
          labelBackgroundColor: '#6366f1',
        },
      },
      watermark: {
        visible: false,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    })

    chartRef.current = chart

    // Create series based on chart type
    let series: ISeriesApi<'Candlestick' | 'Line' | 'Area'>

    if (chartType === 'candlestick') {
      series = chart.addCandlestickSeries({
        upColor: '#10b981',
        downColor: '#ef4444',
        borderUpColor: '#10b981',
        borderDownColor: '#ef4444',
        wickUpColor: '#10b981',
        wickDownColor: '#ef4444',
      })
    } else if (chartType === 'line') {
      series = chart.addLineSeries({
        color: '#6366f1',
        lineWidth: 2,
      })
    } else {
      series = chart.addAreaSeries({
        topColor: 'rgba(99, 102, 241, 0.4)',
        bottomColor: 'rgba(99, 102, 241, 0.0)',
        lineColor: '#6366f1',
        lineWidth: 2,
      })
    }

    seriesRef.current = series

    // Set data with proper formatting
    try {
      const chartData = data.map(d => {
        // Handle various date formats (YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)
        let timeStr = d.time
        if (typeof timeStr === 'string' && timeStr.includes(' ')) {
          timeStr = timeStr.split(' ')[0]
        }
        
        if (chartType === 'candlestick') {
          return {
            time: timeStr as Time,
            open: parseFloat(d.open) || 0,
            high: parseFloat(d.high) || 0,
            low: parseFloat(d.low) || 0,
            close: parseFloat(d.close) || 0,
          }
        } else {
          return {
            time: timeStr as Time,
            value: parseFloat(d.close) || 0,
          }
        }
      }).filter(d => {
        // Filter out invalid data points
        if (chartType === 'candlestick') {
          const candleData = d as { time: Time; open: number; high: number; low: number; close: number }
          return candleData.open > 0 && candleData.high > 0 && candleData.low > 0 && candleData.close > 0
        }
        const lineData = d as { time: Time; value: number }
        return lineData.value > 0
      })

      if (chartData.length === 0) {
        console.error('No valid chart data after filtering')
        return
      }

      series.setData(chartData as any)
      console.log(`Chart rendered with ${chartData.length} data points`)
    } catch (error) {
      console.error('Error setting chart data:', error)
    }

    // Fit content
    chart.timeScale().fitContent()

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [data, chartType])

  return (
    <div className="relative w-full h-[500px]">
      <div ref={chartContainerRef} className="w-full h-full rounded-xl overflow-hidden" />
      {(!data || data.length === 0) && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm rounded-xl z-10">
          <div className="text-center">
            <div className="text-slate-400 mb-2">No data available</div>
            <div className="text-slate-500 text-sm">Select a stock to view chart</div>
          </div>
        </div>
      )}
    </div>
  )
}
