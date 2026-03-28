# /// script
# requires-python = ">=3.10"
# dependencies = ["httpx"]
# ///
"""
Realistic mock data seeder for Monthly Financial Tracker.
Seeds ~14 months of coherent financial data for a single user.

Usage:
    uv run scripts/seed_mock_data.py [--base-url http://localhost] [--email demo@example.com] [--password Demo1234]
"""

import argparse
import random
import sys
from datetime import date, timedelta
from decimal import Decimal

import httpx

# ── Configuration ──────────────────────────────────────────────────────────────

SEED_START = date(2025, 1, 1)
SEED_END = date(2026, 3, 28)  # today

CURRENCY = "INR"

# Monthly salary range (base, varies ±5%)
BASE_SALARY = 125000

# Expense patterns: (description, min, max, frequency_per_month, payment_method, tags)
EXPENSE_PATTERNS = {
    "Food & Dining": [
        ("Swiggy order", 200, 800, 12, "upi", ["food", "delivery"]),
        ("Zomato order", 250, 900, 8, "upi", ["food", "delivery"]),
        ("Grocery - BigBasket", 1500, 4000, 3, "upi", ["grocery"]),
        ("Restaurant dinner", 800, 3500, 3, "credit_card", ["dining", "restaurant"]),
        ("Coffee shop", 150, 400, 6, "upi", ["coffee"]),
        ("Street food", 50, 200, 5, "cash", ["food"]),
    ],
    "Transportation": [
        ("Uber/Ola ride", 150, 600, 8, "upi", ["cab", "commute"]),
        ("Metro recharge", 500, 500, 1, "upi", ["metro", "commute"]),
        ("Petrol", 2000, 3500, 2, "credit_card", ["fuel"]),
        ("Auto rickshaw", 50, 200, 4, "cash", ["commute"]),
    ],
    "Shopping": [
        ("Amazon purchase", 500, 8000, 2, "credit_card", ["online", "shopping"]),
        ("Flipkart purchase", 300, 5000, 1, "credit_card", ["online", "shopping"]),
        ("Clothing - Myntra", 1000, 6000, 1, "credit_card", ["clothing"]),
        ("Electronics accessory", 500, 3000, 0.5, "credit_card", ["electronics"]),
    ],
    "Utilities": [
        ("Electricity bill", 1200, 3500, 1, "upi", ["utility", "bill"]),
        ("WiFi bill", 799, 799, 1, "upi", ["utility", "internet"]),
        ("Mobile recharge", 399, 599, 1, "upi", ["utility", "mobile"]),
        ("Water bill", 200, 500, 1, "upi", ["utility", "bill"]),
        ("Gas cylinder", 900, 950, 0.5, "upi", ["utility"]),
        ("Netflix subscription", 649, 649, 1, "credit_card", ["subscription", "entertainment"]),
        ("Spotify subscription", 119, 119, 1, "credit_card", ["subscription", "music"]),
    ],
    "Healthcare": [
        ("Medicine - Apollo", 200, 1500, 1, "upi", ["health", "medicine"]),
        ("Doctor consultation", 500, 1500, 0.3, "upi", ["health", "doctor"]),
        ("Gym membership", 2000, 2000, 1, "upi", ["fitness", "gym"]),
        ("Health checkup", 3000, 8000, 0.08, "credit_card", ["health"]),  # ~once a year
    ],
    "Entertainment": [
        ("Movie tickets", 400, 1200, 1.5, "upi", ["entertainment", "movies"]),
        ("BookMyShow event", 500, 3000, 0.3, "credit_card", ["entertainment", "events"]),
        ("Gaming purchase", 500, 2500, 0.3, "credit_card", ["entertainment", "gaming"]),
        ("Weekend outing", 1000, 4000, 1, "credit_card", ["entertainment", "outing"]),
    ],
    "Other": [
        ("Haircut/salon", 300, 800, 1, "cash", ["personal"]),
        ("Gift for friend", 500, 3000, 0.3, "upi", ["gift"]),
        ("Charity donation", 500, 2000, 0.2, "upi", ["charity"]),
        ("Home supplies", 300, 1500, 0.5, "upi", ["household"]),
    ],
}

