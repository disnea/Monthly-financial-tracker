# FinanceTracker — Design Review & Feature Proposals

---

## Section 1: UI/UX Improvements for Existing Screens

---

### 1.1 Global / Cross-Cutting Issues

#### Usability Issues
- **Fake data shown to authenticated users**: Dashboard falls back to `sampleStats` (hardcoded ₹61,000 expenses, 3 loans, etc.) when real data is empty. Users see numbers that aren't theirs. Monthly trend chart (`monthlyTrendData`) is always hardcoded — never real.
- **Hardcoded metrics**: Net worth `+8.2%` badge, cash flow income of `₹95,000` are static values. This is actively misleading.
- **Debug console.log everywhere**: Login page has 15+ console.log statements. API interceptors log tokens. Dashboard layout logs auth checks. These leak sensitive data to browser console.
- **`confirm()` dialogs**: Delete actions use browser `confirm()` — ugly, not branded, not accessible. Replace with shadcn AlertDialog.
- **Raw `<select>` elements**: Expense form (category, payment method), EMI form (interest type) use unstyled `<select>` instead of shadcn Select component. They look out of place.
- **No mobile navigation**: Sidebar has no hamburger/drawer for mobile. On small screens, the 72px/288px sidebar eats the viewport.
- **Missing nav items**: Export and Market services exist in the backend but have no sidebar entries.

#### Visual Design
- **Inconsistent page gradients**: Expenses uses indigo→purple, EMI uses blue→cyan, Budgets uses amber→orange. This is fine for differentiation, but the hero section gradient blobs differ per page with no system.
- **Overly aggressive hover effects**: `hover:scale-[1.02]` on EMI cards and expense cards causes layout jitter on lists. Prefer shadow/border changes over scale transforms for list items.
- **Typography scale**: Page headers use `text-3xl`, stat values use `text-2xl`, card titles use `text-xl`. This is generally fine but section labels like "Filter by Category" use `text-xs uppercase tracking-wider` which is very small.

#### Accessibility
- **No focus-visible styles**: Tab navigation through sidebar, cards, and buttons shows no visible focus ring.
- **Color-only status indicators**: Budget progress (green/amber/red) and EMI payment status (green/white) rely solely on color. Add icons or text labels.
- **Calendar day buttons**: Mini-calendar in expenses has no ARIA labels. Screen readers can't distinguish days with expenses from empty days.
- **Contrast issues**: `text-[10px] text-slate-500` (sidebar descriptions, card labels) fails WCAG AA contrast ratio on white/slate backgrounds.

---

### 1.2 Screen-by-Screen Review

---

#### LOGIN PAGE

**Issues Found:**
1. `setTimeout(200ms)` for redirect after login — fragile, race condition-prone
2. No password visibility toggle (eye icon)
3. No "Forgot Password" link
4. No "Remember Me" checkbox
5. 15+ debug console.logs leak auth tokens to browser console
6. No loading skeleton — just a spinner

**Quick Wins:**
- Add eye icon toggle on password field using `useState` for visibility
- Remove all `console.log` debug statements
- Replace `setTimeout` redirect with `await router.push()` directly after `setAuth()`

**Medium Effort:**
- Add "Forgot Password" flow (even if it just shows a message for now)
- Add proper form validation with inline error messages (red border + text below input)
- Add social login buttons (Google/GitHub) as visual placeholders

**Bigger Changes:**
- Add onboarding flow after first registration (set currency, add first expense)

---

#### DASHBOARD

**Issues Found:**
1. **Fake data masquerading as real**: `sampleStats` object shows ₹61,000 expenses when user has none. `monthlyTrendData` is always Jan-Jun hardcoded — never reflects actual data.
2. Net worth `+8.2%` badge is static — always green, always 8.2%
3. Cash flow calculation uses hardcoded income `95000` (line 137)
4. No income tracking exists in the system, yet dashboard shows income in the trend chart
5. Pie chart legend doesn't show amounts, only category names
6. Recent transactions show numbered circles (1,2,3) instead of category icons
7. Quick actions are all "navigate to page" — no inline add-expense shortcut

**Quick Wins:**
- Remove `sampleStats` fallback — show real zeros with meaningful empty states instead
- Remove hardcoded `+8.2%` badge or label it as "sample data"
- Add amounts to pie chart legend items
- Show category icons on recent transactions instead of numbered circles

**Medium Effort:**
- Build real monthly trend data from expense history (aggregate by month)
- Replace fake net worth calculation with: `investments - total_outstanding_EMI_principal`
- Add an "Add Expense" floating action button (FAB) on mobile
- Budget progress bars on dashboard (top 3 budgets with utilization)

**Bigger Changes:**
- Add income tracking (new model + API + form) to make cash flow real
- Add a "Financial Health Score" widget (0-100 based on budget adherence, savings rate, debt-to-income)
- Add due date alerts: "EMI due in 3 days", "Budget 90% used" as real-time cards

---

#### EXPENSES PAGE

