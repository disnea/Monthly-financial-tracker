// Helper functions for dynamic category colors
export const getCategoryColor = (color?: string) => {
  if (!color) return 'bg-gray-500'
  
  // Convert hex color to Tailwind class
  const colorMap: Record<string, string> = {
    '#f97316': 'bg-orange-500',
    '#3b82f6': 'bg-blue-500', 
    '#3B82F6': 'bg-blue-500',
    '#a855f7': 'bg-purple-500',
    '#8b5cf6': 'bg-purple-500',
    '#10b981': 'bg-green-500',
    '#06b6d4': 'bg-cyan-500',
    '#84cc16': 'bg-lime-500',
    '#f59e0b': 'bg-amber-500',
    '#ef4444': 'bg-red-500',
    '#ec4899': 'bg-pink-500',
    '#64748b': 'bg-gray-500',
  }
  
  return colorMap[color] || 'bg-gray-500'
}

export const getCategoryGradient = (color?: string) => {
  if (!color) return 'from-gray-500 to-gray-600'
  
  const gradientMap: Record<string, string> = {
    '#f97316': 'from-orange-500 to-red-500',
    '#3b82f6': 'from-blue-500 to-cyan-500',
    '#a855f7': 'from-purple-500 to-pink-500', 
    '#10b981': 'from-green-500 to-emerald-500',
    '#ef4444': 'from-red-500 to-pink-500',
    '#ec4899': 'from-pink-500 to-rose-500',
    '#64748b': 'from-gray-500 to-slate-500',
  }
  
  return gradientMap[color] || 'from-gray-500 to-gray-600'
}
