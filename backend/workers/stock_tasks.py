"""
Celery tasks for stock market data caching and optimization
Uses RabbitMQ as broker and Redis as result backend
"""
from celery import Celery
from celery.schedules import crontab
import os
import redis
import json
import httpx
import time
from typing import Dict, List
from datetime import datetime, timedelta

# Celery configuration
celery_app = Celery(
    'stock_tasks',
    broker=os.getenv('RABBITMQ_URL', 'amqp://rabbitmq_user:rabbitmq_password@rabbitmq:5672/'),
    backend=os.getenv('REDIS_URL', 'redis://:redis_password@redis:6379/5')
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='Asia/Kolkata',
    enable_utc=True,
    result_expires=3600,
    task_track_started=True,
    task_time_limit=300,
    worker_prefetch_multiplier=4,
    worker_max_tasks_per_child=1000,
)

# Redis connection for caching
redis_client = redis.Redis(
    host='redis',
    port=6379,
    password='redis_password',
    db=5,
    decode_responses=True
)

FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY", "")
ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY", "")

# Popular Indian stocks (Top 10 to avoid rate limits)
NIFTY_50_SYMBOLS = [
    'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'ICICIBANK.NS',
    'HINDUNILVR.NS', 'ITC.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'KOTAKBANK.NS'
]

# Popular US stocks
US_POPULAR_STOCKS = [
    'AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'NVDA', 'META', 'NFLX'
]

CACHE_DURATIONS = {
    'quote': 60,  # 1 minute for quotes
    'profile': 86400,  # 24 hours for company profiles
    'history': 3600,  # 1 hour for historical data
}


@celery_app.task(name='stock_tasks.fetch_and_cache_quote')
def fetch_and_cache_quote(symbol: str, exchange: str = 'US') -> Dict:
    """
    Fetch real-time quote and cache in Redis
    Args:
        symbol: Stock symbol (e.g., 'AAPL', 'RELIANCE.NS')
        exchange: Exchange identifier (US, NSE, BSE)
    """
    cache_key = f"stock:quote:{symbol}"
    
    # Check cache first
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # Fetch from API
    try:
        if exchange in ['NSE', 'BSE']:
            # Use Yahoo Finance for Indian stocks
            data = fetch_indian_stock_quote(symbol)
        else:
            # Use Finnhub for US stocks
            data = fetch_us_stock_quote(symbol)
        
        # Cache the result
        redis_client.setex(
            cache_key,
            CACHE_DURATIONS['quote'],
            json.dumps(data)
        )
        
        return data
    except Exception as e:
        print(f"Error fetching quote for {symbol}: {e}")
        return {"error": str(e), "symbol": symbol}


def fetch_us_stock_quote(symbol: str) -> Dict:
    """Fetch US stock quote from Finnhub"""
    url = f"https://finnhub.io/api/v1/quote?symbol={symbol}&token={FINNHUB_API_KEY}"
    
    with httpx.Client(timeout=10.0) as client:
        response = client.get(url)
        data = response.json()
        
        return {
            "symbol": symbol,
            "price": data.get("c", 0),
            "change": data.get("d", 0),
            "change_percent": data.get("dp", 0),
            "high": data.get("h", 0),
            "low": data.get("l", 0),
            "open": data.get("o", 0),
            "previous_close": data.get("pc", 0),
            "timestamp": datetime.now().isoformat(),
            "exchange": "US"
        }


def fetch_indian_stock_quote(symbol: str) -> Dict:
    """Fetch Indian stock quote from Yahoo Finance"""
    # Yahoo Finance format: RELIANCE.NS for NSE, RELIANCE.BO for BSE
    if not symbol.endswith(('.NS', '.BO')):
        symbol = f"{symbol}.NS"
    
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
    
    with httpx.Client(timeout=10.0) as client:
        response = client.get(url)
        data = response.json()
        
        try:
            result = data['chart']['result'][0]
            meta = result['meta']
            quote = result['indicators']['quote'][0]
            
            current_price = meta.get('regularMarketPrice', 0)
            previous_close = meta.get('previousClose', 0)
            change = current_price - previous_close
            change_percent = (change / previous_close * 100) if previous_close else 0
            
            return {
                "symbol": symbol,
                "price": current_price,
                "change": change,
                "change_percent": change_percent,
                "high": meta.get('regularMarketDayHigh', 0),
                "low": meta.get('regularMarketDayLow', 0),
                "open": quote.get('open', [0])[-1] if quote.get('open') else 0,
                "previous_close": previous_close,
                "timestamp": datetime.now().isoformat(),
                "exchange": "NSE" if symbol.endswith('.NS') else "BSE",
                "currency": "INR"
            }
        except (KeyError, IndexError) as e:
            print(f"Error parsing Yahoo Finance data for {symbol}: {e}")
            return {"error": "Failed to parse data", "symbol": symbol}


