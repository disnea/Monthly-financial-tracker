from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
import uuid

import sys
sys.path.append('/app')

from shared.database import get_db, set_tenant_context
from shared.models import Investment
from shared.middleware.auth import get_current_user, auth_middleware
from shared.config import get_settings
from .stock_api import stock_api

app = FastAPI(title="Investment Service", version="1.0.0")

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

class InvestmentCreate(BaseModel):
    investment_type: str
    asset_name: str
    asset_symbol: Optional[str] = None
    quantity: float
    purchase_price: float
    currency: str = "USD"
    purchase_date: date
    notes: Optional[str] = None

class InvestmentResponse(BaseModel):
    id: str
    investment_type: str
    asset_name: str
    asset_symbol: Optional[str]
    quantity: float
    purchase_price: float
    currency: str
    purchase_date: date
    current_price: Optional[float]
    current_value: Optional[float]
    unrealized_gain_loss: Optional[float]
    gain_loss_percentage: Optional[float]
    notes: Optional[str]

class PriceUpdate(BaseModel):
    current_price: float

class PortfolioSummary(BaseModel):
    total_investment: float
    current_value: float
    total_gain_loss: float
    gain_loss_percentage: float
    investments_count: int

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "investment"}

@app.post("/investments", response_model=InvestmentResponse)
async def create_investment(
    investment: InvestmentCreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    user = get_current_user(request)
    await set_tenant_context(db, user["tenant_id"])
    
    new_investment = Investment(
        tenant_id=uuid.UUID(user["tenant_id"]),
        user_id=uuid.UUID(user["user_id"]),
        investment_type=investment.investment_type,
        asset_name=investment.asset_name,
        asset_symbol=investment.asset_symbol,
        quantity=Decimal(str(investment.quantity)),
        purchase_price=Decimal(str(investment.purchase_price)),
        currency=investment.currency,
        purchase_date=investment.purchase_date,
        notes=investment.notes,
        current_price=Decimal(str(investment.purchase_price)),
        current_value=Decimal(str(investment.quantity)) * Decimal(str(investment.purchase_price)),
        unrealized_gain_loss=Decimal("0"),
        last_updated=datetime.utcnow()
    )
    
    db.add(new_investment)
    await db.commit()
    await db.refresh(new_investment)
    
    return InvestmentResponse(
        id=str(new_investment.id),
        investment_type=new_investment.investment_type,
        asset_name=new_investment.asset_name,
        asset_symbol=new_investment.asset_symbol,
        quantity=float(new_investment.quantity),
        purchase_price=float(new_investment.purchase_price),
        currency=new_investment.currency,
        purchase_date=new_investment.purchase_date,
        current_price=float(new_investment.current_price) if new_investment.current_price else None,
        current_value=float(new_investment.current_value) if new_investment.current_value else None,
        unrealized_gain_loss=float(new_investment.unrealized_gain_loss) if new_investment.unrealized_gain_loss else None,
        gain_loss_percentage=None,
        notes=new_investment.notes
    )

@app.get("/investments", response_model=List[InvestmentResponse])
async def get_investments(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    user = get_current_user(request)
    await set_tenant_context(db, user["tenant_id"])
    
    result = await db.execute(
        select(Investment).where(Investment.user_id == uuid.UUID(user["user_id"]))
    )
    investments = result.scalars().all()
    
    response = []
    for inv in investments:
        total_invested = inv.quantity * inv.purchase_price
        gain_loss_pct = None
        
        if inv.current_value and total_invested > 0:
            gain_loss_pct = float((inv.current_value - total_invested) / total_invested * 100)
        
        response.append(InvestmentResponse(
            id=str(inv.id),
            investment_type=inv.investment_type,
            asset_name=inv.asset_name,
            asset_symbol=inv.asset_symbol,
            quantity=float(inv.quantity),
            purchase_price=float(inv.purchase_price),
            currency=inv.currency,
            purchase_date=inv.purchase_date,
            current_price=float(inv.current_price) if inv.current_price else None,
            current_value=float(inv.current_value) if inv.current_value else None,
            unrealized_gain_loss=float(inv.unrealized_gain_loss) if inv.unrealized_gain_loss else None,
            gain_loss_percentage=gain_loss_pct,
            notes=inv.notes
        ))
    
    return response

@app.get("/investments/{investment_id}", response_model=InvestmentResponse)
async def get_investment(
    investment_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    from fastapi import HTTPException
    user = get_current_user(request)
    await set_tenant_context(db, user["tenant_id"])
    
    result = await db.execute(
        select(Investment).where(
            and_(
                Investment.id == uuid.UUID(investment_id),
                Investment.user_id == uuid.UUID(user["user_id"]),
            )
        )
    )
    inv = result.scalar_one_or_none()
    
    if not inv:
        raise HTTPException(status_code=404, detail="Investment not found")
    
    total_invested = inv.quantity * inv.purchase_price
    gain_loss_pct = None
    
    if inv.current_value and total_invested > 0:
        gain_loss_pct = float((inv.current_value - total_invested) / total_invested * 100)
    
    return InvestmentResponse(
        id=str(inv.id),
        investment_type=inv.investment_type,
        asset_name=inv.asset_name,
        asset_symbol=inv.asset_symbol,
        quantity=float(inv.quantity),
        purchase_price=float(inv.purchase_price),
        currency=inv.currency,
        purchase_date=inv.purchase_date,
        current_price=float(inv.current_price) if inv.current_price else None,
        current_value=float(inv.current_value) if inv.current_value else None,
        unrealized_gain_loss=float(inv.unrealized_gain_loss) if inv.unrealized_gain_loss else None,
        gain_loss_percentage=gain_loss_pct,
        notes=inv.notes
    )

@app.put("/investments/{investment_id}")
async def update_investment(
    investment_id: str,
    investment_update: InvestmentCreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    from fastapi import HTTPException
    user = get_current_user(request)
    await set_tenant_context(db, user["tenant_id"])
    
    result = await db.execute(
        select(Investment).where(
            and_(
                Investment.id == uuid.UUID(investment_id),
                Investment.user_id == uuid.UUID(user["user_id"]),
            )
        )
    )
    investment = result.scalar_one_or_none()
    
    if not investment:
        raise HTTPException(status_code=404, detail="Investment not found")
    
    investment.investment_type = investment_update.investment_type
    investment.asset_name = investment_update.asset_name
    investment.asset_symbol = investment_update.asset_symbol
    investment.quantity = Decimal(str(investment_update.quantity))
    investment.purchase_price = Decimal(str(investment_update.purchase_price))
    investment.currency = investment_update.currency
    investment.purchase_date = investment_update.purchase_date
    investment.notes = investment_update.notes
    investment.current_value = investment.quantity * investment.current_price if investment.current_price else investment.quantity * investment.purchase_price
    investment.unrealized_gain_loss = investment.current_value - (investment.quantity * investment.purchase_price)
    investment.last_updated = datetime.utcnow()
    
    await db.commit()
    
    return {"message": "Investment updated successfully", "investment_id": investment_id}

@app.delete("/investments/{investment_id}")
async def delete_investment(
    investment_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    from fastapi import HTTPException
    user = get_current_user(request)
    await set_tenant_context(db, user["tenant_id"])
    
    result = await db.execute(
        select(Investment).where(
            and_(
                Investment.id == uuid.UUID(investment_id),
                Investment.user_id == uuid.UUID(user["user_id"]),
            )
        )
    )
    investment = result.scalar_one_or_none()
    
    if not investment:
        raise HTTPException(status_code=404, detail="Investment not found")
    
    await db.delete(investment)
    await db.commit()
    
    return {"message": "Investment deleted successfully"}

@app.get("/portfolio/summary", response_model=PortfolioSummary)
async def get_portfolio_summary(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    user = get_current_user(request)
    await set_tenant_context(db, user["tenant_id"])
    
    result = await db.execute(
        select(Investment).where(Investment.user_id == uuid.UUID(user["user_id"]))
    )
    investments = result.scalars().all()
    
    total_investment = Decimal("0")
    current_value = Decimal("0")
    
    for inv in investments:
        total_investment += inv.quantity * inv.purchase_price
        if inv.current_value:
            current_value += inv.current_value
        else:
            current_value += inv.quantity * inv.purchase_price
    
    total_gain_loss = current_value - total_investment
    gain_loss_pct = float((total_gain_loss / total_investment * 100)) if total_investment > 0 else 0
    
    return PortfolioSummary(
        total_investment=float(total_investment),
        current_value=float(current_value),
        total_gain_loss=float(total_gain_loss),
        gain_loss_percentage=gain_loss_pct,
        investments_count=len(investments)
    )

@app.put("/investments/{investment_id}/price")
async def update_investment_price(
    investment_id: str,
    payload: PriceUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    user = get_current_user(request)
    await set_tenant_context(db, user["tenant_id"])
    
    result = await db.execute(
        select(Investment).where(
            and_(
                Investment.id == uuid.UUID(investment_id),
                Investment.user_id == uuid.UUID(user["user_id"]),
            )
        )
    )
    investment = result.scalar_one_or_none()
    
    if not investment:
        raise HTTPException(status_code=404, detail="Investment not found")
    
    investment.current_price = Decimal(str(payload.current_price))
    investment.current_value = investment.quantity * investment.current_price
    investment.unrealized_gain_loss = investment.current_value - (investment.quantity * investment.purchase_price)
    investment.last_updated = datetime.utcnow()
    
    await db.commit()
    
    return {"message": "Price updated", "investment_id": investment_id}

# Stock Market API Endpoints (Public - no auth needed for market data)
@app.get("/stocks/{symbol}/quote")
async def get_stock_quote(symbol: str):
    """Get real-time stock quote"""
    quote = await stock_api.get_quote(symbol.upper())
    return quote

@app.get("/stocks/{symbol}/profile")
async def get_stock_profile(symbol: str):
    """Get company profile information"""
    profile = await stock_api.get_company_profile(symbol.upper())
    return profile

@app.get("/stocks/{symbol}/history")
async def get_stock_history(
    symbol: str,
    interval: str = "daily",
    outputsize: str = "compact"
):
    """Get historical stock data"""
    data = await stock_api.get_historical_data(symbol.upper(), interval, outputsize)
    return data

@app.get("/stocks/{symbol}/intraday")
async def get_stock_intraday(
    symbol: str,
    interval: str = "5min"
):
    """Get intraday stock data"""
    data = await stock_api.get_intraday_data(symbol.upper(), interval)
    return data

@app.get("/stocks/search")
async def search_stocks(query: str):
    """Search for stocks by symbol or name"""
    results = await stock_api.search_stocks(query)
    return {"results": results}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8004)
