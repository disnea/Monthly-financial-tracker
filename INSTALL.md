# Installation Guide

## Prerequisites

Before installing the Monthly Financial Tracker, ensure you have the following installed on your machine:

### Required Software

1. **Docker Desktop** (v20.10+)
   - macOS: https://docs.docker.com/desktop/install/mac-install/
   - Linux: https://docs.docker.com/desktop/install/linux-install/
   - Windows: https://docs.docker.com/desktop/install/windows-install/

2. **Node.js** (v18+)
   - Download from: https://nodejs.org/
   - Or use nvm: `nvm install 18`

3. **Package Manager**
   - **Yarn** (recommended): `npm install -g yarn`
   - Or use **npm** (comes with Node.js)

### System Requirements

- **RAM**: Minimum 8GB (16GB recommended)
- **Disk Space**: At least 10GB free
- **OS**: macOS, Linux, or Windows with WSL2

---

## Quick Installation (Automated)

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd Monthly-financial-tracker
```

### Step 2: Run Installation Script

```bash
./install.sh
```

The script will:
- ✅ Check all prerequisites
- ✅ Create environment files
- ✅ Install frontend dependencies
- ✅ Build Docker images
- ✅ Start all services
- ✅ Display access information

### Step 3: Start Frontend

```bash
cd frontend
yarn dev
# Or: npm run dev
```

### Step 4: Access the Application

Open your browser and navigate to: **http://localhost:3000**

---

## Manual Installation

If you prefer to install manually or the automated script fails:

### 1. Environment Setup

#### Backend Environment

Create `backend/.env`:

```bash
# Database Configuration
DATABASE_URL=postgresql://finance_user:finance_password@postgres:5432/finance_db

# Security
SECRET_KEY=your-secret-key-min-32-characters-long
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=redis_password

# MinIO Configuration
MINIO_ENDPOINT=minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_SECURE=false

# RabbitMQ Configuration
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=rabbitmq_user
RABBITMQ_PASSWORD=rabbitmq_password

# API Keys
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key
FINNHUB_API_KEY=your_finnhub_key

# Service Ports
AUTH_SERVICE_PORT=8001
EXPENSE_SERVICE_PORT=8002
BUDGET_SERVICE_PORT=8003
INVESTMENT_SERVICE_PORT=8004
EMI_SERVICE_PORT=8005
NOTIFICATION_SERVICE_PORT=8006
```

#### Frontend Environment

Create `frontend/.env.local`:

```bash
NEXT_PUBLIC_API_URL=http://localhost/api
```

### 2. Install Frontend Dependencies

```bash
cd frontend
yarn install
# Or: npm install
cd ..
```

### 3. Start Backend Services

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Check status
docker-compose ps
```

### 4. Verify Services

All services should be running:
- ✅ PostgreSQL Database
- ✅ Redis Cache
- ✅ RabbitMQ Message Broker
- ✅ MinIO Object Storage
- ✅ Nginx API Gateway
- ✅ Auth Service
- ✅ Expense Service
- ✅ Budget Service
- ✅ Investment Service
- ✅ EMI Service
- ✅ Notification Service
- ✅ Celery Workers (for background tasks)

### 5. Start Frontend Development Server

```bash
cd frontend
yarn dev
# Or: npm run dev
```

Access the app at: **http://localhost:3000**

---

## Service URLs

### Application
- **Frontend**: http://localhost:3000
- **API Gateway**: http://localhost/api

### Backend Services
- **Auth**: http://localhost/api/auth
- **Expenses**: http://localhost/api/expense
- **Budgets**: http://localhost/api/budget
- **Investments**: http://localhost/api/investment
- **EMI**: http://localhost/api/emi
- **Notifications**: http://localhost/api/notification

### Infrastructure
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **RabbitMQ Management**: http://localhost:15672 (guest/guest)
- **MinIO Console**: http://localhost:9001 (minioadmin/minioadmin)

---

## Common Commands

### Docker Operations

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v

# Restart specific service
docker-compose restart <service_name>

# View logs
docker-compose logs -f

# View logs for specific service
docker-compose logs -f auth_service

# Rebuild specific service
docker-compose build <service_name>
docker-compose up -d <service_name>

# Check service status
docker-compose ps
```

### Frontend Operations

```bash
cd frontend

# Development server
yarn dev

# Build for production
yarn build

# Start production server
yarn start

# Run linting
yarn lint
```

### Database Operations

```bash
# Access PostgreSQL
docker exec -it finance_postgres psql -U finance_user -d finance_db

# View tables
\dt

