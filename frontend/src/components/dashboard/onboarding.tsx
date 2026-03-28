'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/store'
import { CURRENCY_CODES, CURRENCY_SYMBOLS, formatCurrency } from '@/lib/currency'
import { expenseApi } from '@/lib/api'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Wallet,
  Target,
  TrendingUp,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Check,
  Coins,
  PartyPopper,
} from 'lucide-react'

interface OnboardingProps {
  onComplete: () => void
}

const STEPS = ['Welcome', 'Currency', 'Tour', 'Expense', 'Done']
const TOTAL_STEPS = STEPS.length

const EXPENSE_CATEGORIES = [
  { value: 'food', label: 'Food & Dining' },
  { value: 'transport', label: 'Transport' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'utilities', label: 'Utilities' },
  { value: 'other', label: 'Other' },
]

const CURRENCY_LABELS: Record<string, string> = {
  INR: 'Indian Rupee',
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'British Pound',
  JPY: 'Japanese Yen',
  AUD: 'Australian Dollar',
  CAD: 'Canadian Dollar',
}

const FEATURES = [
  {
    icon: Wallet,
    title: 'Track Expenses',
    description: 'Log daily spending and categorize transactions',
    color: 'from-blue-500 to-cyan-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/40',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    icon: Target,
    title: 'Manage Budgets',
    description: 'Set spending limits and track progress',
    color: 'from-emerald-500 to-green-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/40',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
  {
    icon: TrendingUp,
    title: 'Monitor Investments',
    description: 'Track your portfolio performance',
    color: 'from-violet-500 to-purple-500',
    bgColor: 'bg-violet-50 dark:bg-violet-950/40',
    iconColor: 'text-violet-600 dark:text-violet-400',
  },
  {
    icon: CreditCard,
    title: 'EMI & Loans',
    description: 'Manage loan payments and schedules',
    color: 'from-amber-500 to-orange-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950/40',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
]

export function Onboarding({ onComplete }: OnboardingProps) {
  const user = useAuthStore((s) => s.user)
  const [step, setStep] = useState(0)
  const [selectedCurrency, setSelectedCurrency] = useState(
    user?.preferred_currency || 'INR'
  )

  // Expense form state
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseDescription, setExpenseDescription] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('food')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expenseAdded, setExpenseAdded] = useState(false)
  const [expenseError, setExpenseError] = useState('')

  const progressValue = ((step + 1) / TOTAL_STEPS) * 100

  const firstName = user?.full_name?.split(' ')[0] || 'there'

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1)
    }
  }

  const handleComplete = () => {
    localStorage.setItem('onboarding_completed', 'true')
    onComplete()
  }

  const handleAddExpense = async () => {
    if (!expenseAmount || parseFloat(expenseAmount) <= 0) {
      setExpenseError('Please enter a valid amount')
      return
    }

    setIsSubmitting(true)
    setExpenseError('')

    try {
      const today = new Date().toISOString().split('T')[0]
      await expenseApi.create({
        amount: parseFloat(expenseAmount),
        currency: selectedCurrency,
        description: expenseDescription || `${expenseCategory} expense`,
        transaction_date: today,
        payment_method: 'cash',
        tags: [expenseCategory],
      })
      setExpenseAdded(true)
      setTimeout(() => handleNext(), 1200)
    } catch {
      setExpenseError('Could not add expense. You can try again later from the dashboard.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkipExpense = () => {
    handleNext()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-sm">
      {/* Confetti animation styles (used in step 5) */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes confetti-fall {
          0% { transform: translateY(-100%) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes confetti-fall-2 {
          0% { transform: translateY(-100%) rotate(0deg) scale(0.8); opacity: 1; }
          100% { transform: translateY(100vh) rotate(-540deg) scale(0.8); opacity: 0; }
        }
        @keyframes onb-float-up {
          0% { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes onb-scale-in {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes onb-pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
          50% { box-shadow: 0 0 40px rgba(59, 130, 246, 0.6); }
        }
        .confetti-piece {
          position: absolute;
          top: -10px;
          width: 10px;
          height: 10px;
          border-radius: 2px;
          animation: confetti-fall linear forwards;
        }
        .confetti-piece:nth-child(odd) {
          animation-name: confetti-fall-2;
        }
        .animate-float-up {
          animation: onb-float-up 0.5s ease-out forwards;
        }
        .animate-scale-in {
          animation: onb-scale-in 0.4s ease-out forwards;
        }
        .animate-pulse-glow {
          animation: onb-pulse-glow 2s ease-in-out infinite;
        }
      ` }} />

      <div className="w-full max-w-2xl mx-4">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Step {step + 1} of {TOTAL_STEPS}
            </p>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {STEPS[step]}
            </p>
          </div>
          <Progress value={progressValue} className="h-2" />
        </div>

        {/* Step content */}
        <Card className="border-0 shadow-2xl dark:shadow-slate-900/50 overflow-hidden bg-white dark:bg-slate-900">
          <CardContent className="p-8 md:p-10">
            {/* Step 1: Welcome */}
            {step === 0 && (
              <div className="text-center space-y-6 animate-float-up">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/25 animate-pulse-glow">
                  <Sparkles className="w-10 h-10 text-white" />
                </div>
                <div className="space-y-3">
                  <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
                    Welcome, {firstName}! 👋
                  </h1>
                  <p className="text-lg text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                    Your personal financial tracker is ready. Let&apos;s set things up
                    so you can start managing your money smarter.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-center pt-4">
                  <Button
                    size="lg"
                    onClick={handleNext}
                    className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg shadow-blue-500/25 rounded-xl px-8 h-12 text-base font-semibold"
                  >
                    Get Started
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Takes less than 2 minutes
                </p>
              </div>
            )}

            {/* Step 2: Currency */}
            {step === 1 && (
              <div className="space-y-6 animate-float-up">
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 shadow-lg shadow-emerald-500/25">
                    <Coins className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                    Choose Your Currency
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400">
                    All your transactions will be displayed in this currency
                  </p>
                </div>

                <div className="max-w-sm mx-auto space-y-4">
                  <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Preferred Currency
                  </Label>
                  <Select
                    value={selectedCurrency}
                    onValueChange={setSelectedCurrency}
                  >
                    <SelectTrigger className="h-12 text-base rounded-xl">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_CODES.map((code) => (
                        <SelectItem key={code} value={code}>
                          <span className="flex items-center gap-2">
                            <span className="font-semibold">
                              {CURRENCY_SYMBOLS[code as keyof typeof CURRENCY_SYMBOLS]}
                            </span>
                            <span>
                              {code} — {CURRENCY_LABELS[code]}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Preview */}
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-4 space-y-2">
                    <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Preview
                    </p>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-300">
                          Salary
                        </span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(50000, selectedCurrency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-300">
                          Groceries
                        </span>
                        <span className="font-semibold text-red-500 dark:text-red-400">
                          -{formatCurrency(2500, selectedCurrency)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-300">
                          Coffee
                        </span>
                        <span className="font-semibold text-red-500 dark:text-red-400">
                          -{formatCurrency(150, selectedCurrency)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button
                    variant="ghost"
                    onClick={handleBack}
                    className="rounded-xl"
                  >
                    <ArrowLeft className="mr-2 w-4 h-4" />
                    Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg shadow-blue-500/25 rounded-xl px-6"
                  >
                    Continue
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Quick Tour */}
            {step === 2 && (
              <div className="space-y-6 animate-float-up">
                <div className="text-center space-y-3">
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                    Here&apos;s What You Can Do
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400">
                    Everything you need to manage your finances in one place
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {FEATURES.map((feature, index) => {
                    const Icon = feature.icon
                    return (
                      <div
                        key={feature.title}
                        className="animate-scale-in"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div
                          className={`rounded-xl border border-slate-200 dark:border-slate-700 p-5 ${feature.bgColor} transition-all duration-200 hover:scale-[1.02] hover:shadow-md`}
                        >
                          <div
                            className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${feature.color} shadow-sm mb-3`}
                          >
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                            {feature.title}
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                            {feature.description}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="flex justify-between pt-4">
                  <Button
                    variant="ghost"
                    onClick={handleBack}
                    className="rounded-xl"
                  >
                    <ArrowLeft className="mr-2 w-4 h-4" />
                    Back
                  </Button>
                  <Button
                    onClick={handleNext}
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg shadow-blue-500/25 rounded-xl px-6"
                  >
                    Continue
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Add First Expense */}
            {step === 3 && (
              <div className="space-y-6 animate-float-up">
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-500 shadow-lg shadow-violet-500/25">
                    <Wallet className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
                    Add Your First Expense
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400">
                    Try adding a quick expense to see how it works
                  </p>
                </div>

                {expenseAdded ? (
                  <div className="text-center py-6 space-y-3 animate-scale-in">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                      <Check className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                      Expense added successfully!
                    </p>
                  </div>
                ) : (
                  <div className="max-w-sm mx-auto space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Amount ({CURRENCY_SYMBOLS[selectedCurrency as keyof typeof CURRENCY_SYMBOLS] || selectedCurrency})
                      </Label>
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={expenseAmount}
                        onChange={(e) => {
                          setExpenseAmount(e.target.value)
                          setExpenseError('')
                        }}
                        className="h-12 text-lg rounded-xl"
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Description
                      </Label>
                      <Input
                        type="text"
                        placeholder="e.g., Morning coffee"
                        value={expenseDescription}
                        onChange={(e) => setExpenseDescription(e.target.value)}
                        className="h-12 rounded-xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        Category
                      </Label>
                      <Select
                        value={expenseCategory}
                        onValueChange={setExpenseCategory}
                      >
                        <SelectTrigger className="h-12 rounded-xl">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPENSE_CATEGORIES.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {expenseError && (
                      <p className="text-sm text-red-500 dark:text-red-400">
                        {expenseError}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <Button
                    variant="ghost"
                    onClick={handleBack}
                    className="rounded-xl"
                  >
                    <ArrowLeft className="mr-2 w-4 h-4" />
                    Back
                  </Button>
                  <div className="flex gap-3">
                    {!expenseAdded && (
                      <>
                        <Button
                          variant="outline"
                          onClick={handleSkipExpense}
                          className="rounded-xl"
                        >
                          Skip for now
                        </Button>
                        <Button
                          onClick={handleAddExpense}
                          disabled={isSubmitting}
                          className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white shadow-lg shadow-violet-500/25 rounded-xl px-6"
                        >
                          {isSubmitting ? (
                            <span className="flex items-center gap-2">
                              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Adding...
                            </span>
                          ) : (
                            'Add Expense'
                          )}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: All Done */}
            {step === 4 && (
              <div className="relative text-center space-y-6 animate-float-up overflow-hidden">
                {/* Confetti pieces */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div
                      key={i}
                      className="confetti-piece"
                      style={{
                        left: `${Math.random() * 100}%`,
                        backgroundColor: [
                          '#3B82F6',
                          '#10B981',
                          '#F59E0B',
                          '#EF4444',
                          '#8B5CF6',
                          '#EC4899',
                          '#06B6D4',
                        ][i % 7],
                        width: `${8 + Math.random() * 8}px`,
                        height: `${8 + Math.random() * 8}px`,
                        borderRadius: i % 3 === 0 ? '50%' : '2px',
                        animationDuration: `${2 + Math.random() * 3}s`,
                        animationDelay: `${Math.random() * 1.5}s`,
                      }}
                    />
                  ))}
                </div>

                <div className="relative z-10 space-y-6">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-500 shadow-lg shadow-emerald-500/25 animate-pulse-glow">
                    <PartyPopper className="w-10 h-10 text-white" />
                  </div>

                  <div className="space-y-3">
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
                      You&apos;re All Set! 🎉
                    </h2>
                    <p className="text-lg text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                      Your financial tracker is ready to go. Start adding
                      expenses, setting budgets, and taking control of your
                      finances.
                    </p>
                  </div>

                  <div className="inline-flex flex-col items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 px-6 py-4">
                    <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                      <Check className="w-5 h-5" />
                      <span className="font-medium">
                        Currency: {selectedCurrency}
                      </span>
                    </div>
                    {expenseAdded && (
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                        <Check className="w-5 h-5" />
                        <span className="font-medium">
                          First expense added
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-4">
                    <Button
                      size="lg"
                      onClick={handleComplete}
                      className="w-full sm:w-auto bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white shadow-lg shadow-emerald-500/25 rounded-xl px-10 h-12 text-base font-semibold"
                    >
                      Go to Dashboard
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step indicators */}
        <div className="flex justify-center gap-2 mt-6">
          {STEPS.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === step
                  ? 'w-8 bg-blue-500'
                  : index < step
                    ? 'w-2 bg-blue-400'
                    : 'w-2 bg-slate-300 dark:bg-slate-600'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