**Issues Found:**
1. Sidebar toggle button uses `fixed` positioning with `left-[calc(33.333%-1rem)]` — breaks on different screen widths
2. Calendar sidebar is always visible on desktop, wastes space when filtering isn't needed
3. `<select>` for category and payment method don't match design system
4. No pagination — all expenses load at once (performance issue with 1000+ records)
5. Amount input accepts negative values
6. No currency symbol shown next to amount input
7. Import only supports CSV — no format guidance shown
8. Date headers use `sticky top-20` which can overlap with the sticky header bar
9. Edit/Delete buttons are `opacity-0` until hover — invisible on touch devices

**Quick Wins:**
- Replace `<select>` with shadcn `Select` component
- Add `min="0.01"` to amount input
- Show currency symbol as InputAdornment: `₹ [____]`
- Make edit/delete buttons always visible on mobile (detect touch)
- Add CSV format hint text near Import button

**Medium Effort:**
- Add pagination or infinite scroll (load 50 at a time)
- Replace fixed sidebar toggle with a proper responsive drawer (Sheet component)
- Add receipt photo upload (camera icon) per expense
- Add recurring expense toggle with frequency selector

**Bigger Changes:**
- Implement bank statement parser with column mapping UI
- Add split expense feature (split ₹3000 dinner between Food + Entertainment)
- Expense analytics view: category trends over time, day-of-week patterns

---

#### EMI LOANS PAGE

**Issues Found:**
1. Form submit button always says "Add Loan" even when `editingEmi` is set (line 566)
2. No confirmation before "Mark Paid" on installments
3. Schedule modal can show 240+ installments with no pagination/virtualization
4. Loan type is a free-text input — should be a categorized dropdown
5. No "Prepay" action despite `prepayment_allowed` field in the model
6. No visual indicator for overdue payments in the schedule
7. Account number field exists in model but not in the form

**Quick Wins:**
- Fix submit button: `{editingEmi ? 'Save Changes' : 'Add Loan'}`
- Add overdue styling: red background for payments past due date
- Add loan type dropdown: Home, Car, Personal, Education, Gold, Other
- Show account number field in the form

**Medium Effort:**
- Add prepayment flow: "Make Extra Payment" button that recalculates schedule
- Virtualize schedule list (react-virtual) for loans with 100+ installments
- Add loan comparison tool: side-by-side two loans with different terms
- Add "Next Payment Due" alert card at the top of the page

**Bigger Changes:**
- Add amortization chart (principal vs interest over time) using Area chart
- Add loan closure flow with final settlement amount calculation
- Add document upload per loan (agreement PDFs)

---

#### INVESTMENTS PAGE

**Issues Found:**
1. Stock API calls use `fetch()` while rest of app uses `axios` — inconsistent error handling
2. No loading state for the investments table itself (only for stock chart)
3. Add Investment form is in the same page — complex page doing too much
4. Stock search uses `localStorage.getItem('auth_token')` directly instead of the store
5. No portfolio summary (total invested, current value, total P&L)
6. No way to update current price of an investment manually
7. Symbol conflict: JS `symbol` variable (currency symbol) collides with stock `symbol` display

**Quick Wins:**
- Switch stock API calls to use `investmentApiClient` with axios
- Fix the variable naming conflict (`symbol` → `currencySymbol`)
- Add portfolio summary stats bar (like other pages have)

**Medium Effort:**
- Separate "Portfolio" tab and "Market Research" tab
- Add "Sell/Exit" action for investments to record realized gains
- Add dividend tracking per investment
- Show investment allocation pie chart (by type: stocks, mutual funds, etc.)

**Bigger Changes:**
- Add XIRR calculation for true portfolio returns
- Goal-based investing view: "Retirement Fund: ₹5L/₹50L (10%)"
- Import from broker statements (Zerodha, Groww CSV formats)

---

#### BUDGETS PAGE

**Issues Found:**
1. No visual connection between budgets and actual expenses — `spent` field exists but may not auto-update
2. No period selector UI to view past months' budgets
3. Budget names are free text — no category linkage is visible in the UI
4. No rollover option (carry unused budget to next month)

**Quick Wins:**
- Show a "remaining days in period" indicator on each budget card
- Add a "most overspent" highlight badge

**Medium Effort:**
- Add category picker that auto-links budget to expense categories for tracking
- Add month/week period navigation at the top
- Add budget vs actual bar chart comparison

**Bigger Changes:**
- Auto-create budgets based on last 3 months' average spending per category
- Add budget templates: "Conservative", "Balanced", "Aggressive Saver"

---

#### SETTINGS PAGE

**Issues Found:**
1. `handleDeleteAccount` doesn't actually call any API (line 69-80) — just clears local state
2. No email change flow
3. No password change flow
4. Currency preference change doesn't trigger data refresh/conversion
5. No data export/backup option
6. No notification preferences

**Quick Wins:**
- Add password change form (current + new + confirm)
- Wire up actual delete account API call

**Medium Effort:**
- Add data export: "Download all my data as JSON/CSV"
- Add notification preferences (email alerts, budget thresholds)
- Add connected accounts section (future: bank sync)

