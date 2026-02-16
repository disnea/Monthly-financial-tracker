import axios from 'axios'

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:8001'
const FINANCE_URL = process.env.NEXT_PUBLIC_FINANCE_URL || 'http://localhost:8002'
const EMI_URL = process.env.NEXT_PUBLIC_EMI_URL || 'http://localhost:8003'
const INVESTMENT_URL = process.env.NEXT_PUBLIC_INVESTMENT_URL || 'http://localhost:8004'
const MARKET_URL = process.env.NEXT_PUBLIC_MARKET_URL || 'http://localhost:8005'
const EXPORT_URL = process.env.NEXT_PUBLIC_EXPORT_URL || 'http://localhost:8006'

// Separate API instances for each service
export const authApiClient = axios.create({
  baseURL: AUTH_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const financeApiClient = axios.create({
  baseURL: FINANCE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const emiApiClient = axios.create({
  baseURL: EMI_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const investmentApiClient = axios.create({
  baseURL: INVESTMENT_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const exportApiClient = axios.create({
  baseURL: EXPORT_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Keep the generic one for backwards compatibility
export const api = authApiClient

// Shared interceptor: attach auth token to every request
const addAuthToken = (config: any) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
}

const handle401 = (error: any) => {
  if (error.response?.status === 401) {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    window.location.href = '/login'
  }
  return Promise.reject(error)
}

authApiClient.interceptors.request.use(addAuthToken)
authApiClient.interceptors.response.use((r) => r, handle401)

financeApiClient.interceptors.request.use(addAuthToken)
financeApiClient.interceptors.response.use((r) => r, handle401)

emiApiClient.interceptors.request.use(addAuthToken)
emiApiClient.interceptors.response.use((r) => r, handle401)

investmentApiClient.interceptors.request.use(addAuthToken)
investmentApiClient.interceptors.response.use((r) => r, handle401)

exportApiClient.interceptors.request.use(addAuthToken)
exportApiClient.interceptors.response.use((r) => r, handle401)

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  full_name: string
  tenant_name: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: {
    id: string
    tenant_id: string
    email: string
    full_name: string
    role: string
    preferred_currency: string
    preferred_language: string
  }
}

export const authApi = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await authApiClient.post('/login', data)
    return response.data
  },
  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await authApiClient.post('/register', data)
    return response.data
  },
  me: async (): Promise<AuthResponse['user']> => {
    const response = await authApiClient.get('/me')
    return response.data
  },
}

export interface Expense {
  id: string
  amount: number
  currency: string
  description?: string | null
  transaction_date: string        // "YYYY-MM-DD"
  payment_method?: string | null
  category_id?: string | null
  created_at: string

  // new:
  category_name?: string | null
  category_color?: string | null
  category_icon?: string | null
}

export interface ExpenseCreatePayload {
  category_id?: string | null
  amount: number
  currency: string
  description?: string
  transaction_date: string       // "YYYY-MM-DD"
  payment_method?: string
  tags?: string[]
}

export const expenseApi = {
  list(): Promise<Expense[]> {
    return financeApiClient.get('/expenses').then(r => r.data)
  },
  create(data: ExpenseCreatePayload): Promise<Expense> {
    return financeApiClient.post('/expenses', data).then(r => r.data)
  },
  update(id: string, data: ExpenseCreatePayload): Promise<Expense> {
    return financeApiClient.put(`/expenses/${id}`, data).then(r => r.data)
  },
  delete(id: string): Promise<void> {
    return financeApiClient.delete(`/expenses/${id}`).then(() => {})
  },
}

export interface Category {
  id: string
  name: string
  type: string          // e.g. 'expense'
  color: string
  icon: string
  is_system: boolean
}

export const categoryApi = {
  list(): Promise<Category[]> {
    return financeApiClient.get('/categories').then(r => r.data)
  },
  create(data: { name: string; type: string; color: string; icon: string }): Promise<Category> {
    return financeApiClient.post('/categories', data).then(r => r.data)
  },
  update(id: string, data: { name: string; type: string; color: string; icon: string }): Promise<Category> {
    return financeApiClient.put(`/categories/${id}`, data).then(r => r.data)
  },
  delete(id: string): Promise<void> {
    return financeApiClient.delete(`/categories/${id}`).then(r => r.data)
  },
}

export interface Budget {
  id?: string
  name: string
  amount: number
  currency: string
  period: string
  start_date: string
  end_date: string
  alert_threshold?: number
  category_id?: string
}

export const budgetApi = {
  create: async (data: Budget) => {
    const response = await financeApiClient.post('/budgets', data)
    return response.data
  },
  list: async () => {
    const response = await financeApiClient.get('/budgets')
    return response.data
  },
  update: async (id: string, data: Partial<Budget>) => {
    const response = await financeApiClient.put(`/budgets/${id}`, data)
    return response.data
  },
  delete: async (id: string) => {
    const response = await financeApiClient.delete(`/budgets/${id}`)
    return response.data
  },
}

// EMI Interfaces and API
export interface EMI {
  id?: string
  loan_type: string
  lender_name: string
  account_number?: string
  principal_amount: number
  currency: string
  interest_rate: number
  interest_type?: string
  tenure_months: number
  start_date: string
  notes?: string
  monthly_emi?: number
  total_interest?: number
  total_amount?: number
  paid_months?: number
  remaining_amount?: number
  remaining_principal?: number
  remaining_interest?: number
}

export interface EMIPayment {
  id: string
  installment_number: number
  due_date: string
  paid_date?: string
  amount: number
  principal_component: number
  interest_component: number
  outstanding_balance: number
  status: string
}

export const emiApi = {
  create: async (data: EMI) => {
    const response = await emiApiClient.post('/emis', data)
    return response.data
  },
  list: async () => {
    const response = await emiApiClient.get('/emis')
    return response.data
  },
  get: async (id: string) => {
    const response = await emiApiClient.get(`/emis/${id}`)
    return response.data
  },
  update: async (id: string, data: Partial<EMI>) => {
    const response = await emiApiClient.put(`/emis/${id}`, data)
    return response.data
  },
  delete: async (id: string) => {
    const response = await emiApiClient.delete(`/emis/${id}`)
    return response.data
  },
  getSchedule: async (emiId: string): Promise<EMIPayment[]> => {
    const response = await emiApiClient.get(`/emis/${emiId}/schedule`)
    return response.data
  },
  markPaymentPaid: async (paymentId: string, paidDate: string) => {
    const response = await emiApiClient.put(`/payments/${paymentId}/mark-paid?paid_date=${paidDate}`)
    return response.data
  },
}

// Borrowing Interfaces and API
export interface Borrowing {
  id?: string
  lender_name: string
  lender_contact?: string | null
  principal_amount: number
  currency: string
  interest_rate: number
  interest_type: string  // 'none', 'simple', 'compound'
  borrowed_date: string
  due_date?: string | null
  purpose?: string | null
  tags?: string[] | null
  status?: string  // 'open', 'partially_paid', 'closed'
  total_repaid?: number
  remaining_amount?: number
  notes?: string | null
  closed_at?: string | null
  created_at?: string
  repayments?: BorrowingRepayment[]
}

export interface BorrowingRepayment {
  id?: string
  amount: number
  repayment_date: string
  payment_method?: string | null
  reference_number?: string | null
  note?: string | null
  close_borrowing?: boolean
  created_at?: string
}

export const borrowingApi = {
  list: async (status?: string, lender?: string) => {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    if (lender) params.append('lender', lender)
    const response = await financeApiClient.get(`/borrowings?${params}`)
    return response.data
  },
  get: async (id: string) => {
    const response = await financeApiClient.get(`/borrowings/${id}`)
    return response.data
  },
  create: async (data: Borrowing) => {
    const response = await financeApiClient.post('/borrowings', data)
    return response.data
  },
  update: async (id: string, data: Borrowing) => {
    const response = await financeApiClient.put(`/borrowings/${id}`, data)
    return response.data
  },
  delete: async (id: string) => {
    const response = await financeApiClient.delete(`/borrowings/${id}`)
    return response.data
  },
  close: async (id: string) => {
    const response = await financeApiClient.post(`/borrowings/${id}/close`)
    return response.data
  },
  reopen: async (id: string) => {
    const response = await financeApiClient.post(`/borrowings/${id}/reopen`)
    return response.data
  },
  listRepayments: async (borrowingId: string) => {
    const response = await financeApiClient.get(`/borrowings/${borrowingId}/repayments`)
    return response.data
  },
  createRepayment: async (borrowingId: string, data: BorrowingRepayment) => {
    const response = await financeApiClient.post(`/borrowings/${borrowingId}/repayments`, data)
    return response.data
  },
  updateRepayment: async (borrowingId: string, repaymentId: string, data: BorrowingRepayment) => {
    const response = await financeApiClient.put(`/borrowings/${borrowingId}/repayments/${repaymentId}`, data)
    return response.data
  },
  deleteRepayment: async (borrowingId: string, repaymentId: string) => {
    const response = await financeApiClient.delete(`/borrowings/${borrowingId}/repayments/${repaymentId}`)
    return response.data
  },
}

export const aiApi = {
  categorize: async (description: string, amount?: number) => {
    const response = await financeApiClient.post('/categorize', { description, amount })
    return response.data
  },
  budgetSuggestions: async () => {
    const response = await financeApiClient.get('/budget-suggestions')
    return response.data
  },
  anomalies: async () => {
    const response = await financeApiClient.get('/anomalies')
    return response.data
  },
}

// Investment Interfaces and API
export interface Investment {
  id?: string
  investment_type: string
  asset_name: string
  asset_symbol?: string
  quantity: number
  purchase_price: number
  current_price?: number
  current_value?: number           // renamed from total_value
  unrealized_gain_loss?: number    // renamed from profit_loss
  gain_loss_percentage?: number    // renamed from profit_loss_percentage
  currency: string
  purchase_date: string
  notes?: string
}

// Income Interfaces and API
export interface Income {
  id?: string
  source: string  // salary, freelance, dividends, rental, gift, other
  amount: number
  currency: string
  income_date: string
  description?: string | null
  is_recurring: boolean
  recurrence_period?: string | null  // monthly, weekly, yearly
  notes?: string | null
  created_at?: string
}

export const incomeApi = {
  list: async (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    const response = await financeApiClient.get(`/income?${params}`)
    return response.data
  },
  get: async (id: string) => {
    const response = await financeApiClient.get(`/income/${id}`)
    return response.data
  },
  create: async (data: Income) => {
    const response = await financeApiClient.post('/income', data)
    return response.data
  },
  update: async (id: string, data: Income) => {
    const response = await financeApiClient.put(`/income/${id}`, data)
    return response.data
  },
  delete: async (id: string) => {
    const response = await financeApiClient.delete(`/income/${id}`)
    return response.data
  },
  summary: async () => {
    const response = await financeApiClient.get('/income/summary')
    return response.data
  },
}

// Lending Interfaces and API
export interface Lending {
  id?: string
  borrower_name: string
  borrower_contact?: string | null
  principal_amount: number
  currency: string
  interest_rate: number
  interest_type: string  // 'none', 'simple', 'compound'
  lent_date: string
  due_date?: string | null
  purpose?: string | null
  status?: string  // 'open', 'partially_received', 'closed'
  total_received?: number
  remaining_amount?: number
  notes?: string | null
  closed_at?: string | null
  created_at?: string
  collections?: LendingCollection[]
}

export interface LendingCollection {
  id?: string
  amount: number
  collection_date: string
  payment_method?: string | null
  reference_number?: string | null
  note?: string | null
  close_lending?: boolean
  created_at?: string
}

export const lendingApi = {
  list: async (status?: string, borrower?: string) => {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    if (borrower) params.append('borrower', borrower)
    const response = await financeApiClient.get(`/lendings?${params}`)
    return response.data
  },
  get: async (id: string) => {
    const response = await financeApiClient.get(`/lendings/${id}`)
    return response.data
  },
  create: async (data: Lending) => {
    const response = await financeApiClient.post('/lendings', data)
    return response.data
  },
  update: async (id: string, data: Lending) => {
    const response = await financeApiClient.put(`/lendings/${id}`, data)
    return response.data
  },
  delete: async (id: string) => {
    const response = await financeApiClient.delete(`/lendings/${id}`)
    return response.data
  },
  close: async (id: string) => {
    const response = await financeApiClient.post(`/lendings/${id}/close`)
    return response.data
  },
  reopen: async (id: string) => {
    const response = await financeApiClient.post(`/lendings/${id}/reopen`)
    return response.data
  },
  listCollections: async (lendingId: string) => {
    const response = await financeApiClient.get(`/lendings/${lendingId}/collections`)
    return response.data
  },
  createCollection: async (lendingId: string, data: LendingCollection) => {
    const response = await financeApiClient.post(`/lendings/${lendingId}/collections`, data)
    return response.data
  },
  updateCollection: async (lendingId: string, collectionId: string, data: LendingCollection) => {
    const response = await financeApiClient.put(`/lendings/${lendingId}/collections/${collectionId}`, data)
    return response.data
  },
  deleteCollection: async (lendingId: string, collectionId: string) => {
    const response = await financeApiClient.delete(`/lendings/${lendingId}/collections/${collectionId}`)
    return response.data
  },
}

export const investmentApi = {
  create: async (data: Investment) => {
    const response = await investmentApiClient.post('/investments', data)
    return response.data
  },
  list: async () => {
    const response = await investmentApiClient.get('/investments')
    return response.data
  },
  get: async (id: string) => {
    const response = await investmentApiClient.get(`/investments/${id}`)
    return response.data
  },
  update: async (id: string, data: Partial<Investment>) => {
    const response = await investmentApiClient.put(`/investments/${id}`, data)
    return response.data
  },
  delete: async (id: string) => {
    const response = await investmentApiClient.delete(`/investments/${id}`)
    return response.data
  },
}
