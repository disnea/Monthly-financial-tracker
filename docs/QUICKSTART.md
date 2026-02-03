# Quick Start Guide

Get your Financial Tracker Application running in 5 minutes!

## Prerequisites

- Docker Desktop installed and running
- At least 4GB RAM available
- Ports 80, 3000, 5432, 6379, 9000, 9001, 15672 available

## Step 1: Environment Setup (1 minute)

```bash
cd Monthly-financial-tracker

# Copy environment template
cp .env.example .env

# Optional: Add your API keys for enhanced features
# Edit .env and add:
# - EXCHANGE_RATE_API_KEY (for multi-currency support)
# - FINNHUB_API_KEY (for real-time stock quotes)
```

## Step 2: Start the Application (3 minutes)

```bash
# Start all services
docker-compose up -d

# Wait for services to be ready (takes ~1-2 minutes)
docker-compose ps
```

You should see all services as "healthy" or "running".

## Step 3: Access the Application (30 seconds)

Open your browser and navigate to:

- **API Gateway**: http://localhost
- **API Documentation**: 
  - Auth: http://localhost:8001/docs
  - Finance: http://localhost:8002/docs
  - EMI: http://localhost:8003/docs
  - Investment: http://localhost:8004/docs
  - Market: http://localhost:8005/docs
  - Export: http://localhost:8006/docs

## Step 4: Create Your First Account (30 seconds)

### Using cURL:

```bash
curl -X POST "http://localhost:8001/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "password": "SecurePassword123!",
    "full_name": "Your Name",
    "tenant_name": "My Family"
  }'
```

### Using the API Docs:

1. Go to http://localhost:8001/docs
2. Click on `POST /register`
3. Click "Try it out"
4. Fill in your details
5. Click "Execute"

You'll receive a JWT token in the response - copy it!

## Step 5: Test Your Setup (1 minute)

### Add Your First Expense:

```bash
# Replace YOUR_JWT_TOKEN with the token from step 4
curl -X POST "http://localhost:8002/expenses" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50.00,
    "currency": "USD",
    "description": "Groceries",
    "transaction_date": "2024-02-02"
  }'
```

### View Your Expenses:

```bash
curl -X GET "http://localhost:8002/expenses" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Common Use Cases

### 1. Track an Expense

```bash
POST http://localhost:8002/expenses
{
  "amount": 1200.00,
  "currency": "USD",
  "description": "Monthly rent",
  "transaction_date": "2024-02-01",
  "payment_method": "bank_transfer"
}
```

### 2. Create a Budget

```bash
POST http://localhost:8002/budgets
{
  "name": "Monthly Grocery Budget",
  "amount": 500.00,
  "currency": "USD",
  "period": "monthly",
  "start_date": "2024-02-01",
  "end_date": "2024-02-29",
  "alert_threshold": 80
}
```

### 3. Add an EMI/Loan

```bash
POST http://localhost:8003/emis
{
  "loan_type": "Home Loan",
  "lender_name": "City Bank",
  "principal_amount": 200000.00,
  "currency": "USD",
  "interest_rate": 7.5,
  "tenure_months": 240,
  "start_date": "2024-01-01"
}
```

### 4. Add an Investment

```bash
POST http://localhost:8004/investments
{
  "investment_type": "stock",
  "asset_name": "Apple Inc.",
  "asset_symbol": "AAPL",
  "quantity": 10,
  "purchase_price": 175.50,
  "currency": "USD",
  "purchase_date": "2024-01-15"
}
```

### 5. Add to Stock Watchlist

```bash
POST http://localhost:8005/watchlist
{
  "symbol": "GOOGL",
  "exchange": "NASDAQ",
  "asset_type": "stock",
  "alert_price_high": 150.00,
  "alert_price_low": 130.00
}
```

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose logs

# Restart all services
docker-compose down
docker-compose up -d
```

### Port Already in Use

```bash
# Find what's using the port
lsof -i :8001  # Replace with your port

# Or change ports in docker-compose.yml
```

### Database Connection Issues

```bash
# Reset database
docker-compose down -v
docker-compose up -d postgres
# Wait 30 seconds for database to initialize
docker-compose up -d
```

### Can't Access Services

```bash
# Verify all services are running
docker-compose ps

# Check service health
curl http://localhost:8001/health
curl http://localhost:8002/health
```

## Next Steps

1. **Explore the API**: Visit http://localhost:8001/docs for interactive API documentation
2. **Set Up Currency Updates**: Add `EXCHANGE_RATE_API_KEY` to `.env` for automatic currency updates
3. **Enable Stock Quotes**: Add `FINNHUB_API_KEY` to `.env` for real-time market data
4. **Read the Full Documentation**: See `README.md` for detailed features
5. **Deploy to Production**: Follow `DEPLOYMENT.md` for production deployment

## Useful Commands

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f auth_service

# Stop all services
docker-compose down

# Stop and remove all data
docker-compose down -v

# Restart a service
docker-compose restart finance_service

# Check database
docker exec -it finance_postgres psql -U finance_user -d finance_db

# Check Redis
docker exec -it finance_redis redis-cli -a redis_password

# Access MinIO Console
# Open http://localhost:9001
# Username: minio_admin
# Password: minio_password

# Access RabbitMQ Management
# Open http://localhost:15672
# Username: rabbitmq_user
# Password: rabbitmq_password
```

## Architecture Overview

```
Your Request → Nginx (Port 80)
              ↓
         API Gateway (Rate Limiting)
              ↓
    ┌─────────┴─────────┐
    ↓                   ↓
 Services            Workers
 - Auth (8001)       - Celery Worker
 - Finance (8002)    - Celery Beat
 - EMI (8003)           ↓
 - Investment (8004) Background Tasks
 - Market (8005)     - Currency Updates
 - Export (8006)     - Market Data Sync
    ↓                - Budget Alerts
 Data Layer
 - PostgreSQL (5432)
 - TimescaleDB
 - Redis (6379)
 - MinIO (9000)
 - RabbitMQ (5672)
```

## Key Features

✅ **Multi-tenant**: Separate data for each organization  
✅ **Multi-currency**: Support for 11+ currencies with auto-conversion  
✅ **Expense Tracking**: Log all your expenses with categories  
✅ **EMI Management**: Track loans with auto-calculated schedules  
✅ **Investment Portfolio**: Monitor stocks, bonds, and crypto  
✅ **Market Data**: Real-time stock quotes (with API key)  
✅ **Budgets & Alerts**: Set spending limits with notifications  
✅ **Export Reports**: Generate PDF, CSV, Excel reports  
✅ **Background Jobs**: Automated currency updates and alerts  
✅ **Row-Level Security**: Database-level tenant isolation  

## Getting Help

- **Documentation**: See `README.md` for comprehensive guide
- **API Reference**: http://localhost:8001/docs
- **Deployment Guide**: See `DEPLOYMENT.md`
- **GitHub Issues**: Report bugs and request features

---

**Congratulations! 🎉 Your Financial Tracker is now running!**
