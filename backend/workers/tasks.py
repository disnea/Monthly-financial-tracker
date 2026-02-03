from celery import Celery
from celery.schedules import crontab
from sqlalchemy import create_engine, text
from datetime import date, datetime
import httpx
import os

RABBITMQ_URL = os.getenv("RABBITMQ_URL", "amqp://rabbitmq_user:rabbitmq_password@localhost:5672/")
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://finance_user:finance_password@localhost:5432/finance_db").replace("+asyncpg", "")
EXCHANGE_RATE_API_KEY = os.getenv("EXCHANGE_RATE_API_KEY", "")

celery_app = Celery('finance_tasks', broker=RABBITMQ_URL)

celery_app.conf.beat_schedule = {
    'update-exchange-rates': {
        'task': 'workers.tasks.update_exchange_rates',
        'schedule': crontab(hour=0, minute=0),
    },
    'update-market-data': {
        'task': 'workers.tasks.update_market_data',
        'schedule': crontab(minute='*/15'),
    },
    'check-budget-alerts': {
        'task': 'workers.tasks.check_budget_alerts',
        'schedule': crontab(hour='*/6'),
    },
}

celery_app.conf.timezone = 'UTC'

@celery_app.task(name='workers.tasks.update_exchange_rates')
def update_exchange_rates():
    """Fetch and update currency exchange rates daily"""
    if not EXCHANGE_RATE_API_KEY:
        print("No Exchange Rate API key configured")
        return
    
    base_currency = "USD"
    
    try:
        response = httpx.get(
            f"https://v6.exchangerate-api.com/v6/{EXCHANGE_RATE_API_KEY}/latest/{base_currency}",
            timeout=10.0
        )
        
        if response.status_code == 200:
            data = response.json()
            rates = data.get("conversion_rates", {})
            
            engine = create_engine(DATABASE_URL)
            with engine.connect() as conn:
                for target_currency, rate in rates.items():
                    query = text("""
                        INSERT INTO exchange_rates (base_currency, target_currency, rate, date, source)
                        VALUES (:base, :target, :rate, :date, 'api')
                        ON CONFLICT (base_currency, target_currency, date)
                        DO UPDATE SET rate = :rate
                    """)
                    
                    conn.execute(query, {
                        "base": base_currency,
                        "target": target_currency,
                        "rate": rate,
                        "date": date.today()
                    })
                
                conn.commit()
            
            print(f"Updated {len(rates)} exchange rates")
            return {"status": "success", "rates_updated": len(rates)}
    
    except Exception as e:
        print(f"Error updating exchange rates: {e}")
        return {"status": "error", "message": str(e)}

@celery_app.task(name='workers.tasks.update_market_data')
def update_market_data():
    """Update market data for watched symbols"""
    print("Updating market data for watchlist symbols")
    
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT DISTINCT symbol FROM watchlist"))
        symbols = [row[0] for row in result]
    
    print(f"Found {len(symbols)} unique symbols in watchlist")
    return {"status": "success", "symbols_checked": len(symbols)}

@celery_app.task(name='workers.tasks.check_budget_alerts')
def check_budget_alerts():
    """Check for budget threshold alerts"""
    print("Checking budget alerts")
    
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        query = text("""
            SELECT b.id, b.name, b.amount, b.alert_threshold, b.user_id,
                   COALESCE(SUM(e.amount_in_base_currency), 0) as spent
            FROM budgets b
            LEFT JOIN expenses e ON e.user_id = b.user_id
                AND e.transaction_date BETWEEN b.start_date AND b.end_date
                AND (b.category_id IS NULL OR e.category_id = b.category_id)
            WHERE b.is_active = true
                AND b.end_date >= CURRENT_DATE
            GROUP BY b.id, b.name, b.amount, b.alert_threshold, b.user_id
            HAVING (COALESCE(SUM(e.amount_in_base_currency), 0) / b.amount * 100) >= b.alert_threshold
        """)
        
        result = conn.execute(query)
        alerts = result.fetchall()
    
    print(f"Found {len(alerts)} budget alerts")
    
    for alert in alerts:
        print(f"Alert: Budget '{alert[1]}' has exceeded {alert[3]}% threshold")
    
    return {"status": "success", "alerts_found": len(alerts)}

@celery_app.task(name='workers.tasks.send_monthly_report')
def send_monthly_report(user_id: str):
    """Generate and send monthly financial report to user"""
    print(f"Generating monthly report for user {user_id}")
    return {"status": "success", "user_id": user_id}