---

#### SIDEBAR / NAVIGATION

**Issues Found:**
1. Notifications are hardcoded samples — not from any API
2. Missing nav entries for Export and Market services
3. No mobile responsive hamburger menu
4. Keyboard shortcuts (Ctrl+Shift+Key) conflict with browser shortcuts on some systems

**Quick Wins:**
- Add "Export" and "Market" nav items under Finance section
- Add mobile hamburger toggle with Sheet/Drawer

**Medium Effort:**
- Build real notification system (store in Redis, poll every 30s)
- Add collapsible section headers (click to collapse Finance section)
- Add search command palette (Cmd+K) for quick navigation

---

### 1.3 Priority Summary

| Priority | Item | Effort |
|----------|------|--------|
| P0 | Remove fake/hardcoded data (sampleStats, monthlyTrend, +8.2%) | Low |
| P0 | Remove debug console.logs from all files | Low |
| P0 | Fix EMI form "Add Loan" button text when editing | Trivial |
| P0 | Replace `confirm()` with AlertDialog | Low |
| P1 | Replace raw `<select>` with shadcn Select | Low |
| P1 | Add mobile responsive sidebar (hamburger/Sheet) | Medium |
| P1 | Add pagination to expenses list | Medium |
| P1 | Make edit/delete visible on touch devices | Low |
| P1 | Add password visibility toggle on login | Trivial |
| P2 | Build real monthly trend chart from expense data | Medium |
| P2 | Add income tracking to make dashboard metrics real | High |
| P2 | Add proper form validation with inline errors | Medium |
| P2 | Wire up real notifications | Medium |
| P3 | Add command palette (Cmd+K) | Medium |
| P3 | Add data export in settings | Medium |
| P3 | Amortization chart for EMI | Medium |

---

## Section 2: AI Integration Ideas

---

### 2.1 Smart Transaction Categorization

**What it does:** Automatically suggests a category when the user types an expense description. "Swiggy order" → Food & Dining, "Uber ride" → Transportation.

**User value:** Saves time, reduces miscategorization, makes expense data more accurate for budgeting.

**UI changes:**
- In the Add Expense modal, as the user types in "Description", show a suggested category badge below the field: `🤖 Suggested: Food & Dining [Accept] [Dismiss]`
- If accepted, auto-fill the category dropdown

**Technical approach:**
- **Input:** Description text, amount, payment method, time of day
- **Model:** Start with a keyword/rule-based classifier (fast, no API cost). Graduate to a fine-tuned text classifier or OpenAI API call.
- **Implementation:** New endpoint `POST /api/finance/categorize` that takes `{description, amount}` and returns `{category_id, confidence}`. Frontend calls this on description field `onBlur`.
- **Data:** Train on the user's own historical data (description → category mappings). 50+ labeled examples gives good accuracy.
- **Privacy:** All processing can stay on-server. No need to send data to external APIs if using local rules. If using OpenAI, mention in privacy policy.

**Effort:** Medium (rule-based: 2 days, ML-based: 1 week)

---

### 2.2 Monthly Spending Insights & Summaries

**What it does:** Generates a natural language summary of the user's finances at month-end: "You spent ₹58,000 in January — 15% more than December. Your biggest increase was in Shopping (+₹8,000). You stayed under budget in 4 of 6 categories."

**User value:** Users get actionable insights without manually analyzing charts. Creates an "aha moment" that drives engagement.

**UI changes:**
- New "Insights" card on the Dashboard below the hero section
- Expandable card with 3-4 bullet points
- "Generate Insights" button that shows a typing animation while processing
- Monthly email digest (future)

**Technical approach:**
- **Input:** Current month's expenses (amounts, categories, dates), previous month's data, budget data, EMI data
- **Model:** LLM API call (OpenAI GPT-4o-mini or similar) with a structured prompt:
  ```
  Given this user's financial data for {month}:
  - Expenses by category: {json}
  - Budget utilization: {json}
  - Comparison to last month: {json}
  Generate 4 concise, actionable insights.
  ```
- **Caching:** Cache insights per user per month in Redis (regenerate only when new expenses are added)
- **Fallback:** If no API key, use template-based insights (pure math: "Top category: X, +Y% vs last month")
- **Privacy:** Aggregate data only — no raw descriptions sent to LLM. Or offer local-only template mode.

**Effort:** Medium (template: 3 days, LLM: 1 week)

---

### 2.3 Natural Language Query

**What it does:** User types "How much did I spend on food last month?" or "Show expenses over ₹5000" in a search bar, and gets filtered results or a direct answer.

**User value:** Faster than navigating filters. Feels magical. Power users love it.

**UI changes:**
- Command palette (Cmd+K) with a natural language input field
- Results shown inline: either a direct answer ("₹12,500 on Food & Dining in December") or filtered expense list
- Suggested queries as placeholder: "Try: 'biggest expense this week'"

**Technical approach:**
- **Input:** User's natural language query + their expense/EMI/investment data
- **Model:** LLM to parse intent → convert to structured filter query:
  ```
  User: "food expenses over 1000 last month"
  → {category: "Food & Dining", min_amount: 1000, date_range: "2026-01"}
  ```
