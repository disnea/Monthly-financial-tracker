import { useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { categoryApi, type Category } from '@/lib/api'

const DEFAULT_CATEGORY_COLOR = '#64748b'
const DEFAULT_CATEGORY_ICON = 'folder'

export function useCategories() {
  const query = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryApi.list(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })

  const categories = query.data ?? []

  const categoriesById = useMemo(() => {
    return categories.reduce<Record<string, Category>>((acc, category) => {
      acc[category.id] = category
      return acc
    }, {})
  }, [categories])

  const expenseCategories = useMemo(
    () => categories.filter((category) => category.type === 'expense'),
    [categories]
  )

  const incomeCategories = useMemo(
    () => categories.filter((category) => category.type === 'income'),
    [categories]
  )

  const getCategory = useCallback(
    (categoryId?: string | null) => {
      if (!categoryId) return undefined
      return categoriesById[categoryId]
    },
    [categoriesById]
  )

  const getCategoryColor = useCallback(
    (categoryId?: string | null) => {
      return getCategory(categoryId)?.color ?? DEFAULT_CATEGORY_COLOR
    },
    [getCategory]
  )

  const getCategoryIcon = useCallback(
    (categoryId?: string | null) => {
      return getCategory(categoryId)?.icon ?? DEFAULT_CATEGORY_ICON
    },
    [getCategory]
  )

  const getCategoryLabel = useCallback(
    (categoryId?: string | null) => {
      return getCategory(categoryId)?.name ?? 'Uncategorized'
    },
    [getCategory]
  )

  return {
    categories,
    expenseCategories,
    incomeCategories,
    categoriesById,
    getCategory,
    getCategoryColor,
    getCategoryIcon,
    getCategoryLabel,
    ...query,
  }
}
