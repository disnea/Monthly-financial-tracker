import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api'

// Debug: Log the API URL
console.log('🔗 API_URL configured as:', API_URL)
console.log('🔗 Using Nginx API Gateway with path-based routing')

// Separate API instances for each service using nginx gateway paths
export const authApiClient = axios.create({
  baseURL: `${API_URL}/auth`,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const financeApiClient = axios.create({
  baseURL: `${API_URL}/finance`,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const emiApiClient = axios.create({
  baseURL: `${API_URL}/emi`,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const investmentApiClient = axios.create({
  baseURL: `${API_URL}/investment`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Keep the generic one for backwards compatibility
export const api = authApiClient

// Add interceptors to auth client
authApiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  console.log('🔐 Auth API Request:', config.method?.toUpperCase(), config.url)
  console.log('🎫 Token from localStorage:', token ? 'EXISTS' : 'MISSING')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
    console.log('✅ Token added to headers')
  } else {
    console.warn('⚠️ No token found in localStorage')
  }
  return config
})

authApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('⚠️ Auth API returned 401 Unauthorized')
    }
    return Promise.reject(error)
  }
)

// Add interceptors to finance client
financeApiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  console.log('💰 Finance API Request:', config.method?.toUpperCase(), config.url)
  console.log('🎫 Token from localStorage:', token ? token.substring(0, 20) + '...' : 'MISSING')
  console.log('🔍 Full token length:', token ? token.length : 0)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
    console.log('✅ Token added to headers:', `Bearer ${token.substring(0, 20)}...`)
    console.log('📋 Full headers:', JSON.stringify(config.headers))
  } else {
    console.warn('⚠️ No token found in localStorage')
  }
  return config
})

financeApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('⚠️ Finance API returned 401 Unauthorized')
    }
    return Promise.reject(error)
  }
)

// Add interceptors to EMI client
emiApiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  console.log('🏠 EMI API Request:', config.method?.toUpperCase(), config.url)
  console.log('🎫 Token from localStorage:', token ? 'EXISTS' : 'MISSING')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
    console.log('✅ Token added to headers')
  } else {
    console.warn('⚠️ No token found in localStorage')
  }
  return config
})

emiApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('⚠️ EMI API returned 401 Unauthorized')
    }
    return Promise.reject(error)
  }
)

// Add interceptors to Investment client
investmentApiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  console.log('📈 Investment API Request:', config.method?.toUpperCase(), config.url)
  console.log('🎫 Token from localStorage:', token ? 'EXISTS' : 'MISSING')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
    console.log('✅ Token added to headers')
  } else {
    console.warn('⚠️ No token found in localStorage')
  }
  return config
})

investmentApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('⚠️ Investment API returned 401 Unauthorized')
    }
    return Promise.reject(error)
  }
)

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
  currency: string
  purchase_date: string
  notes?: string
  total_value?: number
  profit_loss?: number
  profit_loss_percentage?: number
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
