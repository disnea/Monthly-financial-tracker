'use client'

import React, { useId, useMemo } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { cn } from '@/lib/utils'
import {
  Shield, TrendingUp, Target, PiggyBank, Lightbulb, ChevronRight, ArrowUpRight,
} from 'lucide-react'

// =========================================================================
// TYPES
// =========================================================================

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

// =========================================================================
// SCORE LEVELS
// =========================================================================

const SCORE_LEVELS = {
  excellent: {
    min: 85,
    label: 'Excellent',
    description: 'Your finances are in great shape',
    gradientFrom: '#10b981',
    gradientTo: '#059669',
    bgGlow: 'from-emerald-500/20 via-emerald-400/5 to-transparent',
    trackColor: '#d1fae5',
    trackColorDark: '#064e3b',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    badgeRing: 'ring-emerald-200 dark:ring-emerald-800',
  },
  good: {
    min: 70,
    label: 'Good',
    description: 'You\'re on the right track',
    gradientFrom: '#f59e0b',
    gradientTo: '#d97706',
    bgGlow: 'from-amber-500/20 via-amber-400/5 to-transparent',
    trackColor: '#fef3c7',
    trackColorDark: '#78350f',
    textColor: 'text-amber-600 dark:text-amber-400',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/40',
    badgeText: 'text-amber-700 dark:text-amber-300',
    badgeRing: 'ring-amber-200 dark:ring-amber-800',
  },
  fair: {
    min: 50,
    label: 'Fair',
    description: 'Some areas need improvement',
    gradientFrom: '#f97316',
    gradientTo: '#ea580c',
    bgGlow: 'from-orange-500/20 via-orange-400/5 to-transparent',
    trackColor: '#ffedd5',
    trackColorDark: '#7c2d12',
    textColor: 'text-orange-600 dark:text-orange-400',
    badgeBg: 'bg-orange-50 dark:bg-orange-950/40',
    badgeText: 'text-orange-700 dark:text-orange-300',
    badgeRing: 'ring-orange-200 dark:ring-orange-800',
  },
  poor: {
    min: 0,
    label: 'Needs Work',
    description: 'Take action to improve your health',
    gradientFrom: '#ef4444',
    gradientTo: '#dc2626',
    bgGlow: 'from-rose-500/20 via-rose-400/5 to-transparent',
    trackColor: '#fee2e2',
    trackColorDark: '#7f1d1d',
    textColor: 'text-rose-600 dark:text-rose-400',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/40',
    badgeText: 'text-rose-700 dark:text-rose-300',
    badgeRing: 'ring-rose-200 dark:ring-rose-800',
  },
} as const

type ScoreLevelKey = keyof typeof SCORE_LEVELS

function getScoreLevel(score: number) {
  if (score >= SCORE_LEVELS.excellent.min) return SCORE_LEVELS.excellent
  if (score >= SCORE_LEVELS.good.min) return SCORE_LEVELS.good
  if (score >= SCORE_LEVELS.fair.min) return SCORE_LEVELS.fair
  return SCORE_LEVELS.poor
}

// =========================================================================
// ANIMATED NUMBER
// =========================================================================

function AnimatedNumber({ value, duration = 1.2, className }: { value: number; duration?: number; className?: string }) {
  const ref = React.useRef<HTMLSpanElement>(null)
  const [displayed, setDisplayed] = React.useState(0)

  React.useEffect(() => {
    const controls = animate(0, value, {
      duration,
      ease: [0.32, 0.72, 0, 1],
      onUpdate: (v) => setDisplayed(Math.round(v)),
    })
    return () => controls.stop()
  }, [value, duration])

  return <span ref={ref} className={className}>{displayed}</span>
}

// =========================================================================
// GAUGE (CRED-inspired)
// =========================================================================

interface GaugeProps {
  score: number
  size?: number
  strokeWidth?: number
  className?: string
}

