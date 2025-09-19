# TikTok Carousel Middleware

A production-ready Node.js microservice that enables n8n workflows to create TikTok image carousels. Built with TypeScript, Express, and comprehensive security features.

## 🚀 Features

- **Multiple Image Input Methods**: Support for multipart file uploads, base64 images, and URL-based images
- **TikTok API Integration**: Media upload and post creation with credential management
- **Production-Ready Security**: JWT authentication, rate limiting, CORS, input validation
- **Job Management**: Synchronous and asynchronous processing with status tracking
- **Docker Ready**: Multi-stage builds, health checks, and production configuration
- **Comprehensive Logging**: Structured logging with Winston and request tracking
- **n8n Integration**: Webhook endpoints and callback support

## 📋 Prerequisites

- Node.js 20+ or Docker
- TikTok Developer Account with App credentials
- PostgreSQL database (provided via Docker)
- Redis (optional, provided via Docker)

## 🏗 Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│      n8n        │───▶│   Middleware     │───▶│   TikTok API    │
│   Workflow      │    │   (This App)     │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   Job Storage    │
                       │ (In-Memory/DB*)  │
                       └──────────────────┘
```

**\*Current Implementation**: Uses in-memory job storage. PostgreSQL integration available for persistent job tracking in production deployments.

## 🔧 Installation & Setup

### Option 1: Docker (Recommended)

1. **Clone the repository**
```bash
git clone <repository-url>
cd tiktok-carousel-middleware
```

2. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your TikTok API credentials and secure passwords
```

3. **Generate SSL certificates** (for production)
```bash
mkdir -p nginx/ssl
# For development:
openssl req -x509 -newkey rsa:4096 -keyout nginx/ssl/key.pem -out nginx/ssl/cert.pem -days 365 -nodes \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

4. **Start the services**
```bash
# Production
docker-compose up -d

# Development with hot reload
docker-compose -f docker-compose.dev.yml up
```

### Option 2: Local Development

1. **Install dependencies**
```bash
npm install
```

2. **Set up database**
```bash
# Start PostgreSQL with Docker
docker run -d --name postgres \
  -e POSTGRES_DB=tiktok_middleware \
  -e POSTGRES_USER=dev \
  -e POSTGRES_PASSWORD=devpass \
  -p 5432:5432 postgres:15-alpine
```

3. **Configure environment**
```bash
cp .env.example .env
# Update DATABASE_URL and other settings
```

4. **Run the application**
```bash
# Development with hot reload
npm run dev

