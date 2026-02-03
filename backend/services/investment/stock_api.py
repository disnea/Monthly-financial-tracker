"""
Stock Market API Integration
Supports Alpha Vantage, Finnhub for US stocks and Yahoo Finance for Indian stocks (NSE/BSE)
Includes Redis caching for performance optimization
"""
import os
import httpx
import redis
import json
from typing import Dict, List, Optional
from datetime import datetime, timedelta

FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY", "")
ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY", "")

# Redis cache connection
try:
    redis_client = redis.Redis(
        host=os.getenv("REDIS_HOST", "redis"),
        port=6379,
        password=os.getenv("REDIS_PASSWORD", "redis_password"),
        db=5,
        decode_responses=True,
        socket_connect_timeout=2
    )
    redis_client.ping()
    REDIS_AVAILABLE = True
except:
    REDIS_AVAILABLE = False
    redis_client = None

CACHE_DURATIONS = {
    'quote': 60,  # 1 minute
    'profile': 86400,  # 24 hours
    'history': 3600,  # 1 hour
}

class StockAPI:
    def __init__(self):
        self.finnhub_base = "https://finnhub.io/api/v1"
        self.alpha_vantage_base = "https://www.alphavantage.co/query"
        self.yahoo_base = "https://query1.finance.yahoo.com"
    
    def is_indian_stock(self, symbol: str) -> bool:
        """Check if stock is Indian (NSE/BSE)"""
        return symbol.endswith('.NS') or symbol.endswith('.BO')
        
    async def get_quote(self, symbol: str) -> Dict:
        """Get real-time stock quote - routes to Yahoo Finance for Indian stocks, Finnhub for US"""
        if self.is_indian_stock(symbol):
            return await self._get_yahoo_quote(symbol)
        return await self._get_finnhub_quote(symbol)
    
    async def _get_finnhub_quote(self, symbol: str) -> Dict:
        """Get US stock quote using Finnhub"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.finnhub_base}/quote",
                    params={"symbol": symbol, "token": FINNHUB_API_KEY},
                    timeout=10.0
                )
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
                    "currency": "USD",
                    "exchange": "US"
                }
            except Exception as e:
                print(f"Error fetching Finnhub quote for {symbol}: {e}")
                return {"error": str(e), "symbol": symbol}
    
    async def _get_yahoo_quote(self, symbol: str) -> Dict:
        """Get Indian stock quote using Yahoo Finance"""
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        async with httpx.AsyncClient() as client:
            try:
                url = f"{self.yahoo_base}/v8/finance/chart/{symbol}"
                response = await client.get(url, headers=headers, timeout=10.0)
                data = response.json()
                
                result = data['chart']['result'][0]
                meta = result['meta']
                
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
                    "open": meta.get('regularMarketOpen', 0),
                    "previous_close": previous_close,
                    "timestamp": datetime.now().isoformat(),
                    "currency": "INR",
                    "exchange": "NSE" if symbol.endswith('.NS') else "BSE"
                }
            except Exception as e:
                print(f"Error fetching Yahoo quote for {symbol}: {e}")
                return {"error": str(e), "symbol": symbol}
    
    async def get_company_profile(self, symbol: str) -> Dict:
        """Get company information - routes to Yahoo for Indian stocks, Finnhub for US"""
        if self.is_indian_stock(symbol):
            return await self._get_yahoo_profile(symbol)
        return await self._get_finnhub_profile(symbol)
    
    async def _get_finnhub_profile(self, symbol: str) -> Dict:
        """Get US company profile using Finnhub"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    f"{self.finnhub_base}/stock/profile2",
                    params={"symbol": symbol, "token": FINNHUB_API_KEY},
                    timeout=10.0
                )
                data = response.json()
                
                return {
                    "symbol": symbol,
                    "name": data.get("name", symbol),
                    "industry": data.get("finnhubIndustry", "N/A"),
                    "marketCap": data.get("marketCapitalization", 0),
                    "currency": data.get("currency", "USD"),
                    "exchange": data.get("exchange", "N/A"),
                    "logo": data.get("logo", ""),
                    "weburl": data.get("weburl", "")
                }
            except Exception as e:
                print(f"Error fetching Finnhub profile for {symbol}: {e}")
                return {"symbol": symbol, "name": symbol, "error": str(e)}
    
    async def _get_yahoo_profile(self, symbol: str) -> Dict:
        """Get Indian company profile using Yahoo Finance"""
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        async with httpx.AsyncClient() as client:
            try:
                # Yahoo Finance quote summary for basic info
                url = f"{self.yahoo_base}/v10/finance/quoteSummary/{symbol}?modules=summaryProfile,price"
                response = await client.get(url, headers=headers, timeout=10.0)
                data = response.json()
                
                result = data.get('quoteSummary', {}).get('result', [{}])[0]
                profile = result.get('summaryProfile', {})
                price_info = result.get('price', {})
                
                return {
                    "symbol": symbol,
                    "name": price_info.get('longName', symbol.replace('.NS', '').replace('.BO', '')),
                    "industry": profile.get('industry', 'N/A'),
                    "marketCap": price_info.get('marketCap', {}).get('raw', 0),
                    "currency": "INR",
                    "exchange": "NSE" if symbol.endswith('.NS') else "BSE",
                    "logo": "",
                    "weburl": profile.get('website', "")
                }
            except Exception as e:
                print(f"Error fetching Yahoo profile for {symbol}: {e}")
                # Return basic info on error
                return {
                    "symbol": symbol,
                    "name": symbol.replace('.NS', '').replace('.BO', ''),
                    "industry": "N/A",
                    "currency": "INR",
                    "exchange": "NSE" if symbol.endswith('.NS') else "BSE"
                }
    
    async def get_historical_data(
        self, 
        symbol: str, 
        interval: str = "daily",  # daily, weekly, monthly
        outputsize: str = "compact"  # compact (100 points) or full (20+ years)
    ) -> Dict:
        """Get historical OHLCV data - Yahoo Finance for all stocks (free, no limits)"""
        # Use Yahoo Finance for all stocks since Alpha Vantage is rate limited
        # and Finnhub candles require paid subscription
        return await self._get_yahoo_historical(symbol, interval)
    
    async def _get_finnhub_historical(self, symbol: str, interval: str) -> Dict:
        """Get US stock historical data using Finnhub candles endpoint"""
        async with httpx.AsyncClient() as client:
            try:
                # Map interval to Finnhub resolution
                resolution_map = {
                    'daily': 'D',
                    'weekly': 'W',
                    'monthly': 'M'
                }
                resolution = resolution_map.get(interval, 'D')
                
                # Calculate date range (last 3 months)
                from datetime import datetime, timedelta
                to_date = int(datetime.now().timestamp())
                from_date = int((datetime.now() - timedelta(days=90)).timestamp())
                
                url = f"{self.finnhub_base}/stock/candle"
                params = {
                    'symbol': symbol,
                    'resolution': resolution,
                    'from': from_date,
                    'to': to_date,
                    'token': FINNHUB_API_KEY
                }
                
                print(f"📡 Fetching Finnhub candles for {symbol}")
                response = await client.get(url, params=params, timeout=15.0)
                print(f"📊 Finnhub response status: {response.status_code}")
                
                data = response.json()
                print(f"📊 Finnhub response keys: {list(data.keys())}")
                
                # Check for error or no data
                if data.get('s') == 'no_data':
                    print(f"❌ Finnhub returned no_data for {symbol}")
                    return {"error": "No data available", "symbol": symbol}
                
                if data.get('s') != 'ok':
                    print(f"❌ Finnhub error status: {data.get('s')}")
                    return {"error": "Failed to fetch data", "symbol": symbol}
                
                # Extract OHLCV data
                timestamps = data.get('t', [])
                opens = data.get('o', [])
                highs = data.get('h', [])
                lows = data.get('l', [])
                closes = data.get('c', [])
                volumes = data.get('v', [])
                
                print(f"📊 Finnhub data points: {len(timestamps)}")
                
                if not timestamps:
                    print(f"❌ No timestamps in Finnhub response")
                    return {"error": "No data available", "symbol": symbol}
                
                # Convert to chart format
                candles = []
                for i in range(len(timestamps)):
                    date_str = datetime.fromtimestamp(timestamps[i]).strftime('%Y-%m-%d')
                    candles.append({
                        "time": date_str,
                        "open": opens[i],
                        "high": highs[i],
                        "low": lows[i],
                        "close": closes[i],
                        "volume": volumes[i]
                    })
                
                print(f"✅ Successfully parsed {len(candles)} candles from Finnhub")
                
                return {
                    "symbol": symbol,
                    "interval": interval,
                    "data": candles
                }
            except Exception as e:
                print(f"❌ Error fetching Finnhub historical data for {symbol}: {e}")
                return {"error": str(e), "symbol": symbol}
    
    async def _get_alpha_vantage_historical(self, symbol: str, interval: str, outputsize: str) -> Dict:
        """Get US historical data using Alpha Vantage"""
        async with httpx.AsyncClient() as client:
            try:
                function_map = {
                    "daily": "TIME_SERIES_DAILY",
                    "weekly": "TIME_SERIES_WEEKLY",
                    "monthly": "TIME_SERIES_MONTHLY"
                }
                
                response = await client.get(
                    self.alpha_vantage_base,
                    params={
                        "function": function_map.get(interval, "TIME_SERIES_DAILY"),
                        "symbol": symbol,
                        "outputsize": outputsize,
                        "apikey": ALPHA_VANTAGE_API_KEY
                    },
                    timeout=15.0
                )
                data = response.json()
                
                # Parse the time series data
                time_series_key = None
                for key in data.keys():
                    if "Time Series" in key:
                        time_series_key = key
                        break
                
                if not time_series_key or time_series_key not in data:
                    return {"error": "No data available", "symbol": symbol}
                
                time_series = data[time_series_key]
                
                # Convert to array format for charts
                candles = []
                for date_str, values in sorted(time_series.items()):
                    candles.append({
                        "time": date_str,
                        "open": float(values.get("1. open", 0)),
                        "high": float(values.get("2. high", 0)),
                        "low": float(values.get("3. low", 0)),
                        "close": float(values.get("4. close", 0)),
                        "volume": int(values.get("5. volume", 0))
                    })
                
                return {
                    "symbol": symbol,
                    "interval": interval,
                    "data": candles
                }
            except Exception as e:
                print(f"Error fetching Alpha Vantage historical data for {symbol}: {e}")
                return {"error": str(e), "symbol": symbol}
    
    async def _get_yahoo_historical(self, symbol: str, interval: str) -> Dict:
        """Get historical data using Yahoo Finance (works for all stocks)"""
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        async with httpx.AsyncClient() as client:
            try:
                # Map interval to Yahoo Finance format
                interval_map = {
                    'daily': '1d',
                    'weekly': '1wk',
                    'monthly': '1mo'
                }
                yf_interval = interval_map.get(interval, '1d')
                
                # Get last 3 months of data
                url = f"{self.yahoo_base}/v8/finance/chart/{symbol}?interval={yf_interval}&range=3mo"
                print(f"📡 Fetching Yahoo data from: {url}")
                response = await client.get(url, headers=headers, timeout=15.0)
                print(f"📊 Yahoo response status: {response.status_code}")
                
                data = response.json()
                print(f"📊 Yahoo response keys: {list(data.keys())}")
                
                # Check for errors in response
                if 'chart' not in data:
                    print(f"❌ No 'chart' key in response")
                    return {"error": "Invalid response from Yahoo Finance", "symbol": symbol}
                
                chart = data['chart']
                if chart.get('error'):
                    print(f"❌ Yahoo API error: {chart['error']}")
                    return {"error": str(chart['error']), "symbol": symbol}
                
                if not chart.get('result') or len(chart['result']) == 0:
                    print(f"❌ No results in chart response")
                    return {"error": "No data available", "symbol": symbol}
                
                result = chart['result'][0]
                print(f"📊 Result keys: {list(result.keys())}")
                
                timestamps = result.get('timestamp', [])
                indicators = result.get('indicators', {})
                quote_data = indicators.get('quote', [{}])[0] if indicators.get('quote') else {}
                
                print(f"📊 Timestamps: {len(timestamps)}, Quote keys: {list(quote_data.keys())}")
                
                if not timestamps or not quote_data:
                    print(f"❌ Missing timestamps or quote data")
                    return {"error": "Incomplete data from Yahoo Finance", "symbol": symbol}
                
                candles = []
                for i, ts in enumerate(timestamps):
                    close_val = quote_data.get('close', [])[i] if i < len(quote_data.get('close', [])) else None
                    if close_val is not None:  # Skip null values
                        date_str = datetime.fromtimestamp(ts).strftime('%Y-%m-%d')
                        candles.append({
                            "time": date_str,
                            "open": quote_data.get('open', [])[i] or 0,
                            "high": quote_data.get('high', [])[i] or 0,
                            "low": quote_data.get('low', [])[i] or 0,
                            "close": close_val,
                            "volume": quote_data.get('volume', [])[i] or 0
                        })
                
                return {
                    "symbol": symbol,
                    "interval": interval,
                    "data": candles
                }
            except Exception as e:
                print(f"Error fetching Yahoo historical data for {symbol}: {e}")
                return {"error": str(e), "symbol": symbol}
    
    async def get_intraday_data(self, symbol: str, interval: str = "5min") -> Dict:
        """Get intraday data using Alpha Vantage"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    self.alpha_vantage_base,
                    params={
                        "function": "TIME_SERIES_INTRADAY",
                        "symbol": symbol,
                        "interval": interval,
                        "outputsize": "compact",
                        "apikey": ALPHA_VANTAGE_API_KEY
                    },
                    timeout=15.0
                )
                data = response.json()
                
                time_series_key = f"Time Series ({interval})"
                if time_series_key not in data:
                    return {"error": "No intraday data available", "symbol": symbol}
                
                time_series = data[time_series_key]
                
                candles = []
                for datetime_str, values in sorted(time_series.items()):
                    candles.append({
                        "time": datetime_str,
                        "open": float(values.get("1. open", 0)),
                        "high": float(values.get("2. high", 0)),
                        "low": float(values.get("3. low", 0)),
                        "close": float(values.get("4. close", 0)),
                        "volume": int(values.get("5. volume", 0))
                    })
                
                return {
                    "symbol": symbol,
                    "interval": interval,
                    "data": candles
                }
            except Exception as e:
                print(f"Error fetching intraday data for {symbol}: {e}")
                return {"error": str(e), "symbol": symbol}
    
    async def search_stocks(self, query: str) -> List[Dict]:
        """Search for stocks - searches both US and Indian markets"""
        results = []
        
        # Search US stocks via Alpha Vantage
        us_results = await self._search_us_stocks(query)
        results.extend(us_results)
        
        # Add popular Indian stocks if query matches
        indian_results = self._search_indian_stocks(query)
        results.extend(indian_results)
        
        return results[:15]  # Return top 15 results
    
    async def _search_us_stocks(self, query: str) -> List[Dict]:
        """Search US stocks using Alpha Vantage"""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(
                    self.alpha_vantage_base,
                    params={
                        "function": "SYMBOL_SEARCH",
                        "keywords": query,
                        "apikey": ALPHA_VANTAGE_API_KEY
                    },
                    timeout=10.0
                )
                data = response.json()
                
                if "bestMatches" not in data:
                    return []
                
                results = []
                for match in data["bestMatches"][:10]:
                    results.append({
                        "symbol": match.get("1. symbol", ""),
                        "name": match.get("2. name", ""),
                        "type": match.get("3. type", ""),
                        "region": match.get("4. region", ""),
                        "currency": match.get("8. currency", "")
                    })
                
                return results
            except Exception as e:
                print(f"Error searching US stocks for '{query}': {e}")
                return []
    
    def _search_indian_stocks(self, query: str) -> List[Dict]:
        """Search Indian stocks from predefined list (Nifty 50)"""
        # Popular Indian stocks (Nifty 50)
        indian_stocks = [
            {"symbol": "RELIANCE.NS", "name": "Reliance Industries", "type": "Equity", "region": "India", "currency": "INR"},
            {"symbol": "TCS.NS", "name": "Tata Consultancy Services", "type": "Equity", "region": "India", "currency": "INR"},
            {"symbol": "HDFCBANK.NS", "name": "HDFC Bank", "type": "Equity", "region": "India", "currency": "INR"},
            {"symbol": "INFY.NS", "name": "Infosys", "type": "Equity", "region": "India", "currency": "INR"},
            {"symbol": "ICICIBANK.NS", "name": "ICICI Bank", "type": "Equity", "region": "India", "currency": "INR"},
            {"symbol": "HINDUNILVR.NS", "name": "Hindustan Unilever", "type": "Equity", "region": "India", "currency": "INR"},
            {"symbol": "ITC.NS", "name": "ITC Limited", "type": "Equity", "region": "India", "currency": "INR"},
            {"symbol": "SBIN.NS", "name": "State Bank of India", "type": "Equity", "region": "India", "currency": "INR"},
            {"symbol": "BHARTIARTL.NS", "name": "Bharti Airtel", "type": "Equity", "region": "India", "currency": "INR"},
            {"symbol": "KOTAKBANK.NS", "name": "Kotak Mahindra Bank", "type": "Equity", "region": "India", "currency": "INR"},
            {"symbol": "LT.NS", "name": "Larsen & Toubro", "type": "Equity", "region": "India", "currency": "INR"},
            {"symbol": "AXISBANK.NS", "name": "Axis Bank", "type": "Equity", "region": "India", "currency": "INR"},
            {"symbol": "ASIANPAINT.NS", "name": "Asian Paints", "type": "Equity", "region": "India", "currency": "INR"},
            {"symbol": "MARUTI.NS", "name": "Maruti Suzuki", "type": "Equity", "region": "India", "currency": "INR"},
            {"symbol": "TITAN.NS", "name": "Titan Company", "type": "Equity", "region": "India", "currency": "INR"},
        ]
        
        query_lower = query.lower()
        matches = []
        
        for stock in indian_stocks:
            if (query_lower in stock["name"].lower() or 
                query_lower in stock["symbol"].lower()):
                matches.append(stock)
        
        return matches[:5]  # Return top 5 Indian matches

# Singleton instance
stock_api = StockAPI()
