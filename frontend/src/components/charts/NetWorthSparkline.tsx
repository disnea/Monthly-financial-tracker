'use client'

import React from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'

interface NetWorthTrendData {
  date: string
  net_worth: number
  change_percent: number
}

interface NetWorthSparklineProps {
  data: NetWorthTrendData[]
  className?: string
  height?: number
  showGradient?: boolean
}

export function NetWorthSparkline({ 
  data, 
  className, 
  height = 60,
  showGradient = true 
}: NetWorthSparklineProps) {
  if (!data || data.length === 0) {
    return (
      <div className={cn("flex items-center justify-center text-muted-foreground", className)}>
        <span className="text-xs">No data available</span>
      </div>
    )
  }

  // Determine trend direction and color
  const latestValue = data[data.length - 1]?.net_worth || 0
  const previousValue = data[data.length - 2]?.net_worth || latestValue
  const isPositive = latestValue >= previousValue
  const trendColor = isPositive ? '#10b981' : '#ef4444'

  // Format data for chart
  const chartData = data.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: item.net_worth
  }))

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background border border-border rounded-lg p-2 shadow-lg">
          <p className="text-xs font-medium">{data.date}</p>
          <p className="text-sm font-bold">₹{data.value.toLocaleString('en-IN')}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className={cn("relative", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            {showGradient && (
              <linearGradient id={`colorGradient-${trendColor}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={trendColor} stopOpacity={0.2}/>
                <stop offset="95%" stopColor={trendColor} stopOpacity={0}/>
              </linearGradient>
            )}
          </defs>
          <XAxis 
            dataKey="date" 
            hide={true}
          />
          <YAxis 
            hide={true}
            domain={['dataMin', 'dataMax']}
            padding={{ top: 0.05, bottom: 0.05 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={trendColor}
            strokeWidth={1.5}
            fill={showGradient ? `url(#colorGradient-${trendColor})` : trendColor}
            fillOpacity={showGradient ? 0.6 : 0.05}
          />
        </AreaChart>
      </ResponsiveContainer>
      
      {/* Trend indicator */}
      {data.length > 1 && (
        <div className="absolute top-1 right-1 flex items-center gap-1">
          <div 
            className={cn(
              "w-2 h-2 rounded-full",
              isPositive ? "bg-emerald-500" : "bg-red-500"
            )}
          />
          <span className={cn(
            "text-xs font-medium",
            isPositive ? "text-emerald-600" : "text-red-600"
          )}>
            {isPositive ? '↑' : '↓'} {Math.abs(latestValue - previousValue).toLocaleString()}
          </span>
        </div>
      )}
    </div>
  )
}

// Mini sparkline for compact spaces
export function NetWorthMicroSparkline({ data, className }: { data: NetWorthTrendData[], className?: string }) {
  if (!data || data.length === 0) return null
  
  const latestValue = data[data.length - 1]?.net_worth || 0
  const previousValue = data[data.length - 2]?.net_worth || latestValue
  const isPositive = latestValue >= previousValue
  
  return (
    <div className={cn("flex items-center", className)}>
      <NetWorthSparkline 
        data={data} 
        height={24} 
        showGradient={false}
        className="w-16"
      />
    </div>
  )
}