- **Implementation:** `POST /api/finance/query` endpoint. LLM extracts filters, backend applies them to DB query. Return both the filter params (so UI can show active filters) and the results.
- **Simpler alternative:** Regex-based parser for common patterns without LLM dependency.
- **Privacy:** Query text processed server-side, data stays in your DB.

**Effort:** High (regex: 1 week, LLM: 2 weeks)

---

### 2.4 Smart Budget Recommendations

**What it does:** Analyzes 3 months of spending and suggests realistic budgets per category: "Based on your spending, we recommend: Food & Dining: ₹15,000/mo, Transportation: ₹5,000/mo"

**User value:** Users who don't know what budget to set get a data-driven starting point. Reduces friction in budget creation.

**UI changes:**
- "Auto-suggest budgets" button on Budgets page (when empty state, or as a secondary action)
- Shows a list of suggested budgets with amounts pre-filled
- User can adjust each amount before confirming
- Visual: card with slider per category

**Technical approach:**
- **Input:** Last 3 months of categorized expenses
- **Model:** Pure math — no AI needed for V1. Calculate per-category monthly average, suggest 90th percentile (slight buffer). For V2, use LLM to add qualitative advice.
- **Implementation:** `GET /api/finance/budget-suggestions` returns `[{category, suggested_amount, avg_last_3mo, max_last_3mo}]`
- **Privacy:** All local computation.

**Effort:** Low-Medium (2-3 days)

---

### 2.5 Anomaly Detection / Unusual Spending Alerts

**What it does:** Flags unusually large transactions or spending spikes: "⚠️ You spent ₹25,000 at Electronics Store — this is 5x your average Shopping expense"

**User value:** Catches unauthorized transactions, impulse purchases, or billing errors early.

**UI changes:**
- Badge on Dashboard: "1 unusual transaction detected"
- In expense list, flagged items get an amber border + "Unusual" badge
- Notification in sidebar: "Large transaction detected"

**Technical approach:**
- **Input:** New expense amount + historical average and stddev for that category
- **Model:** Statistical z-score. If `(amount - mean) / stddev > 2.5`, flag it. No ML needed.
- **Implementation:** Calculate on expense creation. Store flag in `extra_data` JSONB field. Background job or trigger in the create endpoint.
- **Privacy:** Pure local math.

**Effort:** Low (1-2 days)

---

### 2.6 Receipt OCR

**What it does:** User photographs a receipt, AI extracts amount, date, merchant, and pre-fills the expense form.

**User value:** Eliminates manual entry for physical purchases. Major convenience feature.

**UI changes:**
- Camera icon button next to "Add Expense"
- Opens camera/file picker → shows extracted data for confirmation → saves

**Technical approach:**
- **Input:** Receipt image (JPEG/PNG)
- **Model:** Google Vision API, AWS Textract, or OpenAI Vision API
- **Implementation:** Upload image to MinIO, send to OCR API, parse structured output, return `{amount, date, merchant, suggested_category}`
- **Privacy:** Images stored in user's MinIO bucket. OCR API processes image — mention in privacy policy.

**Effort:** High (1-2 weeks)

---

### AI Priority Matrix

| Feature | Value | Effort | Recommended Order |
|---------|-------|--------|-------------------|
| Smart Categorization | High | Medium | 1st |
| Budget Recommendations | Medium | Low | 2nd |
| Anomaly Detection | Medium | Low | 3rd |
| Monthly Insights | High | Medium | 4th |
| Natural Language Query | High | High | 5th |
| Receipt OCR | Medium | High | 6th |

---

## Section 3: Borrowings Feature Design

---

### 3.1 Feature Overview

**"Borrowings"** tracks money you have borrowed from individuals (not institutional loans — those are EMIs). Supports partial repayments, interest, and full closure.

**Key Concepts:**
- **Borrowing**: A record of money borrowed from a person/entity
- **Lender**: The person/entity you borrowed from (name + contact)
- **Principal**: Original amount borrowed
- **Interest**: Optional rate (simple, per month/year)
- **Repayment**: A partial or full payment made toward the borrowing
- **Status**: `open` → `partially_paid` → `closed`
- **Running Balance**: Principal + accrued interest - total repayments

---

### 3.2 Data Model

#### `borrowings` table

```
id                  UUID PRIMARY KEY
tenant_id           UUID FK → tenants.id
user_id             UUID FK → users.id
lender_name         VARCHAR(255) NOT NULL        -- "Rahul", "Mom", "Company"
lender_contact      VARCHAR(255)                 -- phone/email (optional)
principal_amount    DECIMAL(15,2) NOT NULL
currency            VARCHAR(3) DEFAULT 'INR'
interest_rate       DECIMAL(5,2) DEFAULT 0       -- annual rate
interest_type       VARCHAR(20) DEFAULT 'none'   -- 'none', 'simple', 'compound'
borrowed_date       DATE NOT NULL
due_date            DATE                         -- optional deadline
purpose             TEXT                         -- "House renovation", etc.
tags                TEXT[]                       -- ['family', 'urgent']
status              VARCHAR(20) DEFAULT 'open'   -- 'open', 'partially_paid', 'closed'
total_repaid        DECIMAL(15,2) DEFAULT 0
remaining_amount    DECIMAL(15,2)                -- computed: principal + interest - repaid
notes               TEXT
closed_at           TIMESTAMP
created_at          TIMESTAMP DEFAULT now()
updated_at          TIMESTAMP DEFAULT now()
```