# Income patterns
INCOME_PATTERNS = [
    # (source, description, amount_fn, frequency, is_recurring, recurrence_period)
    ("salary", "Monthly salary - TechCorp", lambda: BASE_SALARY + random.randint(-3000, 5000), "monthly", True, "monthly"),
    ("freelance", "Freelance web development", lambda: random.randint(15000, 45000), "occasional_3", False, None),
    ("dividends", "Stock dividends", lambda: random.randint(2000, 8000), "quarterly", False, None),
    ("rental", "PG accommodation rent", lambda: 12000, "monthly", True, "monthly"),
    ("gift", "Festival gift money", lambda: random.randint(5000, 15000), "occasional_2", False, None),
    ("other", "Cashback & rewards", lambda: random.randint(200, 1500), "monthly", False, None),
]

# Budget definitions
BUDGET_DEFS = [
    ("Monthly Food Budget", "Food & Dining", 15000, "monthly"),
    ("Transport Budget", "Transportation", 8000, "monthly"),
    ("Shopping Allowance", "Shopping", 10000, "monthly"),
    ("Utility Bills", "Utilities", 8000, "monthly"),
    ("Healthcare Reserve", "Healthcare", 5000, "monthly"),
    ("Entertainment Fund", "Entertainment", 6000, "monthly"),
    ("Overall Monthly Budget", None, 80000, "monthly"),
]

# EMI definitions
EMI_DEFS = [
    {
        "loan_type": "home_loan",
        "lender_name": "HDFC Bank",
        "account_number": "HDFC-HL-2024-98765",
        "principal_amount": 4500000,
        "interest_rate": 8.5,
        "interest_type": "reducing",
        "tenure_months": 240,
        "start_date": "2024-06-01",
        "notes": "2BHK flat in Whitefield, Bangalore",
    },
    {
        "loan_type": "car_loan",
        "lender_name": "ICICI Bank",
        "account_number": "ICICI-CL-2025-12345",
        "principal_amount": 800000,
        "interest_rate": 9.2,
        "interest_type": "reducing",
        "tenure_months": 60,
        "start_date": "2025-01-15",
        "notes": "Hyundai Creta 2025",
    },
    {
        "loan_type": "personal_loan",
        "lender_name": "Bajaj Finserv",
        "account_number": "BAJ-PL-2025-55555",
        "principal_amount": 200000,
        "interest_rate": 14.0,
        "interest_type": "flat",
        "tenure_months": 24,
        "start_date": "2025-03-01",
        "notes": "Home renovation",
    },
]

