'use client'

import React, { useMemo, useId } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from 'recharts'
import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent'
import { cn } from '@/lib/utils'

export interface HealthScoreData {
  overall_score: number
  savings_score: number
  debt_score: number
  budget_score: number
  investment_score: number
  recommendations?: string[]
  next_milestone?: string
}

export interface NetWorthTrendData {
  date: string
  net_worth: number
  change_percent?: number
}

export interface NetWorthSparklineProps {
  data: NetWorthTrendData[]
  className?: string
  height?: number
  showGradient?: boolean
  locale?: string
  currency?: string
  showTrendBadge?: boolean
  ariaLabel?: string
  onClick?: () => void
}

export function NetWorthSparkline({
  data,
  className,
  height = 60,
  showGradient = true,
  locale = 'en-IN',
  currency = 'INR',
  showTrendBadge = true,
  ariaLabel,
  onClick,
}: NetWorthSparklineProps) {
  const sortedData = useMemo(() => {
    if (!data || data.length === 0) return []
    return [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [data])

  const hasData = sortedData.length > 0

  const firstPoint = sortedData[0]
  const lastPoint = sortedData[sortedData.length - 1]
  const prevPoint = sortedData.length > 1 ? sortedData[sortedData.length - 2] : lastPoint

  const latestValue = lastPoint?.net_worth ?? 0
  const previousValue = prevPoint?.net_worth ?? latestValue
  const rangeStartValue = firstPoint?.net_worth ?? latestValue

  const absoluteChange = latestValue - rangeStartValue
  const recentChange = latestValue - previousValue
  const percentChangeFromRange = rangeStartValue !== 0 ? (absoluteChange / rangeStartValue) * 100 : 0

  const isPositive = absoluteChange >= 0
  const trendColor = isPositive ? '#10b981' : '#ef4444'

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
      }),
    [locale, currency],
  )

  const percentFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }),
    [locale],
  )

  const chartData = useMemo(
    () =>
      sortedData.map((item) => ({
        dateLabel: new Date(item.date).toLocaleDateString(locale, {
          month: 'short',
          day: 'numeric',
        }),
        rawDate: item.date,
        value: item.net_worth,
      })),
    [sortedData, locale],
  )

  const gradientId = useId()

  const accessibleLabel =
    ariaLabel ??
    `Net worth trend: ${isPositive ? 'up' : 'down'} ${currencyFormatter.format(
      Math.abs(absoluteChange),
    )} (${percentFormatter.format(percentChangeFromRange / 100)}) over the selected period.`

  const CustomTooltip = ({
    active,
    payload,
  }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length > 0) {
      const point = payload[0].payload as (typeof chartData)[number]
      return (
        <div className="rounded-lg border border-border bg-background p-2 shadow-lg">
          <p className="text-xs font-medium">{point.dateLabel}</p>
          <p className="text-sm font-bold">{currencyFormatter.format(point.value)}</p>
        </div>
      )
    }
    return null
  }

  if (!hasData) {
    return (
      <div
        className={cn(
          'flex items-center justify-center text-xs text-muted-foreground',
          className,
        )}
        aria-label={ariaLabel ?? 'Net worth trend: no data available'}
      >
        <span>No data available</span>
      </div>
    )
  }

  return (
    <div
      className={cn('relative', className)}
      role="figure"
      aria-label={accessibleLabel}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            }
          : undefined
      }
    >
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <defs>
            {showGradient && (
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={trendColor} stopOpacity={0.25} />
                <stop offset="95%" stopColor={trendColor} stopOpacity={0} />
              </linearGradient>
            )}
          </defs>
          <XAxis dataKey="dateLabel" hide />
          <YAxis
            hide
            domain={[(dataMin: number) => dataMin * 0.98, (dataMax: number) => dataMax * 1.02]}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={trendColor}
            strokeWidth={1.5}
            fill={showGradient ? `url(#${gradientId})` : trendColor}
            fillOpacity={showGradient ? 0.6 : 0.05}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>

      {showTrendBadge && sortedData.length > 1 && (
        <div className="absolute right-1 top-1 flex items-center gap-1 rounded-full bg-background/85 px-1.5 py-0.5 text-[10px] font-semibold backdrop-blur">
          <span className={cn('h-2 w-2 rounded-full', isPositive ? 'bg-emerald-500' : 'bg-rose-500')} />
          <span className={cn(isPositive ? 'text-emerald-600' : 'text-rose-600')}>
            {isPositive ? '↑' : '↓'} {currencyFormatter.format(Math.abs(recentChange))}
          </span>
        </div>
      )}
    </div>
  )
}

// =========================================================================
// SCORE CONFIGURATION + HELPERS
// =========================================================================