#### `borrowing_repayments` table

```
id                  UUID PRIMARY KEY
tenant_id           UUID FK → tenants.id
borrowing_id        UUID FK → borrowings.id ON DELETE CASCADE
amount              DECIMAL(15,2) NOT NULL
repayment_date      DATE NOT NULL
payment_method      VARCHAR(50)                  -- 'UPI', 'Cash', 'Bank Transfer'
reference_number    VARCHAR(255)                 -- transaction ID
note                TEXT
created_at          TIMESTAMP DEFAULT now()
updated_at          TIMESTAMP DEFAULT now()
```

---

### 3.3 API Endpoints

```
POST   /borrowings                    -- Create new borrowing
GET    /borrowings                    -- List all (with filters: status, lender)
GET    /borrowings/:id                -- Get single with repayment history
PUT    /borrowings/:id                -- Update borrowing details
DELETE /borrowings/:id                -- Delete borrowing + all repayments

POST   /borrowings/:id/repayments     -- Record a repayment
GET    /borrowings/:id/repayments     -- List repayments for a borrowing
PUT    /borrowings/:id/repayments/:rid -- Edit a repayment
DELETE /borrowings/:id/repayments/:rid -- Delete a repayment

POST   /borrowings/:id/close          -- Mark as fully closed
POST   /borrowings/:id/reopen         -- Reopen a closed borrowing
```

---

### 3.4 UI Screens & Flows

#### Navigation Integration
- Add **"Borrowings"** to sidebar under Finance section, between "EMI Loans" and "Investments"
- Icon: `HandCoins` (Lucide) or `Handshake`
- Color: `text-teal-500`
- Dashboard: Add a "Borrowings" stat card showing `total outstanding` + `count of open borrowings`
- Dashboard alert: "⚠️ Borrowing from Rahul is overdue by 5 days"

---

#### Screen 1: Borrowings Overview / List

**Layout:** Same pattern as EMI page — sticky header with stats + card grid.

