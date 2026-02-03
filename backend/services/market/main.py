from fastapi import FastAPI, Depends, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, text
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timedelta
from decimal import Decimal
import uuid
import httpx

import sys
sys.path.append('/app')

from shared.database import get_db, set_tenant_context
from shared.models import Watchlist
from shared.middleware.auth import get_current_user
from shared.redis_client import get_redis
from shared.config import get_settings

app = FastAPI(title="Market Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

settings = get_settings()

class WatchlistCreate(BaseModel):
    symbol: str
    exchange: Optional[str] = None
    asset_type: str = "stock"
    alert_price_high: Optional[float] = None
    alert_price_low: Optional[float] = None
    notes: Optional[str] = None

class WatchlistResponse(BaseModel):
    id: str
    symbol: str
    exchange: Optional[str]
    asset_type: str
    alert_price_high: Optional[float]
    alert_price_low: Optional[float]
    notes: Optional[str]
    current_price: Optional[float]
    change_percent: Optional[float]

class MarketQuote(BaseModel):
    symbol: str
    current_price: float
    open: float
    high: float
    low: float
    volume: int
    change: float
    change_percent: float
    timestamp: datetime

class OHLCVData(BaseModel):
    time: datetime
    open: float
    high: float
    low: float
    close: float
    volume: int

async def fetch_quote_finnhub(symbol: str) -> Optional[dict]:
    """Fetch real-time quote from Finnhub API"""
    if not settings.FINNHUB_API_KEY:
        return None
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://finnhub.io/api/v1/quote",
                params={"symbol": symbol, "token": settings.FINNHUB_API_KEY},
                timeout=5.0
            )
            if response.status_code == 200:
                data = response.json()
                return {
                    "current_price": data.get("c", 0),
                    "open": data.get("o", 0),
                    "high": data.get("h", 0),
                    "low": data.get("l", 0),
                    "previous_close": data.get("pc", 0),
                    "change": data.get("d", 0),
                    "change_percent": data.get("dp", 0),
                    "timestamp": datetime.fromtimestamp(data.get("t", 0))
                }
    except Exception as e:
        print(f"Error fetching quote from Finnhub: {e}")
    
    return None

async def get_cached_quote(symbol: str, redis_client) -> Optional[dict]:
    """Get quote from Redis cache"""
    cache_key = f"quote:{symbol}"
    cached = await redis_client.get_json(cache_key)
    return cached

async def cache_quote(symbol: str, data: dict, redis_client):
    """Cache quote in Redis with 60 second TTL"""
    cache_key = f"quote:{symbol}"
    await redis_client.set_json(cache_key, data, ex=60)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "market"}

