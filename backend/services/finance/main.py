from fastapi import FastAPI, Depends, HTTPException, status, Request, UploadFile, File, Body, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import joinedload
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
import uuid
import io
import csv
import re
from minio import Minio
from minio.error import S3Error

import sys
sys.path.append('/app')

from shared.database import get_db, set_tenant_context
from shared.models import Expense, Category, Budget, ExchangeRate
from shared.middleware.auth import get_current_user, auth_middleware
from shared.config import get_settings

app = FastAPI(title="Finance Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add auth middleware to validate JWT tokens
app.middleware("http")(auth_middleware)

settings = get_settings()

# Initialize MinIO client
minio_client = Minio(
    "minio:9000",
    access_key=settings.MINIO_ACCESS_KEY,
    secret_key=settings.MINIO_SECRET_KEY,
    secure=False
)

class ExpenseCreate(BaseModel):
    category_id: Optional[str] = None
    amount: float
    currency: str = "USD"
    description: Optional[str] = None
    transaction_date: date
    payment_method: Optional[str] = None
    tags: Optional[List[str]] = None

class ExpenseResponse(BaseModel):
    id: str
    amount: float
    currency: str
    description: Optional[str]
    transaction_date: date
    payment_method: Optional[str]
    category_id: Optional[str]
    created_at: datetime
    
    # category display fields
    category_name: Optional[str] = None
    category_color: Optional[str] = None
    category_icon: Optional[str] = None

class CategoryCreate(BaseModel):
    name: str
    type: str
    color: Optional[str] = "#3B82F6"
    icon: Optional[str] = "folder"

class CategoryResponse(BaseModel):
    id: str
    name: str
    type: str
    color: str
    icon: str
    is_system: bool

# Default categories to auto-seed for each tenant
DEFAULT_CATEGORIES = [
    {"name": "Food & Dining",   "type": "expense", "color": "#f97316", "icon": "utensils"},
    {"name": "Transportation",  "type": "expense", "color": "#3b82f6", "icon": "car"},
    {"name": "Shopping",        "type": "expense", "color": "#a855f7", "icon": "shopping"},
    {"name": "Utilities",       "type": "expense", "color": "#10b981", "icon": "home"},
    {"name": "Healthcare",      "type": "expense", "color": "#ef4444", "icon": "heart"},
    {"name": "Entertainment",   "type": "expense", "color": "#ec4899", "icon": "film"},
    {"name": "Other",           "type": "expense", "color": "#64748b", "icon": "folder"},
]

class BudgetCreate(BaseModel):
    category_id: Optional[str] = None
    name: str
    amount: float
    currency: str = "USD"
    period: str
    start_date: date
    end_date: date
    alert_threshold: Optional[float] = 80

class BudgetUpdate(BaseModel):
    category_id: Optional[str] = None
    name: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = None
    period: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    alert_threshold: Optional[float] = None

class BudgetResponse(BaseModel):
    id: str
    name: str
    amount: float
    currency: str
    period: str
    start_date: date
    end_date: date
    spent: float
    remaining: float
    percentage_used: float

async def get_exchange_rate(
    db: AsyncSession,
    from_currency: str,
    to_currency: str,
    rate_date: date = None
) -> Decimal:
    if from_currency == to_currency:
        return Decimal("1.0")
    
    if rate_date is None:
        rate_date = date.today()
    
    result = await db.execute(
        select(ExchangeRate).where(
            and_(
                ExchangeRate.base_currency == from_currency,
                ExchangeRate.target_currency == to_currency,
                ExchangeRate.date == rate_date
            )
        )
    )
    rate_obj = result.scalar_one_or_none()
    
    if rate_obj:
        return rate_obj.rate
    
    result = await db.execute(
        select(ExchangeRate).where(
            and_(
                ExchangeRate.base_currency == to_currency,
                ExchangeRate.target_currency == from_currency,
                ExchangeRate.date == rate_date
            )
        )
    )
    rate_obj = result.scalar_one_or_none()
    
    if rate_obj:
        return Decimal("1.0") / rate_obj.rate
    
    return Decimal("1.0")

async def ensure_default_categories_for_tenant(
    db: AsyncSession,
    tenant_id: str,
):
    # Check if this tenant already has any categories
    result = await db.execute(
        select(func.count(Category.id)).where(
            Category.tenant_id == uuid.UUID(tenant_id)
        )
    )
    count = result.scalar_one() or 0
    if count > 0:
        return  # already seeded or user created some

    # Seed defaults
    for cat in DEFAULT_CATEGORIES:
        new_cat = Category(
            tenant_id=uuid.UUID(tenant_id),
            user_id=None,          # system-wide for this tenant
            name=cat["name"],
            type=cat["type"],
            color=cat["color"],
            icon=cat["icon"],
            is_system=True,
        )
        db.add(new_cat)

    await db.commit()

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "finance"}