# Production build
npm run build
npm start
```

## 🔑 TikTok API Setup

1. **Create TikTok Developer Account**
   - Visit [TikTok Developer Portal](https://developers.tiktok.com/)
   - Create a new app

2. **Get API Credentials**
   - Note your Client ID, Client Secret, and App ID from the developer portal

3. **Update Environment Variables**
```bash
TIKTOK_CLIENT_ID=your-client-id
TIKTOK_CLIENT_SECRET=your-client-secret
TIKTOK_APP_ID=your-app-id
```

**Note**: This implementation uses server-side credential management. TikTok account tokens must be configured manually in the application or obtained through external OAuth flows.

## 📚 API Documentation

### Authentication

The service supports multiple authentication methods:
- **JWT Authentication**: For programmatic access (optional for main endpoints)
- **Admin API Key**: For administrative operations
- **No Authentication**: Most endpoints work without authentication

#### Generating a JWT Token

For programmatic access, you can generate a JWT token:

```bash
# Using Node.js (install jsonwebtoken: npm install jsonwebtoken)
node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { sub: 'user123', iat: Math.floor(Date.now() / 1000) },
  'your-jwt-secret-from-env',
  { expiresIn: '1h' }
);
console.log('JWT Token:', token);
"
```

Or use [jwt.io](https://jwt.io) with your JWT_SECRET to create tokens manually.

### Core Endpoints

#### POST `/api/create-carousel`
Create a TikTok carousel post with images.

**Headers:**
```
Content-Type: multipart/form-data
Authorization: Bearer <jwt-token> (optional)
```

**Body (Multipart):**
```
caption: "Your post caption #hashtags"
tags: ["tag1", "tag2"]
post_as_draft: false
tiktok_account_id: "account123"
sync: true
files: [image1.jpg, image2.jpg, ...]
```

**Body (JSON with Base64):**
```json
{
  "caption": "Your post caption #hashtags",
  "tags": ["tag1", "tag2"],
  "post_as_draft": false,
  "tiktok_account_id": "account123",
  "sync": true,
  "image_base64": [
    "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
  ]
}
```

**Response (Sync):**
```json
{
  "success": true,
  "tiktok_post_id": "post123",
  "details": {
    "media_count": 3,
    "post_url": "https://tiktok.com/@user/video/123",
    "draft": false
  }
}
```

**Response (Async):**
```json
{
  "success": true,
  "job_id": "job_1634567890_abc123",
  "details": {
    "media_count": 3
  }
}
```

#### GET `/api/jobs/{job_id}`
Check the status of an async job.

**Response:**
```json
{
  "job_id": "job_1634567890_abc123",
  "status": "completed",
  "progress": 100,
  "created_at": "2023-10-18T10:30:00Z",
  "updated_at": "2023-10-18T10:35:00Z",
  "details": {
    "tiktok_post_id": "post123",
    "post_url": "https://tiktok.com/@user/video/123",
    "media_count": 3
  }
}
```

#### GET `/health`
Basic health check.

#### GET `/api/health/detailed`
Detailed system health (requires admin auth).

#### POST `/api/webhook/n8n-upload`
Webhook endpoint for n8n file uploads.

**Headers:**
```
Content-Type: multipart/form-data
```

**Body:**
```
files: [image1.jpg, image2.jpg, ...]
callback_url: "https://n8n.yourdomain.com/webhook/callback"
metadata: {"workflow_id": "123", "execution_id": "456"}
```

## 🔗 n8n Integration

### Webhook Node Configuration

1. **HTTP Request Node** (to create carousel):
```json
{
  "method": "POST",
  "url": "https://your-middleware.com/api/create-carousel",
  "headers": {
    "Authorization": "Bearer YOUR_JWT_TOKEN"
  },
  "body": {
    "caption": "{{ $json.caption }}",
    "tags": {{ $json.tags }},
    "sync": false,
    "image_base64": {{ $json.images }}
  }
}
```

2. **Wait Node** (for async processing):
```json
{
  "resume": "webhook",
  "webhookSuffix": "tiktok-status"
}
```

3. **Webhook Node** (to receive job completion):
```json
{
  "httpMethod": "POST",
  "path": "tiktok-status",
  "responseMode": "onReceived"
}
```

### Example n8n Workflow

```json
{
  "nodes": [
    {
      "name": "Trigger",
      "type": "n8n-nodes-base.trigger",
      "position": [240, 300]
    },
    {
      "name": "Prepare Images",
      "type": "n8n-nodes-base.code",
      "position": [460, 300],
      "parameters": {
        "code": "// Convert images to base64 or prepare file uploads\nreturn items.map(item => ({ ...item, processed: true }));"
      }
    },
    {
      "name": "Create TikTok Carousel",
      "type": "n8n-nodes-base.httpRequest",
      "position": [680, 300],
      "parameters": {
        "method": "POST",
        "url": "https://your-middleware.com/api/create-carousel",
        "headers": {
          "Authorization": "Bearer {{ $env.TIKTOK_JWT_TOKEN }}"
        },
        "body": {
          "caption": "{{ $json.caption }}",
          "tags": ["automated", "n8n"],
          "sync": false
        }
      }
    }
  ]
}
```

## 🛡 Security Features

- **Input Validation**: Joi schemas for all endpoints
- **Rate Limiting**: Configurable per endpoint
- **File Upload Security**: MIME type validation, size limits, path traversal protection
- **CORS**: Configurable origin restrictions
- **Helmet.js**: Security headers
- **JWT Authentication**: Secure token-based auth
- **SQL Injection Protection**: Parameterized queries
- **Path Traversal Prevention**: Sanitized file paths

## 🚦 Monitoring & Logging

### Health Checks
- **Basic**: `GET /health`
- **Detailed**: `GET /api/health/detailed` (admin only)
- **Docker**: Built-in health checks with curl

### Logging
- **Structured logging** with Winston
- **Request/response logging** with correlation IDs
- **Error tracking** with stack traces
- **Security event logging**

### Log Files
```
logs/
├── app.log          # General application logs
├── error.log        # Error-only logs
├── access.log       # HTTP access logs
└── security.log     # Security events
```

## 🔧 Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Environment mode |
| `PORT` | No | `5000` | Server port |
| `HOST` | No | `0.0.0.0` | Server host |
| `TIKTOK_CLIENT_ID` | Yes | - | TikTok app client ID |
| `TIKTOK_CLIENT_SECRET` | Yes | - | TikTok app secret |
| `TIKTOK_APP_ID` | Yes | - | TikTok app ID |
| `TIKTOK_REDIRECT_URI` | No | - | OAuth redirect URI (if implementing OAuth) |
| `TIKTOK_API_BASE_URL` | No | `https://open-api.tiktok.com` | TikTok API base URL |
| `JWT_SECRET` | Yes | - | JWT signing secret (32+ chars) |
| `ADMIN_API_KEY` | Yes | - | Admin API key (16+ chars) |
| `ENCRYPTION_KEY` | Yes | - | AES encryption key (64 hex chars) |
| `DATABASE_URL` | No | - | PostgreSQL connection string |
| `MAX_FILE_SIZE_MB` | No | `60` | Max upload size per file |
| `MAX_FILES_PER_REQUEST` | No | `10` | Max files per request |
| `ALLOWED_MIME_TYPES` | No | `image/jpeg,image/png,image/webp` | Allowed file types |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limit window (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | Rate limit per window |
| `CORS_ORIGINS` | No | `http://localhost:5678` | Allowed CORS origins |
| `TRUST_PROXY` | No | `false` | Trust proxy headers |
| `LOG_LEVEL` | No | `info` | Logging level |
| `LOG_FILE_PATH` | No | `./logs/app.log` | Log file path |
| `JOB_TIMEOUT_MS` | No | `300000` | Job timeout (5 min) |
| `CLEANUP_JOBS_AFTER_HOURS` | No | `24` | Job cleanup interval |

### File Upload Limits
- **Max file size**: 60MB per file
- **Max files**: 10 per request
- **Supported formats**: JPEG, PNG, WebP
- **TikTok carousel limit**: 2-10 images

## 🚀 Deployment

### Production Checklist

- [ ] Update all passwords in `.env`
- [ ] Generate secure JWT_SECRET (32+ characters)
- [ ] Create proper SSL certificates
- [ ] Configure CORS origins
- [ ] Set up log rotation
- [ ] Configure backup for PostgreSQL
- [ ] Set up monitoring/alerting
- [ ] Test all endpoints with production data

### Docker Production

1. **Prepare environment**
```bash
# Create production .env
cp .env.example .env.production
# Update all values for production

# Create SSL certificates
# (use Let's Encrypt or your certificate provider)
```

2. **Deploy**
```bash
# Pull latest images
docker-compose pull

# Start services
docker-compose --env-file .env.production up -d

# Check health
curl -f https://yourdomain.com/api/health
```

### Kubernetes Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tiktok-carousel-middleware
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
        - name: NODE_ENV
          value: "production"
        - name: TIKTOK_CLIENT_ID
          valueFrom:
            secretKeyRef:
              name: tiktok-secrets
              key: client-id
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
```

## 🐛 Troubleshooting

### Common Issues

**1. Health check failures**
```bash
# Check container logs
docker-compose logs app

# Verify database connection
docker-compose logs postgres

# Test endpoints manually
curl -f http://localhost:5000/health
```

**2. TikTok API authentication errors**
- Verify CLIENT_ID and CLIENT_SECRET
- Check redirect URI matches exactly
- Ensure account has proper permissions

**3. File upload errors**
- Check file size limits
- Verify MIME types are allowed
- Ensure sufficient disk space

**4. Database connection issues**
- Verify DATABASE_URL format
- Check PostgreSQL is running
- Ensure database exists

### Debug Mode
```bash
# Enable debug logging
export LOG_LEVEL=debug

# Start with verbose output
docker-compose up --no-daemon
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- **Issues**: Open a GitHub issue
- **Documentation**: Check the `/docs` folder
- **API Spec**: Available at `/api/docs` (when running)

---

Built with ❤️ for the n8n community