# Backup database
docker exec finance_postgres pg_dump -U finance_user finance_db > backup.sql

# Restore database
docker exec -i finance_postgres psql -U finance_user -d finance_db < backup.sql
```

### Redis Operations

```bash
# Access Redis CLI
docker exec -it finance_redis redis-cli -a redis_password

# View all keys
KEYS *

# Clear cache
FLUSHALL
```

---

## Troubleshooting

### Port Already in Use

If you get port conflict errors:

```bash
# Check what's using port 80
lsof -i :80

# Check what's using port 3000
lsof -i :3000

# Kill the process or change ports in docker-compose.yml
```

### Docker Daemon Not Running

```bash
# macOS: Start Docker Desktop from Applications
# Linux: sudo systemctl start docker
# Windows: Start Docker Desktop
```

### Services Not Starting

```bash
# Check logs for errors
docker-compose logs

# Restart with clean slate
docker-compose down -v
docker-compose up -d --build
```

### Frontend Build Errors

```bash
cd frontend

# Clear node_modules and reinstall
rm -rf node_modules
yarn install

# Clear Next.js cache
rm -rf .next
yarn dev
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart PostgreSQL
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

### API Key Issues

Stock market data requires API keys:

1. **Alpha Vantage**: https://www.alphavantage.co/support/#api-key
   - Free tier: 25 requests/day
   
2. **Finnhub**: https://finnhub.io/register
   - Free tier: 60 calls/minute

Update keys in `backend/.env`:
```bash
ALPHA_VANTAGE_API_KEY=your_key_here
FINNHUB_API_KEY=your_key_here
```

Then rebuild investment service:
```bash
docker-compose build investment_service
docker-compose up -d investment_service
```

---

## Development Workflow

### Making Backend Changes

1. Edit Python files in `backend/services/`
2. Rebuild the specific service:
   ```bash
   docker-compose build <service_name>
   docker-compose up -d <service_name>
   ```
3. Check logs for errors:
   ```bash
   docker-compose logs -f <service_name>
   ```

### Making Frontend Changes

Frontend uses hot-reload, so changes appear automatically. If not:

```bash
cd frontend
# Stop dev server (Ctrl+C)
yarn dev
```

### Database Schema Changes

1. Update models in `backend/database/models.py`
2. Access PostgreSQL:
   ```bash
   docker exec -it finance_postgres psql -U finance_user -d finance_db
   ```
3. Run migrations or create tables manually

### Adding New Dependencies

**Backend (Python):**
1. Add to `backend/requirements.txt`
2. Rebuild service:
   ```bash
   docker-compose build <service_name>
   ```

**Frontend (Node.js):**
```bash
cd frontend
yarn add <package-name>
# Or: npm install <package-name>
```

---

## Security Notes

### Production Deployment

⚠️ **Important**: Before deploying to production:

1. **Change all default passwords** in `backend/.env`:
   - `SECRET_KEY`
   - `DATABASE_URL` (password)
   - `REDIS_PASSWORD`
   - `RABBITMQ_PASSWORD`
   - `MINIO_SECRET_KEY`

2. **Use strong secrets**:
   ```bash
   # Generate secure secret key
   openssl rand -hex 32
   ```

3. **Enable HTTPS** in production
4. **Set proper CORS origins**
5. **Use environment-specific .env files**

---

## Architecture Overview

```
┌─────────────────┐
│   Frontend      │  Next.js + React + TypeScript
│   (Port 3000)   │  Zustand state management
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Nginx Gateway  │  API routing & load balancing
│   (Port 80)     │
└────────┬────────┘
         │
    ┌────┴────┬────────────┬─────────────┬──────────┐
    ▼         ▼            ▼             ▼          ▼
┌────────┐ ┌──────┐ ┌───────────┐ ┌──────────┐ ┌─────┐
│  Auth  │ │Expense│ │  Budget   │ │Investment│ │ EMI │
│Service │ │Service│ │  Service  │ │ Service  │ │Svc  │
└───┬────┘ └───┬──┘ └─────┬─────┘ └────┬─────┘ └──┬──┘
    │          │          │            │           │
    └──────────┴──────────┴────────────┴───────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
    ┌──────────┐   ┌─────────┐    ┌──────────┐
    │PostgreSQL│   │  Redis  │    │ RabbitMQ │
    └──────────┘   └─────────┘    └──────────┘
```

---

## Support

For issues or questions:
1. Check logs: `docker-compose logs -f`
2. Review this guide
3. Check existing GitHub issues
4. Create a new issue with logs and error details

---

## License

[Your License Here]
