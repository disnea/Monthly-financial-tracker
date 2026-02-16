import { 
  Wallet, ShoppingBag, Utensils, Car, Home, Heart, Film, 
  Briefcase, TrendingUp, Gift, MoreHorizontal, Receipt 
} from 'lucide-react'

// Fixed icon mapping that matches backend icon names
export const categoryIcons: Record<string, any> = {
  // Backend icons → Lucide components
  'utensils': Utensils,
  'car': Car,
  'shopping': ShoppingBag,
  'home': Home,
  'heart': Heart,
  'film': Film,
  'folder': Wallet,
  
  // Income categories (if added later)
  'briefcase': Briefcase,
  'trending-up': TrendingUp,
  'gift': Gift,
  'other': MoreHorizontal,
  
  // Fallback
  'default': Receipt
}

// Helper function to get icon by name
export const getCategoryIcon = (iconName?: string) => {
  return categoryIcons[iconName || 'default'] || categoryIcons.default
}