**Header Stats Bar:**
```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Total Owed   │ Open         │ Overdue      │ Repaid       │
│ ₹1,25,000    │ 3 borrowings │ 1 overdue    │ ₹45,000      │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

**Filter Bar:**
```
[Search lender name...] [Status: All ▼] [Sort: Due Date ▼] [+ New Borrowing]
```

**Borrowing Cards (grid of cards, like EMI):**
```
┌─────────────────────────────────────────┐
│  🤝  Borrowed from Rahul         OPEN  │
│  ───────────────────────────────────── │
│  Principal: ₹50,000                     │
│  Interest:  8% p.a. (simple)            │
│  Remaining: ₹38,500                     │
│  ████████░░░░░ 23% repaid               │
│  ───────────────────────────────────── │
│  Due: 15 Mar 2026  ·  Purpose: Trip     │
│  [View Details]           [✏️] [🗑️]    │
└─────────────────────────────────────────┘
```

**Overdue badge:** Red border + "OVERDUE" badge if `due_date < today && status != 'closed'`

**Empty State:**
```
🤝
No Borrowings Yet
Track money you've borrowed from friends, family, or others.
Record repayments and stay on top of your obligations.
[+ Add Borrowing]
```

---

#### Screen 2: Borrowing Detail Page (Modal or Page)

Shown when user clicks "View Details" on a card.

```
┌─────────────────────────────────────────────────┐
│  Borrowing from Rahul                    [Close]│
│  Status: PARTIALLY PAID                         │
│                                                  │
│  ┌────────┬────────┬────────┬────────┐          │
│  │Original│Interest│ Repaid │Remaining│          │
│  │₹50,000 │₹4,000  │₹15,500│₹38,500 │          │
│  └────────┴────────┴────────┴────────┘          │
│                                                  │
│  Progress: ████████░░░░░░░ 29% repaid           │
│                                                  │
│  Details:                                        │
│  · Borrowed on: 10 Jan 2026                     │
│  · Due date: 15 Mar 2026 (34 days left)         │
│  · Interest: 8% p.a. (simple)                   │
│  · Purpose: Trip to Goa                         │
│  · Contact: +91 98765 43210                     │
│                                                  │
│  ─── Repayment History ──────────────────────── │
│                                                  │
│  ✅ ₹10,000  ·  5 Feb 2026  ·  UPI             │
│     "First installment"             [Edit][Del] │
│                                                  │
│  ✅ ₹5,500   ·  20 Jan 2026 ·  Cash            │
│     "Partial repayment"             [Edit][Del] │
│                                                  │
│  ────────────────────────────────────────────── │
│  [+ Record Repayment]    [Mark as Fully Repaid] │
└─────────────────────────────────────────────────┘
```

---

#### Screen 3: Add/Edit Borrowing Form (Modal)

```
┌─────────────────────────────────────────┐
│  Add New Borrowing                   [X]│
│  ─────────────────────────────────────  │
│                                          │
│  Lender Name *         [Rahul         ] │
│  Contact (optional)    [+91 987...    ] │
│                                          │
│  Amount Borrowed *     [₹ 50,000      ] │
│  Date Borrowed *       [2026-01-10    ] │
│  Due Date              [2026-03-15    ] │
│                                          │
│  Interest Rate         [8   ] % p.a.    │
│  Interest Type         [Simple      ▼]  │
│    Options: None / Simple / Compound     │
│                                          │
│  Purpose               [Trip to Goa   ] │
│  Notes                 [_____________]  │
│                                          │
│  [Cancel]              [Add Borrowing]  │
└─────────────────────────────────────────┘
```

---

#### Screen 4: Record Repayment Flow (Modal)

Triggered from borrowing detail page.

```
┌─────────────────────────────────────────┐
│  Record Repayment                    [X]│
│  Borrowing from Rahul · ₹38,500 left   │
│  ─────────────────────────────────────  │
│                                          │
│  Amount *              [₹ 10,000      ] │
│    Remaining after: ₹28,500             │
│                                          │
│  Date *                [2026-02-10    ] │
│  Payment Method        [UPI         ▼]  │
│  Reference #           [TXN123456     ] │
│  Note                  [Monthly pmt   ] │
│                                          │
│  ☐ This completes the borrowing         │
│    (marks status as "closed")            │
│                                          │
│  [Cancel]           [Record Repayment]  │
└─────────────────────────────────────────┘
```

---

### 3.5 Validation Rules

| Rule | Behavior |
|------|----------|
| `amount > 0` | "Amount must be greater than zero" |
| `repayment_amount <= remaining_amount` | "Repayment cannot exceed remaining balance (₹X)" |
| `repayment_date >= borrowed_date` | "Repayment date cannot be before borrowing date" |
| `lender_name` required | "Please enter the lender's name" |
| `borrowed_date` required | "Please select when you borrowed" |
| `principal_amount` required | "Please enter the amount borrowed" |
| `interest_rate >= 0` | "Interest rate cannot be negative" |
| Delete repayment | Recalculate `total_repaid` and `remaining_amount`. If was closed, revert to `partially_paid` or `open` |
| Close borrowing | Only if remaining ≤ 0 or user confirms manual closure |

---

### 3.6 Status Transitions

```
                ┌─────────────────────────┐
                │         OPEN            │
                │  (no repayments yet)    │
                └────────┬────────────────┘
                         │ first repayment
                         ▼
                ┌─────────────────────────┐
                │    PARTIALLY_PAID       │
                │  (some repayments)      │
                └────────┬────────────────┘
                         │ remaining = 0
                         │ OR manual close
                         ▼
                ┌─────────────────────────┐
                │        CLOSED           │
                │  (fully repaid)         │
                └─────────────────────────┘
                         │ reopen
                         ▼
                   back to OPEN or
                   PARTIALLY_PAID
