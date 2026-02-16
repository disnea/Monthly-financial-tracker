# Missing Integrations & Critical Gaps

**Last Updated:** February 4, 2026

---

## 1. MinIO File Upload Integration ⚠️ CRITICAL

### Status
MinIO is **configured but NOT actively used** for file management.

### Missing Functionality
- Expense receipt uploads
- EMI loan document storage
- Investment document management
- Profile picture uploads
- Bulk import file handling

### Implementation Required

#### Backend API Endpoints
```python
# Add to Finance Service (Port 8002)
POST   /api/finance/expenses/{id}/receipt      # Upload receipt
GET    /api/finance/expenses/{id}/receipt      # Get receipt URL
DELETE /api/finance/expenses/{id}/receipt      # Delete receipt
GET    /api/finance/expenses/{id}/receipts     # List all receipts

# Add to EMI Service (Port 8003)
POST   /api/emi/emis/{id}/documents           # Upload loan documents
GET    /api/emi/emis/{id}/documents           # List documents
DELETE /api/emi/emis/{id}/documents/{doc_id}  # Delete document

# Add to Investment Service (Port 8004)
POST   /api/investment/investments/{id}/documents  # Upload certificates
GET    /api/investment/investments/{id}/documents  # List documents
```

#### Frontend Components
- Drag-and-drop upload component
- Image preview gallery
- PDF viewer integration
- File size validation (max 10MB)
- Progress indicators
- Thumbnail generation
- Multi-file upload

#### OCR Integration (Future Enhancement)
- **Tesseract.js** (client-side) - Free, privacy-friendly
- **AWS Textract** (server-side) - $1.50 per 1000 pages
- Auto-extract: amount, date, merchant, category
- Confidence scoring (0-100%)
- Manual correction interface

### Technical Implementation

```python
# backend/services/finance/utils/file_upload.py

from minio import Minio
import uuid
from datetime import timedelta

async def upload_file_to_minio(
    file: UploadFile,
    tenant_id: str,
    expense_id: str,
    bucket_name: str = "receipts"
):
    """Upload file to MinIO and return URL"""
    
    # Generate unique filename
    file_extension = file.filename.split('.')[-1]
    unique_filename = f"{tenant_id}/{expense_id}/{uuid.uuid4()}.{file_extension}"
    
    # Upload to MinIO
    minio_client.put_object(
        bucket_name,
        unique_filename,
        file.file,
        length=file.size,
        content_type=file.content_type
    )
    
    # Generate presigned URL (valid for 7 days)
    url = minio_client.presigned_get_object(
        bucket_name,
        unique_filename,
        expires=timedelta(days=7)
    )
    
    return {
        "file_path": unique_filename,
        "url": url,
        "filename": file.filename,
        "size": file.size,
        "content_type": file.content_type
    }
```

### Priority
**HIGH** - Users expect receipt management in financial apps

### Estimated Effort
2-3 weeks

---

## 2. Notification System ⚠️ CRITICAL

### Status
SendGrid is **configured but NOT implemented**

### Missing Notifications

#### Budget Alerts
- 75% threshold reached
- 90% threshold reached
- 100% exceeded
- Monthly budget reset

#### EMI Reminders
- 7 days before due date
- 1 day before due date
- Payment overdue alert

#### Investment Alerts
- Price target reached
- Portfolio rebalancing needed
- Dividend received

#### Goal Milestones
- 25%, 50%, 75%, 100% completion
- Behind schedule warning
- Goal achieved celebration

#### Regular Reports
- Daily spending summary
- Weekly financial report
- Monthly statement
- Unusual transaction alerts

### Implementation Architecture

#### New Microservice: Notification Service (Port 8007)

```python
# backend/services/notification/models.py

class Notification(Base):
    __tablename__ = "notifications"
    
    id = UUID(primary_key=True)
    tenant_id = UUID(ForeignKey("tenants.id"))
    user_id = UUID(ForeignKey("users.id"))
    
    # Notification details
    type = String(20)  # "email", "push", "in_app"
    category = String(50)  # "budget", "emi", "investment", "goal"
    
    title = String(200)
    message = Text
    data = JSON  # Additional context
    
    # Status tracking
    status = String(20)  # "pending", "sent", "failed", "read"
    sent_at = DateTime
    read_at = DateTime
    
    # Delivery
    delivery_method = String(50)
    recipient_email = String(255)
    recipient_device_token = String(500)
    
    # Retries
    retry_count = Integer(default=0)
    last_error = Text
    
    created_at = DateTime(default=datetime.utcnow)


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"
    
    user_id = UUID(ForeignKey("users.id"), primary_key=True)
    
    # Channel preferences
    email_enabled = Boolean(default=True)
    push_enabled = Boolean(default=True)
    in_app_enabled = Boolean(default=True)
    
    # Category preferences
    budget_alerts = Boolean(default=True)
    emi_reminders = Boolean(default=True)
    investment_alerts = Boolean(default=True)
    goal_updates = Boolean(default=True)
    weekly_summary = Boolean(default=True)
    monthly_report = Boolean(default=True)
    
    # Quiet hours
    quiet_hours_start = Time
    quiet_hours_end = Time
    
    updated_at = DateTime(default=datetime.utcnow)
```