const SCORE_LEVELS = {
  excellent: {
    min: 85,
    label: 'Excellent',
    emoji: '🎯',
    conicColor: '#10b981',
    ring: 'bg-emerald-400/30',
    bar: 'bg-gradient-to-r from-emerald-500 to-teal-400',
    accentText: 'text-emerald-600 dark:text-emerald-300',
    badge: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20',
    colors: {
      primary: '#10b981',
      secondary: '#34d399',
      text: 'text-emerald-600 dark:text-emerald-300',
    },
  },
  good: {
    min: 70,
    label: 'Good',
    emoji: '👍',
    conicColor: '#f59e0b',
    ring: 'bg-amber-400/30',
    bar: 'bg-gradient-to-r from-amber-500 to-yellow-400',
    accentText: 'text-amber-600 dark:text-amber-300',
    badge: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/20',
    colors: {
      primary: '#f59e0b',
      secondary: '#fbbf24',
      text: 'text-amber-600 dark:text-amber-300',
    },
  },
  fair: {
    min: 50,
    label: 'Fair',
    emoji: '📊',
    conicColor: '#f97316',
    ring: 'bg-orange-400/30',
    bar: 'bg-gradient-to-r from-orange-500 to-amber-400',
    accentText: 'text-orange-600 dark:text-orange-300',
    badge: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-1 ring-orange-500/20',
    colors: {
      primary: '#f97316',
      secondary: '#fb923c',
      text: 'text-orange-600 dark:text-orange-300',
    },
  },
  poor: {
    min: 0,
    label: 'Needs Attention',
    emoji: '⚠️',
    conicColor: '#ef4444',
    ring: 'bg-rose-400/30',
    bar: 'bg-gradient-to-r from-rose-500 to-pink-500',
    accentText: 'text-rose-600 dark:text-rose-300',
    badge: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-1 ring-rose-500/20',
    colors: {
      primary: '#ef4444',
      secondary: '#f87171',
      text: 'text-rose-600 dark:text-rose-300',
    },
  },
} as const

type ScoreLevelKey = keyof typeof SCORE_LEVELS

type ScoreLevelConfig = (typeof SCORE_LEVELS)[ScoreLevelKey]

const getScoreLevel = (score: number): ScoreLevelConfig => {
  if (score >= SCORE_LEVELS.excellent.min) return SCORE_LEVELS.excellent
  if (score >= SCORE_LEVELS.good.min) return SCORE_LEVELS.good
  if (score >= SCORE_LEVELS.fair.min) return SCORE_LEVELS.fair
  return SCORE_LEVELS.poor
}

// =========================================================================
// BADGE + CIRCLE
// =========================================================================

export function HealthScoreBadge({
  healthData,
  className,
}: {
  healthData: HealthScoreData
  className?: string
}) {
  const level = getScoreLevel(healthData.overall_score)
  const score = Math.round(Math.min(Math.max(healthData.overall_score, 0), 100))

  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold backdrop-blur-sm',
        level.badge,
        className,
      )}
    >
      <span>{level.emoji}</span>
      <span className="text-[10px] uppercase tracking-wider">{level.label}</span>
      <span className="text-sm font-bold tabular-nums">{score}</span>
    </span>
  )
}

interface HealthScoreCircleProps {
  score: number
  size?: number
  strokeWidth?: number
  showLabel?: boolean
  className?: string
}

