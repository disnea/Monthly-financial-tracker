from fastapi import FastAPI, Depends, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, timedelta
from decimal import Decimal
import uuid
from dateutil.relativedelta import relativedelta

import sys
sys.path.append('/app')

from shared.database import get_db, set_tenant_context
from shared.models import EMI, EMIPayment
from shared.middleware.auth import get_current_user, auth_middleware
from shared.config import get_settings

app = FastAPI(title="EMI Service", version="1.0.0")

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

class EMICreate(BaseModel):
    loan_type: str
    lender_name: str
    account_number: Optional[str] = None
    principal_amount: float
    currency: str = "USD"
    interest_rate: float
    interest_type: str = "reducing"
    tenure_months: int
    start_date: date
    notes: Optional[str] = None

class EMIResponse(BaseModel):
    id: str
    loan_type: str
    lender_name: str
    principal_amount: float
    currency: str
    interest_rate: float
    tenure_months: int
    monthly_emi: float
    start_date: date
    end_date: date
    status: str
    total_interest: float
    total_amount: float

class EMIPaymentResponse(BaseModel):
    id: str
    installment_number: int
    due_date: date
    paid_date: Optional[date]
    amount: float
    principal_component: float
    interest_component: float
    outstanding_balance: float
    status: str

def calculate_emi(principal: Decimal, annual_rate: Decimal, months: int) -> Decimal:
    """Calculate monthly EMI using reducing balance method"""
    if annual_rate == 0:
        return principal / months
    
    monthly_rate = annual_rate / Decimal("1200")
    emi = principal * monthly_rate * pow(1 + monthly_rate, months) / (pow(1 + monthly_rate, months) - 1)
    return emi.quantize(Decimal("0.01"))

def generate_emi_schedule(
    principal: Decimal,
    annual_rate: Decimal,
    months: int,
    monthly_emi: Decimal,
    start_date: date
) -> List[dict]:
    """Generate complete EMI payment schedule"""
    schedule = []
    outstanding = principal
    monthly_rate = annual_rate / Decimal("1200")
    
    for month in range(1, months + 1):
        interest = outstanding * monthly_rate
        principal_component = monthly_emi - interest
        outstanding -= principal_component
        
        if outstanding < 0:
            outstanding = Decimal("0")
        
        due_date = start_date + relativedelta(months=month-1)
        
        schedule.append({
            "installment_number": month,
            "due_date": due_date,
            "amount": monthly_emi,
            "principal_component": principal_component,
            "interest_component": interest,
            "outstanding_balance": outstanding,
            "status": "pending"
        })
    
    return schedule

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "emi"}