#### API Endpoints

```python
POST   /api/notifications/send               # Send notification
GET    /api/notifications                    # List user notifications
GET    /api/notifications/unread             # Get unread count
PUT    /api/notifications/{id}/read          # Mark as read
PUT    /api/notifications/read-all           # Mark all as read
DELETE /api/notifications/{id}               # Delete notification

GET    /api/notifications/preferences        # Get preferences
PUT    /api/notifications/preferences        # Update preferences
```

#### Celery Background Jobs

```python
# Check budget thresholds after each expense
@celery.task
def check_budget_alerts(expense_id):
    expense = get_expense(expense_id)
    budget = get_budget_for_category(expense.category_id)
    
    if budget:
        utilization = calculate_utilization(budget)
        
        if utilization >= 0.75 and not is_alert_sent(budget, 75):
            send_notification(
                user_id=budget.user_id,
                category="budget",
                title=f"Budget Alert: {budget.category.name}",
                message=f"You've used 75% of your budget for {budget.category.name}",
                type="email"
            )

# Daily EMI reminder check
@celery.task
def check_emi_reminders():
    today = date.today()
    seven_days_later = today + timedelta(days=7)
    
    upcoming_payments = EMIPayment.query.filter(
        EMIPayment.status == "pending",
        EMIPayment.due_date == seven_days_later
    ).all()
    
    for payment in upcoming_payments:
        send_notification(
            user_id=payment.emi.user_id,
            category="emi",
            title="EMI Payment Due in 7 Days",
            message=f"Your {payment.emi.loan_type} EMI of {payment.amount} is due on {payment.due_date}",
            type="email"
        )
```

### Priority
**HIGH** - Critical for user engagement

### Estimated Effort
3-4 weeks

---

## 3. Recurring Transactions ⚠️ HIGH PRIORITY

### Status
**NOT implemented**

### Current Pain Point
Users must manually enter:
- Monthly rent
- Subscriptions (Netflix, Spotify, etc.)
- Utility bills
- Salary income
- Insurance premiums

### Implementation

#### Database Schema

```python
class RecurringTransaction(Base):
    __tablename__ = "recurring_transactions"
    
    id = UUID(primary_key=True)
    tenant_id = UUID(ForeignKey("tenants.id"))
    user_id = UUID(ForeignKey("users.id"))
    
    # Template
    type = String(20)  # "expense" or "income"
    category_id = UUID(ForeignKey("categories.id"))
    amount = Numeric(15, 2)
    description = String(500)
    currency = String(3)
    payment_method = String(50)
    
    # Recurrence pattern
    frequency = String(20)  # "daily", "weekly", "monthly", "yearly"
    interval = Integer(default=1)  # Every N days/weeks/months
    day_of_month = Integer  # For monthly (1-31)
    day_of_week = Integer  # For weekly (0-6)
    
    # Schedule
    start_date = Date
    end_date = Date  # Optional
    next_occurrence = Date
    last_created = Date
    
    # Settings
    auto_create = Boolean(default=True)
    notify_before_days = Integer(default=1)
    
    # Status
    status = String(20)  # "active", "paused", "completed"
    
    created_at = DateTime
    updated_at = DateTime
```

#### Background Job

```python
@celery.task
def process_recurring_transactions():
    """Runs daily at 1 AM"""
    today = date.today()
    
    transactions = RecurringTransaction.query.filter(
        RecurringTransaction.status == 'active',
        RecurringTransaction.next_occurrence <= today
    ).all()
    
    for recurring in transactions:
        if recurring.auto_create:
            # Create actual expense/income
            if recurring.type == 'expense':
                create_expense_from_template(recurring)
            else:
                create_income_from_template(recurring)
        else:
            # Send reminder
            send_reminder_notification(recurring)
        
        # Calculate next occurrence
        recurring.next_occurrence = calculate_next_date(
            recurring.next_occurrence,
            recurring.frequency,
            recurring.interval
        )
        db.session.commit()
```

### Priority
**HIGH** - Major UX improvement

### Estimated Effort
2-3 weeks

---

## 4. Bank Account Integration 🔮 FUTURE

### Status
**NOT implemented**

### Integration Options

#### Option 1: Plaid (US Banks)
- **Pricing:** $60/month for 100 users
- **Features:** 12,000+ banks, real-time sync
- **Setup:** 1 week integration

#### Option 2: Open Banking APIs (EU/UK)
- **Pricing:** Varies by provider
- **Features:** PSD2 compliant
- **Setup:** 2-3 weeks

