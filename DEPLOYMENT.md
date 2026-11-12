# 📦 Production Deployment Guide

Complete guide for deploying Land Registry System to production.

## Pre-Deployment Checklist

- [ ] All environment variables configured
- [ ] Database backed up
- [ ] Smart contract audited
- [ ] SSL/TLS certificates obtained
- [ ] Domain names configured
- [ ] Monitoring tools set up
- [ ] Backup strategy defined
- [ ] Rate limiting configured
- [ ] CORS origins whitelisted
- [ ] Logging aggregation configured

## Environment Setup

### 1. Backend Production Environment

`backend/.env` (Production):
```
# Database
DATABASE_URL="postgresql://user:password@db.example.com:5432/land_registry_prod"

# Security
JWT_SECRET="generate-with-: node -e \"console.log(crypto.randomBytes(32).toString('hex'))\""
JWT_REFRESH_SECRET="generate-strong-secret-key"
JWT_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"

# Server
PORT=3001
NODE_ENV="production"

# CORS
CORS_ORIGIN="https://app.example.com,https://www.example.com"

# Blockchain (Mainnet or Testnet)
GANACHE_RPC_URL="https://mainnet.infura.io/v3/YOUR_PROJECT_ID"
LAND_REGISTRY_CONTRACT_ADDRESS="0x..."
ADMIN_WALLET_PRIVATE_KEY="..."

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Session
SESSION_SECRET="generate-strong-secret-key"
```

### 2. Frontend Production Environment

`frontend/.env.production` (Production):
```
VITE_API_URL=https://api.example.com/api
VITE_GANACHE_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
VITE_CONTRACT_ADDRESS=0x...
VITE_APP_NAME="Land Registry System"
```

## Docker Production Build

### 1. Build Images

```bash
# Build backend image
docker build -t land-registry-backend:latest ./backend

# Build frontend image  
docker build -t land-registry-frontend:latest ./frontend

# Tag for registry
docker tag land-registry-backend:latest myregistry.azurecr.io/land-registry-backend:v1.0.0
docker tag land-registry-frontend:latest myregistry.azurecr.io/land-registry-frontend:v1.0.0

# Push to registry
docker push myregistry.azurecr.io/land-registry-backend:v1.0.0
docker push myregistry.azurecr.io/land-registry-frontend:v1.0.0
```

### 2. Production Docker Compose

`docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  backend:
    image: myregistry.azurecr.io/land-registry-backend:v1.0.0
    container_name: land_registry_backend
    environment:
      DATABASE_URL: postgresql://...
      NODE_ENV: production
      # ... other prod env vars
    ports:
      - "3001:3001"
    networks:
      - land-registry-network
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  frontend:
    image: myregistry.azurecr.io/land-registry-frontend:v1.0.0
    container_name: land_registry_frontend
    ports:
      - "5173:5173"
    networks:
      - land-registry-network
    restart: always

  postgres:
    image: postgres:15-alpine
    container_name: land_registry_db_prod
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: land_registry_prod
    volumes:
      - postgres_prod_data:/var/lib/postgresql/data
      - ./backups:/backups
    networks:
      - land-registry-network
    restart: always
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_prod_data:
    driver: local

networks:
  land-registry-network:
    driver: bridge
```

## Cloud Deployment (AWS Example)

### 1. AWS RDS PostgreSQL

```bash
# Create RDS instance
aws rds create-db-instance \
  --db-instance-identifier land-registry-prod-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.1 \
  --master-username postgres \
  --master-user-password "YOUR_SECURE_PASSWORD" \
  --allocated-storage 100 \
  --backup-retention-period 30
```

### 2. AWS ECS Deployment

```bash
# Register task definition
aws ecs register-task-definition \
  --family land-registry-backend \
  --container-definitions "file://task-def.json"

# Create service
aws ecs create-service \
  --cluster land-registry-prod \
  --service-name land-registry-backend \
  --task-definition land-registry-backend:1 \
  --desired-count 2
```

### 3. AWS CloudFront + S3 (Frontend)

```bash
# Build frontend
cd frontend && npm run build

# Upload to S3
aws s3 sync dist/ s3://land-registry-frontend-prod/

# Invalidate CloudFront
aws cloudfront create-invalidation \
  --distribution-id DISTRIBUTION_ID \
  --paths "/*"
```

## Kubernetes Deployment

### 1. Create Namespaces

```bash
kubectl create namespace land-registry
kubectl create namespace land-registry-prod
```

### 2. Backend Deployment

`k8s-backend.yaml`:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: land-registry-backend
  namespace: land-registry-prod
spec:
  replicas: 3
  selector:
    matchLabels:
      app: land-registry-backend
  template:
    metadata:
      labels:
        app: land-registry-backend
    spec:
      containers:
      - name: backend
        image: myregistry.azurecr.io/land-registry-backend:v1.0.0
        ports:
        - containerPort: 3001
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: connection-string
        - name: NODE_ENV
          value: "production"
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

