# Deployment Guide

This guide covers deploying the TikTok Carousel Middleware in various environments, from development to production.

## 🚀 Quick Start

### Local Development

```bash
# Clone repository
git clone <your-repo-url>
cd tiktok-carousel-middleware

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your values

# Start development server
npm run dev
```

### Docker Development

```bash
# Start with hot reload
docker-compose -f docker-compose.dev.yml up

# Or in detached mode
docker-compose -f docker-compose.dev.yml up -d

# View logs
docker-compose logs -f app
```

## 🏗 Production Deployment

### Prerequisites

- Domain name with DNS configured
- SSL certificates (Let's Encrypt recommended)
- TikTok Developer Account with app credentials
- PostgreSQL database (or use Docker)
- Redis instance (optional, or use Docker)

### Docker Production

#### 1. Prepare Environment

```bash
# Create production directory
mkdir -p /opt/tiktok-carousel
cd /opt/tiktok-carousel

# Download configuration files
curl -O https://raw.githubusercontent.com/your-repo/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/your-repo/main/.env.example
curl -O https://raw.githubusercontent.com/your-repo/main/nginx/nginx.conf

# Create environment file
cp .env.example .env.production
```

#### 2. Configure Environment

Edit `.env.production`:

```bash
# Application
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# TikTok API (get from TikTok Developer Portal)
TIKTOK_CLIENT_ID=your-actual-client-id
TIKTOK_CLIENT_SECRET=your-actual-client-secret
TIKTOK_REDIRECT_URI=https://yourdomain.com/auth/tiktok/callback
TIKTOK_APP_ID=your-actual-app-id

# Security (GENERATE SECURE VALUES!)
JWT_SECRET=$(openssl rand -hex 32)
ADMIN_API_KEY=$(openssl rand -hex 16)
ENCRYPTION_KEY=$(openssl rand -hex 32)

# Database
POSTGRES_USER=tiktok_user
POSTGRES_PASSWORD=$(openssl rand -hex 16)
DATABASE_URL=postgresql://tiktok_user:${POSTGRES_PASSWORD}@postgres:5432/tiktok_middleware

# Redis
REDIS_PASSWORD=$(openssl rand -hex 16)

# File Upload
MAX_FILE_SIZE_MB=60
MAX_FILES_PER_REQUEST=10

# CORS (update to your domains)
CORS_ORIGINS=https://yourdomain.com,https://n8n.yourdomain.com

# Logging
LOG_LEVEL=warn
```

#### 3. SSL Certificates

**Option A: Let's Encrypt (Recommended)**

```bash
# Install certbot
apt-get update && apt-get install -y certbot

# Generate certificates
certbot certonly --standalone \
  --email your-email@domain.com \
  --agree-tos \
  --no-eff-email \
  -d yourdomain.com

# Copy certificates
mkdir -p nginx/ssl
cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem nginx/ssl/cert.pem
cp /etc/letsencrypt/live/yourdomain.com/privkey.pem nginx/ssl/key.pem

# Set up auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet && docker-compose restart nginx" | crontab -
```

**Option B: Self-signed (Development/Testing only)**

```bash
mkdir -p nginx/ssl
openssl req -x509 -newkey rsa:4096 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -days 365 -nodes \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=yourdomain.com"
```

#### 4. Deploy

```bash
# Download/build images
docker-compose --env-file .env.production pull
docker-compose --env-file .env.production build

# Start services
docker-compose --env-file .env.production up -d

# Check status
docker-compose ps
docker-compose logs app

# Test health
curl -k https://yourdomain.com/health
```

#### 5. Monitor

```bash
# View logs
docker-compose logs -f

# Check individual services
docker-compose logs app
docker-compose logs postgres
docker-compose logs nginx

# Monitor resources
docker stats
```

### Kubernetes Deployment

#### 1. Create Namespace

```yaml
# namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: tiktok-carousel
```

#### 2. Secrets

```yaml
# secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: tiktok-secrets
  namespace: tiktok-carousel
type: Opaque
stringData:
  tiktok-client-id: "your-client-id"
  tiktok-client-secret: "your-client-secret"
  tiktok-app-id: "your-app-id"
  jwt-secret: "your-jwt-secret"
  admin-api-key: "your-admin-api-key"
  encryption-key: "your-encryption-key"
  postgres-password: "your-postgres-password"
  redis-password: "your-redis-password"
```

#### 3. ConfigMap

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: tiktok-config
  namespace: tiktok-carousel
data:
  NODE_ENV: "production"
  PORT: "5000"
  MAX_FILE_SIZE_MB: "60"
  MAX_FILES_PER_REQUEST: "10"
  LOG_LEVEL: "warn"
  CORS_ORIGINS: "https://yourdomain.com"
  TIKTOK_REDIRECT_URI: "https://yourdomain.com/auth/tiktok/callback"
```

#### 4. PostgreSQL

```yaml
# postgres.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: tiktok-carousel
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        env:
        - name: POSTGRES_DB
          value: tiktok_middleware
        - name: POSTGRES_USER
          value: tiktok_user
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: tiktok-secrets
              key: postgres-password
        ports:
        - containerPort: 5432
        volumeMounts:
        - name: postgres-data
          mountPath: /var/lib/postgresql/data
        - name: init-script
          mountPath: /docker-entrypoint-initdb.d/init.sql
          subPath: init.sql
      volumes:
      - name: postgres-data
        persistentVolumeClaim:
          claimName: postgres-pvc
      - name: init-script
        configMap:
          name: postgres-init

---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: tiktok-carousel
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-pvc
  namespace: tiktok-carousel
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

#### 5. Application

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tiktok-carousel-app
  namespace: tiktok-carousel
spec:
  replicas: 3
  selector:
    matchLabels:
      app: tiktok-carousel
  template:
    metadata:
      labels:
        app: tiktok-carousel
    spec:
      containers:
      - name: app
        image: your-registry/tiktok-carousel:latest
        ports:
        - containerPort: 5000
        env:
        - name: DATABASE_URL
          value: "postgresql://tiktok_user:$(POSTGRES_PASSWORD)@postgres:5432/tiktok_middleware"
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: tiktok-secrets
              key: postgres-password
        envFrom:
        - configMapRef:
            name: tiktok-config
        - secretRef:
            name: tiktok-secrets
        livenessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        volumeMounts:
        - name: uploads
          mountPath: /app/uploads
        - name: logs
          mountPath: /app/logs
      volumes:
      - name: uploads
        persistentVolumeClaim:
          claimName: uploads-pvc
      - name: logs
        persistentVolumeClaim:
          claimName: logs-pvc

---
apiVersion: v1
kind: Service
metadata:
  name: tiktok-carousel-service
  namespace: tiktok-carousel
spec:
  selector:
    app: tiktok-carousel
  ports:
  - port: 80
    targetPort: 5000
  type: ClusterIP

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: uploads-pvc
  namespace: tiktok-carousel
spec:
  accessModes:
  - ReadWriteMany
  resources:
    requests:
      storage: 50Gi

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: logs-pvc
  namespace: tiktok-carousel
spec:
  accessModes:
  - ReadWriteMany
  resources:
    requests:
      storage: 10Gi
```

#### 6. Ingress

```yaml
# ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: tiktok-carousel-ingress
  namespace: tiktok-carousel
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "60m"
    nginx.ingress.kubernetes.io/rate-limit-rps: "10"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
spec:
  tls:
  - hosts:
    - yourdomain.com
    secretName: tiktok-carousel-tls
  rules:
  - host: yourdomain.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: tiktok-carousel-service
            port:
              number: 80
```

#### 7. Deploy to Kubernetes

```bash
# Apply all manifests
kubectl apply -f namespace.yaml
kubectl apply -f secrets.yaml
kubectl apply -f configmap.yaml
kubectl apply -f postgres.yaml
kubectl apply -f deployment.yaml
kubectl apply -f ingress.yaml

# Check deployment
kubectl get pods -n tiktok-carousel
kubectl logs -f -n tiktok-carousel deployment/tiktok-carousel-app

# Test
curl https://yourdomain.com/api/health
```

## 🌐 Cloud Platform Deployments

### AWS ECS

#### 1. Task Definition

```json
{
  "family": "tiktok-carousel",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "app",
      "image": "your-account.dkr.ecr.region.amazonaws.com/tiktok-carousel:latest",
      "portMappings": [
        {
          "containerPort": 5000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "TIKTOK_CLIENT_ID",
          "valueFrom": "arn:aws:secretsmanager:region:account:secret:tiktok-secrets:client-id::"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/tiktok-carousel",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:5000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

#### 2. Service Definition

```json
{
  "serviceName": "tiktok-carousel",
  "cluster": "production",
  "taskDefinition": "tiktok-carousel:1",
  "desiredCount": 3,
  "launchType": "FARGATE",
  "networkConfiguration": {
    "awsvpcConfiguration": {
      "subnets": ["subnet-12345", "subnet-67890"],
      "securityGroups": ["sg-abcdef"],
      "assignPublicIp": "ENABLED"
    }
  },
  "loadBalancers": [
    {
      "targetGroupArn": "arn:aws:elasticloadbalancing:region:account:targetgroup/tiktok-carousel/1234567890",
      "containerName": "app",
      "containerPort": 5000
    }
  ],
  "healthCheckGracePeriodSeconds": 300
}
```

### Google Cloud Run

#### 1. Dockerfile (optimize for Cloud Run)

```dockerfile
FROM node:20-alpine AS production

WORKDIR /app

# Copy built application
COPY dist ./dist
COPY node_modules ./node_modules
COPY package*.json ./

# Create non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Create directories
RUN mkdir -p uploads logs && \
    chown -R appuser:appgroup /app

USER appuser

EXPOSE 5000

CMD ["node", "dist/server.js"]
```

#### 2. Deploy

```bash
# Build and push
docker build -t gcr.io/your-project/tiktok-carousel .
docker push gcr.io/your-project/tiktok-carousel

# Deploy to Cloud Run
gcloud run deploy tiktok-carousel \
  --image gcr.io/your-project/tiktok-carousel \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 5000 \
  --memory 2Gi \
  --cpu 2 \
  --max-instances 10 \
  --set-env-vars NODE_ENV=production \
  --set-secrets TIKTOK_CLIENT_ID=tiktok-client-id:latest \
  --set-secrets TIKTOK_CLIENT_SECRET=tiktok-client-secret:latest
```

### Heroku

#### 1. Procfile

```
web: node dist/server.js
```

#### 2. Deploy

```bash
# Install Heroku CLI and login
heroku login

# Create app
heroku create your-tiktok-carousel

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set TIKTOK_CLIENT_ID=your-client-id
heroku config:set TIKTOK_CLIENT_SECRET=your-client-secret
# ... other variables

# Add Heroku Postgres
heroku addons:create heroku-postgresql:standard-0

# Deploy
git push heroku main

# Check status
heroku ps
heroku logs --tail
```

## 🔧 Configuration Management

### Environment Variables by Environment

#### Development
```bash
NODE_ENV=development
LOG_LEVEL=debug
MAX_FILE_SIZE_MB=10
CORS_ORIGINS=http://localhost:*
```

#### Staging
```bash
NODE_ENV=staging
LOG_LEVEL=info
MAX_FILE_SIZE_MB=30
CORS_ORIGINS=https://staging.yourdomain.com
```

#### Production
```bash
NODE_ENV=production
LOG_LEVEL=warn
MAX_FILE_SIZE_MB=60
CORS_ORIGINS=https://yourdomain.com
```

### Secrets Management

**AWS Secrets Manager:**
```bash
aws secretsmanager create-secret \
  --name "tiktok-carousel/production" \
  --description "TikTok Carousel API secrets" \
  --secret-string '{
    "TIKTOK_CLIENT_ID": "your-client-id",
    "TIKTOK_CLIENT_SECRET": "your-client-secret",
    "JWT_SECRET": "your-jwt-secret",
    "ENCRYPTION_KEY": "your-encryption-key"
  }'
```

**HashiCorp Vault:**
```bash
vault kv put secret/tiktok-carousel \
  tiktok_client_id=your-client-id \
  tiktok_client_secret=your-client-secret \
  jwt_secret=your-jwt-secret \
  encryption_key=your-encryption-key
```

**Kubernetes Secrets:**
```bash
kubectl create secret generic tiktok-secrets \
  --from-literal=tiktok-client-id=your-client-id \
  --from-literal=tiktok-client-secret=your-client-secret \
  --from-literal=jwt-secret=your-jwt-secret \
  --from-literal=encryption-key=your-encryption-key
```

## 📊 Monitoring & Observability

### Health Checks

Configure your load balancer/orchestrator to use:
- **Endpoint**: `GET /api/health`
- **Expected status**: 200
- **Expected response**: `{"status": "healthy"}`
- **Interval**: 30 seconds
- **Timeout**: 10 seconds

### Logging

#### Log Levels by Environment:
- **Development**: `debug`
- **Staging**: `info`
- **Production**: `warn`

#### Log Aggregation:

**ELK Stack:**
```yaml
# docker-compose.yml addition
elasticsearch:
  image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
  environment:
    - discovery.type=single-node
    - xpack.security.enabled=false

kibana:
  image: docker.elastic.co/kibana/kibana:8.11.0
  depends_on:
    - elasticsearch

logstash:
  image: docker.elastic.co/logstash/logstash:8.11.0
  volumes:
    - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
```

**Fluentd configuration:**
```xml
<source>
  @type tail
  path /app/logs/*.log
  pos_file /var/log/fluentd/app.log.pos
  tag app.logs
  format json
</source>

<match app.logs>
  @type elasticsearch
  host elasticsearch
  port 9200
  index_name app-logs
</match>
```

### Metrics

**Prometheus + Grafana:**

```yaml
# docker-compose.monitoring.yml
prometheus:
  image: prom/prometheus
  ports:
    - "9090:9090"
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml

grafana:
  image: grafana/grafana
  ports:
    - "3000:3000"
  environment:
    - GF_SECURITY_ADMIN_PASSWORD=admin
```

Add to your app:
```javascript
const client = require('prom-client');
const register = new client.Registry();

const httpRequests = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status']
});

register.registerMetric(httpRequests);
```

## 🚨 Troubleshooting

### Common Issues

#### Health Check Failures
```bash
# Check application logs
docker-compose logs app

# Test health endpoint
curl -v http://localhost:5000/health

# Check database connection
docker-compose exec postgres psql -U tiktok_user -d tiktok_middleware -c "SELECT 1;"
```

#### SSL Certificate Issues
```bash
# Check certificate expiry
openssl x509 -in nginx/ssl/cert.pem -text -noout | grep "Not After"

# Renew Let's Encrypt
certbot renew --dry-run
certbot renew

# Restart nginx
docker-compose restart nginx
```

#### Database Connection Issues
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Test connection
docker-compose exec app node -e "
const pg = require('pg');
const client = new pg.Client(process.env.DATABASE_URL);
client.connect().then(() => console.log('Connected')).catch(console.error);
"
```

#### Performance Issues
```bash
# Monitor resource usage
docker stats

# Check application metrics
curl http://localhost:5000/api/health/detailed

# View slow queries
docker-compose exec postgres psql -U tiktok_user -d tiktok_middleware -c "
SELECT query, mean_exec_time, calls 
FROM pg_stat_statements 
ORDER BY mean_exec_time DESC 
LIMIT 10;"
```

### Debug Mode

Enable debug logging:
```bash
# Docker
docker-compose exec app npm run debug

# Or set environment
export LOG_LEVEL=debug
export DEBUG=tiktok:*
```

## 🔄 Updates & Rollbacks

### Rolling Updates

```bash
# Build new version
docker build -t your-registry/tiktok-carousel:v1.1 .
docker push your-registry/tiktok-carousel:v1.1

# Update docker-compose.yml image tag
sed -i 's/tiktok-carousel:v1.0/tiktok-carousel:v1.1/g' docker-compose.yml

# Deploy with zero downtime
docker-compose up -d --no-deps app

# Verify
curl https://yourdomain.com/api/health
```

### Database Migrations

```bash
# Run migrations
docker-compose exec app npm run migrate

# Or manually
docker-compose exec postgres psql -U tiktok_user -d tiktok_middleware -f migrations/001_add_new_table.sql
```

### Rollback

```bash
# Revert to previous version
docker-compose exec app docker tag your-registry/tiktok-carousel:v1.0 your-registry/tiktok-carousel:latest
docker-compose up -d --no-deps app

# Or use specific version
sed -i 's/tiktok-carousel:v1.1/tiktok-carousel:v1.0/g' docker-compose.yml
docker-compose up -d --no-deps app
```

## 📋 Production Checklist

Before deploying to production:

- [ ] All secrets configured (no defaults)
- [ ] SSL certificates installed and valid
- [ ] Database backups configured
- [ ] Monitoring and alerting set up
- [ ] Log rotation configured
- [ ] Rate limiting tested
- [ ] Load balancer health checks working
- [ ] CORS origins restricted to your domains
- [ ] File upload limits appropriate
- [ ] TikTok API credentials valid
- [ ] Error tracking configured
- [ ] Performance benchmarks met
- [ ] Security scan completed
- [ ] Backup and recovery tested

For additional help, refer to the main README.md and API documentation.