#### Option 3: Manual Statement Parsing
- **Pricing:** Free (custom solution)
- **Features:** PDF/CSV parsing
- **Setup:** 3-4 weeks

### Implementation

```python
# Plaid integration example
from plaid import Client

@app.post("/bank/link")
async def create_link_token(request: Request):
    """Generate Plaid Link token"""
    client = Client(
        client_id=settings.PLAID_CLIENT_ID,
        secret=settings.PLAID_SECRET,
        environment='sandbox'
    )
    
    response = client.link_token_create({
        'user': {'client_user_id': request.user.id},
        'products': ['transactions'],
        'country_codes': ['US'],
        'language': 'en',
    })
    
    return {'link_token': response['link_token']}


@app.post("/bank/exchange-token")
async def exchange_public_token(public_token: str):
    """Exchange public token for access token"""
    response = client.item_public_token_exchange(public_token)
    access_token = response['access_token']
    
    # Store access token securely
    save_encrypted_token(access_token)
    
    return {'success': True}


@celery.task
def sync_bank_transactions():
    """Sync transactions daily"""
    accounts = BankAccount.query.filter_by(status='active').all()
    
    for account in accounts:
        transactions = plaid_client.transactions_get(
            access_token=account.access_token,
            start_date=(date.today() - timedelta(days=30)),
            end_date=date.today()
        )
        
        for txn in transactions['transactions']:
            # Check for duplicates
            if not transaction_exists(txn['transaction_id']):
                create_expense_from_bank_txn(txn, account)
```

### Priority
**MEDIUM** (Phase 3)

### Estimated Effort
6-8 weeks

---

## 5. Calendar Integration 💼

### Status
**NOT implemented**

### Features Needed
- Export EMI due dates to Google Calendar
- Export bill payment reminders
- Budget period visualization
- iCal format support
- Sync with external calendars

### Implementation

```python
from icalendar import Calendar, Event

@app.get("/calendar/export")
async def export_calendar(request: Request):
    """Export financial events as iCal"""
    cal = Calendar()
    cal.add('prodid', '-//Financial Tracker//EN')
    cal.add('version', '2.0')
    
    # Add EMI due dates
    emis = get_user_emis(request.user.id)
    for emi in emis:
        payments = get_pending_payments(emi.id)
        for payment in payments:
            event = Event()
            event.add('summary', f'EMI Payment: {emi.loan_type}')
            event.add('dtstart', payment.due_date)
            event.add('description', f'Amount: {payment.amount}')
            event.add('categories', ['EMI', 'Finance'])
            cal.add_component(event)
    
    return Response(
        content=cal.to_ical(),
        media_type="text/calendar",
        headers={"Content-Disposition": "attachment; filename=financial_calendar.ics"}
    )
```

### Priority
**LOW** (Phase 3)

### Estimated Effort
1-2 weeks

---

## 6. Testing Suite ⚠️ CRITICAL

### Status
**NO tests exist**

### Required Coverage

#### Backend Tests (pytest)

```python
# Unit Tests
tests/
  unit/
    test_emi_calculations.py
    test_currency_conversion.py
    test_budget_calculations.py
    test_goal_forecasting.py
    test_date_utilities.py

# Integration Tests
  integration/
    test_auth_endpoints.py
    test_expense_endpoints.py
    test_emi_endpoints.py
    test_investment_endpoints.py
    test_multi_tenancy.py

# Load Tests (Locust)
  load/
    test_api_performance.py
    test_concurrent_users.py
```

#### Frontend Tests (Jest + Playwright)

```typescript
// Unit Tests
__tests__/
  components/
    GoalCard.test.tsx
    EMISchedule.test.tsx
    ExpenseForm.test.tsx
  utils/
    currency.test.ts
    dateFormat.test.ts

// E2E Tests (Playwright)
e2e/
  auth.spec.ts
  expense-flow.spec.ts
  emi-management.spec.ts
  investment-portfolio.spec.ts
```

### Coverage Target
**>80%** for production readiness

### Priority
**CRITICAL**

### Estimated Effort
4-6 weeks

---

## Summary Table

| Integration | Status | Priority | Effort | Dependencies |
|------------|--------|----------|--------|--------------|
| File Upload | Not Implemented | HIGH | 2-3 weeks | MinIO |
| Notifications | Not Implemented | HIGH | 3-4 weeks | SendGrid |
| Recurring Transactions | Not Implemented | HIGH | 2-3 weeks | Celery |
| Testing Suite | Not Implemented | CRITICAL | 4-6 weeks | None |
| Bank Integration | Not Implemented | MEDIUM | 6-8 weeks | Plaid API |
| Calendar Export | Not Implemented | LOW | 1-2 weeks | None |

**Total Estimated Effort:** 18-25 weeks (4-6 months)

---

**Next Steps:**
1. Prioritize file upload and notifications
2. Set up testing infrastructure
3. Implement recurring transactions
4. Plan for bank integration in Phase 3
