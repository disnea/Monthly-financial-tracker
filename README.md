# Financial Tracker Application

A comprehensive enterprise-grade financial tracking application with multi-tenancy, offline-first PWA capabilities, and microservices architecture.

## 🌟 Features

### Core Features
- **Expense Tracking**: Track daily expenses with multi-currency support
- **EMI Management**: Manage loans with automated payment schedules and EMI calculations
- **Investment Portfolio**: Monitor investments with real-time portfolio analytics
- **Stock Market Data**: Real-time market quotes and TradingView-style charts
- **Budgets & Alerts**: Set budgets with automated threshold alerts
- **Multi-Currency**: Automatic currency conversion with daily rate updates
- **Reports & Export**: Generate PDF, CSV, and Excel reports
- **Offline Support**: PWA with IndexedDB for offline functionality

### Technical Highlights
- **Multi-tenant Architecture**: Row-Level Security (RLS) for data isolation
- **Microservices**: 6 independent services (Auth, Finance, EMI, Investment, Market, Export)
- **Real-time Updates**: WebSocket support for market data
- **Background Jobs**: Celery workers for currency updates and scheduled tasks
- **Scalable Infrastructure**: Docker-based deployment with PostgreSQL, Redis, MinIO, RabbitMQ

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Next.js 14 PWA                         │
│              (React, TypeScript, shadcn/ui)                 │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                   Nginx API Gateway                          │
│            (Rate Limiting, SSL/TLS, Load Balancing)         │
└─┬────────┬────────┬────────┬────────┬────────┬─────────────┘
  │        │        │        │        │        │
  ▼        ▼        ▼        ▼        ▼        ▼
┌───┐    ┌───┐    ┌───┐    ┌───┐    ┌───┐    ┌───┐
│Auth│    │Fin│    │EMI│    │Inv│    │Mkt│    │Exp│
└─┬─┘    └─┬─┘    └─┬─┘    └─┬─┘    └─┬─┘    └─┬─┘
  │        │        │        │        │        │
  └────────┴────────┴────────┴────────┴────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   PostgreSQL    Redis       MinIO
   TimescaleDB   Cache      Storage
