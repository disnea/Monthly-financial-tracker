# Financial Tracker Frontend

Production-grade frontend built with Next.js 14, TypeScript, Tailwind CSS, and shadcn/ui.

## 🎨 Features

- **Modern UI**: Beautiful, responsive design with shadcn/ui components
- **Authentication**: Secure login and registration pages
- **Dashboard**: Comprehensive overview with stats and charts
- **Expense Tracking**: Add and manage expenses
- **Budget Management**: Create and monitor budgets
- **EMI Calculator**: Track loans and payments
- **Investment Portfolio**: Monitor investments and gains/losses
- **Real-time Data**: Integrated with backend APIs
- **State Management**: Zustand for client state
- **Type Safety**: Full TypeScript support
- **Responsive**: Mobile-first design

## 🚀 Getting Started

### Install Dependencies

```bash
cd frontend
npm install
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## 📁 Project Structure

```
src/
├── app/                      # Next.js 14 App Router
│   ├── page.tsx             # Home page (redirects)
│   ├── login/               # Login page
│   ├── register/            # Registration page
│   └── dashboard/           # Dashboard pages
│       ├── layout.tsx       # Dashboard layout with sidebar
│       ├── page.tsx         # Dashboard home
│       ├── expenses/        # Expense management
│       ├── budgets/         # Budget management
│       ├── emi/             # EMI/Loan tracking
│       └── investments/     # Investment portfolio
├── components/
│   ├── ui/                  # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── label.tsx
│   └── dashboard/
│       └── sidebar.tsx      # Dashboard navigation
├── lib/
│   ├── api.ts              # API client & endpoints
│   ├── store.ts            # Zustand state management
│   └── utils.ts            # Utility functions
└── globals.css             # Global styles
```

## 🎨 UI Components

Built with **shadcn/ui** - a collection of re-usable components:

- ✅ Button
- ✅ Card
- ✅ Input
- ✅ Label
- ✅ Dialog
- ✅ Dropdown Menu
- ✅ Select
- ✅ Tabs
- ✅ Toast notifications (sonner)
- ✅ Avatar
- ✅ Tooltip

## 🔐 Authentication Flow

1. **Register**: Create account with email, password, name, and organization
2. **Login**: Authenticate and receive JWT token
3. **Protected Routes**: Dashboard pages require authentication
4. **Auto-redirect**: Logged-in users go to dashboard, others to login

## 📊 Dashboard Features

### Overview Page
- Financial statistics cards
- Recent transactions list
- Budget progress bars
- Quick action buttons

### Expense Management
- Add new expenses with categories
- View expense history
- Filter and search
- Multi-currency support

### Budget Tracking
- Create monthly/yearly budgets
- Category-wise tracking
- Alert when threshold exceeded
- Visual progress indicators

### EMI/Loan Management
- Add new loans with details
- View payment schedules
- Track outstanding balance
- Mark payments as paid

### Investment Portfolio
- Add investments (stocks, crypto, etc.)
- Track current value
- Calculate gains/losses
- Portfolio analytics

## 🎨 Design System

### Colors
- Primary: Blue
- Secondary: Purple
- Success: Green
- Danger: Red
- Muted: Gray

### Typography
- Font: Inter (Google Fonts)
- Headings: Bold, tracking-tight
- Body: Regular, comfortable line-height

### Spacing
- Consistent padding/margins
- Gap utilities for flex/grid
- Responsive spacing scales

## 🔌 API Integration

All API calls are centralized in `src/lib/api.ts`:

```typescript
import { authApi, expenseApi, budgetApi } from '@/lib/api'

// Login
const { user, access_token } = await authApi.login({ email, password })

// Create expense
await expenseApi.create({
  amount: 100,
  currency: 'USD',
  description: 'Lunch',
  transaction_date: '2024-02-02'
})
```

## 🗂️ State Management

Using Zustand for global state:

```typescript
import { useAuthStore } from '@/lib/store'

const { user, token, setAuth, clearAuth } = useAuthStore()
```

## 📱 Responsive Design

- **Mobile**: Single column, collapsible sidebar
- **Tablet**: Two columns, compact sidebar
- **Desktop**: Full layout with expanded sidebar

## 🎯 Next Steps

1. **Install dependencies**: `npm install`
2. **Run development server**: `npm run dev`
3. **Open in browser**: `http://localhost:3000`
4. **Register an account**: Click "Sign up"
5. **Explore dashboard**: View your financial data

## 🔧 Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost
```

## 📝 Notes

- TypeScript errors will resolve after running `npm install`
- Ensure backend services are running on port 8001-8006
- JWT tokens are stored in localStorage and Zustand state
- All routes except login/register require authentication

## 🎨 Customization

### Change Theme Colors

Edit `tailwind.config.ts` to customize the color scheme.

### Add New Pages

1. Create new page in `src/app/dashboard/[page-name]/page.tsx`
2. Add route to sidebar in `src/components/dashboard/sidebar.tsx`
3. Create API functions in `src/lib/api.ts`

### Add shadcn/ui Components

```bash
npx shadcn-ui@latest add [component-name]
```

## 🚀 Production Ready

This frontend is production-grade with:

- ✅ TypeScript for type safety
- ✅ Modern React patterns (hooks, server components where appropriate)
- ✅ Accessible UI components
- ✅ Responsive design
- ✅ Error handling
- ✅ Loading states
- ✅ Toast notifications
- ✅ Protected routes
- ✅ Clean code structure
- ✅ Scalable architecture

**Your production-grade UI is ready to use!** 🎉
