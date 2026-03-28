export interface ExpenseResponse {
  id: string
  amount: number
  currency: string
  description?: string | null
  transaction_date: string
  payment_method?: string | null
  category_id?: string | null
  created_at: string
  category_name?: string | null
  category_color?: string | null
  category_icon?: string | null
}