```

## 📋 Prerequisites

- Docker & Docker Compose (24.x+)
- Node.js 18+ (for local frontend development)
- Python 3.11+ (for local backend development)

## 🚀 Quick Start

### 1. Clone and Configure

```bash
cd Monthly-financial-tracker
cp .env.example .env
# Edit .env with your API keys and passwords
```

### 2. Start Infrastructure

```bash
docker-compose up -d postgres redis minio rabbitmq
```

Wait for services to be healthy (check with `docker-compose ps`)

### 3. Start Backend Services

```bash
docker-compose up -d auth_service finance_service emi_service investment_service market_service export_service
```

### 4. Start Background Workers

```bash
docker-compose up -d celery_worker celery_beat
```

### 5. Start API Gateway and Frontend

```bash
docker-compose up -d nginx frontend
```

### 6. Access the Application

- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost/api
- **Auth Service**: http://localhost:8001/docs
- **Finance Service**: http://localhost:8002/docs
- **MinIO Console**: http://localhost:9001
- **RabbitMQ Management**: http://localhost:15672

## 📦 Services Overview

### Backend Services

#### Auth Service (Port 8001)
- User registration and authentication
- JWT token generation and validation
- Multi-tenant context management
- User profile management

**Key Endpoints:**
- `POST /register` - Register new user and tenant
- `POST /login` - Authenticate and get JWT token
- `GET /me` - Get current user info

#### Finance Service (Port 8002)
- Expense tracking and management
- Category management
- Budget creation and monitoring
- Multi-currency support with automatic conversion

**Key Endpoints:**
- `POST /expenses` - Create expense
- `GET /expenses` - List expenses
- `POST /categories` - Create category
- `POST /budgets` - Create budget
- `GET /budgets` - Get budgets with spending analysis

#### EMI Service (Port 8003)
- Loan/EMI management
- Automated payment schedule generation
- EMI calculation (reducing balance)
- Payment tracking and status updates
- Document storage support

**Key Endpoints:**
- `POST /emis` - Create new EMI
- `GET /emis` - List all EMIs
- `GET /emis/{id}/schedule` - Get payment schedule
- `PUT /payments/{id}/mark-paid` - Mark payment as paid

#### Investment Service (Port 8004)
- Portfolio management
- Investment tracking
- Performance analytics
- Gain/loss calculations
- Portfolio summary and reporting

**Key Endpoints:**
- `POST /investments` - Add investment
- `GET /investments` - List investments
- `GET /portfolio/summary` - Portfolio overview
- `PUT /investments/{id}/price` - Update current price

#### Market Service (Port 8005)
- Real-time stock quotes (Finnhub API)
- Watchlist management
- Historical OHLCV data
- Market data caching (Redis)

**Key Endpoints:**
- `POST /watchlist` - Add to watchlist
- `GET /watchlist` - Get watchlist with live prices
- `GET /quote/{symbol}` - Get real-time quote
- `GET /chart/{symbol}` - Get historical chart data

#### Export Service (Port 8006)
- PDF report generation
- CSV export
- Excel export
- Scheduled reports

**Key Endpoints:**
- `POST /export/expenses` - Export expenses
- `POST /export/emis` - Export EMIs
- `POST /export/investments` - Export investments

### Background Workers

#### Celery Worker
- Currency rate updates (daily)
- Market data synchronization (every 15 minutes)
- Budget alert checks (every 6 hours)
- Report generation tasks

#### Celery Beat
- Scheduled task coordinator
- Cron-based job execution

## 🗄️ Database Schema

### Multi-Tenancy with Row-Level Security

All tenant-specific tables have `tenant_id` and are protected by PostgreSQL RLS policies:

```sql
CREATE POLICY tenant_isolation_policy ON expenses
    USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
```

### Core Tables
- `tenants` - Tenant/organization information
- `users` - User accounts with tenant association
- `categories` - Expense/income categories
- `expenses` - Transaction records with multi-currency support
- `emis` - Loan/EMI details
- `emi_payments` - Payment schedules
- `investments` - Portfolio holdings
- `budgets` - Budget limits and alerts
- `watchlist` - Stock watchlist
- `currencies` - Supported currencies
- `exchange_rates` - Daily exchange rates

### TimescaleDB Tables (Time-Series)
- `market_data` - OHLCV stock market data
- `investment_snapshots` - Historical portfolio values

## 🔐 Security Features

1. **JWT Authentication**: Secure token-based authentication
2. **Row-Level Security (RLS)**: Database-level tenant isolation
3. **Password Hashing**: bcrypt with salting
4. **Rate Limiting**: 100 requests/minute per user (Nginx)
5. **CORS Protection**: Configurable CORS policies
6. **SQL Injection Prevention**: Parameterized queries via SQLAlchemy
7. **Session Management**: Redis-based session storage

## 💱 Multi-Currency Support

### How It Works

1. **Rate Synchronization**: Celery worker fetches rates daily from exchangerate-api.com
2. **Transaction Storage**: Original currency + converted base currency amount
3. **Conversion Logic**:
   - Direct rate lookup
   - Inverse rate calculation
   - Pivot currency (USD) for missing pairs
4. **Reporting**: All aggregations use base currency (USD default, user-configurable)

### Supported Currencies
USD, EUR, GBP, JPY, CHF, CAD, AUD, INR, CNY, BTC, ETH (expandable)

## 📱 Offline-First PWA

### Offline Capabilities
- Expense tracking
- Budget viewing
- Investment portfolio viewing
- EMI schedule viewing

### Sync Strategy
- IndexedDB for local storage
- Service Workers for background sync
- Last-write-wins conflict resolution

### Online-Only Features
- Real-time market data
- Document uploads
- Report generation
- Currency rate updates

## 🔧 Development

### Local Backend Development

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run individual service
cd services/auth
uvicorn main:app --reload --port 8001
```

