#!/bin/bash
# Run all FastAPI services locally with uvicorn
# Infrastructure (Postgres, Redis, MinIO, RabbitMQ, Nginx) should be running in Docker

export PYTHONPATH="$(pwd):$PYTHONPATH"
export DATABASE_URL="postgresql+asyncpg://finance_user:finance_password@localhost:5432/finance_db"
export REDIS_URL="redis://:redis_password@localhost:6379/0"
export SECRET_KEY="your-secret-key-change-in-production"
export JWT_ALGORITHM="HS256"
export JWT_EXPIRATION_MINUTES="1440"
export AUTH_SERVICE_URL="http://localhost:8001"
export MINIO_ENDPOINT="localhost:9000"
export MINIO_ACCESS_KEY="minio_admin"
export MINIO_SECRET_KEY="minio_password"
export FINNHUB_API_KEY="${FINNHUB_API_KEY:-your_finnhub_key_here}"
export ALPHA_VANTAGE_API_KEY="${ALPHA_VANTAGE_API_KEY:-your_alpha_vantage_key_here}"

VENV=".venv/bin/python"

echo "🚀 Starting all FastAPI services locally..."

$VENV -m uvicorn services.auth.main:app --host 0.0.0.0 --port 8001 --reload &
echo "  ✅ Auth service on :8001"

$VENV -m uvicorn services.finance.main:app --host 0.0.0.0 --port 8002 --reload &
echo "  ✅ Finance service on :8002"

$VENV -m uvicorn services.emi.main:app --host 0.0.0.0 --port 8003 --reload &
echo "  ✅ EMI service on :8003"

$VENV -m uvicorn services.investment.main:app --host 0.0.0.0 --port 8004 --reload &
echo "  ✅ Investment service on :8004"

$VENV -m uvicorn services.market.main:app --host 0.0.0.0 --port 8005 --reload &
echo "  ✅ Market service on :8005"

$VENV -m uvicorn services.export.main:app --host 0.0.0.0 --port 8006 --reload &
echo "  ✅ Export service on :8006"

echo ""
echo "All services started! Press Ctrl+C to stop all."
echo "Nginx (Docker) proxies localhost:80 → these services"

trap "kill 0" EXIT
wait
