# Deployment Guide

## Production Deployment Checklist

### 1. Security Hardening

#### Generate Secure Keys
```bash
# Generate SECRET_KEY
openssl rand -hex 32

# Generate database passwords
openssl rand -hex 16
```

#### Update Environment Variables
```bash
cp .env.example .env
# Edit .env with production values
```

**Critical Environment Variables:**
- `SECRET_KEY` - Must be random and secure
- `DATABASE_URL` - Production database connection
- `POSTGRES_PASSWORD` - Strong password
- `REDIS_PASSWORD` - Strong password
- `MINIO_SECRET_KEY` - Strong password
- `RABBITMQ_DEFAULT_PASS` - Strong password

### 2. SSL/TLS Configuration

#### Using Let's Encrypt (Recommended)

```bash
# Install certbot
apt-get update
apt-get install certbot python3-certbot-nginx

# Obtain certificate
certbot --nginx -d yourdomain.com

# Auto-renewal
certbot renew --dry-run
```

#### Update Nginx Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # ... rest of configuration
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

### 3. Database Optimization

#### PostgreSQL Configuration

Edit `postgresql.conf`:

```conf
# Memory
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
work_mem = 16MB

# Connections
max_connections = 100

# Checkpoints
checkpoint_completion_target = 0.9
wal_buffers = 16MB

# Query Planning
random_page_cost = 1.1
effective_io_concurrency = 200
```

#### Create Indexes

```sql
-- Performance indexes
CREATE INDEX CONCURRENTLY idx_expenses_user_date 
    ON expenses(user_id, transaction_date DESC);

CREATE INDEX CONCURRENTLY idx_expenses_category 
    ON expenses(category_id) WHERE category_id IS NOT NULL;

CREATE INDEX CONCURRENTLY idx_emis_user_status 
    ON emis(user_id, status);

CREATE INDEX CONCURRENTLY idx_investments_user 
    ON investments(user_id, investment_type);
```

### 4. Redis Configuration

#### Persistence Settings

```conf
# redis.conf
save 900 1
save 300 10
save 60 10000

appendonly yes
appendfsync everysec
```

### 5. Backup Strategy

#### Database Backup Script

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="finance_db_$DATE.sql.gz"

docker exec finance_postgres pg_dump -U finance_user finance_db | gzip > "$BACKUP_DIR/$FILENAME"

# Keep only last 30 days
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed: $FILENAME"
```

#### Cron Schedule

```bash
# Daily backup at 2 AM
0 2 * * * /path/to/backup.sh >> /var/log/backup.log 2>&1
```

#### MinIO Backup

```bash
# Sync MinIO data
aws s3 sync s3://your-bucket /backups/minio --endpoint-url http://localhost:9000
```

### 6. Monitoring Setup

#### Prometheus Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'fastapi'
    static_configs:
      - targets: 
        - 'auth_service:8001'
        - 'finance_service:8002'
        - 'emi_service:8003'
        - 'investment_service:8004'
        - 'market_service:8005'
        - 'export_service:8006'
```

#### Grafana Dashboards

1. Import FastAPI dashboard (ID: 14407)
2. Import PostgreSQL dashboard (ID: 9628)
3. Import Redis dashboard (ID: 11835)

### 7. Logging Configuration

#### Centralized Logging with ELK Stack

```yaml
# docker-compose.override.yml
services:
  elasticsearch:
    image: elasticsearch:8.11.0
    environment:
      - discovery.type=single-node
    ports:
      - "9200:9200"

  logstash:
    image: logstash:8.11.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf

  kibana:
    image: kibana:8.11.0
    ports:
      - "5601:5601"
```

### 8. Docker Compose Production Override

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  postgres:
    restart: always
    volumes:
      - /mnt/data/postgres:/var/lib/postgresql/data
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 1G

  redis:
    restart: always
    command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru

  nginx:
    restart: always
    volumes:
      - /etc/letsencrypt:/etc/nginx/ssl:ro
```

Start with:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 9. Health Checks & Alerts

#### Uptime Monitoring

Use services like:
- UptimeRobot
- Pingdom
- StatusCake

Monitor endpoints:
- https://yourdomain.com/health
- https://yourdomain.com/api/auth/health
- https://yourdomain.com/api/finance/health

#### Alert Configuration

```python
# alerts.py
def send_alert(service, message):
    # Send to Slack, PagerDuty, etc.
    pass
```

### 10. Scaling Strategies

#### Horizontal Scaling

```bash
# Scale specific services
docker-compose up -d --scale finance_service=3
docker-compose up -d --scale celery_worker=2
```

#### Load Balancer Configuration

```nginx
upstream finance_backend {
    least_conn;
    server finance_service_1:8002;
    server finance_service_2:8002;
    server finance_service_3:8002;
}
```

### 11. Performance Tuning

#### Connection Pooling

```python
# database.py
engine = create_async_engine(
    DATABASE_URL,
    pool_size=20,
    max_overflow=40,
    pool_pre_ping=True,
    pool_recycle=3600
)
```

#### Redis Caching Strategy

```python
# Cache hot data
CACHE_TTL = {
    'exchange_rates': 3600,      # 1 hour
    'market_quotes': 60,         # 1 minute
    'user_preferences': 7200,    # 2 hours
}
```

### 12. Disaster Recovery Plan

#### Recovery Steps

1. **Database Recovery**
```bash
# Restore from backup
gunzip -c backup.sql.gz | docker exec -i finance_postgres psql -U finance_user finance_db
```

2. **Application Recovery**
```bash
# Pull latest images
docker-compose pull

# Restart services
docker-compose up -d
```

3. **Data Validation**
```bash
# Verify data integrity
docker exec finance_postgres psql -U finance_user -d finance_db -c "SELECT COUNT(*) FROM users;"
```

### 13. CI/CD Pipeline

#### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build and push Docker images
        run: |
          docker-compose build
          docker-compose push
      
      - name: Deploy to server
        run: |
          ssh user@server 'cd /app && docker-compose pull && docker-compose up -d'
```

### 14. Security Best Practices

- [ ] Enable firewall (UFW/iptables)
- [ ] Use non-root user for Docker
- [ ] Implement rate limiting
- [ ] Enable CORS properly
- [ ] Use secrets management (Vault, AWS Secrets Manager)
- [ ] Regular security updates
- [ ] Enable audit logging
- [ ] Implement 2FA for admin accounts
- [ ] Regular penetration testing
- [ ] GDPR compliance measures

### 15. Cost Optimization

#### Resource Limits

```yaml
services:
  auth_service:
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
```

#### Auto-scaling with Docker Swarm

```bash
docker service scale finance_service=5
```

### 16. Maintenance Windows

Schedule regular maintenance:
- Weekly: Log rotation, cleanup
- Monthly: Database vacuum, index rebuild
- Quarterly: Security audits, dependency updates

```bash
# Log rotation
docker-compose logs --tail=1000 > logs/$(date +%Y%m%d).log
```

### 17. Documentation

Maintain updated documentation:
- API changelog
- Database schema changes
- Deployment procedures
- Incident response playbook

---

## Support Contacts

- **Emergency**: emergency@yourcompany.com
- **Operations**: ops@yourcompany.com
- **Development**: dev@yourcompany.com

## Useful Commands

```bash
# Check service health
docker-compose ps

# View logs
docker-compose logs -f [service]

# Restart service
docker-compose restart [service]

# Database backup
./scripts/backup.sh

# Check disk usage
df -h

# Monitor containers
docker stats
```