### Local Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

### Database Migrations

```bash
# Create migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

## 🧪 Testing

```bash
# Backend tests
pytest backend/tests/

# Frontend tests
cd frontend
npm test
```

## 📊 Monitoring

### Health Checks

All services expose `/health` endpoints:

```bash
curl http://localhost:8001/health
curl http://localhost:8002/health
```

### Logs

```bash
# View all logs
docker-compose logs -f

# Service-specific logs
docker-compose logs -f auth_service
docker-compose logs -f celery_worker
```

### Resource Monitoring

```bash
# Container stats
docker stats

# Database connections
docker exec -it finance_postgres psql -U finance_user -d finance_db -c "SELECT count(*) FROM pg_stat_activity;"
```

## 🌍 API Keys Required

### Exchange Rate API (Free Tier)
1. Sign up at https://www.exchangerate-api.com/
2. Get your API key (1500 requests/month free)
3. Add to `.env`: `EXCHANGE_RATE_API_KEY=your-key`

### Finnhub Stock API (Free Tier)
1. Sign up at https://finnhub.io/
2. Get your API key (60 calls/minute free)
3. Add to `.env`: `FINNHUB_API_KEY=your-key`

### SendGrid Email (Optional)
1. Sign up at https://sendgrid.com/
2. Get your API key
3. Add to `.env`: `SENDGRID_API_KEY=your-key`

## 🚢 Production Deployment

### Environment Variables

Update `.env` for production:

```bash
# Generate secure secret key
SECRET_KEY=$(openssl rand -hex 32)

# Use strong passwords
POSTGRES_PASSWORD=$(openssl rand -hex 16)
REDIS_PASSWORD=$(openssl rand -hex 16)
```

### SSL/TLS Configuration

1. Obtain SSL certificates (Let's Encrypt recommended)
2. Update `nginx/nginx.conf`:

```nginx
server {
    listen 443 ssl;
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    # ... rest of configuration
}
```

### Scaling

```bash
# Scale individual services
docker-compose up -d --scale finance_service=3

# Use Docker Swarm or Kubernetes for production
```

## 📝 API Documentation

Interactive API documentation available at:
- Auth Service: http://localhost:8001/docs
- Finance Service: http://localhost:8002/docs
- EMI Service: http://localhost:8003/docs
- Investment Service: http://localhost:8004/docs
- Market Service: http://localhost:8005/docs
- Export Service: http://localhost:8006/docs

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Troubleshooting

### Database Connection Issues

```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Verify connection
docker exec -it finance_postgres psql -U finance_user -d finance_db
```

### Service Not Starting

```bash
# Check service logs
docker-compose logs [service_name]

# Restart service
docker-compose restart [service_name]

# Rebuild service
docker-compose up -d --build [service_name]
```

### Port Conflicts

If ports are already in use, update `docker-compose.yml`:

```yaml
ports:
  - "5433:5432"  # Change external port
```

## 📞 Support

For issues and questions:
- GitHub Issues: [Project Issues](https://github.com/yourrepo/issues)
- Documentation: [Wiki](https://github.com/yourrepo/wiki)

## 🗺️ Roadmap

### Phase 1 (Current)
- ✅ Core expense tracking
- ✅ Multi-tenancy with RLS
- ✅ EMI management
- ✅ Investment portfolio
- ✅ Market data integration
- ✅ Export functionality

### Phase 2 (Next)
- 🔲 Next.js frontend with shadcn/ui
- 🔲 PWA offline support
- 🔲 Mobile responsive design
- 🔲 Real-time notifications
- 🔲 Advanced analytics dashboard

### Phase 3 (Future)
- 🔲 Mobile apps (React Native)
- 🔲 AI-powered insights
- 🔲 Automated categorization
- 🔲 Receipt OCR scanning
- 🔲 Bank account integration
- 🔲 Tax report generation

---

**Built with ❤️ using FastAPI, Next.js, PostgreSQL, and Docker**
