'use client'

interface TimeframeSelectorProps {
  selected: string
  onSelect: (timeframe: string) => void
}

const timeframes = [
  { label: '1D', value: '1day' },
  { label: '1W', value: '1week' },
  { label: '1M', value: '1month' },
  { label: '3M', value: '3month' },
  { label: '6M', value: '6month' },
  { label: '1Y', value: '1year' },
  { label: 'ALL', value: 'all' },
]

export default function TimeframeSelector({ selected, onSelect }: TimeframeSelectorProps) {
  return (
    <div className="flex gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
      {timeframes.map((tf) => (
        <button
          key={tf.value}
          onClick={() => onSelect(tf.value)}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
            selected === tf.value
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/50'
              : 'text-slate-400 hover:text-white hover:bg-slate-700'
          }`}
        >
          {tf.label}
        </button>
      ))}
    </div>
  )
}