# Investment definitions
INVESTMENT_DEFS = [
    # Stocks
    {"investment_type": "stock", "asset_name": "Reliance Industries", "asset_symbol": "RELIANCE.BSE", "quantity": 15, "purchase_price": 2450.0, "purchase_date": "2025-02-10", "notes": "Long term hold"},
    {"investment_type": "stock", "asset_name": "Tata Consultancy Services", "asset_symbol": "TCS.BSE", "quantity": 8, "purchase_price": 3850.0, "purchase_date": "2025-03-15", "notes": "IT sector bet"},
    {"investment_type": "stock", "asset_name": "Infosys", "asset_symbol": "INFY.BSE", "quantity": 20, "purchase_price": 1520.0, "purchase_date": "2025-01-20", "notes": "IT blue chip"},
    {"investment_type": "stock", "asset_name": "HDFC Bank", "asset_symbol": "HDFCBANK.BSE", "quantity": 12, "purchase_price": 1680.0, "purchase_date": "2025-04-05", "notes": "Banking leader"},
    {"investment_type": "stock", "asset_name": "ITC Limited", "asset_symbol": "ITC.BSE", "quantity": 50, "purchase_price": 445.0, "purchase_date": "2025-05-12", "notes": "Dividend play"},
    # Mutual Funds (SIP)
    {"investment_type": "mutual_fund", "asset_name": "Nifty 50 Index Fund - UTI", "asset_symbol": "UTI-N50", "quantity": 250.5, "purchase_price": 180.0, "purchase_date": "2025-01-05", "notes": "Monthly SIP 5000"},
    {"investment_type": "mutual_fund", "asset_name": "Parag Parikh Flexi Cap", "asset_symbol": "PPFCF", "quantity": 120.3, "purchase_price": 65.0, "purchase_date": "2025-01-05", "notes": "Monthly SIP 3000"},
    {"investment_type": "mutual_fund", "asset_name": "Axis Small Cap Fund", "asset_symbol": "AXIS-SC", "quantity": 85.7, "purchase_price": 95.0, "purchase_date": "2025-02-05", "notes": "Monthly SIP 2000"},
    # Crypto
    {"investment_type": "crypto", "asset_name": "Bitcoin", "asset_symbol": "BTC", "quantity": 0.015, "purchase_price": 6800000.0, "purchase_date": "2025-06-15", "notes": "Small crypto allocation"},
    {"investment_type": "crypto", "asset_name": "Ethereum", "asset_symbol": "ETH", "quantity": 0.5, "purchase_price": 250000.0, "purchase_date": "2025-07-20", "notes": "ETH stake"},
    # Fixed Deposit
    {"investment_type": "fd", "asset_name": "SBI Fixed Deposit - 1 Year", "asset_symbol": None, "quantity": 1, "purchase_price": 200000.0, "purchase_date": "2025-03-01", "notes": "7.1% p.a., matures Mar 2026"},
    # Gold
    {"investment_type": "gold", "asset_name": "Sovereign Gold Bond 2025", "asset_symbol": "SGB-2025", "quantity": 4, "purchase_price": 6200.0, "purchase_date": "2025-04-15", "notes": "2.5% annual interest"},
]

# Borrowing definitions
BORROWING_DEFS = [
    {
        "lender_name": "Rahul Sharma",
        "lender_contact": "+91-9876543210",
        "principal_amount": 50000,
        "interest_rate": 0,
        "interest_type": "none",
        "borrowed_date": "2025-06-10",
        "due_date": "2025-09-10",
        "purpose": "Emergency medical expense for family",
        "tags": ["personal", "medical"],
        "notes": "Rahul said no rush, but should return by September",
    },
    {
        "lender_name": "Priya Patel",
        "lender_contact": "+91-9123456780",
        "principal_amount": 25000,
        "interest_rate": 0,
        "interest_type": "none",
        "borrowed_date": "2025-10-01",
        "due_date": "2025-12-31",
        "purpose": "Short term cash for festival shopping",
        "tags": ["personal", "festival"],
        "notes": "Return before year end",
    },
    {
        "lender_name": "Dad",
        "lender_contact": None,
        "principal_amount": 100000,
        "interest_rate": 0,
        "interest_type": "none",
        "borrowed_date": "2025-02-15",
        "due_date": None,
        "purpose": "Down payment help for car",
        "tags": ["family"],
        "notes": "No fixed timeline, return when comfortable",
    },
]

# Lending definitions
LENDING_DEFS = [
    {
        "borrower_name": "Amit Kumar",
        "borrower_contact": "+91-9988776655",
        "principal_amount": 30000,
        "interest_rate": 0,
        "interest_type": "none",
        "lent_date": "2025-04-20",
        "due_date": "2025-07-20",
        "purpose": "Helping with rent deposit",
        "notes": "Should return in 3 months",
    },
    {
        "borrower_name": "Sneha Gupta",
        "borrower_contact": "+91-8877665544",
        "principal_amount": 15000,
        "interest_rate": 0,
        "interest_type": "none",
        "lent_date": "2025-08-05",
        "due_date": "2025-10-05",
        "purpose": "Birthday event advance",
        "notes": "Close friend, will return soon",
    },
    {
        "borrower_name": "Vikram Singh",
        "borrower_contact": "+91-7766554433",
        "principal_amount": 75000,
        "interest_rate": 5,
        "interest_type": "simple",
        "lent_date": "2025-05-01",
        "due_date": "2026-05-01",
        "purpose": "Business startup seed money",
        "notes": "Agreed on 5% simple interest, yearly repayment",
    },
]