function ScoreGauge({ score, size = 180, strokeWidth = 14, className }: GaugeProps) {
  const gradientId = useId()
  const filterId = useId()
  const level = getScoreLevel(score)

  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = Math.min(Math.max(score, 0), 100) / 100

  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      {/* Glow behind the gauge */}
      <div
        className={cn('absolute inset-0 rounded-full blur-2xl opacity-40', `bg-gradient-radial ${level.bgGlow}`)}
        style={{ transform: 'scale(1.2)' }}
      />

      <svg width={size} height={size} className="relative z-10 block -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={level.gradientFrom} />
            <stop offset="100%" stopColor={level.gradientTo} />
          </linearGradient>
          <filter id={filterId}>
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={level.gradientFrom} floodOpacity="0.4" />
          </filter>
        </defs>

        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-slate-200 dark:stroke-slate-700/60"
        />

        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map((tick) => {
          const angle = (tick / 100) * 360 - 90
          const rad = (angle * Math.PI) / 180
          const outerR = radius + strokeWidth / 2 + 2
          const innerR = radius + strokeWidth / 2 - 2
          return (
            <line
              key={tick}
              x1={size / 2 + Math.cos(rad) * innerR}
              y1={size / 2 + Math.sin(rad) * innerR}
              x2={size / 2 + Math.cos(rad) * outerR}
              y2={size / 2 + Math.sin(rad) * outerR}
              className="stroke-slate-300 dark:stroke-slate-600"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          )
        })}

        {/* Progress arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          filter={`url(#${filterId})`}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - progress) }}
          transition={{ duration: 1.4, ease: [0.32, 0.72, 0, 1], delay: 0.2 }}
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
          Score
        </span>
        <span className="text-5xl font-extrabold tabular-nums text-slate-900 dark:text-white leading-none">
          <AnimatedNumber value={score} duration={1.6} />
        </span>
        <span className={cn('mt-1.5 text-sm font-bold', level.textColor)}>
          {level.label}
        </span>
      </div>
    </div>
  )
}

// =========================================================================
// SUB-SCORE BAR
// =========================================================================

const SUB_SCORE_CONFIG = [
  { key: 'savings_score' as const, label: 'Savings', icon: PiggyBank, color: '#10b981', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600' },
  { key: 'debt_score' as const, label: 'Debt', icon: Shield, color: '#3b82f6', bgColor: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600' },
  { key: 'budget_score' as const, label: 'Budget', icon: Target, color: '#f59e0b', bgColor: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600' },
  { key: 'investment_score' as const, label: 'Investing', icon: TrendingUp, color: '#8b5cf6', bgColor: 'bg-purple-100 dark:bg-purple-900/30', iconColor: 'text-purple-600' },
] as const

function SubScoreBar({
  label,
  value,
  color,
  icon: Icon,
  bgColor,
  iconColor,
  index,
}: {
  label: string
  value: number
  color: string
  icon: React.ElementType
  bgColor: string
  iconColor: string
  index: number
}) {
  const clamped = Math.min(Math.max(value, 0), 100)
  const level = clamped >= 85 ? 'Excellent' : clamped >= 70 ? 'Good' : clamped >= 50 ? 'Fair' : 'Low'

  return (
    <motion.div
      className="group"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: 0.6 + index * 0.1, ease: 'easeOut' }}
    >
      <div className="flex items-center gap-3">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', bgColor)}>
          <Icon className={cn('h-4.5 w-4.5', iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">{level}</span>
              <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">{Math.round(clamped)}</span>
            </div>
          </div>
          <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-700/60 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: color }}
              initial={{ width: 0 }}
              animate={{ width: `${clamped}%` }}
              transition={{ duration: 0.8, delay: 0.8 + index * 0.1, ease: [0.32, 0.72, 0, 1] }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// =========================================================================
// MAIN: FINANCIAL HEALTH CARD (standalone dashboard widget)
// =========================================================================

interface FinancialHealthCardProps {
  healthData: HealthScoreData
  className?: string
}

export function FinancialHealthCard({ healthData, className }: FinancialHealthCardProps) {
  const score = Math.min(Math.max(healthData.overall_score, 0), 100)
  const level = getScoreLevel(score)

  return (
    <motion.div
      className={cn(
        'relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl',
        className,
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Background glow */}
      <div className={cn('absolute -top-32 -right-32 w-80 h-80 rounded-full blur-3xl opacity-20 bg-gradient-radial', level.bgGlow)} />
      <div className="absolute -bottom-20 -left-20 w-48 h-48 rounded-full blur-3xl opacity-10 bg-gradient-to-br from-slate-300 to-transparent dark:from-slate-700" />

      <div className="relative z-10 p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 dark:from-slate-200 dark:to-slate-300 flex items-center justify-center shadow-lg">
              <Shield className="h-5 w-5 text-white dark:text-slate-900" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Financial Health</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{level.description}</p>
            </div>
          </div>
          <span className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1',
            level.badgeBg, level.badgeText, level.badgeRing,
          )}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: level.gradientFrom }} />
            {level.label}
          </span>
        </div>

        {/* Main content: Gauge + Sub-scores */}
        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-8">
          {/* Gauge */}
          <div className="flex-shrink-0">
            <ScoreGauge score={score} size={180} strokeWidth={14} />
          </div>

          {/* Sub-scores */}
          <div className="flex-1 w-full space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Breakdown</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            </div>
            {SUB_SCORE_CONFIG.map((cfg, i) => (
              <SubScoreBar
                key={cfg.key}
                label={cfg.label}
                value={healthData[cfg.key]}
                color={cfg.color}
                icon={cfg.icon}
                bgColor={cfg.bgColor}
                iconColor={cfg.iconColor}
                index={i}
              />
            ))}
          </div>
        </div>

        {/* Recommendations */}
        {healthData.recommendations && healthData.recommendations.length > 0 && (
          <motion.div
            className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Recommendations</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {healthData.recommendations.slice(0, 4).map((rec, i) => (
                <motion.div
                  key={i}
                  className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.3 + i * 0.1, duration: 0.3 }}
                >
                  <ArrowUpRight className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-600 dark:text-slate-300 leading-snug">{rec}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Next milestone */}
        {healthData.next_milestone && (
          <motion.div
            className="mt-4 flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/40 dark:to-slate-800/20 border border-slate-200 dark:border-slate-700/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5, duration: 0.4 }}
          >
            <Target className="h-5 w-5 text-indigo-500 flex-shrink-0" />
            <div className="flex-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Next Milestone</span>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{healthData.next_milestone}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300" />
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}

// =========================================================================
// COMPACT BADGE (for use in hero section inline)
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
        'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1',
        level.badgeBg, level.badgeText, level.badgeRing,
        className,
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: level.gradientFrom }} />
      <span className="tabular-nums font-bold">{score}</span>
      <span className="text-[10px] uppercase tracking-wider opacity-75">{level.label}</span>
    </span>
  )
}

// =========================================================================
// EXPORTS (backward compat)
// =========================================================================

// Keep old name working for existing imports
export const HealthScoreIndicator = FinancialHealthCard
export const HealthScoreCircle = ScoreGauge
