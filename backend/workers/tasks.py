from celery import Celery
from celery.schedules import crontab
from sqlalchemy import create_engine, text
from datetime import date, datetime, timedelta
import calendar
import json
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
    'process-recurring-transactions': {
        'task': 'workers.tasks.process_recurring_transactions',
        'schedule': crontab(hour=1, minute=0),
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
    """Check for budget threshold alerts and create notification records"""
    print("Checking budget alerts")
    
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        query = text("""
            SELECT b.id, b.name, b.amount, b.alert_threshold, b.user_id, b.tenant_id,
                   COALESCE(SUM(e.amount_in_base_currency), 0) as spent
            FROM budgets b
            LEFT JOIN expenses e ON e.user_id = b.user_id
                AND e.transaction_date BETWEEN b.start_date AND b.end_date
                AND (b.category_id IS NULL OR e.category_id = b.category_id)
            WHERE b.is_active = true
                AND b.end_date >= CURRENT_DATE
            GROUP BY b.id, b.name, b.amount, b.alert_threshold, b.user_id, b.tenant_id
            HAVING (COALESCE(SUM(e.amount_in_base_currency), 0) / b.amount * 100) >= b.alert_threshold
        """)
        
        result = conn.execute(query)
        alerts = result.fetchall()
    
    print(f"Found {len(alerts)} budget alerts")
    
    for alert in alerts:
        budget_name = alert[1]
        budget_amount = float(alert[2])
        threshold = float(alert[3])
        user_id = alert[4]
        tenant_id = alert[5]
        spent = float(alert[6])
        pct = round(spent / budget_amount * 100, 1)
        
        is_exceeded = pct >= 100
        title = f"Budget {'exceeded' if is_exceeded else 'alert'}: {budget_name}"
        message = f"You've spent {pct}% of your {budget_name} budget ({spent:.0f} of {budget_amount:.0f})."
        notif_type = "error" if is_exceeded else "warning"
        
        print(f"Alert: Budget '{budget_name}' at {pct}% (threshold: {threshold}%)")
        
        # Insert notification record (skip if duplicate exists today)
        with engine.connect() as conn:
            existing = conn.execute(text("""
                SELECT id FROM notifications
                WHERE user_id = :user_id AND title = :title
                    AND created_at::date = CURRENT_DATE
            """), {"user_id": user_id, "title": title}).fetchone()
            
            if not existing:
                conn.execute(text("""
                    INSERT INTO notifications (tenant_id, user_id, title, message, type, action_label, action_href)
                    VALUES (:tenant_id, :user_id, :title, :message, :type, 'View Budget', '/dashboard/budgets')
                """), {
                    "tenant_id": tenant_id,
                    "user_id": user_id,
                    "title": title,
                    "message": message,
                    "type": notif_type,
                })
                conn.commit()
    
    return {"status": "success", "alerts_found": len(alerts)}

@celery_app.task(name='workers.tasks.send_monthly_report')
def send_monthly_report(user_id: str):
    """Generate and send monthly financial report to user"""
    print(f"Generating monthly report for user {user_id}")
    return {"status": "success", "user_id": user_id}


def _calculate_next_due_date(current_date, frequency):
    """Calculate the next due date based on frequency.
    
    Args:
        current_date: date object representing the current due date
        frequency: one of 'daily', 'weekly', 'monthly', 'yearly'
    
    Returns:
        date object for the next due date
    """
    if frequency == 'daily':
        return current_date + timedelta(days=1)
    elif frequency == 'weekly':
        return current_date + timedelta(weeks=1)
    elif frequency == 'monthly':
        month = current_date.month + 1
        year = current_date.year
        if month > 12:
            month = 1
            year += 1
        max_day = calendar.monthrange(year, month)[1]
        day = min(current_date.day, max_day)
        return date(year, month, day)
    elif frequency == 'yearly':
        year = current_date.year + 1
        # Handle leap year edge case (Feb 29 -> Feb 28)
        max_day = calendar.monthrange(year, current_date.month)[1]
        day = min(current_date.day, max_day)
        return date(year, current_date.month, day)
    else:
        # Fallback: treat as monthly
        return current_date + timedelta(days=30)


@celery_app.task(name='workers.tasks.process_recurring_transactions')
def process_recurring_transactions():
    """Process recurring expenses and income entries daily.
    
    For each recurring expense with a next_due_date <= today:
      - Creates a new (non-recurring) expense entry copying all fields
      - Advances the next_due_date in recurring_config
    
    For each recurring income with income_date <= today:
      - Creates a new (non-recurring) income entry with today's date
      - Advances the income_date to the next period
    """
    today = date.today()
    expenses_created = 0
    income_created = 0
    max_catchup = 12  # Safety cap: max entries to create per recurring item

    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        # ── Process Recurring Expenses ──────────────────────────────────
        recurring_expenses = conn.execute(text("""
            SELECT id, tenant_id, user_id, category_id, amount, currency,
                   amount_in_base_currency, exchange_rate, description,
                   payment_method, tags, extra_data, recurring_config
            FROM expenses
            WHERE is_recurring = true
              AND recurring_config IS NOT NULL
              AND (recurring_config->>'next_due_date') IS NOT NULL
              AND (recurring_config->>'next_due_date')::date <= :today
        """), {"today": today})

        for row in recurring_expenses.fetchall():
            (exp_id, tenant_id, user_id, category_id, amount, currency,
             amount_in_base_currency, exchange_rate, description,
             payment_method, tags, extra_data, recurring_config) = row

            config = recurring_config if isinstance(recurring_config, dict) else json.loads(recurring_config)
            frequency = config.get("frequency", "monthly")
            next_due_str = config.get("next_due_date")

            if not next_due_str:
                continue

            next_due = datetime.strptime(next_due_str, "%Y-%m-%d").date()
            entries_created = 0

            # Create entries for all missed periods (capped)
            while next_due <= today and entries_created < max_catchup:
                conn.execute(text("""
                    INSERT INTO expenses (
                        id, tenant_id, user_id, category_id, amount, currency,
                        amount_in_base_currency, exchange_rate, description,
                        transaction_date, payment_method, tags, extra_data,
                        is_recurring, recurring_config, synced
                    ) VALUES (
                        gen_random_uuid(), :tenant_id, :user_id, :category_id,
                        :amount, :currency, :amount_in_base_currency,
                        :exchange_rate, :description, :transaction_date,
                        :payment_method, :tags, :extra_data,
                        false, NULL, true
                    )
                """), {
                    "tenant_id": tenant_id,
                    "user_id": user_id,
                    "category_id": category_id,
                    "amount": amount,
                    "currency": currency,
                    "amount_in_base_currency": amount_in_base_currency,
                    "exchange_rate": exchange_rate,
                    "description": description,
                    "transaction_date": next_due,
                    "payment_method": payment_method,
                    "tags": tags,
                    "extra_data": json.dumps(extra_data) if extra_data and not isinstance(extra_data, str) else extra_data,
                })

                next_due = _calculate_next_due_date(next_due, frequency)
                entries_created += 1

            # Update the recurring template with the new next_due_date
            new_config = dict(config)
            new_config["next_due_date"] = next_due.isoformat()
            conn.execute(text("""
                UPDATE expenses
                SET recurring_config = :config,
                    updated_at = NOW()
                WHERE id = :id
            """), {
                "config": json.dumps(new_config),
                "id": exp_id,
            })

            expenses_created += entries_created

        # ── Process Recurring Income ────────────────────────────────────
        recurring_income = conn.execute(text("""
            SELECT id, tenant_id, user_id, source, amount, currency,
                   income_date, description, recurrence_period, notes
            FROM income
            WHERE is_recurring = true
              AND recurrence_period IS NOT NULL
              AND income_date <= :today
        """), {"today": today})

        for row in recurring_income.fetchall():
            (inc_id, tenant_id, user_id, source, amount, currency,
             income_date, description, recurrence_period, notes) = row

            entries_created = 0
            next_due = income_date

            # Create entries for all missed periods (capped)
            while next_due <= today and entries_created < max_catchup:
                conn.execute(text("""
                    INSERT INTO income (
                        id, tenant_id, user_id, source, amount, currency,
                        income_date, description, is_recurring,
                        recurrence_period, notes
                    ) VALUES (
                        gen_random_uuid(), :tenant_id, :user_id, :source,
                        :amount, :currency, :income_date, :description,
                        false, NULL, :notes
                    )
                """), {
                    "tenant_id": tenant_id,
                    "user_id": user_id,
                    "source": source,
                    "amount": amount,
                    "currency": currency,
                    "income_date": next_due,
                    "description": description,
                    "notes": notes,
                })

                next_due = _calculate_next_due_date(next_due, recurrence_period)
                entries_created += 1

            # Advance the template's income_date to the next future due date
            conn.execute(text("""
                UPDATE income
                SET income_date = :next_date,
                    updated_at = NOW()
                WHERE id = :id
            """), {
                "next_date": next_due,
                "id": inc_id,
            })

            income_created += entries_created

        conn.commit()

    print(f"Recurring transactions processed: {expenses_created} expenses, {income_created} income entries created")
    return {
        "status": "success",
        "expenses_created": expenses_created,
        "income_created": income_created,
    }