# ── Helpers ────────────────────────────────────────────────────────────────────

def months_between(start: date, end: date):
    """Yield the first day of each month from start to end (inclusive)."""
    current = start.replace(day=1)
    while current <= end:
        yield current
        if current.month == 12:
            current = current.replace(year=current.year + 1, month=1)
        else:
            current = current.replace(month=current.month + 1)


def random_date_in_month(year: int, month: int) -> str:
    """Return a random date within the given month as YYYY-MM-DD."""
    if month == 12:
        last_day = 31
    else:
        last_day = (date(year, month + 1, 1) - timedelta(days=1)).day
    day = random.randint(1, last_day)
    return date(year, month, day).isoformat()


class Seeder:
    def __init__(self, base_url: str, email: str, password: str, tenant_name: str):
        self.base_url = base_url.rstrip("/")
        self.email = email
        self.password = password
        self.tenant_name = tenant_name
        self.client = httpx.Client(timeout=30)
        self.token = None
        self.headers = {}
        self.category_map = {}  # name -> id
        self.stats = {
            "expenses": 0,
            "income": 0,
            "budgets": 0,
            "emis": 0,
            "investments": 0,
            "borrowings": 0,
            "lendings": 0,
            "repayments": 0,
            "collections": 0,
        }

    def _post(self, path: str, json_data: dict, service_port: int | None = None):
        url = f"{self.base_url}:{service_port}{path}" if service_port else f"{self.base_url}{path}"
        for attempt in range(3):
            try:
                resp = self.client.post(url, json=json_data, headers=self.headers)
                return resp
            except httpx.ReadError:
                if attempt < 2:
                    import time; time.sleep(0.5)
                else:
                    raise

    def _get(self, path: str, service_port: int | None = None):
        url = f"{self.base_url}:{service_port}{path}" if service_port else f"{self.base_url}{path}"
        for attempt in range(3):
            try:
                resp = self.client.get(url, headers=self.headers)
                return resp
            except httpx.ReadError:
                if attempt < 2:
                    import time; time.sleep(0.5)
                else:
                    raise

    def _put(self, path: str, service_port: int | None = None, params: dict | None = None):
        url = f"{self.base_url}:{service_port}{path}" if service_port else f"{self.base_url}{path}"
        for attempt in range(3):
            try:
                resp = self.client.put(url, headers=self.headers, params=params)
                return resp
            except httpx.ReadError:
                if attempt < 2:
                    import time; time.sleep(0.5)
                else:
                    raise

    # ── Auth ───────────────────────────────────────────────────────────────

    def register_and_login(self):
        print("🔐 Registering / Logging in...")
        # Try register first
        resp = self._post("/register", {
            "email": self.email,
            "password": self.password,
            "full_name": "Demo User",
            "tenant_name": self.tenant_name,
            "phone": "+91-9999999999",
        }, service_port=8001)

        if resp.status_code == 200:
            data = resp.json()
            self.token = data.get("access_token") or data.get("token")
            print(f"   Registered new user: {self.email}")
        else:
            # Already exists, try login
            resp = self._post("/login", {
                "email": self.email,
                "password": self.password,
            }, service_port=8001)
            if resp.status_code != 200:
                print(f"   ERROR: Could not login: {resp.status_code} {resp.text}")
                sys.exit(1)
            data = resp.json()
            self.token = data.get("access_token") or data.get("token")
            print(f"   Logged in as: {self.email}")

        self.headers = {"Authorization": f"Bearer {self.token}"}

    # ── Categories ─────────────────────────────────────────────────────────

    def fetch_categories(self):
        print("📂 Fetching categories...")
        resp = self._get("/categories", service_port=8002)
        if resp.status_code != 200:
            print(f"   ERROR fetching categories: {resp.status_code} {resp.text}")
            return
        categories = resp.json()
        if isinstance(categories, dict) and "categories" in categories:
            categories = categories["categories"]
        for cat in categories:
            self.category_map[cat["name"]] = cat["id"]
        print(f"   Found {len(self.category_map)} categories: {list(self.category_map.keys())}")

    # ── Expenses ───────────────────────────────────────────────────────────

    def seed_expenses(self):
        print("💸 Seeding expenses...")
        count = 0
        for month_start in months_between(SEED_START, SEED_END):
            year, month = month_start.year, month_start.month
            # Don't generate future data
            if month_start > SEED_END:
                break

            for cat_name, patterns in EXPENSE_PATTERNS.items():
                cat_id = self.category_map.get(cat_name)
                for desc, min_amt, max_amt, freq, payment_method, tags in patterns:
                    # Number of transactions this month (Poisson-like)
                    n = max(0, int(random.gauss(freq, max(0.5, freq * 0.3))))
                    for _ in range(n):
                        txn_date = random_date_in_month(year, month)
                        # Skip if date is in the future
                        if date.fromisoformat(txn_date) > SEED_END:
                            continue
                        amount = round(random.uniform(min_amt, max_amt), 2)
                        payload = {
                            "amount": amount,
                            "currency": CURRENCY,
                            "description": desc,
                            "transaction_date": txn_date,
                            "payment_method": payment_method,
                            "tags": tags,
                        }
                        if cat_id:
                            payload["category_id"] = cat_id
                        resp = self._post("/expenses", payload, service_port=8002)
                        if resp.status_code in (200, 201):
                            count += 1
                        else:
                            if count == 0:  # Print first error for debugging
                                print(f"   WARN: expense failed: {resp.status_code} {resp.text[:200]}")

            # Seasonal spikes
            if month == 10:  # Diwali
                for _ in range(random.randint(3, 6)):
                    resp = self._post("/expenses", {
                        "amount": round(random.uniform(2000, 15000), 2),
                        "currency": CURRENCY,
                        "description": random.choice(["Diwali gifts", "Diwali decoration", "Diwali sweets", "Firecrackers", "Diwali shopping"]),
                        "transaction_date": random_date_in_month(year, month),
                        "payment_method": "credit_card",
                        "tags": ["diwali", "festival"],
                        "category_id": self.category_map.get("Shopping"),
                    }, service_port=8002)
                    if resp.status_code in (200, 201):
                        count += 1

            if month == 1:  # New Year
                resp = self._post("/expenses", {
                    "amount": round(random.uniform(3000, 8000), 2),
                    "currency": CURRENCY,
                    "description": "New Year celebration dinner",
                    "transaction_date": f"{year}-01-01",
                    "payment_method": "credit_card",
                    "tags": ["new_year", "celebration"],
                    "category_id": self.category_map.get("Food & Dining"),
                }, service_port=8002)
                if resp.status_code in (200, 201):
                    count += 1

        self.stats["expenses"] = count
        print(f"   Created {count} expenses")

    # ── Income ─────────────────────────────────────────────────────────────

    def seed_income(self):
        print("💰 Seeding income...")
        count = 0
        for month_start in months_between(SEED_START, SEED_END):
            year, month = month_start.year, month_start.month

            for source, desc, amount_fn, frequency, is_recurring, recurrence in INCOME_PATTERNS:
                should_create = False
                if frequency == "monthly":
                    should_create = True
                elif frequency == "quarterly" and month in (3, 6, 9, 12):
                    should_create = True
                elif frequency == "occasional_3" and random.random() < 0.25:
                    should_create = True
                elif frequency == "occasional_2" and month in (3, 10):
                    should_create = True

                if not should_create:
                    continue

                income_date = random_date_in_month(year, month)
                if date.fromisoformat(income_date) > SEED_END:
                    continue

                # Salary always on 1st
                if source == "salary":
                    income_date = f"{year}-{month:02d}-01"
                # Rent on 5th
                elif source == "rental":
                    income_date = f"{year}-{month:02d}-05"

                payload = {
                    "source": source,
                    "amount": round(amount_fn(), 2),
                    "currency": CURRENCY,
                    "income_date": income_date,
                    "description": desc,
                    "is_recurring": is_recurring,
                    "recurrence_period": recurrence,
                }
                resp = self._post("/income", payload, service_port=8002)
                if resp.status_code in (200, 201):
                    count += 1
                elif not hasattr(self, '_income_warn_shown'):
                    self._income_warn_shown = True
                    print(f"   WARN: income failed: {resp.status_code} {resp.text[:200]}")

        # Bonus in March (fiscal year end)
        for yr in (2025, 2026):
            bonus_date = f"{yr}-03-15"
            if date.fromisoformat(bonus_date) <= SEED_END:
                resp = self._post("/income", {
                    "source": "salary",
                    "amount": round(BASE_SALARY * random.uniform(1.5, 3.0), 2),
                    "currency": CURRENCY,
                    "income_date": bonus_date,
                    "description": "Annual performance bonus",
                    "is_recurring": False,
                    "notes": f"FY {yr-1}-{yr} bonus",
                }, service_port=8002)
                if resp.status_code in (200, 201):
                    count += 1

        self.stats["income"] = count
        print(f"   Created {count} income records")

    # ── Budgets ────────────────────────────────────────────────────────────

    def seed_budgets(self):
        print("📊 Seeding budgets...")
        count = 0
        # Create budgets for current month and a few previous months
        for month_start in months_between(date(2025, 10, 1), SEED_END):
            year, month = month_start.year, month_start.month
            if month == 12:
                end_day = date(year + 1, 1, 1) - timedelta(days=1)
            else:
                end_day = date(year, month + 1, 1) - timedelta(days=1)

            for name, cat_name, amount, period in BUDGET_DEFS:
                payload = {
                    "name": f"{name} - {month_start.strftime('%b %Y')}",
                    "amount": amount,
                    "currency": CURRENCY,
                    "period": period,
                    "start_date": month_start.isoformat(),
                    "end_date": end_day.isoformat(),
                    "alert_threshold": 80,
                }
                if cat_name and cat_name in self.category_map:
                    payload["category_id"] = self.category_map[cat_name]

                resp = self._post("/budgets", payload, service_port=8002)
                if resp.status_code in (200, 201):
                    count += 1
                else:
                    if count == 0:
                        print(f"   WARN: budget failed: {resp.status_code} {resp.text[:200]}")

        self.stats["budgets"] = count
        print(f"   Created {count} budgets")

    # ── EMIs ───────────────────────────────────────────────────────────────

    def seed_emis(self):
        print("🏦 Seeding EMIs...")
        count = 0
        emi_ids = []
        for emi_def in EMI_DEFS:
            payload = {**emi_def, "currency": CURRENCY}
            resp = self._post("/emis", payload, service_port=8003)
            if resp.status_code in (200, 201):
                count += 1
                data = resp.json()
                emi_id = data.get("id") or data.get("emi", {}).get("id")
                if emi_id:
                    emi_ids.append((emi_id, emi_def["start_date"]))
            else:
                print(f"   WARN: EMI failed: {resp.status_code} {resp.text[:200]}")

        self.stats["emis"] = count
        print(f"   Created {count} EMIs")

        # Mark some past payments as paid
        print("   Marking past EMI payments as paid...")
        paid_count = 0
        for emi_id, start_str in emi_ids:
            resp = self._get(f"/emis/{emi_id}/schedule", service_port=8003)
            if resp.status_code != 200:
                continue
            payments = resp.json()
            if isinstance(payments, dict):
                payments = payments.get("schedule", payments.get("payments", []))
            for payment in payments:
                due_date = payment.get("due_date", "")
                if due_date and date.fromisoformat(due_date) < SEED_END and payment.get("status") == "pending":
                    mark_resp = self._put(
                        f"/payments/{payment['id']}/mark-paid",
                        service_port=8003,
                        params={"paid_date": due_date},
                    )
                    if mark_resp.status_code in (200, 201):
                        paid_count += 1
        print(f"   Marked {paid_count} EMI payments as paid")

    # ── Investments ────────────────────────────────────────────────────────

    def seed_investments(self):
        print("📈 Seeding investments...")
        count = 0
        for inv_def in INVESTMENT_DEFS:
            payload = {**inv_def, "currency": CURRENCY}
            resp = self._post("/investments", payload, service_port=8004)
            if resp.status_code in (200, 201):
                count += 1
            else:
                print(f"   WARN: investment failed: {resp.status_code} {resp.text[:200]}")

        # Add some SIP installments (monthly mutual fund purchases)
        sip_funds = [
            ("Nifty 50 Index Fund - UTI", "UTI-N50", 5000, 180.0),
            ("Parag Parikh Flexi Cap", "PPFCF", 3000, 65.0),
            ("Axis Small Cap Fund", "AXIS-SC", 2000, 95.0),
        ]
        for fund_name, symbol, monthly_amount, nav_base in sip_funds:
            for month_start in months_between(date(2025, 2, 1), SEED_END):
                sip_date = f"{month_start.year}-{month_start.month:02d}-05"
                if date.fromisoformat(sip_date) > SEED_END:
                    continue
                # NAV fluctuates
                nav = round(nav_base * random.uniform(0.95, 1.12), 2)
                units = round(monthly_amount / nav, 4)
                payload = {
                    "investment_type": "mutual_fund",
                    "asset_name": f"{fund_name} - SIP {month_start.strftime('%b %Y')}",
                    "asset_symbol": symbol,
                    "quantity": units,
                    "purchase_price": nav,
                    "currency": CURRENCY,
                    "purchase_date": sip_date,
                    "notes": f"Monthly SIP - {monthly_amount} INR",
                }
                resp = self._post("/investments", payload, service_port=8004)
                if resp.status_code in (200, 201):
                    count += 1

        self.stats["investments"] = count
        print(f"   Created {count} investments")

    # ── Borrowings ─────────────────────────────────────────────────────────

    def seed_borrowings(self):
        print("🤝 Seeding borrowings...")
        count = 0
        borrowing_ids = []
        for borrow_def in BORROWING_DEFS:
            payload = {**borrow_def, "currency": CURRENCY}
            resp = self._post("/borrowings", payload, service_port=8002)
            if resp.status_code in (200, 201):
                count += 1
                data = resp.json()
                b_id = data.get("id")
                if b_id:
                    borrowing_ids.append((b_id, borrow_def))
            else:
                print(f"   WARN: borrowing failed: {resp.status_code} {resp.text[:200]}")

        self.stats["borrowings"] = count
        print(f"   Created {count} borrowings")

        # Add some repayments
        repay_count = 0
        for b_id, bdef in borrowing_ids:
            borrow_date = date.fromisoformat(bdef["borrowed_date"])
            principal = bdef["principal_amount"]
            # For the first borrowing (Rahul), repay in 2 installments
            if "Rahul" in bdef["lender_name"]:
                for i, amt in enumerate([25000, 25000]):
                    repay_date = (borrow_date + timedelta(days=30 * (i + 1))).isoformat()
                    if date.fromisoformat(repay_date) > SEED_END:
                        continue
                    resp = self._post(f"/borrowings/{b_id}/repayments", {
                        "amount": amt,
                        "repayment_date": repay_date,
                        "payment_method": "upi",
                        "note": f"Repayment #{i+1}",
                        "close_borrowing": (i == 1),
                    }, service_port=8002)
                    if resp.status_code in (200, 201):
                        repay_count += 1
            # Dad - partial repayment
            elif "Dad" in bdef["lender_name"]:
                resp = self._post(f"/borrowings/{b_id}/repayments", {
                    "amount": 30000,
                    "repayment_date": "2025-08-15",
                    "payment_method": "bank_transfer",
                    "note": "Partial repayment",
                }, service_port=8002)
                if resp.status_code in (200, 201):
                    repay_count += 1

        self.stats["repayments"] = repay_count
        print(f"   Created {repay_count} borrowing repayments")

    # ── Lendings ───────────────────────────────────────────────────────────

    def seed_lendings(self):
        print("💳 Seeding lendings...")
        count = 0
        lending_ids = []
        for lend_def in LENDING_DEFS:
            payload = {**lend_def, "currency": CURRENCY}
            resp = self._post("/lendings", payload, service_port=8002)
            if resp.status_code in (200, 201):
                count += 1
                data = resp.json()
                l_id = data.get("id")
                if l_id:
                    lending_ids.append((l_id, lend_def))
            else:
                print(f"   WARN: lending failed: {resp.status_code} {resp.text[:200]}")

        self.stats["lendings"] = count
        print(f"   Created {count} lendings")

        # Add some collections
        collect_count = 0
        for l_id, ldef in lending_ids:
            # Amit returned fully
            if "Amit" in ldef["borrower_name"]:
                resp = self._post(f"/lendings/{l_id}/collections", {
                    "amount": 15000,
                    "collection_date": "2025-06-20",
                    "payment_method": "upi",
                    "note": "First half",
                }, service_port=8002)
                if resp.status_code in (200, 201):
                    collect_count += 1
                resp = self._post(f"/lendings/{l_id}/collections", {
                    "amount": 15000,
                    "collection_date": "2025-07-15",
                    "payment_method": "upi",
                    "note": "Final payment",
                    "close_lending": True,
                }, service_port=8002)
                if resp.status_code in (200, 201):
                    collect_count += 1
            # Sneha partial
            elif "Sneha" in ldef["borrower_name"]:
                resp = self._post(f"/lendings/{l_id}/collections", {
                    "amount": 10000,
                    "collection_date": "2025-09-15",
                    "payment_method": "upi",
                    "note": "Partial return",
                }, service_port=8002)
                if resp.status_code in (200, 201):
                    collect_count += 1

        self.stats["collections"] = collect_count
        print(f"   Created {collect_count} lending collections")

    # ── Net Worth Snapshots ────────────────────────────────────────────────

    def seed_net_worth_snapshots(self):
        print("📸 Triggering net worth snapshot...")
        resp = self._post("/net-worth/snapshot", {}, service_port=8002)
        if resp.status_code in (200, 201):
            print("   Net worth snapshot created")
        else:
            print(f"   WARN: snapshot failed: {resp.status_code} {resp.text[:200]}")

    # ── Run All ────────────────────────────────────────────────────────────

    def run(self):
        print("=" * 60)
        print("  Monthly Financial Tracker - Mock Data Seeder")
        print("=" * 60)
        print(f"  Base URL: {self.base_url}")
        print(f"  Email:    {self.email}")
        print(f"  Period:   {SEED_START} → {SEED_END}")
        print("=" * 60)
        print()

        self.register_and_login()
        self.fetch_categories()
        self.seed_expenses()
        self.seed_income()
        self.seed_budgets()
        self.seed_emis()
        self.seed_investments()
        self.seed_borrowings()
        self.seed_lendings()
        self.seed_net_worth_snapshots()

        print()
        print("=" * 60)
        print("  Seed Summary")
        print("=" * 60)
        for key, val in self.stats.items():
            print(f"  {key:20s}: {val}")
        total = sum(self.stats.values())
        print(f"  {'TOTAL':20s}: {total}")
        print("=" * 60)
        print("  Done! Login with:")
        print(f"    Email:    {self.email}")
        print(f"    Password: {self.password}")
        print("=" * 60)


def main():
    parser = argparse.ArgumentParser(description="Seed realistic mock data")
    parser.add_argument("--base-url", default="http://localhost", help="API base URL (default: http://localhost)")
    parser.add_argument("--email", default="demo@example.com", help="User email")
    parser.add_argument("--password", default="Demo1234", help="User password")
    parser.add_argument("--tenant", default="Demo Household", help="Tenant name")
    args = parser.parse_args()

    random.seed(42)  # Reproducible data

    seeder = Seeder(args.base_url, args.email, args.password, args.tenant)
    seeder.run()


if __name__ == "__main__":
    main()