export function HealthScoreCircle({
  score: rawScore,
  size = 160,
  strokeWidth = 12,
  showLabel = true,
  className,
}: HealthScoreCircleProps) {
  const gradientId = useId()
  const filterId = useId()

  const score = Math.min(Math.max(rawScore, 0), 100)
  const level = getScoreLevel(score)

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  return (
    <div
      className={cn('relative', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Financial health score: ${Math.round(score)} out of 100, rated ${level.label}`}
    >
      <svg width={size} height={size} className="block">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={level.colors.secondary} />
            <stop offset="100%" stopColor={level.colors.primary} />
          </linearGradient>
          <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-slate-200 dark:text-slate-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          filter={`url(#${filterId})`}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: 'center',
            transition: 'stroke-dashoffset 0.8s ease-out',
          }}
        />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center text-center">
          <span className="text-2xl leading-none">{level.emoji}</span>
          <span
            className="mt-1 font-bold leading-none text-slate-900 dark:text-white tabular-nums"
            style={{ fontSize: size * 0.25 }}
          >
            {Math.round(score)}
          </span>
          {showLabel && (
            <span className={cn('mt-1 text-[11px] font-semibold uppercase tracking-wide', level.colors.text)}>
              {level.label}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// =========================================================================
// HEALTH SCORE INDICATOR
// =========================================================================

interface HealthScoreIndicatorProps {
  healthData: HealthScoreData
  size?: 'sm' | 'md'
  showRecommendations?: boolean
  className?: string
}

export function HealthScoreIndicator({
  healthData,
  size = 'md',
  showRecommendations = false,
  className,
}: HealthScoreIndicatorProps) {
  const level = getScoreLevel(healthData.overall_score)
  const score = Math.min(Math.max(healthData.overall_score, 0), 100)

  const radius = size === 'sm' ? 30 : 40
  const strokeWidth = size === 'sm' ? 7 : 8
  const svgSize = radius * 2 + strokeWidth * 2
  const circumference = 2 * Math.PI * radius
  const progressOffset = circumference * (1 - score / 100)

  const innerInset = strokeWidth + 6
  const innerSize = svgSize - innerInset * 2
  const trackColor = score >= 85 ? '#dcfce7' : score >= 70 ? '#fef9c3' : '#fee2e2'
  const ringId = useId()

  const metricItems = [
    { label: 'Savings', value: healthData.savings_score },
    { label: 'Debt', value: healthData.debt_score },
    { label: 'Budget', value: healthData.budget_score },
    { label: 'Investments', value: healthData.investment_score },
  ]

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="min-w-[110px] flex flex-col items-center gap-2 sm:items-start">
          <span className="text-[11px] uppercase tracking-[0.16em] text-slate-500">Score</span>

          <div
            className="flex items-center justify-center"
            style={{ width: svgSize, height: svgSize }}
            aria-label={`Financial health score ${Math.round(score)} (${level.label})`}
            role="img"
          >
            <div className="relative" style={{ width: svgSize, height: svgSize }}>
              <div className={cn('absolute inset-0 rounded-full opacity-45 blur-[2px]', level.ring)} />

              <svg width={svgSize} height={svgSize} className="absolute inset-0 rotate-[-90deg]">
                <defs>
                  <linearGradient id={ringId} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor={level.conicColor} />
                    <stop offset="100%" stopColor="#fb7185" />
                  </linearGradient>
                </defs>

                <circle
                  cx={svgSize / 2}
                  cy={svgSize / 2}
                  r={radius}
                  stroke={trackColor}
                  strokeWidth={strokeWidth}
                  fill="none"
                />
                <circle
                  cx={svgSize / 2}
                  cy={svgSize / 2}
                  r={radius}
                  stroke={`url(#${ringId})`}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={circumference}
                  strokeDashoffset={progressOffset}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.4s ease-out' }}
                />
              </svg>

              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="flex flex-col items-center justify-center rounded-full bg-white/95 shadow-[0_0_0_1px_rgba(148,163,184,0.18)] dark:bg-slate-950/95"
                  style={{ width: innerSize, height: innerSize, transform: 'translateY(-2px)' }}
                >
                  <span
                    className={cn(
                      'font-bold leading-none text-slate-900 dark:text-white',
                      size === 'sm' ? 'text-2xl' : 'text-3xl',
                    )}
                  >
                    {Math.round(score)}
                  </span>
                  <span
                    className={cn(
                      'mt-1 max-w-[70%] text-center text-[11px] font-semibold leading-tight',
                      level.accentText,
                    )}
                  >
                    {level.label}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Next milestone</p>
            <p className="text-base font-semibold text-slate-900 dark:text-white">
              {healthData.next_milestone ?? 'Stay consistent with your plan'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {metricItems.map((metric) => {
              const value = Math.min(Math.max(metric.value ?? 0, 0), 100)
              return (
                <div key={metric.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>{metric.label}</span>
                    <span>{Math.round(value)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={cn('h-2 rounded-full transition-all duration-500', level.bar)}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {showRecommendations && healthData.recommendations && healthData.recommendations.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recommendations</p>
          <ul className="mt-2 space-y-1.5 text-sm text-slate-700 dark:text-slate-300">
            {healthData.recommendations.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// =========================================================================
// COMPACT MICRO SPARKLINE WRAPPER
// =========================================================================

export function NetWorthMicroSparkline({
  data,
  className,
  locale = 'en-IN',
  currency = 'INR',
}: {
  data: NetWorthTrendData[]
  className?: string
  locale?: string
  currency?: string
}) {
  if (!data || data.length === 0) return null

  return (
    <div className={cn('flex items-center', className)}>
      <NetWorthSparkline
        data={data}
        height={24}
        showGradient={false}
        showTrendBadge={false}
        className="w-16"
        locale={locale}
        currency={currency}
        ariaLabel="Compact net worth trend"
      />
    </div>
  )
}