@celery_app.task(name='stock_tasks.cache_popular_stocks')
def cache_popular_stocks():
    """
    Background task to pre-cache popular stocks
    Runs every 30 minutes via Celery Beat
    """
    print("🔄 Caching popular stocks...")
    
    # Cache US stocks (no rate limit issues)
    for symbol in US_POPULAR_STOCKS:
        fetch_and_cache_quote.delay(symbol, 'US')
    
    # Cache Indian stocks with delays to avoid rate limiting
    for i, symbol in enumerate(NIFTY_50_SYMBOLS):
        fetch_and_cache_quote.delay(symbol, 'NSE')
        # Add 2 second delay between requests to avoid Yahoo Finance rate limits
        if i < len(NIFTY_50_SYMBOLS) - 1:
            time.sleep(2)
    
    print(f"✅ Queued {len(US_POPULAR_STOCKS) + len(NIFTY_50_SYMBOLS)} stocks for caching")


@celery_app.task(name='stock_tasks.fetch_historical_data')
def fetch_historical_data(symbol: str, interval: str = 'daily', exchange: str = 'US') -> Dict:
    """
    Fetch historical data and cache
    Args:
        symbol: Stock symbol
        interval: daily, weekly, monthly
        exchange: US, NSE, BSE
    """
    cache_key = f"stock:history:{symbol}:{interval}"
    
    # Check cache
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)
    
    # Fetch from API based on exchange
    try:
        if exchange in ['NSE', 'BSE']:
            data = fetch_indian_stock_history(symbol, interval)
        else:
            data = fetch_us_stock_history(symbol, interval)
        
        # Cache for 1 hour
        redis_client.setex(
            cache_key,
            CACHE_DURATIONS['history'],
            json.dumps(data)
        )
        
        return data
    except Exception as e:
        print(f"Error fetching history for {symbol}: {e}")
        return {"error": str(e), "symbol": symbol}


def fetch_us_stock_history(symbol: str, interval: str) -> Dict:
    """Fetch US stock history from Alpha Vantage"""
    function_map = {
        "daily": "TIME_SERIES_DAILY",
        "weekly": "TIME_SERIES_WEEKLY",
        "monthly": "TIME_SERIES_MONTHLY"
    }
    
    url = f"https://www.alphavantage.co/query?function={function_map[interval]}&symbol={symbol}&outputsize=compact&apikey={ALPHA_VANTAGE_API_KEY}"
    
    with httpx.Client(timeout=15.0) as client:
        response = client.get(url)
        data = response.json()
        
        # Parse time series
        time_series_key = None
        for key in data.keys():
            if "Time Series" in key:
                time_series_key = key
                break
        
        if not time_series_key:
            return {"error": "No data", "symbol": symbol}
        
        candles = []
        for date_str, values in sorted(data[time_series_key].items()):
            candles.append({
                "time": date_str,
                "open": float(values.get("1. open", 0)),
                "high": float(values.get("2. high", 0)),
                "low": float(values.get("3. low", 0)),
                "close": float(values.get("4. close", 0)),
                "volume": int(values.get("5. volume", 0))
            })
        
        return {"symbol": symbol, "interval": interval, "data": candles}


def fetch_indian_stock_history(symbol: str, interval: str) -> Dict:
    """Fetch Indian stock history from Yahoo Finance"""
    if not symbol.endswith(('.NS', '.BO')):
        symbol = f"{symbol}.NS"
    
    # Map interval to Yahoo Finance format
    interval_map = {
        'daily': '1d',
        'weekly': '1wk',
        'monthly': '1mo'
    }
    
    period = '3mo'  # Last 3 months
    yf_interval = interval_map.get(interval, '1d')
    
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval={yf_interval}&range={period}"
    
    with httpx.Client(timeout=15.0) as client:
        response = client.get(url)
        data = response.json()
        
        try:
            result = data['chart']['result'][0]
            timestamps = result['timestamp']
            quote = result['indicators']['quote'][0]
            
            candles = []
            for i, ts in enumerate(timestamps):
                date_str = datetime.fromtimestamp(ts).strftime('%Y-%m-%d')
                candles.append({
                    "time": date_str,
                    "open": quote['open'][i] or 0,
                    "high": quote['high'][i] or 0,
                    "low": quote['low'][i] or 0,
                    "close": quote['close'][i] or 0,
                    "volume": quote['volume'][i] or 0
                })
            
            return {"symbol": symbol, "interval": interval, "data": candles}
        except (KeyError, IndexError) as e:
            print(f"Error parsing Yahoo Finance history for {symbol}: {e}")
            return {"error": "Failed to parse data", "symbol": symbol}


# Celery Beat Schedule - Periodic Tasks
celery_app.conf.beat_schedule = {
    'cache-popular-stocks-every-30-minutes': {
        'task': 'stock_tasks.cache_popular_stocks',
        'schedule': crontab(minute='*/30'),  # Every 30 minutes to avoid rate limits
    },
    'cleanup-old-cache-daily': {
        'task': 'stock_tasks.cleanup_old_cache',
        'schedule': crontab(hour=2, minute=0),  # 2 AM daily
    },
}


@celery_app.task(name='stock_tasks.cleanup_old_cache')
def cleanup_old_cache():
    """Clean up expired cache entries"""
    print("🧹 Cleaning up old cache...")
    # Redis automatically handles TTL expiration
    # This task is for any additional cleanup logic
    return "Cache cleanup completed"


if __name__ == '__main__':
    celery_app.start()
