#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Monthly Financial Tracker - Installation     ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════╝${NC}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to print status
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check system requirements
print_status "Checking system requirements..."
echo ""

# Check Docker
if ! command_exists docker; then
    print_error "Docker is not installed!"
    echo "Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    exit 1
else
    DOCKER_VERSION=$(docker --version | cut -d ' ' -f3 | cut -d ',' -f1)
    print_success "Docker found (version $DOCKER_VERSION)"
fi

# Check Docker Compose
if ! command_exists docker-compose; then
    print_error "Docker Compose is not installed!"
    echo "Please install Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
else
    COMPOSE_VERSION=$(docker-compose --version | cut -d ' ' -f4 | cut -d ',' -f1)
    print_success "Docker Compose found (version $COMPOSE_VERSION)"
fi

# Check Docker daemon
if ! docker info >/dev/null 2>&1; then
    print_error "Docker daemon is not running!"
    echo "Please start Docker Desktop and try again."
    exit 1
else
    print_success "Docker daemon is running"
fi

# Check Node.js
if ! command_exists node; then
    print_error "Node.js is not installed!"
    echo "Please install Node.js from: https://nodejs.org/"
    exit 1
else
    NODE_VERSION=$(node --version)
    print_success "Node.js found ($NODE_VERSION)"
fi

# Check npm or yarn
if command_exists yarn; then
    PKG_MANAGER="yarn"
    PKG_VERSION=$(yarn --version)
    print_success "Yarn found (version $PKG_VERSION)"
elif command_exists npm; then
    PKG_MANAGER="npm"
    PKG_VERSION=$(npm --version)
    print_success "npm found (version $PKG_VERSION)"
else
    print_error "Neither npm nor yarn is installed!"
    exit 1
fi

echo ""
print_status "All prerequisites satisfied!"
echo ""

# Setup environment files
print_status "Setting up environment files..."

# Backend environment
if [ ! -f "backend/.env" ]; then
    cat > backend/.env << 'EOF'
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

# API Keys - Replace with your own keys
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_here
FINNHUB_API_KEY=your_finnhub_key_here

# Service Ports
AUTH_SERVICE_PORT=8001
EXPENSE_SERVICE_PORT=8002
BUDGET_SERVICE_PORT=8003
INVESTMENT_SERVICE_PORT=8004
EMI_SERVICE_PORT=8005
NOTIFICATION_SERVICE_PORT=8006
EOF
    print_success "Created backend/.env"
else
    print_warning "backend/.env already exists, skipping..."
fi

# Frontend environment
if [ ! -f "frontend/.env.local" ]; then
    cat > frontend/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost/api
EOF
    print_success "Created frontend/.env.local"
else
    print_warning "frontend/.env.local already exists, skipping..."
fi

echo ""

# Install frontend dependencies
print_status "Installing frontend dependencies..."
cd frontend
if [ "$PKG_MANAGER" = "yarn" ]; then
    yarn install
else
    npm install
fi
print_success "Frontend dependencies installed"
cd ..

echo ""

# Stop any existing containers
print_status "Stopping any existing containers..."
docker-compose down -v 2>/dev/null || true
print_success "Cleaned up existing containers"

echo ""

# Build Docker images
print_status "Building Docker images (this may take several minutes)..."
docker-compose build --no-cache
print_success "Docker images built successfully"

echo ""

# Start services
print_status "Starting all services..."
docker-compose up -d
print_success "All services started"

echo ""

# Wait for services to be healthy
print_status "Waiting for services to be ready..."
echo "This may take 30-60 seconds..."

MAX_WAIT=60
ELAPSED=0
while [ $ELAPSED -lt $MAX_WAIT ]; do
    if docker-compose ps | grep -q "Up (healthy)"; then
        break
    fi
    sleep 2
    ELAPSED=$((ELAPSED + 2))
    echo -n "."
done
echo ""

# Check service status
print_status "Checking service status..."
echo ""

SERVICES=(
    "postgres:5432:PostgreSQL Database"
    "redis:6379:Redis Cache"
    "rabbitmq:5672:RabbitMQ Message Broker"
    "minio:9000:MinIO Object Storage"
    "nginx:80:API Gateway"
)

for service_info in "${SERVICES[@]}"; do
    IFS=':' read -r service port description <<< "$service_info"
    container_name="finance_${service}"
    
    if docker ps | grep -q "$container_name"; then
        print_success "$description is running"
    else
        print_warning "$description might not be ready yet"
    fi
done

echo ""

# Display access information
echo -e "${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          Installation Complete! 🎉             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}Backend Services:${NC}"
echo "  • API Gateway:      http://localhost/api"
echo "  • Auth Service:     http://localhost/api/auth"
echo "  • Expense Service:  http://localhost/api/expense"
echo "  • Budget Service:   http://localhost/api/budget"
echo "  • Investment:       http://localhost/api/investment"
echo "  • EMI Service:      http://localhost/api/emi"
echo ""
echo -e "${BLUE}Infrastructure:${NC}"
echo "  • PostgreSQL:       localhost:5432"
echo "  • Redis:            localhost:6379"
echo "  • RabbitMQ:         http://localhost:15672 (guest/guest)"
echo "  • MinIO Console:    http://localhost:9001 (minioadmin/minioadmin)"
echo ""
echo -e "${BLUE}Frontend:${NC}"
echo "  To start the development server:"
echo "  ${YELLOW}cd frontend && yarn dev${NC}"
echo "  Then visit: ${GREEN}http://localhost:3000${NC}"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo "  • View logs:        ${YELLOW}docker-compose logs -f [service_name]${NC}"
echo "  • Stop services:    ${YELLOW}docker-compose down${NC}"
echo "  • Restart services: ${YELLOW}docker-compose restart${NC}"
echo "  • Check status:     ${YELLOW}docker-compose ps${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Start frontend: cd frontend && yarn dev"
echo "  2. Open browser:   http://localhost:3000"
echo "  3. Create account and login"
echo ""
print_success "Setup completed successfully!"