@app.post("/emis", response_model=EMIResponse)
async def create_emi(
    emi: EMICreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    user = get_current_user(request)
    await set_tenant_context(db, user["tenant_id"])
    
    principal = Decimal(str(emi.principal_amount))
    annual_rate = Decimal(str(emi.interest_rate))
    
    monthly_emi = calculate_emi(principal, annual_rate, emi.tenure_months)
    end_date = emi.start_date + relativedelta(months=emi.tenure_months)
    
    new_emi = EMI(
        tenant_id=uuid.UUID(user["tenant_id"]),
        user_id=uuid.UUID(user["user_id"]),
        loan_type=emi.loan_type,
        lender_name=emi.lender_name,
        account_number=emi.account_number,
        principal_amount=principal,
        currency=emi.currency,
        interest_rate=annual_rate,
        interest_type=emi.interest_type,
        tenure_months=emi.tenure_months,
        monthly_emi=monthly_emi,
        start_date=emi.start_date,
        end_date=end_date,
        status="active",
        notes=emi.notes
    )
    
    db.add(new_emi)
    await db.flush()
    
    schedule = generate_emi_schedule(
        principal, annual_rate, emi.tenure_months, monthly_emi, emi.start_date
    )
    
    for payment_data in schedule:
        payment = EMIPayment(
            tenant_id=uuid.UUID(user["tenant_id"]),
            emi_id=new_emi.id,
            **payment_data
        )
        db.add(payment)
    
    await db.commit()
    await db.refresh(new_emi)
    
    total_amount = monthly_emi * emi.tenure_months
    total_interest = total_amount - principal
    
    return EMIResponse(
        id=str(new_emi.id),
        loan_type=new_emi.loan_type,
        lender_name=new_emi.lender_name,
        principal_amount=float(new_emi.principal_amount),
        currency=new_emi.currency,
        interest_rate=float(new_emi.interest_rate),
        tenure_months=new_emi.tenure_months,
        monthly_emi=float(new_emi.monthly_emi),
        start_date=new_emi.start_date,
        end_date=new_emi.end_date,
        status=new_emi.status,
        total_interest=float(total_interest),
        total_amount=float(total_amount)
    )

@app.get("/emis", response_model=List[EMIResponse])
async def get_emis(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    user = get_current_user(request)
    await set_tenant_context(db, user["tenant_id"])
    
    result = await db.execute(
        select(EMI).where(EMI.user_id == uuid.UUID(user["user_id"]))
    )
    emis = result.scalars().all()
    
    response = []
    for emi in emis:
        total_amount = emi.monthly_emi * emi.tenure_months
        total_interest = total_amount - emi.principal_amount
        
        response.append(EMIResponse(
            id=str(emi.id),
            loan_type=emi.loan_type,
            lender_name=emi.lender_name,
            principal_amount=float(emi.principal_amount),
            currency=emi.currency,
            interest_rate=float(emi.interest_rate),
            tenure_months=emi.tenure_months,
            monthly_emi=float(emi.monthly_emi),
            start_date=emi.start_date,
            end_date=emi.end_date,
            status=emi.status,
            total_interest=float(total_interest),
            total_amount=float(total_amount)
        ))
    
    return response

@app.get("/emis/{emi_id}", response_model=EMIResponse)
async def get_emi(
    emi_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    user = get_current_user(request)
    await set_tenant_context(db, user["tenant_id"])
    
    result = await db.execute(
        select(EMI).where(
            and_(
                EMI.id == uuid.UUID(emi_id),
                EMI.user_id == uuid.UUID(user["user_id"])
            )
        )
    )
    emi = result.scalar_one_or_none()
    
    if not emi:
        raise HTTPException(status_code=404, detail="EMI not found")
    
    total_amount = emi.monthly_emi * emi.tenure_months
    total_interest = total_amount - emi.principal_amount
    
    return EMIResponse(
        id=str(emi.id),
        loan_type=emi.loan_type,
        lender_name=emi.lender_name,
        principal_amount=float(emi.principal_amount),
        currency=emi.currency,
        interest_rate=float(emi.interest_rate),
        tenure_months=emi.tenure_months,
        monthly_emi=float(emi.monthly_emi),
        start_date=emi.start_date,
        end_date=emi.end_date,
        status=emi.status,
        total_interest=float(total_interest),
        total_amount=float(total_amount)
    )

@app.put("/emis/{emi_id}")
async def update_emi(
    emi_id: str,
    emi_update: EMICreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    user = get_current_user(request)
    await set_tenant_context(db, user["tenant_id"])
    
    result = await db.execute(
        select(EMI).where(
            and_(
                EMI.id == uuid.UUID(emi_id),
                EMI.user_id == uuid.UUID(user["user_id"])
            )
        )
    )
    emi = result.scalar_one_or_none()
    
    if not emi:
        raise HTTPException(status_code=404, detail="EMI not found")
    
    principal = Decimal(str(emi_update.principal_amount))
    annual_rate = Decimal(str(emi_update.interest_rate))
    monthly_emi = calculate_emi(principal, annual_rate, emi_update.tenure_months)
    end_date = emi_update.start_date + relativedelta(months=emi_update.tenure_months)
    
    emi.loan_type = emi_update.loan_type
    emi.lender_name = emi_update.lender_name
    emi.account_number = emi_update.account_number
    emi.principal_amount = principal
    emi.currency = emi_update.currency
    emi.interest_rate = annual_rate
    emi.interest_type = emi_update.interest_type
    emi.tenure_months = emi_update.tenure_months
    emi.monthly_emi = monthly_emi
    emi.start_date = emi_update.start_date
    emi.end_date = end_date
    emi.notes = emi_update.notes
    
    await db.commit()
    
    return {"message": "EMI updated successfully", "emi_id": emi_id}

@app.delete("/emis/{emi_id}")
async def delete_emi(
    emi_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    user = get_current_user(request)
    await set_tenant_context(db, user["tenant_id"])
    
    result = await db.execute(
        select(EMI).where(
            and_(
                EMI.id == uuid.UUID(emi_id),
                EMI.user_id == uuid.UUID(user["user_id"])
            )
        )
    )
    emi = result.scalar_one_or_none()
    
    if not emi:
        raise HTTPException(status_code=404, detail="EMI not found")
    
    await db.delete(emi)
    await db.commit()
    
    return {"message": "EMI deleted successfully"}

@app.get("/emis/{emi_id}/schedule", response_model=List[EMIPaymentResponse])
async def get_emi_schedule(
    emi_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    user = get_current_user(request)
    await set_tenant_context(db, user["tenant_id"])
    
    result = await db.execute(
        select(EMIPayment)
        .where(EMIPayment.emi_id == uuid.UUID(emi_id))
        .order_by(EMIPayment.installment_number)
    )
    payments = result.scalars().all()
    
    return [
        EMIPaymentResponse(
            id=str(payment.id),
            installment_number=payment.installment_number,
            due_date=payment.due_date,
            paid_date=payment.paid_date,
            amount=float(payment.amount),
            principal_component=float(payment.principal_component),
            interest_component=float(payment.interest_component),
            outstanding_balance=float(payment.outstanding_balance),
            status=payment.status
        )
        for payment in payments
    ]

@app.put("/payments/{payment_id}/mark-paid")
async def mark_payment_paid(
    payment_id: str,
    paid_date: date,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    user = get_current_user(request)
    await set_tenant_context(db, user["tenant_id"])
    
    result = await db.execute(
        select(EMIPayment).where(EMIPayment.id == uuid.UUID(payment_id))
    )
    payment = result.scalar_one_or_none()
    
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    payment.status = "paid"
    payment.paid_date = paid_date
    
    await db.commit()
    
    return {"message": "Payment marked as paid", "payment_id": payment_id}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8003)