```bash
# Deploy
kubectl apply -f k8s-backend.yaml

# Deploy frontend
kubectl apply -f k8s-frontend.yaml
```

## Domain & SSL

### 1. Configure Domain

```bash
# Point DNS to load balancer
CNAME api.example.com -> lb.example.com
CNAME app.example.com -> cloudfront.example.com
```

### 2. SSL Certificate

```bash
# Let's Encrypt / Certbot
certbot certonly --standalone -d api.example.com -d app.example.com

# Or AWS Certificate Manager
aws acm request-certificate \
  --domain-name api.example.com \
  --validation-method DNS
```

### 3. Nginx Reverse Proxy

`/etc/nginx/sites-available/land-registry`:
```nginx
upstream backend {
    server 127.0.0.1:3001;
}

upstream frontend {
    server 127.0.0.1:5173;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name app.example.com;

    ssl_certificate /etc/letsencrypt/live/app.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.example.com/privkey.pem;

    location / {
        proxy_pass http://frontend;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name api.example.com app.example.com;
    return 301 https://$server_name$request_uri;
}
```

```bash
# Enable and restart
sudo systemctl restart nginx
```

## Monitoring & Logging

### 1. Prometheus Metrics

```bash
# Add to backend
npm install prom-client
```

### 2. ELK Stack (Elasticsearch, Logstash, Kibana)

```bash
docker-compose -f docker-compose.elk.yml up

# Configure logstash to ingest backend logs
```

### 3. DataDog

```bash
# Install agent
DD_AGENT_MAJOR_VERSION=7 DD_API_KEY=xxx DD_SITE=datadoghq.com bash -c "$(curl -L https://s3.amazonaws.com/dd-agent/scripts/install_agent.sh)"
```

## Database Backups

### 1. Automated Backups

```bash
#!/bin/bash
# backup.sh
BACKUP_DIR="/backups/database"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATABASE="land_registry_prod"

pg_dump -h localhost -U postgres $DATABASE > $BACKUP_DIR/backup_$TIMESTAMP.sql

# Compress
gzip $BACKUP_DIR/backup_$TIMESTAMP.sql

# Upload to S3
aws s3 cp $BACKUP_DIR/backup_$TIMESTAMP.sql.gz s3://land-registry-backups/

# Cleanup old backups (keep last 30 days)
find $BACKUP_DIR -mtime +30 -delete
```

```bash
# Schedule with cron (3 AM daily)
0 3 * * * /usr/local/bin/backup.sh
```

### 2. Restore from Backup

```bash
# List backups
aws s3 ls s3://land-registry-backups/

# Download backup
aws s3 cp s3://land-registry-backups/backup_20240115_030000.sql.gz ./

# Restore
gunzip backup_20240115_030000.sql.gz
psql -h localhost -U postgres land_registry_prod < backup_20240115_030000.sql
```

## Security Checklist

- [ ] All secrets in AWS Secrets Manager / HashiCorp Vault
- [ ] Database encrypted at rest (AWS KMS)
- [ ] TLS 1.3 enabled
- [ ] Rate limiting configured (100 req/15min)
- [ ] CORS properly configured
- [ ] SQL injection protection (Prisma ORM)
- [ ] CSRF protection enabled
- [ ] Security headers set (Helmet.js)
- [ ] OWASP Top 10 mitigation
- [ ] Regular security audits scheduled

## Performance Optimization

### 1. Database Queries
```sql
-- Add indexes for common queries
CREATE INDEX idx_land_owner_id ON "Land"("ownerId");
CREATE INDEX idx_land_status ON "Land"("status");
CREATE INDEX idx_approval_land_id ON "Approval"("landId");
CREATE INDEX idx_log_action ON "Log"("action");
CREATE INDEX idx_log_timestamp ON "Log"("timestamp");
```

### 2. Caching

```typescript
// Redis cache for frequently accessed data
import redis from 'redis';
const cache = redis.createClient({ host: 'cache.example.com' });

// Cache land lookups (TTL: 5 minutes)
const cachedLand = await cache.get(`land:${parcelId}`);
```

### 3. CDN Configuration

```bash
# CloudFront invalidation on updates
DISTRIBUTION_ID="E1234ABCD"
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"
```

## Post-Deployment

1. **Run migrations**: `docker exec land_registry_backend npx prisma migrate deploy`
2. **Seed database**: `docker exec land_registry_backend npm run prisma:seed`
3. **Run tests**: `npm test`
4. **Health check**: `curl https://api.example.com/health`
5. **Monitor logs**: `docker logs -f land_registry_backend`

## Support

For deployment issues:
1. Check logs: `docker logs <container_id>`
2. Verify environment: `env | grep -v PASS`
3. Test connectivity: `curl -v https://api.example.com/health`
4. Review monitoring dashboards

---

**Last Updated**: January 2024
**Status**: ✅ Production Ready