```

---

### 3.7 Edge Cases

| Edge Case | Handling |
|-----------|----------|
| **Edit a repayment amount** | Recalculate `total_repaid` and `remaining_amount`. If `remaining > 0` and was `closed`, revert to `partially_paid` |
| **Delete a repayment** | Same recalculation. Show confirmation dialog: "This will increase your outstanding balance by ₹X. Continue?" |
| **Reopen a closed borrowing** | Set `status = 'partially_paid'` if `remaining > 0`, else `'open'`. Clear `closed_at`. Show: "This borrowing has been reopened." |
| **Overpayment** | Block: "Repayment of ₹X exceeds remaining balance of ₹Y. Maximum repayment: ₹Y" |
| **Zero interest + no due date** | Valid — informal borrowing. Show: "No deadline set" instead of empty |
| **Multiple borrowings from same person** | Allowed. Consider grouping by lender in future: "You owe Rahul ₹85,000 total (2 borrowings)" |
| **Borrowing in foreign currency** | Use user's preferred currency. Exchange rate conversion is out of scope for V1 |
| **Delete borrowing with repayments** | Confirm: "This will delete the borrowing and all X repayments. This cannot be undone." |

---

### 3.8 Messages & Labels Reference

**Success Messages:**
- "Borrowing from {name} added successfully"
- "Repayment of {amount} recorded"
- "Borrowing marked as fully repaid"
- "Borrowing reopened"

**Error Messages:**
- "Repayment cannot exceed remaining balance of {amount}"
- "Please fill in all required fields"
- "Failed to record repayment. Please try again."

**Empty States:**
- List: "No borrowings yet. Track money you've borrowed from others."
- Repayment history: "No repayments recorded yet. Record your first repayment."
- Filtered list (no results): "No borrowings match your filters."

**Confirmation Dialogs:**
- Delete borrowing: "Delete borrowing from {name}? This will also delete all repayment records. This action cannot be undone."
- Delete repayment: "Delete this repayment of {amount}? Your outstanding balance will increase."
- Close borrowing (with balance): "Mark as closed? You still have an outstanding balance of {amount}. This will be written off."

---

### 3.9 Dashboard Integration

Add to the Dashboard hero "Quick Stats Grid":
```
┌──────────────────────┐
│ 🤝 Borrowings        │
│ ₹1,25,000 owed       │
│ 3 open · 1 overdue   │
└──────────────────────┘
```

Add to Quick Actions bar:
```
[Record Repayment] → links to /dashboard/borrowings
```

Add alert card (if any overdue):
```
⚠️ Overdue: ₹50,000 to Rahul was due 5 days ago
[View Borrowing →]
```

---

### 3.10 Implementation Order

1. **Backend model + migration** (Borrowing + BorrowingRepayment tables)
2. **Backend CRUD API** (borrowings service — new FastAPI service on port 8007, or add to finance service)
3. **Frontend: Borrowings list page** with empty state
4. **Frontend: Add/Edit borrowing form**
5. **Frontend: Borrowing detail modal** with repayment history
6. **Frontend: Record repayment flow**
7. **Frontend: Close/Reopen actions**
8. **Dashboard integration** (stat card + alert)
9. **Sidebar nav entry**

**Recommended:** Add to the existing **finance service** (port 8002) rather than creating a new microservice. Borrowings are a core finance concept, and a 7th service adds operational complexity with minimal benefit.

---

## Section 4: Export Page Design

The export service (port 8006) already supports CSV, Excel, and PDF for expenses, and CSV for EMIs and investments. A dedicated frontend page is needed.

### 4.1 UI Design

- **Module selector** — Card-based selection for Expenses, EMI Loans, Investments (expandable to Borrowings, Budgets)
- **Format selector** — Button group showing available formats per module (CSV, Excel, PDF)
- **Date range filter** — Optional start/end date pickers to scope the export
- **Download button** — Triggers blob download via `responseType: 'blob'`
- **Recent exports list** — Session-only list of successful downloads with module, format, and timestamp

### 4.2 Backend Additions Needed

- `POST /export/borrowings` — Export borrowings + repayments to CSV/PDF
- `POST /export/budgets` — Export budgets with spent/remaining data
- `POST /export/all` — Combined export of all modules into a zip or multi-sheet Excel

### 4.3 Implementation Status

- ✅ Backend: Expenses (CSV, Excel, PDF), EMIs (CSV), Investments (CSV)
- ✅ Frontend: Export page created at `/dashboard/export`
- ❌ Backend: Borrowings, Budgets, combined export
- ❌ Frontend: Borrowings and Budgets export options

---

## Section 5: Income Tracking Feature

The dashboard references "Cash Flow" and "Income vs Expenses" but no income model exists. This is a significant gap for a financial tracker.

### 5.1 Data Model

```
Income:
  id: UUID (PK)
  user_id: UUID (FK → users)
  tenant_id: UUID
  source: string (salary, freelance, dividends, rental, gift, other)
  amount: Decimal
  currency: string
  income_date: date
  description: string (nullable)
  is_recurring: boolean (default false)
  recurrence_period: string (nullable — monthly, weekly, yearly)
  category_id: UUID (nullable, FK → categories)
  notes: string (nullable)
  created_at: timestamp
```

### 5.2 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/income` | List income entries (with date range filter) |
| POST | `/income` | Create income entry |
| PUT | `/income/{id}` | Update income entry |
| DELETE | `/income/{id}` | Delete income entry |
| GET | `/income/summary` | Monthly income totals for charts |

### 5.3 UI Screens

- **Income List Page** — `/dashboard/income` with similar layout to expenses (timeline view, search, filters)
- **Add/Edit Income Form** — Modal with source dropdown, amount, date, description, recurring toggle
- **Dashboard Integration** — Replace "Cash Flow" stat with actual `income - expenses`, show income bar alongside expenses in Monthly Trends chart

### 5.4 Priority

**P2** — Important for complete financial picture but app is functional without it.

---

## Section 6: Goals & Savings Module

A separate spec exists in `GOALS_SAVINGS_MODULE.md`. Summary of expectations:

- Track savings goals with target amounts and deadlines
- Visual progress bars and milestone tracking
- Monthly contribution tracking
- Dashboard widget showing top 3 goals progress
- Integration with budget system (auto-allocate savings from budget surplus)

### Priority

**P3** — Nice to have. Requires income tracking (Section 5) first for meaningful auto-contribution features.

---

## Section 7: Dark Mode / Theme System

The app currently has an inconsistent visual theme: dark sidebar with light main content area.

### 7.1 Requirements

- **Theme toggle** in Settings → Profile (and optionally in sidebar footer)
- **Three modes**: Light, Dark, System (follow OS preference)
- Use `next-themes` package with Tailwind CSS `darkMode: 'class'`
- All shadcn/ui components already support dark mode via CSS variables
- Persist preference in `localStorage` and sync to user profile (`preferred_theme` field)