@app.post("/watchlist", response_model=WatchlistResponse)
async def add_to_watchlist(
    watchlist: WatchlistCreate,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    user = get_current_user(request)
    await set_tenant_context(db, user["tenant_id"])
    
    result = await db.execute(
        select(Watchlist).where(
            and_(
                Watchlist.user_id == uuid.UUID(user["user_id"]),
                Watchlist.symbol == watchlist.symbol
            )
        )
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        raise HTTPException(status_code=400, detail="Symbol already in watchlist")
    
    new_watchlist = Watchlist(
        tenant_id=uuid.UUID(user["tenant_id"]),
        user_id=uuid.UUID(user["user_id"]),
        symbol=watchlist.symbol,
        exchange=watchlist.exchange,
        asset_type=watchlist.asset_type,
        alert_price_high=Decimal(str(watchlist.alert_price_high)) if watchlist.alert_price_high else None,
        alert_price_low=Decimal(str(watchlist.alert_price_low)) if watchlist.alert_price_low else None,
        notes=watchlist.notes
    )
    
    db.add(new_watchlist)
    await db.commit()
    await db.refresh(new_watchlist)
    
    return WatchlistResponse(
        id=str(new_watchlist.id),
        symbol=new_watchlist.symbol,
        exchange=new_watchlist.exchange,
        asset_type=new_watchlist.asset_type,
        alert_price_high=float(new_watchlist.alert_price_high) if new_watchlist.alert_price_high else None,
        alert_price_low=float(new_watchlist.alert_price_low) if new_watchlist.alert_price_low else None,
        notes=new_watchlist.notes,
        current_price=None,
        change_percent=None
    )

@app.get("/watchlist", response_model=List[WatchlistResponse])
async def get_watchlist(
    request: Request,
    db: AsyncSession = Depends(get_db),
    redis_client = Depends(get_redis)
):
    user = get_current_user(request)
    await set_tenant_context(db, user["tenant_id"])
    
    result = await db.execute(
        select(Watchlist).where(Watchlist.user_id == uuid.UUID(user["user_id"]))
    )
    watchlist_items = result.scalars().all()
    
    response = []
    for item in watchlist_items:
        quote = await get_cached_quote(item.symbol, redis_client)
        if not quote:
            quote = await fetch_quote_finnhub(item.symbol)
            if quote:
                await cache_quote(item.symbol, quote, redis_client)
        
        response.append(WatchlistResponse(
            id=str(item.id),
            symbol=item.symbol,
            exchange=item.exchange,
            asset_type=item.asset_type,
            alert_price_high=float(item.alert_price_high) if item.alert_price_high else None,
            alert_price_low=float(item.alert_price_low) if item.alert_price_low else None,
            notes=item.notes,
            current_price=quote.get("current_price") if quote else None,
            change_percent=quote.get("change_percent") if quote else None
        ))
    
    return response

@app.get("/quote/{symbol}", response_model=MarketQuote)
async def get_quote(
    symbol: str,
    redis_client = Depends(get_redis)
):
    quote = await get_cached_quote(symbol, redis_client)
    
    if not quote:
        quote = await fetch_quote_finnhub(symbol)
        if not quote:
            raise HTTPException(status_code=404, detail="Quote not found")
        await cache_quote(symbol, quote, redis_client)
    
    return MarketQuote(
        symbol=symbol,
        current_price=quote["current_price"],
        open=quote["open"],
        high=quote["high"],
        low=quote["low"],
        volume=0,
        change=quote["change"],
        change_percent=quote["change_percent"],
        timestamp=quote["timestamp"]
    )

@app.get("/chart/{symbol}", response_model=List[OHLCVData])
async def get_chart_data(
    symbol: str,
    interval: str = "1D",
    db: AsyncSession = Depends(get_db)
):
    """Get historical OHLCV data for charting"""
    intervals_map = {
        "1D": "1d",
        "1W": "1w",
        "1M": "1M"
    }
    
    db_interval = intervals_map.get(interval, "1d")
    
    query = text("""
        SELECT time, open, high, low, close, volume
        FROM market_data
        WHERE symbol = :symbol AND interval = :interval
        ORDER BY time DESC
        LIMIT 100
    """)
    
    result = await db.execute(query, {"symbol": symbol, "interval": db_interval})
    rows = result.fetchall()
    
    return [
        OHLCVData(
            time=row[0],
            open=float(row[1]) if row[1] else 0,
            high=float(row[2]) if row[2] else 0,
            low=float(row[3]) if row[3] else 0,
            close=float(row[4]) if row[4] else 0,
            volume=row[5] if row[5] else 0
        )
        for row in rows
    ]

@app.delete("/watchlist/{watchlist_id}")
async def remove_from_watchlist(
    watchlist_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    user = get_current_user(request)
    await set_tenant_context(db, user["tenant_id"])
    
    result = await db.execute(
        select(Watchlist).where(Watchlist.id == uuid.UUID(watchlist_id))
    )
    watchlist_item = result.scalar_one_or_none()
    
    if not watchlist_item:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    
    await db.delete(watchlist_item)
    await db.commit()
    
    return {"message": "Removed from watchlist"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8005)
