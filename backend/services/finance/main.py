from fastapi import FastAPI, Depends, HTTPException, status, Request, UploadFile, File, Body, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, update
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
from shared.models import Expense, Category, Budget, ExchangeRate, Borrowing, BorrowingRepayment, Income, Lending, LendingCollection
from shared.middleware.auth import get_current_user, auth_middleware
from shared.config import get_settings

app = FastAPI(title="Finance Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add auth middleware to validate JWT tokens
app.middleware("http")(auth_middleware)

settings = get_settings()

# Initialize MinIO client
minio_client = Minio(
    settings.MINIO_ENDPOINT,
    access_key=settings.MINIO_ACCESS_KEY,
    secret_key=settings.MINIO_SECRET_KEY,
    secure=settings.MINIO_SECURE
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
    # Expense Categories
    {"name": "Food & Dining",   "type": "expense", "color": "#f97316", "icon": "utensils"},
    {"name": "Transportation",  "type": "expense", "color": "#3b82f6", "icon": "car"},
    {"name": "Shopping",        "type": "expense", "color": "#a855f7", "icon": "shopping"},
    {"name": "Utilities",       "type": "expense", "color": "#10b981", "icon": "home"},
    {"name": "Healthcare",      "type": "expense", "color": "#ef4444", "icon": "heart"},
    {"name": "Entertainment",   "type": "expense", "color": "#ec4899", "icon": "film"},
    {"name": "Other",           "type": "expense", "color": "#64748b", "icon": "folder"},
    
    # Income Categories
    {"name": "Salary",          "type": "income", "color": "#10b981", "icon": "briefcase"},
    {"name": "Freelance",       "type": "income", "color": "#3b82f6", "icon": "trending-up"},
    {"name": "Investments",     "type": "income", "color": "#8b5cf6", "icon": "trending-up"},
    {"name": "Rental Income",   "type": "income", "color": "#f59e0b", "icon": "home"},
    {"name": "Gifts",           "type": "income", "color": "#ec4899", "icon": "gift"},
    {"name": "Other Income",    "type": "income", "color": "#64748b", "icon": "folder"},
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
        icon=new_category.icon,
        is_system=new_category.is_system,
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

@app.put("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: str,
    category: CategoryCreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    user = get_current_user(request)
    await set_tenant_context(db, user["tenant_id"])
    
    result = await db.execute(
        select(Category).where(
            and_(
                Category.id == uuid.UUID(category_id),
                Category.tenant_id == uuid.UUID(user["tenant_id"]),
                Category.is_system == False  # Can't update system categories
            )
        )
    )
    existing_category = result.scalar_one_or_none()
    
    if not existing_category:
        raise HTTPException(status_code=404, detail="Category not found or cannot be modified")
    
    existing_category.name = category.name
    existing_category.type = category.type
    existing_category.color = category.color
    existing_category.icon = category.icon
    
    await db.commit()
    await db.refresh(existing_category)
    
    return CategoryResponse(
        id=str(existing_category.id),
        name=existing_category.name,
        type=existing_category.type,
        color=existing_category.color,
        icon=existing_category.icon,
        is_system=existing_category.is_system
    )

@app.delete("/categories/{category_id}")
async def delete_category(
    category_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    user = get_current_user(request)
    await set_tenant_context(db, user["tenant_id"])
    
    result = await db.execute(
        select(Category).where(
            and_(
                Category.id == uuid.UUID(category_id),
                Category.tenant_id == uuid.UUID(user["tenant_id"]),
                Category.is_system == False  # Can't delete system categories
            )
        )
    )
    category = result.scalar_one_or_none()
    
    if not category:
        raise HTTPException(status_code=404, detail="Category not found or cannot be deleted")
    
    # Check if category is being used by any expenses
    expense_count = await db.execute(
        select(func.count(Expense.id)).where(Expense.category_id == category.id)
    ).scalar()
    
    if expense_count > 0:
        # Set category_id to NULL for all expenses using this category
        await db.execute(
            update(Expense).where(Expense.category_id == category.id).values(category_id=None)
        )
    
    await db.delete(category)
    await db.commit()
    
    return {"message": "Category deleted successfully"}

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

###############################################################################
# BORROWINGS ENDPOINTS (Section 3.3 of Design Review)
###############################################################################

class BorrowingCreate(BaseModel):
    lender_name: str
    lender_contact: Optional[str] = None
    principal_amount: float
    currency: str = "INR"
    interest_rate: float = 0
    interest_type: str = "none"  # 'none', 'simple', 'compound'
    borrowed_date: date
    due_date: Optional[date] = None
    purpose: Optional[str] = None
    tags: Optional[List[str]] = None
    notes: Optional[str] = None

class RepaymentCreate(BaseModel):
    amount: float
    repayment_date: date
    payment_method: Optional[str] = None
    reference_number: Optional[str] = None
    note: Optional[str] = None
    close_borrowing: bool = False

def compute_remaining(principal: float, interest_rate: float, interest_type: str, borrowed_date, total_repaid: float) -> float:
    """Compute remaining amount including accrued interest."""
    accrued = 0.0
    if interest_type == 'simple' and interest_rate > 0:
        days = (date.today() - borrowed_date).days
        accrued = float(principal) * (float(interest_rate) / 100) * (days / 365)
    elif interest_type == 'compound' and interest_rate > 0:
        days = (date.today() - borrowed_date).days
        years = days / 365
        accrued = float(principal) * ((1 + float(interest_rate) / 100) ** years - 1)
    return float(principal) + accrued - float(total_repaid)

# POST /borrowings - Create new borrowing
@app.post("/borrowings")
async def create_borrowing(data: BorrowingCreate, request: Request, db: AsyncSession = Depends(get_db)):
    user = request.state.user
    await set_tenant_context(db, user["tenant_id"])
    remaining = compute_remaining(data.principal_amount, data.interest_rate, data.interest_type, data.borrowed_date, 0)
    borrowing = Borrowing(
        tenant_id=uuid.UUID(user["tenant_id"]),
        user_id=uuid.UUID(user["user_id"]),
        lender_name=data.lender_name,
        lender_contact=data.lender_contact,
        principal_amount=Decimal(str(data.principal_amount)),
        currency=data.currency,
        interest_rate=Decimal(str(data.interest_rate)),
        interest_type=data.interest_type,
        borrowed_date=data.borrowed_date,
        due_date=data.due_date,
        purpose=data.purpose,
        tags=data.tags,
        notes=data.notes,
        total_repaid=Decimal("0"),
        remaining_amount=Decimal(str(round(remaining, 2))),
        status="open"
    )
    db.add(borrowing)
    await db.commit()
    await db.refresh(borrowing)
    return {
        "id": str(borrowing.id), "lender_name": borrowing.lender_name,
        "principal_amount": float(borrowing.principal_amount), "currency": borrowing.currency,
        "interest_rate": float(borrowing.interest_rate), "interest_type": borrowing.interest_type,
        "borrowed_date": str(borrowing.borrowed_date), "due_date": str(borrowing.due_date) if borrowing.due_date else None,
        "purpose": borrowing.purpose, "tags": borrowing.tags, "status": borrowing.status,
        "total_repaid": float(borrowing.total_repaid), "remaining_amount": float(borrowing.remaining_amount),
        "lender_contact": borrowing.lender_contact, "notes": borrowing.notes,
        "created_at": str(borrowing.created_at)
    }

# GET /borrowings - List all borrowings
@app.get("/borrowings")
async def list_borrowings(request: Request, status: Optional[str] = None, lender: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    user = request.state.user
    await set_tenant_context(db, user["tenant_id"])
    query = select(Borrowing).where(Borrowing.user_id == uuid.UUID(user["user_id"]))
    if status:
        query = query.where(Borrowing.status == status)
    if lender:
        query = query.where(Borrowing.lender_name.ilike(f"%{lender}%"))
    query = query.order_by(Borrowing.created_at.desc())
    result = await db.execute(query)
    borrowings = result.scalars().all()
    return [{
        "id": str(b.id), "lender_name": b.lender_name, "lender_contact": b.lender_contact,
        "principal_amount": float(b.principal_amount), "currency": b.currency,
        "interest_rate": float(b.interest_rate), "interest_type": b.interest_type,
        "borrowed_date": str(b.borrowed_date), "due_date": str(b.due_date) if b.due_date else None,
        "purpose": b.purpose, "tags": b.tags, "status": b.status,
        "total_repaid": float(b.total_repaid), "remaining_amount": float(b.remaining_amount or 0),
        "notes": b.notes, "closed_at": str(b.closed_at) if b.closed_at else None,
        "created_at": str(b.created_at)
    } for b in borrowings]

# GET /borrowings/:id - Get single borrowing with repayment history
@app.get("/borrowings/{borrowing_id}")
async def get_borrowing(borrowing_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    user = request.state.user
    await set_tenant_context(db, user["tenant_id"])
    result = await db.execute(
        select(Borrowing).where(Borrowing.id == uuid.UUID(borrowing_id), Borrowing.user_id == uuid.UUID(user["user_id"]))
    )
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=404, detail="Borrowing not found")
    # Fetch repayments
    rep_result = await db.execute(
        select(BorrowingRepayment).where(BorrowingRepayment.borrowing_id == b.id).order_by(BorrowingRepayment.repayment_date.desc())
    )
    repayments = rep_result.scalars().all()
    return {
        "id": str(b.id), "lender_name": b.lender_name, "lender_contact": b.lender_contact,
        "principal_amount": float(b.principal_amount), "currency": b.currency,
        "interest_rate": float(b.interest_rate), "interest_type": b.interest_type,
        "borrowed_date": str(b.borrowed_date), "due_date": str(b.due_date) if b.due_date else None,
        "purpose": b.purpose, "tags": b.tags, "status": b.status,
        "total_repaid": float(b.total_repaid), "remaining_amount": float(b.remaining_amount or 0),
        "notes": b.notes, "closed_at": str(b.closed_at) if b.closed_at else None,
        "created_at": str(b.created_at),
        "repayments": [{
            "id": str(r.id), "amount": float(r.amount), "repayment_date": str(r.repayment_date),
            "payment_method": r.payment_method, "reference_number": r.reference_number,
            "note": r.note, "created_at": str(r.created_at)
        } for r in repayments]
    }

# PUT /borrowings/:id - Update borrowing details
@app.put("/borrowings/{borrowing_id}")
async def update_borrowing(borrowing_id: str, data: BorrowingCreate, request: Request, db: AsyncSession = Depends(get_db)):
    user = request.state.user
    await set_tenant_context(db, user["tenant_id"])
    result = await db.execute(
        select(Borrowing).where(Borrowing.id == uuid.UUID(borrowing_id), Borrowing.user_id == uuid.UUID(user["user_id"]))
    )
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=404, detail="Borrowing not found")
    b.lender_name = data.lender_name
    b.lender_contact = data.lender_contact
    b.principal_amount = Decimal(str(data.principal_amount))
    b.currency = data.currency
    b.interest_rate = Decimal(str(data.interest_rate))
    b.interest_type = data.interest_type
    b.borrowed_date = data.borrowed_date
    b.due_date = data.due_date
    b.purpose = data.purpose
    b.tags = data.tags
    b.notes = data.notes
    b.remaining_amount = Decimal(str(round(compute_remaining(
        float(b.principal_amount), float(b.interest_rate), b.interest_type, b.borrowed_date, float(b.total_repaid)
    ), 2)))
    await db.commit()
    await db.refresh(b)
    return {"message": "Borrowing updated", "id": str(b.id)}

# DELETE /borrowings/:id - Delete borrowing + all repayments
@app.delete("/borrowings/{borrowing_id}")
async def delete_borrowing(borrowing_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    user = request.state.user
    await set_tenant_context(db, user["tenant_id"])
    result = await db.execute(
        select(Borrowing).where(Borrowing.id == uuid.UUID(borrowing_id), Borrowing.user_id == uuid.UUID(user["user_id"]))
    )
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=404, detail="Borrowing not found")
    await db.delete(b)
    await db.commit()
    return {"message": "Borrowing and all repayments deleted"}

# POST /borrowings/:id/repayments - Record a repayment
@app.post("/borrowings/{borrowing_id}/repayments")
async def create_repayment(borrowing_id: str, data: RepaymentCreate, request: Request, db: AsyncSession = Depends(get_db)):
    user = request.state.user
    await set_tenant_context(db, user["tenant_id"])
    result = await db.execute(
        select(Borrowing).where(Borrowing.id == uuid.UUID(borrowing_id), Borrowing.user_id == uuid.UUID(user["user_id"]))
    )
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=404, detail="Borrowing not found")
    remaining = float(b.remaining_amount or 0)
    if data.amount > remaining and remaining > 0:
        raise HTTPException(status_code=400, detail=f"Repayment cannot exceed remaining balance of {remaining}")
    if data.repayment_date < b.borrowed_date:
        raise HTTPException(status_code=400, detail="Repayment date cannot be before borrowing date")
    repayment = BorrowingRepayment(
        tenant_id=uuid.UUID(user["tenant_id"]),
        borrowing_id=b.id,
        amount=Decimal(str(data.amount)),
        repayment_date=data.repayment_date,
        payment_method=data.payment_method,
        reference_number=data.reference_number,
        note=data.note
    )
    db.add(repayment)
    b.total_repaid = Decimal(str(float(b.total_repaid or 0) + data.amount))
    b.remaining_amount = Decimal(str(round(compute_remaining(
        float(b.principal_amount), float(b.interest_rate), b.interest_type, b.borrowed_date, float(b.total_repaid)
    ), 2)))
    if data.close_borrowing or float(b.remaining_amount) <= 0:
        b.status = "closed"
        b.closed_at = datetime.utcnow()
    elif float(b.total_repaid) > 0:
        b.status = "partially_paid"
    await db.commit()
    return {"message": f"Repayment of {data.amount} recorded", "id": str(repayment.id), "remaining": float(b.remaining_amount), "status": b.status}

# GET /borrowings/:id/repayments - List repayments for a borrowing
@app.get("/borrowings/{borrowing_id}/repayments")
async def list_repayments(borrowing_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    user = request.state.user
    await set_tenant_context(db, user["tenant_id"])
    result = await db.execute(
        select(BorrowingRepayment).where(BorrowingRepayment.borrowing_id == uuid.UUID(borrowing_id))
        .order_by(BorrowingRepayment.repayment_date.desc())
    )
    repayments = result.scalars().all()
    return [{
        "id": str(r.id), "amount": float(r.amount), "repayment_date": str(r.repayment_date),
        "payment_method": r.payment_method, "reference_number": r.reference_number,
        "note": r.note, "created_at": str(r.created_at)
    } for r in repayments]

# PUT /borrowings/:id/repayments/:rid - Edit a repayment
@app.put("/borrowings/{borrowing_id}/repayments/{repayment_id}")
async def update_repayment(borrowing_id: str, repayment_id: str, data: RepaymentCreate, request: Request, db: AsyncSession = Depends(get_db)):
    user = request.state.user
    await set_tenant_context(db, user["tenant_id"])
    result = await db.execute(
        select(BorrowingRepayment).where(BorrowingRepayment.id == uuid.UUID(repayment_id), BorrowingRepayment.borrowing_id == uuid.UUID(borrowing_id))
    )
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Repayment not found")
    # Get borrowing
    b_result = await db.execute(select(Borrowing).where(Borrowing.id == uuid.UUID(borrowing_id)))
    b = b_result.scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=404, detail="Borrowing not found")
    # Adjust totals
    old_amount = float(r.amount)
    b.total_repaid = Decimal(str(float(b.total_repaid) - old_amount + data.amount))
    r.amount = Decimal(str(data.amount))
    r.repayment_date = data.repayment_date
    r.payment_method = data.payment_method
    r.reference_number = data.reference_number
    r.note = data.note
    b.remaining_amount = Decimal(str(round(compute_remaining(
        float(b.principal_amount), float(b.interest_rate), b.interest_type, b.borrowed_date, float(b.total_repaid)
    ), 2)))
    # Update status
    if float(b.remaining_amount) <= 0:
        b.status = "closed"
    elif float(b.total_repaid) > 0:
        b.status = "partially_paid"
        b.closed_at = None
    else:
        b.status = "open"
        b.closed_at = None
    await db.commit()
    return {"message": "Repayment updated"}

# DELETE /borrowings/:id/repayments/:rid - Delete a repayment
@app.delete("/borrowings/{borrowing_id}/repayments/{repayment_id}")
async def delete_repayment(borrowing_id: str, repayment_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    user = request.state.user
    await set_tenant_context(db, user["tenant_id"])
    result = await db.execute(
        select(BorrowingRepayment).where(BorrowingRepayment.id == uuid.UUID(repayment_id), BorrowingRepayment.borrowing_id == uuid.UUID(borrowing_id))
    )
    r = result.scalar_one_or_none()
    if not r:
        raise HTTPException(status_code=404, detail="Repayment not found")
    b_result = await db.execute(select(Borrowing).where(Borrowing.id == uuid.UUID(borrowing_id)))
    b = b_result.scalar_one_or_none()
    amount = float(r.amount)
    await db.delete(r)
    if b:
        b.total_repaid = Decimal(str(max(0, float(b.total_repaid) - amount)))
        b.remaining_amount = Decimal(str(round(compute_remaining(
            float(b.principal_amount), float(b.interest_rate), b.interest_type, b.borrowed_date, float(b.total_repaid)
        ), 2)))
        if float(b.remaining_amount) > 0 and b.status == "closed":
            b.status = "partially_paid" if float(b.total_repaid) > 0 else "open"
            b.closed_at = None
    await db.commit()
    return {"message": "Repayment deleted", "outstanding_increase": amount}

# POST /borrowings/:id/close - Mark as fully closed
@app.post("/borrowings/{borrowing_id}/close")
async def close_borrowing(borrowing_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    user = request.state.user
    await set_tenant_context(db, user["tenant_id"])
    result = await db.execute(
        select(Borrowing).where(Borrowing.id == uuid.UUID(borrowing_id), Borrowing.user_id == uuid.UUID(user["user_id"]))
    )
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=404, detail="Borrowing not found")
    b.status = "closed"
    b.closed_at = datetime.utcnow()
    await db.commit()
    return {"message": "Borrowing marked as fully repaid"}

# POST /borrowings/:id/reopen - Reopen a closed borrowing
@app.post("/borrowings/{borrowing_id}/reopen")
async def reopen_borrowing(borrowing_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    user = request.state.user
    await set_tenant_context(db, user["tenant_id"])
    result = await db.execute(
        select(Borrowing).where(Borrowing.id == uuid.UUID(borrowing_id), Borrowing.user_id == uuid.UUID(user["user_id"]))
    )
    b = result.scalar_one_or_none()
    if not b:
        raise HTTPException(status_code=404, detail="Borrowing not found")
    b.closed_at = None
    if float(b.total_repaid or 0) > 0:
        b.status = "partially_paid"
    else:
        b.status = "open"
    await db.commit()
    return {"message": "Borrowing reopened"}

###############################################################################
# INCOME ENDPOINTS
###############################################################################

class IncomeCreate(BaseModel):
    source: str  # salary, freelance, dividends, rental, gift, other
    amount: float
    currency: str = "INR"
    income_date: date
    description: Optional[str] = None
    is_recurring: bool = False
    recurrence_period: Optional[str] = None  # monthly, weekly, yearly
    notes: Optional[str] = None

def _income_to_dict(i) -> dict:
    return {
        "id": str(i.id), "source": i.source, "amount": float(i.amount),
        "currency": i.currency, "income_date": str(i.income_date),
        "description": i.description, "is_recurring": i.is_recurring,
        "recurrence_period": i.recurrence_period, "notes": i.notes,
        "created_at": str(i.created_at)
    }

@app.post("/income")
async def create_income(data: IncomeCreate, request: Request, db: AsyncSession = Depends(get_db)):
    user = request.state.user
    await set_tenant_context(db, user["tenant_id"])
    income = Income(
        tenant_id=uuid.UUID(user["tenant_id"]),
        user_id=uuid.UUID(user["user_id"]),
        source=data.source,
        amount=Decimal(str(data.amount)),
        currency=data.currency,
        income_date=data.income_date,
        description=data.description,
        is_recurring=data.is_recurring,
        recurrence_period=data.recurrence_period,
        notes=data.notes,
    )
    db.add(income)
    await db.commit()
    await db.refresh(income)
    return _income_to_dict(income)

@app.get("/income")
async def list_income(request: Request, start_date: Optional[date] = None, end_date: Optional[date] = None, db: AsyncSession = Depends(get_db)):
    user = request.state.user
    await set_tenant_context(db, user["tenant_id"])
    query = select(Income).where(Income.user_id == uuid.UUID(user["user_id"]))
    if start_date:
        query = query.where(Income.income_date >= start_date)
    if end_date:
        query = query.where(Income.income_date <= end_date)
    query = query.order_by(Income.income_date.desc())
    result = await db.execute(query)
    return [_income_to_dict(i) for i in result.scalars().all()]

@app.get("/income/summary")
async def income_summary(request: Request, db: AsyncSession = Depends(get_db)):
    user = request.state.user
    await set_tenant_context(db, user["tenant_id"])
    uid = uuid.UUID(user["user_id"])
    # Total income
    total_result = await db.execute(
        select(func.sum(Income.amount)).where(Income.user_id == uid)
    )
    total = float(total_result.scalar() or 0)
    # By source
    by_source_result = await db.execute(
        select(Income.source, func.sum(Income.amount).label("total"), func.count(Income.id).label("count"))
        .where(Income.user_id == uid)
        .group_by(Income.source)
        .order_by(func.sum(Income.amount).desc())
    )
    by_source = [{"source": r.source, "total": float(r.total), "count": r.count} for r in by_source_result.all()]
    # This month
    first_of_month = date.today().replace(day=1)
    month_result = await db.execute(
        select(func.sum(Income.amount)).where(Income.user_id == uid, Income.income_date >= first_of_month)
    )
    this_month = float(month_result.scalar() or 0)
    return {"total": total, "this_month": this_month, "by_source": by_source}

@app.get("/income/{income_id}")
async def get_income(income_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    user = request.state.user
    await set_tenant_context(db, user["tenant_id"])
    result = await db.execute(
        select(Income).where(Income.id == uuid.UUID(income_id), Income.user_id == uuid.UUID(user["user_id"]))
    )
    i = result.scalar_one_or_none()
    if not i:
        raise HTTPException(status_code=404, detail="Income not found")
    return _income_to_dict(i)

@app.put("/income/{income_id}")
async def update_income(income_id: str, data: IncomeCreate, request: Request, db: AsyncSession = Depends(get_db)):
    user = request.state.user
    await set_tenant_context(db, user["tenant_id"])
    result = await db.execute(
        select(Income).where(Income.id == uuid.UUID(income_id), Income.user_id == uuid.UUID(user["user_id"]))
    )
    i = result.scalar_one_or_none()
    if not i:
        raise HTTPException(status_code=404, detail="Income not found")
    i.source = data.source
    i.amount = Decimal(str(data.amount))
    i.currency = data.currency
    i.income_date = data.income_date
    i.description = data.description
    i.is_recurring = data.is_recurring
    i.recurrence_period = data.recurrence_period
    i.notes = data.notes
    await db.commit()
    await db.refresh(i)
    return _income_to_dict(i)

@app.delete("/income/{income_id}")
async def delete_income(income_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    user = request.state.user
    await set_tenant_context(db, user["tenant_id"])
    result = await db.execute(
        select(Income).where(Income.id == uuid.UUID(income_id), Income.user_id == uuid.UUID(user["user_id"]))
    )
    i = result.scalar_one_or_none()
    if not i:
        raise HTTPException(status_code=404, detail="Income not found")
    await db.delete(i)
    await db.commit()
    return {"message": "Income deleted successfully"}

###############################################################################
# LENDING ENDPOINTS
###############################################################################

class LendingCreate(BaseModel):
    borrower_name: str
    borrower_contact: Optional[str] = None
    principal_amount: float
    currency: str = "INR"
    interest_rate: float = 0
    interest_type: str = "none"  # 'none', 'simple', 'compound'
    lent_date: date
    due_date: Optional[date] = None
    purpose: Optional[str] = None
    notes: Optional[str] = None

class CollectionCreate(BaseModel):
    amount: float
    collection_date: date
    payment_method: Optional[str] = None
    reference_number: Optional[str] = None
    note: Optional[str] = None
    close_lending: bool = False

def compute_lending_remaining(principal: float, interest_rate: float, interest_type: str, lent_date, total_received: float) -> float:
    """Compute remaining amount including accrued interest for a lending."""
    accrued = 0.0
    if interest_type == 'simple' and interest_rate > 0:
        days = (date.today() - lent_date).days
        accrued = float(principal) * (float(interest_rate) / 100) * (days / 365)
    elif interest_type == 'compound' and interest_rate > 0:
        days = (date.today() - lent_date).days
        years = days / 365
        accrued = float(principal) * ((1 + float(interest_rate) / 100) ** years - 1)
    return float(principal) + accrued - float(total_received)

def _lending_to_dict(l, collections=None) -> dict:
    d = {
        "id": str(l.id), "borrower_name": l.borrower_name,
        "borrower_contact": l.borrower_contact,
        "principal_amount": float(l.principal_amount), "currency": l.currency,
        "interest_rate": float(l.interest_rate), "interest_type": l.interest_type,
        "lent_date": str(l.lent_date),
        "due_date": str(l.due_date) if l.due_date else None,
        "purpose": l.purpose, "status": l.status,
        "total_received": float(l.total_received or 0),
        "remaining_amount": float(l.remaining_amount or 0),
        "notes": l.notes,
        "closed_at": str(l.closed_at) if l.closed_at else None,
        "created_at": str(l.created_at),
    }
    if collections is not None:
        d["collections"] = [{
            "id": str(c.id), "amount": float(c.amount),
            "collection_date": str(c.collection_date),
            "payment_method": c.payment_method,
            "reference_number": c.reference_number,
            "note": c.note, "created_at": str(c.created_at)
        } for c in collections]
    return d

@app.post("/lendings")
async def create_lending(data: LendingCreate, request: Request, db: AsyncSession = Depends(get_db)):
    user = request.state.user
    await set_tenant_context(db, user["tenant_id"])
    remaining = compute_lending_remaining(data.principal_amount, data.interest_rate, data.interest_type, data.lent_date, 0)
    lending = Lending(
        tenant_id=uuid.UUID(user["tenant_id"]),
        user_id=uuid.UUID(user["user_id"]),
        borrower_name=data.borrower_name,
        borrower_contact=data.borrower_contact,
        principal_amount=Decimal(str(data.principal_amount)),
        currency=data.currency,
        interest_rate=Decimal(str(data.interest_rate)),
        interest_type=data.interest_type,
        lent_date=data.lent_date,
        due_date=data.due_date,
        purpose=data.purpose,
        notes=data.notes,
        total_received=Decimal("0"),
        remaining_amount=Decimal(str(round(remaining, 2))),
        status="open"
    )
    db.add(lending)
    await db.commit()
    await db.refresh(lending)
    return _lending_to_dict(lending)

@app.get("/lendings")
async def list_lendings(request: Request, status: Optional[str] = None, borrower: Optional[str] = None, db: AsyncSession = Depends(get_db)):
    user = request.state.user
    await set_tenant_context(db, user["tenant_id"])
    query = select(Lending).where(Lending.user_id == uuid.UUID(user["user_id"]))
    if status:
        query = query.where(Lending.status == status)
    if borrower:
        query = query.where(Lending.borrower_name.ilike(f"%{borrower}%"))
    query = query.order_by(Lending.created_at.desc())
    result = await db.execute(query)
    return [_lending_to_dict(l) for l in result.scalars().all()]

@app.get("/lendings/{lending_id}")
async def get_lending(lending_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    user = request.state.user
    await set_tenant_context(db, user["tenant_id"])
    result = await db.execute(
        select(Lending).where(Lending.id == uuid.UUID(lending_id), Lending.user_id == uuid.UUID(user["user_id"]))
    )
    l = result.scalar_one_or_none()
    if not l:
        raise HTTPException(status_code=404, detail="Lending not found")
    col_result = await db.execute(
        select(LendingCollection).where(LendingCollection.lending_id == l.id).order_by(LendingCollection.collection_date.desc())
    )
    collections = col_result.scalars().all()
    return _lending_to_dict(l, collections)

@app.put("/lendings/{lending_id}")
async def update_lending(lending_id: str, data: LendingCreate, request: Request, db: AsyncSession = Depends(get_db)):
    user = request.state.user
    await set_tenant_context(db, user["tenant_id"])
    result = await db.execute(
        select(Lending).where(Lending.id == uuid.UUID(lending_id), Lending.user_id == uuid.UUID(user["user_id"]))
    )
    l = result.scalar_one_or_none()
    if not l:
        raise HTTPException(status_code=404, detail="Lending not found")
    l.borrower_name = data.borrower_name
    l.borrower_contact = data.borrower_contact
    l.principal_amount = Decimal(str(data.principal_amount))
    l.currency = data.currency
    l.interest_rate = Decimal(str(data.interest_rate))
    l.interest_type = data.interest_type
    l.lent_date = data.lent_date
    l.due_date = data.due_date
    l.purpose = data.purpose
    l.notes = data.notes
    l.remaining_amount = Decimal(str(round(compute_lending_remaining(
        float(l.principal_amount), float(l.interest_rate), l.interest_type, l.lent_date, float(l.total_received)
    ), 2)))
    await db.commit()
    await db.refresh(l)
    return {"message": "Lending updated", "id": str(l.id)}

@app.delete("/lendings/{lending_id}")
async def delete_lending(lending_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    user = request.state.user
    await set_tenant_context(db, user["tenant_id"])
    result = await db.execute(
        select(Lending).where(Lending.id == uuid.UUID(lending_id), Lending.user_id == uuid.UUID(user["user_id"]))
    )
    l = result.scalar_one_or_none()
    if not l:
        raise HTTPException(status_code=404, detail="Lending not found")
    await db.delete(l)
    await db.commit()
    return {"message": "Lending and all collections deleted"}

@app.post("/lendings/{lending_id}/collections")
async def create_collection(lending_id: str, data: CollectionCreate, request: Request, db: AsyncSession = Depends(get_db)):
    user = request.state.user
    await set_tenant_context(db, user["tenant_id"])
    result = await db.execute(
        select(Lending).where(Lending.id == uuid.UUID(lending_id), Lending.user_id == uuid.UUID(user["user_id"]))
    )
    l = result.scalar_one_or_none()
    if not l:
        raise HTTPException(status_code=404, detail="Lending not found")
    remaining = float(l.remaining_amount or 0)
    if data.amount > remaining and remaining > 0:
        raise HTTPException(status_code=400, detail=f"Collection cannot exceed remaining balance of {remaining}")
    if data.collection_date < l.lent_date:
        raise HTTPException(status_code=400, detail="Collection date cannot be before lending date")
    collection = LendingCollection(
        tenant_id=uuid.UUID(user["tenant_id"]),
        lending_id=l.id,
        amount=Decimal(str(data.amount)),
        collection_date=data.collection_date,
        payment_method=data.payment_method,
        reference_number=data.reference_number,
        note=data.note
    )
    db.add(collection)
    l.total_received = Decimal(str(float(l.total_received or 0) + data.amount))
    l.remaining_amount = Decimal(str(round(compute_lending_remaining(
        float(l.principal_amount), float(l.interest_rate), l.interest_type, l.lent_date, float(l.total_received)
    ), 2)))
    if data.close_lending or float(l.remaining_amount) <= 0:
        l.status = "closed"
        l.closed_at = datetime.utcnow()
    elif float(l.total_received) > 0:
        l.status = "partially_received"
    await db.commit()
    return {"message": f"Collection of {data.amount} recorded", "id": str(collection.id), "remaining": float(l.remaining_amount), "status": l.status}

@app.get("/lendings/{lending_id}/collections")
async def list_collections(lending_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    user = request.state.user
    await set_tenant_context(db, user["tenant_id"])
    result = await db.execute(
        select(LendingCollection).where(LendingCollection.lending_id == uuid.UUID(lending_id))
        .order_by(LendingCollection.collection_date.desc())
    )
    collections = result.scalars().all()
    return [{
        "id": str(c.id), "amount": float(c.amount), "collection_date": str(c.collection_date),
        "payment_method": c.payment_method, "reference_number": c.reference_number,
        "note": c.note, "created_at": str(c.created_at)
    } for c in collections]

@app.put("/lendings/{lending_id}/collections/{collection_id}")
async def update_collection(lending_id: str, collection_id: str, data: CollectionCreate, request: Request, db: AsyncSession = Depends(get_db)):
    user = request.state.user
    await set_tenant_context(db, user["tenant_id"])
    result = await db.execute(
        select(LendingCollection).where(LendingCollection.id == uuid.UUID(collection_id), LendingCollection.lending_id == uuid.UUID(lending_id))
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Collection not found")
    l_result = await db.execute(select(Lending).where(Lending.id == uuid.UUID(lending_id)))
    l = l_result.scalar_one_or_none()
    if not l:
        raise HTTPException(status_code=404, detail="Lending not found")
    old_amount = float(c.amount)
    l.total_received = Decimal(str(float(l.total_received) - old_amount + data.amount))
    c.amount = Decimal(str(data.amount))
    c.collection_date = data.collection_date
    c.payment_method = data.payment_method
    c.reference_number = data.reference_number
    c.note = data.note
    l.remaining_amount = Decimal(str(round(compute_lending_remaining(
        float(l.principal_amount), float(l.interest_rate), l.interest_type, l.lent_date, float(l.total_received)
    ), 2)))
    if float(l.remaining_amount) <= 0:
        l.status = "closed"
    elif float(l.total_received) > 0:
        l.status = "partially_received"
        l.closed_at = None
    else:
        l.status = "open"
        l.closed_at = None
    await db.commit()
    return {"message": "Collection updated"}

@app.delete("/lendings/{lending_id}/collections/{collection_id}")
async def delete_collection(lending_id: str, collection_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    user = request.state.user
    await set_tenant_context(db, user["tenant_id"])
    result = await db.execute(
        select(LendingCollection).where(LendingCollection.id == uuid.UUID(collection_id), LendingCollection.lending_id == uuid.UUID(lending_id))
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Collection not found")
    l_result = await db.execute(select(Lending).where(Lending.id == uuid.UUID(lending_id)))
    l = l_result.scalar_one_or_none()
    amount = float(c.amount)
    await db.delete(c)
    if l:
        l.total_received = Decimal(str(max(0, float(l.total_received) - amount)))
        l.remaining_amount = Decimal(str(round(compute_lending_remaining(
            float(l.principal_amount), float(l.interest_rate), l.interest_type, l.lent_date, float(l.total_received)
        ), 2)))
        if float(l.remaining_amount) > 0 and l.status == "closed":
            l.status = "partially_received" if float(l.total_received) > 0 else "open"
            l.closed_at = None
    await db.commit()
    return {"message": "Collection deleted", "outstanding_increase": amount}

@app.post("/lendings/{lending_id}/close")
async def close_lending(lending_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    user = request.state.user
    await set_tenant_context(db, user["tenant_id"])
    result = await db.execute(
        select(Lending).where(Lending.id == uuid.UUID(lending_id), Lending.user_id == uuid.UUID(user["user_id"]))
    )
    l = result.scalar_one_or_none()
    if not l:
        raise HTTPException(status_code=404, detail="Lending not found")
    l.status = "closed"
    l.closed_at = datetime.utcnow()
    await db.commit()
    return {"message": "Lending marked as fully received"}

@app.post("/lendings/{lending_id}/reopen")
async def reopen_lending(lending_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    user = request.state.user
    await set_tenant_context(db, user["tenant_id"])
    result = await db.execute(
        select(Lending).where(Lending.id == uuid.UUID(lending_id), Lending.user_id == uuid.UUID(user["user_id"]))
    )
    l = result.scalar_one_or_none()
    if not l:
        raise HTTPException(status_code=404, detail="Lending not found")
    l.closed_at = None
    if float(l.total_received or 0) > 0:
        l.status = "partially_received"
    else:
        l.status = "open"
    await db.commit()
    return {"message": "Lending reopened"}

###############################################################################
# AI FEATURES (Section 2 of Design Review)
###############################################################################

# 2.1 Smart Transaction Categorization (rule-based V1)
CATEGORY_RULES = {
    "Food & Dining": ["swiggy", "zomato", "restaurant", "food", "dining", "pizza", "burger", "cafe", "coffee", "tea", "lunch", "dinner", "breakfast", "snack", "biryani", "dominos", "mcdonalds", "kfc", "starbucks", "chai"],
    "Transportation": ["uber", "ola", "rapido", "metro", "bus", "train", "fuel", "petrol", "diesel", "parking", "toll", "cab", "auto", "rickshaw", "flight", "airline"],
    "Shopping": ["amazon", "flipkart", "myntra", "ajio", "mall", "shopping", "clothes", "shoes", "fashion", "electronics", "gadget"],
    "Utilities": ["electricity", "electric", "water", "gas", "internet", "wifi", "broadband", "phone", "mobile", "recharge", "dth", "maintenance"],
    "Healthcare": ["hospital", "doctor", "medicine", "pharmacy", "medical", "health", "clinic", "dental", "eye", "lab", "test", "apollo", "medplus"],
    "Entertainment": ["movie", "netflix", "spotify", "hotstar", "prime", "disney", "gaming", "game", "concert", "show", "theatre", "cinema"],
    "Bills": ["rent", "emi", "insurance", "premium", "subscription", "loan", "credit card", "bill"],
    "Education": ["course", "udemy", "coursera", "book", "tuition", "school", "college", "exam", "study"],
    "Groceries": ["grocery", "bigbasket", "blinkit", "zepto", "instamart", "vegetables", "fruits", "milk", "supermarket", "dmart"],
    "Personal Care": ["salon", "haircut", "spa", "gym", "fitness", "yoga", "beauty", "skincare"],
}

class CategorizeRequest(BaseModel):
    description: str
    amount: Optional[float] = None

@app.post("/categorize")
async def categorize_expense(data: CategorizeRequest, request: Request, db: AsyncSession = Depends(get_db)):
    user = request.state.user
    await set_tenant_context(db, user["tenant_id"])
    desc_lower = data.description.lower()
    best_match = None
    best_confidence = 0.0
    for category_name, keywords in CATEGORY_RULES.items():
        for keyword in keywords:
            if keyword in desc_lower:
                confidence = len(keyword) / max(len(desc_lower), 1)
                confidence = min(max(confidence, 0.5), 0.95)
                if confidence > best_confidence:
                    best_confidence = confidence
                    best_match = category_name
    if not best_match:
        return {"category_name": None, "category_id": None, "confidence": 0}
    # Find the matching category in DB
    cat_result = await db.execute(
        select(Category).where(Category.name == best_match, Category.tenant_id == uuid.UUID(user["tenant_id"]))
    )
    cat = cat_result.scalar_one_or_none()
    return {
        "category_name": best_match,
        "category_id": str(cat.id) if cat else None,
        "confidence": round(best_confidence, 2)
    }

# 2.4 Smart Budget Recommendations
@app.get("/budget-suggestions")
async def budget_suggestions(request: Request, db: AsyncSession = Depends(get_db)):
    user = request.state.user
    await set_tenant_context(db, user["tenant_id"])
    # Get expenses from last 3 months grouped by category
    three_months_ago = date.today().replace(day=1)
    for _ in range(3):
        if three_months_ago.month == 1:
            three_months_ago = three_months_ago.replace(year=three_months_ago.year - 1, month=12)
        else:
            three_months_ago = three_months_ago.replace(month=three_months_ago.month - 1)
    result = await db.execute(
        select(
            Category.name,
            Category.id,
            func.avg(Expense.amount).label("avg_amount"),
            func.max(Expense.amount).label("max_amount"),
            func.count(Expense.id).label("count"),
            func.sum(Expense.amount).label("total")
        )
        .join(Category, Expense.category_id == Category.id)
        .where(
            Expense.user_id == uuid.UUID(user["user_id"]),
            Expense.transaction_date >= three_months_ago
        )
        .group_by(Category.name, Category.id)
        .order_by(func.sum(Expense.amount).desc())
    )
    rows = result.all()
    suggestions = []
    for row in rows:
        monthly_avg = float(row.total or 0) / 3
        suggested = round(monthly_avg * 1.1, -2)  # 10% buffer, round to nearest 100
        suggestions.append({
            "category_name": row.name,
            "category_id": str(row.id),
            "avg_last_3mo": round(monthly_avg, 2),
            "max_last_3mo": float(row.max_amount or 0),
            "suggested_amount": max(suggested, 500),  # minimum 500
            "transaction_count": row.count
        })
    return suggestions

# 2.5 Anomaly Detection
@app.get("/anomalies")
async def detect_anomalies(request: Request, db: AsyncSession = Depends(get_db)):
    user = request.state.user
    await set_tenant_context(db, user["tenant_id"])
    # Get per-category stats
    stats_result = await db.execute(
        select(
            Expense.category_id,
            Category.name.label("category_name"),
            func.avg(Expense.amount).label("avg_amount"),
            func.count(Expense.id).label("count")
        )
        .join(Category, Expense.category_id == Category.id, isouter=True)
        .where(Expense.user_id == uuid.UUID(user["user_id"]))
        .group_by(Expense.category_id, Category.name)
        .having(func.count(Expense.id) >= 3)
    )
    stats = {str(row.category_id): {"avg": float(row.avg_amount), "name": row.category_name, "count": row.count} for row in stats_result.all()}
    # Get recent expenses (last 30 days)
    thirty_days_ago = date.today().replace(day=1)
    recent_result = await db.execute(
        select(Expense).where(
            Expense.user_id == uuid.UUID(user["user_id"]),
            Expense.transaction_date >= thirty_days_ago
        ).order_by(Expense.amount.desc()).limit(50)
    )
    recent = recent_result.scalars().all()
    anomalies = []
    for exp in recent:
        cat_id = str(exp.category_id) if exp.category_id else None
        if cat_id and cat_id in stats:
            avg = stats[cat_id]["avg"]
            if avg > 0 and float(exp.amount) > avg * 2.5:
                anomalies.append({
                    "expense_id": str(exp.id),
                    "description": exp.description,
                    "amount": float(exp.amount),
                    "category": stats[cat_id]["name"],
                    "category_avg": round(avg, 2),
                    "multiplier": round(float(exp.amount) / avg, 1),
                    "date": str(exp.transaction_date)
                })
    return anomalies

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8002)