### 7.2 Implementation Scope

- Add `ThemeProvider` wrapping the app layout
- Update `globals.css` with dark mode CSS variables
- Audit all custom colors (gradient backgrounds, text colors) for dark mode compatibility
- Add toggle component to sidebar footer and settings page

### Priority

**P2** — High user-facing impact, moderate implementation effort.

---

## Section 8: Lending Feature (Money Lent to Others)

Complementary to Borrowings (Section 3). Track money **lent to** others with the same partial repayment model.

### 8.1 Data Model

Nearly identical to Borrowing, with `borrower_name` instead of `lender_name` and reversed semantics (you are the lender).

```
Lending:
  id: UUID (PK)
  user_id: UUID (FK)
  tenant_id: UUID
  borrower_name: string
  borrower_contact: string (nullable)
  principal_amount: Decimal
  currency: string
  interest_rate: Decimal (default 0)
  interest_type: enum (none, simple, compound)
  lent_date: date
  due_date: date (nullable)
  purpose: string (nullable)
  status: enum (open, partially_received, closed)
  total_received: Decimal (computed)
  remaining_amount: Decimal (computed)
  notes: string (nullable)
```

### 8.2 UI Design

- Reuse Borrowings page layout with different color scheme (e.g., indigo/violet gradient)
- Add to sidebar under Finance section as "Lendings"
- Dashboard stat card: "Money Lent" with total outstanding and count
- Same repayment tracking (but labeled "collections" or "received")

### Priority

**P2** — Natural companion to Borrowings. Can share most UI components.

---

## Section 9: Recurring Transactions

No support for recurring expenses or income currently. Users must manually re-enter regular payments.

### 9.1 Requirements

- **Recurring toggle** on expense and income forms
- **Frequency options**: Daily, Weekly, Bi-weekly, Monthly, Quarterly, Yearly
- **Auto-generation**: Celery task runs daily, creates pending transactions for the day
- **Management UI**: List of active recurring items with next occurrence date, ability to pause/resume/edit/delete
- **Notification**: Alert when a recurring transaction is auto-created

### 9.2 Data Model Addition

Add to Expense model:
```
is_recurring: boolean (default false)
recurrence_frequency: string (nullable — daily, weekly, monthly, yearly)
recurrence_end_date: date (nullable)
parent_recurring_id: UUID (nullable — links generated instances to template)
```

### Priority

**P3** — Quality of life improvement. Requires Celery worker infrastructure (already exists for stock tasks).

---

## Section 10: Placeholder Features Audit

Several UI elements exist as placeholders with no backend wiring:

| Feature | Location | Status |
|---------|----------|--------|
| Notification preferences (checkboxes) | Settings → Notifications | UI only — does not save |
| Two-Factor Authentication | Settings → Security | Button shows "Enable" but no backend |
| Active Sessions | Settings → Security | Button shows "View" but no backend |
| Export All Data | Settings → Data & Privacy | Button exists but not wired to export service |
| Download Statements | Settings → Data & Privacy | Button exists but no implementation |
| Forgot Password | Login page | Shows toast "check email" but no email service |

### Recommendations

1. **Notification preferences** — Store in user profile as JSON field, or use localStorage as interim
2. **2FA** — Implement TOTP-based 2FA using `pyotp` library in auth service
3. **Active Sessions** — Track JWT tokens with device info in a sessions table
4. **Export/Statements** — Wire to existing export service (Section 4)
5. **Forgot Password** — Implement password reset flow with email (requires email service — SendGrid/SES)

### Priority

- Notification prefs: **P1** (quick localStorage fix)
- Export wiring: **P1** (backend exists)
- 2FA: **P3**
- Sessions: **P3**
- Forgot Password: **P2**

---

## Section 11: Implementation Status Summary

| Feature | Backend | Frontend | Dashboard |
|---------|---------|----------|-----------|
| Expenses | ✅ | ✅ | ✅ |
| EMI Loans | ✅ | ✅ | ✅ |
| Investments | ✅ | ✅ | ✅ |
| Budgets | ✅ | ✅ | ✅ |
| Borrowings | ✅ | ✅ | ✅ |
| Export | ✅ Partial | ✅ | N/A |
| Income | ❌ Needs endpoints | ✅ Page + API client | ✅ Quick action |
| Lending | ❌ Needs endpoints | ✅ Page + API client | ✅ Quick action |
| Goals & Savings | ❌ | ❌ | ❌ |
| Dark Mode | N/A | ✅ Theme provider + toggle | ✅ Global CSS overrides |
| Recurring | ❌ | ❌ | ❌ |
| Notifications | ❌ | ✅ localStorage prefs | N/A |
| 2FA | ❌ | ⚠️ Placeholder | N/A |
| Appearance Settings | N/A | ✅ Theme toggle in Settings | N/A |
| Export from Settings | N/A | ✅ Wired to /dashboard/export | N/A |