@app.post("/expenses", response_model=ExpenseResponse)
async def create_expense(
    expense: ExpenseCreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    user = get_current_user(request)
    await set_tenant_context(db, user["tenant_id"])
    
    exchange_rate = await get_exchange_rate(db, expense.currency, "USD", expense.transaction_date)
    amount_in_base = Decimal(str(expense.amount)) * exchange_rate
    
    new_expense = Expense(
        tenant_id=uuid.UUID(user["tenant_id"]),
        user_id=uuid.UUID(user["user_id"]),
        category_id=uuid.UUID(expense.category_id) if expense.category_id else None,
        amount=Decimal(str(expense.amount)),
        currency=expense.currency,
        amount_in_base_currency=amount_in_base,
        exchange_rate=exchange_rate,
        description=expense.description,
        transaction_date=expense.transaction_date,
        payment_method=expense.payment_method,
        tags=expense.tags,
        synced=True
    )
    
    db.add(new_expense)
    await db.commit()
    await db.refresh(new_expense)
    
    # Fetch category if exists
    category = None
    if new_expense.category_id:
        result = await db.execute(
            select(Category).where(Category.id == new_expense.category_id)
        )
        category = result.scalar_one_or_none()
    
    return ExpenseResponse(
        id=str(new_expense.id),
        amount=float(new_expense.amount),
        currency=new_expense.currency,
        description=new_expense.description,
        transaction_date=new_expense.transaction_date,
        payment_method=new_expense.payment_method,
        category_id=str(new_expense.category_id) if new_expense.category_id else None,
        created_at=new_expense.created_at,
        category_name=category.name if category else None,
        category_color=category.color if category else None,
        category_icon=category.icon if category else None,
    )

@app.get("/expenses", response_model=List[ExpenseResponse])
async def get_expenses(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    user = get_current_user(request)
    await set_tenant_context(db, user["tenant_id"])
    
    result = await db.execute(
        select(Expense)
        .options(joinedload(Expense.category))
        .where(Expense.user_id == uuid.UUID(user["user_id"]))
        .order_by(Expense.transaction_date.desc())
        .offset(skip)
        .limit(limit)
    )
    expenses = result.scalars().all()
    
    return [
        ExpenseResponse(
            id=str(exp.id),
            amount=float(exp.amount),
            currency=exp.currency,
            description=exp.description,
            transaction_date=exp.transaction_date,
            payment_method=exp.payment_method,
            category_id=str(exp.category_id) if exp.category_id else None,
            created_at=exp.created_at,
            category_name=exp.category.name if exp.category else None,
            category_color=exp.category.color if exp.category else None,
            category_icon=exp.category.icon if exp.category else None,
        )
        for exp in expenses
    ]

@app.put("/expenses/{expense_id}", response_model=ExpenseResponse)
async def update_expenses(
    expense_id: str,
    payload: ExpenseCreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    user = get_current_user(request)
    await set_tenant_context(db, user["tenant_id"])

    result = await db.execute(
        select(Expense).where(and_(Expense.id == uuid.UUID(expense_id), Expense.user_id == uuid.UUID(user["user_id"])))
    )
    expense = result.scalar_one_or_none()
    if not expense: 
        raise HTTPException(status_code=404, detail="Expense not found")

    expense.category_id = uuid.UUID(payload.category_id) if payload.category_id else None 
    expense.amount = Decimal(str(payload.amount))
    expense.currency = payload.currency 
    expense.description = payload.description 
    expense.transaction_date = payload.transaction_date 
    expense.payment_method = payload.payment_method 
    expense.tags = payload.tags 

    exchange_rate = await get_exchange_rate(db, payload.currency, "USD", payload.transaction_date)
    expense.exchange_rate = exchange_rate 
    expense.amount_in_base_currency = Decimal(str(payload.amount)) * exchange_rate 

    await db.commit()
    await db.refresh(expense)
    
    # Fetch category if exists
    category = None
    if expense.category_id:
        result = await db.execute(
            select(Category).where(Category.id == expense.category_id)
        )
        category = result.scalar_one_or_none()

    return ExpenseResponse(
        id=str(expense.id),
        amount=float(expense.amount),
        currency=expense.currency,
        description=expense.description,
        transaction_date=expense.transaction_date,
        payment_method=expense.payment_method,
        category_id=str(expense.category_id) if expense.category_id else None,
        created_at=expense.created_at,
        category_name=category.name if category else None,
        category_color=category.color if category else None,
        category_icon=category.icon if category else None,
    )


@app.delete("/expenses/{expense_id}")
async def delete_expense(
    expense_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    user = get_current_user(request)
    await set_tenant_context(db, user["tenant_id"])
    
    result = await db.execute(
        select(Expense).where(
            and_(
                Expense.id == uuid.UUID(expense_id),
                Expense.user_id == uuid.UUID(user["user_id"])
            )
        )
    )
    expense = result.scalar_one_or_none()
    
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    await db.delete(expense)
    await db.commit()
    
    return {"message": "Expense deleted successfully"}

@app.post("/categories", response_model=CategoryResponse)
async def create_category(
    category: CategoryCreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    user = get_current_user(request)
    await set_tenant_context(db, user["tenant_id"])
    
    new_category = Category(
        tenant_id=uuid.UUID(user["tenant_id"]),
        user_id=uuid.UUID(user["user_id"]),
        name=category.name,
        type=category.type,
        color=category.color,
        icon=category.icon,
        is_system=False
    )
    
    db.add(new_category)
    await db.commit()
    await db.refresh(new_category)
    
    return CategoryResponse(
        id=str(new_category.id),
        name=new_category.name,
        type=new_category.type,
        color=new_category.color,
        icon=new_category.icon
    )

@app.get("/categories", response_model=List[CategoryResponse])
async def get_categories(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    user = get_current_user(request)
    await set_tenant_context(db, user["tenant_id"])

    # Ensure system defaults exist for this tenant
    await ensure_default_categories_for_tenant(db, user["tenant_id"])
    
    result = await db.execute(
        select(Category).where(
            Category.tenant_id == uuid.UUID(user["tenant_id"])
        )
    )
    categories = result.scalars().all()
    
    return [
        CategoryResponse(
            id=str(cat.id),
            name=cat.name,
            type=cat.type,
            color=cat.color,
            icon=cat.icon,
            is_system=cat.is_system
        )
        for cat in categories
    ]

@app.post("/budgets", response_model=BudgetResponse)
async def create_budget(
    budget: BudgetCreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    user = get_current_user(request)
    await set_tenant_context(db, user["tenant_id"])
    
    new_budget = Budget(
        tenant_id=uuid.UUID(user["tenant_id"]),
        user_id=uuid.UUID(user["user_id"]),
        category_id=uuid.UUID(budget.category_id) if budget.category_id else None,
        name=budget.name,
        amount=Decimal(str(budget.amount)),
        currency=budget.currency,
        period=budget.period,
        start_date=budget.start_date,
        end_date=budget.end_date,
        alert_threshold=Decimal(str(budget.alert_threshold)) if budget.alert_threshold is not None else Decimal("80"),
        is_active=True
    )
    
    db.add(new_budget)
    await db.commit()
    await db.refresh(new_budget)
    
    result = await db.execute(
        select(func.sum(Expense.amount_in_base_currency))
        .where(
            and_(
                Expense.user_id == uuid.UUID(user["user_id"]),
                Expense.transaction_date >= budget.start_date,
                Expense.transaction_date <= budget.end_date,
                Expense.category_id == new_budget.category_id if new_budget.category_id else True
            )
        )
    )
    spent = result.scalar() or Decimal("0")
    
    remaining = new_budget.amount - spent
    percentage = (spent / new_budget.amount * 100) if new_budget.amount > 0 else 0
    
    return BudgetResponse(
        id=str(new_budget.id),
        name=new_budget.name,
        amount=float(new_budget.amount),
        currency=new_budget.currency,
        period=new_budget.period,
        start_date=new_budget.start_date,
        end_date=new_budget.end_date,
        spent=float(spent),
        remaining=float(remaining),
        percentage_used=float(percentage)
    )

@app.get("/budgets", response_model=List[BudgetResponse])
async def get_budgets(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    user = get_current_user(request)
    await set_tenant_context(db, user["tenant_id"])
    
    result = await db.execute(
        select(Budget).where(
            and_(
                Budget.user_id == uuid.UUID(user["user_id"]),
                Budget.is_active == True
            )
        )
    )
    budgets = result.scalars().all()
    
    budget_responses = []
    for budget in budgets:
        # Build conditions list
        conditions = [
            Expense.user_id == uuid.UUID(user["user_id"]),
            Expense.transaction_date >= budget.start_date,
            Expense.transaction_date <= budget.end_date,
        ]
        
        # Add category filter only if budget.category_id exists
        if budget.category_id:
            conditions.append(Expense.category_id == budget.category_id)
        
        result = await db.execute(
            select(func.sum(Expense.amount_in_base_currency))
            .where(and_(*conditions))
        )
        spent = result.scalar() or Decimal("0")
        remaining = budget.amount - spent
        percentage = (spent / budget.amount * 100) if budget.amount > 0 else 0
        
        budget_responses.append(BudgetResponse(
            id=str(budget.id),
            name=budget.name,
            amount=float(budget.amount),
            currency=budget.currency,
            period=budget.period,
            start_date=budget.start_date,
            end_date=budget.end_date,
            spent=float(spent),
            remaining=float(remaining),
            percentage_used=float(percentage)
        ))
    
    return budget_responses

@app.put("/budgets/{budget_id}", response_model=BudgetResponse)
async def update_budget(
    budget_id: str,
    payload: BudgetUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    user = get_current_user(request)
    await set_tenant_context(db, user["tenant_id"])

    # Find existing budget for this user
    result = await db.execute(
        select(Budget).where(
            and_(
                Budget.id == uuid.UUID(budget_id),
                Budget.user_id == uuid.UUID(user["user_id"]),
            )
        )
    )
    budget = result.scalar_one_or_none()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    # Apply partial updates
    if payload.category_id is not None:
        budget.category_id = uuid.UUID(payload.category_id) if payload.category_id else None
    if payload.name is not None:
        budget.name = payload.name
    if payload.amount is not None:
        budget.amount = Decimal(str(payload.amount))
    if payload.currency is not None:
        budget.currency = payload.currency
    if payload.period is not None:
        budget.period = payload.period
    if payload.start_date is not None:
        budget.start_date = payload.start_date
    if payload.end_date is not None:
        budget.end_date = payload.end_date
    if payload.alert_threshold is not None:
        budget.alert_threshold = Decimal(str(payload.alert_threshold))

    await db.commit()
    await db.refresh(budget)

    # Recompute spent/remaining/percentage with updated fields
    conditions = [
        Expense.user_id == uuid.UUID(user["user_id"]),
        Expense.transaction_date >= budget.start_date,
        Expense.transaction_date <= budget.end_date,
    ]
    if budget.category_id:
        conditions.append(Expense.category_id == budget.category_id)

    result = await db.execute(
        select(func.sum(Expense.amount_in_base_currency)).where(and_(*conditions))
    )
    spent = result.scalar() or Decimal("0")

    remaining = budget.amount - spent
    percentage = (spent / budget.amount * 100) if budget.amount > 0 else 0

    return BudgetResponse(
        id=str(budget.id),
        name=budget.name,
        amount=float(budget.amount),
        currency=budget.currency,
        period=budget.period,
        start_date=budget.start_date,
        end_date=budget.end_date,
        spent=float(spent),
        remaining=float(remaining),
        percentage_used=float(percentage),
    )

@app.delete("/budgets/{budget_id}")
async def delete_budget(
    budget_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    user = get_current_user(request)
    await set_tenant_context(db, user["tenant_id"])

    result = await db.execute(
        select(Budget).where(
            and_(
                Budget.id == uuid.UUID(budget_id),
                Budget.user_id == uuid.UUID(user["user_id"]),
            )
        )
    )
    budget = result.scalar_one_or_none()
    if not budget:
        raise HTTPException(status_code=404, detail="Budget not found")

    await db.delete(budget)
    await db.commit()

    return {"message": "Budget deleted successfully"}

def parse_bank_statement_csv(content: str, currency: str = "INR") -> List[dict]:
    """Parse bank statement CSV and extract transactions"""
    transactions = []
    
    try:
        csv_reader = csv.DictReader(io.StringIO(content))
        
        for row in csv_reader:
            # Try to identify common CSV formats
            transaction_date = None
            description = None
            amount = None
            payment_method = "Bank Transfer"
            
            # Common date field names
            date_fields = ['Date', 'Transaction Date', 'Value Date', 'date', 'transaction_date']
            for field in date_fields:
                if field in row and row[field]:
                    try:
                        # Try parsing common date formats
                        date_str = row[field].strip()
                        for fmt in ['%d/%m/%Y', '%Y-%m-%d', '%d-%m-%Y', '%m/%d/%Y']:
                            try:
                                transaction_date = datetime.strptime(date_str, fmt).date()
                                break
                            except:
                                continue
                        if transaction_date:
                            break
                    except:
                        continue
            
            # Common description field names
            desc_fields = ['Description', 'Narration', 'Particulars', 'description', 'narration']
            for field in desc_fields:
                if field in row and row[field]:
                    description = row[field].strip()
                    break
            
            # Common amount field names (look for debits/withdrawals)
            amount_fields = ['Debit', 'Withdrawal', 'Amount', 'Debit Amount', 'debit', 'withdrawal']
            for field in amount_fields:
                if field in row and row[field]:
                    try:
                        # Remove currency symbols and commas
                        amount_str = re.sub(r'[₹$,\s]', '', row[field].strip())
                        if amount_str:
                            amount = float(amount_str)
                            break
                    except:
                        continue
            
            # Only add valid transactions with all required fields
            if transaction_date and description and amount and amount > 0:
                transactions.append({
                    'transaction_date': transaction_date,
                    'description': description,
                    'amount': amount,
                    'currency': currency,
                    'payment_method': payment_method
                })
    except Exception as e:
        print(f"Error parsing CSV: {e}")
    
    return transactions

@app.post("/import/bank-statement")
async def import_bank_statement(
    request: Request,
    file: UploadFile = File(...),
    currency: str = Form("INR"),
    db: AsyncSession = Depends(get_db)
):
    user = get_current_user(request)
    await set_tenant_context(db, user["tenant_id"])
    
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")
    
    # Read file content
    file_content = await file.read()
    content = file_content.decode('utf-8')
    
    # Parse transactions
    transactions = parse_bank_statement_csv(content, currency)
    
    if not transactions:
        raise HTTPException(status_code=400, detail="No valid transactions found in the statement")
    
    # Store file in MinIO for record keeping
    try:
        unique_filename = f"{user['user_id']}/statements/{uuid.uuid4()}.csv"
        minio_client.put_object(
            "bank-statements",
            unique_filename,
            io.BytesIO(file_content),
            len(file_content),
            content_type="text/csv"
        )
    except Exception as e:
        print(f"MinIO upload error: {e}")
    
    # Import transactions as expenses
    imported_count = 0
    exchange_rate = await get_exchange_rate(db, currency, "USD")
    
    for trans in transactions:
        try:
            amount_in_base = Decimal(str(trans['amount'])) * exchange_rate
            
            new_expense = Expense(
                tenant_id=uuid.UUID(user["tenant_id"]),
                user_id=uuid.UUID(user["user_id"]),
                amount=Decimal(str(trans['amount'])),
                currency=trans['currency'],
                amount_in_base_currency=amount_in_base,
                exchange_rate=exchange_rate,
                description=trans['description'],
                transaction_date=trans['transaction_date'],
                payment_method=trans['payment_method'],
                synced=True
            )
            
            db.add(new_expense)
            imported_count += 1
        except Exception as e:
            print(f"Error importing transaction: {e}")
            continue
    
    await db.commit()
    
    return {
        "message": "Bank statement imported successfully",
        "total_transactions": len(transactions),
        "imported_count": imported_count,
        "transactions": transactions[:10]  # Return first 10 for preview
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
