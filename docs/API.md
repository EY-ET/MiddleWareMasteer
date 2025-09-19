# API Documentation

## Overview

The TikTok Carousel Middleware provides a RESTful API for creating TikTok carousel posts from n8n workflows. This document covers all available endpoints, authentication methods, and integration examples.

## Base URL

```
https://your-domain.com/api
```

**Note**: All API endpoints are prefixed with `/api` except the basic health check which is available at `/health`.

## Authentication

### JWT Authentication (Recommended)
Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Admin API Key
For administrative endpoints, use the admin API key:

```
X-Admin-Key: <your-admin-api-key>
```

### No Authentication
Some endpoints like health checks work without authentication.

## Endpoints

### Core Endpoints

#### POST /create-carousel

Create a TikTok carousel post with 2-10 images.

**Authentication:** Optional JWT
**Rate Limit:** 2 requests/second
**Content-Type:** 
- `multipart/form-data` (for file uploads)
- `application/json` (for base64/URL images)

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `caption` | string | No | Post caption (max 2200 chars) |
| `tags` | string[] | No | Array of hashtags (without #) |
| `post_as_draft` | boolean | No | Save as draft (default: false) |
| `tiktok_account_id` | string | No | Account ID (default: "default") |
| `sync` | boolean | No | Process synchronously (default: true) |

**Image Input Methods:**

1. **Multipart Files**
```
Content-Type: multipart/form-data

images: [File, File, ...]  // 2-10 image files
```

2. **Base64 Images**
```json
{
  "image_base64": [
    "data:image/jpeg;base64,/9j/4AAQSkZJRg...",
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
  ]
}
```

3. **Image URLs**
```json
{
  "image_urls": [
    "https://example.com/image1.jpg",
    "https://example.com/image2.png"
  ]
}
```

**Response (Synchronous):**
```json
{
  "success": true,
  "tiktok_post_id": "7123456789012345678",
  "details": {
    "media_count": 3,
    "post_url": "https://www.tiktok.com/@username/photo/7123456789012345678",
    "draft": false
  }
}
```

**Response (Asynchronous):**
```json
{
  "success": true,
  "job_id": "job_1697654321_abc123def",
  "details": {
    "media_count": 3
  }
}
```

**Example cURL:**
```bash
# Multipart file upload (sync)
curl -X POST "https://api.example.com/api/create-carousel" \
  -H "Authorization: Bearer your-jwt-token" \
  -F "caption=Beautiful sunset photos #nature #photography" \
  -F "tags=nature,photography,sunset" \
  -F "sync=true" \
  -F "images=@image1.jpg" \
  -F "images=@image2.jpg" \
  -F "images=@image3.jpg"

# Base64 images (async)
curl -X POST "https://api.example.com/api/create-carousel" \
  -H "Authorization: Bearer your-jwt-token" \
  -H "Content-Type: application/json" \
  -d '{
    "caption": "Amazing artwork collection #art #digital",
    "tags": ["art", "digital", "creative"],
    "sync": false,
    "image_base64": [
      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...",
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
    ]
  }'
```

---

### Job Management

#### GET /jobs/{job_id}

Get the status of an asynchronous job.

**Authentication:** None required
**Parameters:** None

**Response:**
```json
{
  "job_id": "job_1697654321_abc123def",
  "status": "completed", // pending | processing | completed | failed
  "progress": 100,       // 0-100
  "created_at": "2023-10-18T14:32:01.000Z",
  "updated_at": "2023-10-18T14:33:45.000Z",
  "details": {
    "tiktok_post_id": "7123456789012345678",
    "post_url": "https://www.tiktok.com/@username/photo/7123456789012345678",
    "media_count": 3,
    "draft": false
  }
}
```

**Status Values:**
- `pending`: Job created, waiting to start
- `processing`: Job is currently running
- `completed`: Job finished successfully
- `failed`: Job encountered an error

**Example:**
```bash
curl -X GET "https://api.example.com/api/jobs/job_1697654321_abc123def"
```

#### GET /jobs

List all jobs with pagination.

**Authentication:** None required
**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 10 | Items per page (max 100) |
| `status` | string | - | Filter by status |

**Response:**
```json
{
  "jobs": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "pages": 0
  },
  "message": "Job listing requires persistent storage implementation"
}
```

**Note**: The current implementation uses in-memory job storage. For production deployments with persistent job tracking, this endpoint would return actual job data from the database.

#### DELETE /jobs/{job_id}

Cancel a running job.

**Authentication:** Admin API Key required
**Response:**
```json
{
  "success": true,
  "message": "Job cancelled successfully",
  "job_id": "job_1697654321_abc123def",
  "status": "failed"
}
```

---

### Health & Monitoring

#### GET /health

Basic health check for load balancers and monitoring. **Note**: This endpoint is at the root level, not under `/api`.

**URL**: `https://your-domain.com/health` (not `/api/health`)
**Authentication:** None required
**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2023-10-18T14:30:00.000Z",
  "version": "1.0.0",
  "uptime": 86400,
  "tiktok_api_status": "connected"
}
```

**TikTok API Status Values:**
- `connected`: Successfully authenticated with TikTok API
- `disconnected`: No credentials configured
- `error`: Authentication or API error

#### GET /health/detailed

Comprehensive system health information.

**URL**: `https://your-domain.com/api/health/detailed` 
**Authentication:** Admin API Key required
**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2023-10-18T14:30:00.000Z",
  "details": {
    "service": "tiktok-carousel-middleware",
    "version": "1.0.0",
    "uptime": 86400,
    "environment": "production",
    "node_version": "v20.5.0",
    "memory": {
      "rss": 45678592,
      "heapTotal": 26734592,
      "heapUsed": 18956544,
      "external": 1848320,
      "arrayBuffers": 1048576
    },
    "system": {
      "platform": "linux",
      "arch": "x64",
      "cpu_count": 4,
      "load_average": [0.1, 0.2, 0.15],
      "free_memory": 2048576000,
      "total_memory": 8589934592
    },
    "tiktok": {
      "api_base_url": "https://open-api.tiktok.com",
      "accounts_configured": 2,
      "accounts": [
        {
          "id": "default",
          "has_credentials": true
        },
        {
          "id": "business",
          "has_credentials": false
        }
      ]
    },
    "configuration": {
      "port": 5000,
      "host": "0.0.0.0",
      "max_file_size": "60MB",
      "max_files_per_request": 10,
      "allowed_mime_types": ["image/jpeg", "image/png", "image/webp"],
      "rate_limit": {
        "window_ms": 900000,
        "max_requests": 100
      },
      "cors_origins": ["https://yourdomain.com"],
      "log_level": "info"
    }
  }
}
```

---

### Webhook Endpoints

#### POST /webhook/n8n-upload

Webhook endpoint for n8n file uploads and processing.

**Authentication:** None required
**Content-Type:** `multipart/form-data`
**Rate Limit:** 2 requests/second

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `images` | File[] | Yes | Image files to upload (2-10 files) |
| `callback_url` | string | No | URL to call when processing completes |
| `metadata` | object | No | Additional data to store with job |

**Response:**
```json
{
  "job_id": "job_1697654321_def456ghi",
  "status_url": "/api/jobs/job_1697654321_def456ghi",
  "upload_id": "upload_1697654321_xyz789abc"
}
```

**Callback Payload:**
When processing completes, the callback URL receives:
```json
{
  "job_id": "job_1697654321_def456ghi",
  "status": "completed",
  "timestamp": "2023-10-18T14:35:00.000Z",
  "data": {
    "processed_files": 3,
    "status_url": "/api/jobs/job_1697654321_def456ghi"
  }
}
```

**Example:**
```bash
curl -X POST "https://api.example.com/api/webhook/n8n-upload" \
  -F "images=@photo1.jpg" \
  -F "images=@photo2.png" \
  -F "images=@photo3.webp" \
  -F "callback_url=https://n8n.example.com/webhook/tiktok-callback" \
  -F "metadata={\"workflow_id\":\"123\",\"execution_id\":\"456\"}"
```

#### POST /verify-domain-callback

Domain verification endpoint for TikTok API setup.

**Authentication:** Admin API Key required
**Response:**
```json
{
  "success": true,
  "message": "Domain verification endpoint",
  "token": "verification-token",
  "timestamp": "2023-10-18T14:30:00.000Z"
}
```

---

## Error Handling

All endpoints return standardized error responses:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input provided",
    "details": {
      "field": "caption",
      "issue": "Caption exceeds maximum length of 2200 characters"
    },
    "timestamp": "2023-10-18T14:30:00.000Z"
  }
}
```

### HTTP Status Codes

| Status | Description |
|--------|-------------|
| 200 | Success |
| 201 | Created |
| 202 | Accepted (for async operations) |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 413 | Payload Too Large |
| 422 | Unprocessable Entity |
| 429 | Too Many Requests |
| 500 | Internal Server Error |
| 502 | Bad Gateway |
| 503 | Service Unavailable |

### Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Invalid input data |
| `AUTHENTICATION_ERROR` | Auth token invalid/missing |
| `AUTHORIZATION_ERROR` | Insufficient permissions |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `FILE_TOO_LARGE` | File size exceeds limit |
| `UNSUPPORTED_FILE_TYPE` | Invalid MIME type |
| `TIKTOK_API_ERROR` | TikTok API returned error |
| `NETWORK_ERROR` | External service unavailable |
| `PROCESSING_ERROR` | Job processing failed |
| `NOT_FOUND` | Resource not found |

## Rate Limiting

Rate limits are applied per IP address:

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/create-carousel` | 2 requests | 1 second |
| `/webhook/*` | 2 requests | 1 second |
| All other endpoints | 10 requests | 1 second |

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 99
X-RateLimit-Reset: 1697654400
```

## File Upload Specifications

### Supported Image Types
- **JPEG** (.jpg, .jpeg)
- **PNG** (.png)
- **WebP** (.webp)

### File Size Limits
- **Per file**: 60MB maximum
- **Total request**: 60MB maximum
- **File count**: 2-10 files per carousel

### Image Requirements
- **Minimum dimensions**: 480x480 pixels
- **Maximum dimensions**: 4096x4096 pixels
- **Aspect ratio**: 1:1 (square) recommended
- **Color space**: RGB

## Integration Examples

### n8n Workflow Node

```json
{
  "name": "Create TikTok Carousel",
  "type": "n8n-nodes-base.httpRequest",
  "parameters": {
    "method": "POST",
    "url": "https://your-api.com/api/create-carousel",
    "headers": {
      "Authorization": "Bearer {{ $env.TIKTOK_JWT_TOKEN }}"
    },
    "contentType": "json",
    "body": {
      "caption": "{{ $json.caption }}",
      "tags": {{ $json.tags }},
      "sync": false,
      "image_base64": {{ $json.images }}
    }
  }
}
```

### JavaScript Client

```javascript
class TikTokCarouselClient {
  constructor(apiUrl, jwtToken) {
    this.apiUrl = apiUrl;
    this.jwtToken = jwtToken;
  }

  async createCarousel({ images, caption, tags, sync = true }) {
    const response = await fetch(`${this.apiUrl}/api/create-carousel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.jwtToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_base64: images,
        caption,
        tags,
        sync
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }

  async getJobStatus(jobId) {
    const response = await fetch(`${this.apiUrl}/api/jobs/${jobId}`);
    return response.json();
  }

  async waitForJob(jobId, timeout = 300000) {
    const start = Date.now();
    
    while (Date.now() - start < timeout) {
      const job = await this.getJobStatus(jobId);
      
      if (job.status === 'completed') {
        return job;
      } else if (job.status === 'failed') {
        throw new Error(`Job failed: ${job.details?.error || 'Unknown error'}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    throw new Error('Job timeout');
  }
}

// Usage
const client = new TikTokCarouselClient('https://api.example.com', 'your-jwt-token');

const result = await client.createCarousel({
  images: ['data:image/jpeg;base64,...', 'data:image/png;base64,...'],
  caption: 'My awesome carousel #nature #photography',
  tags: ['nature', 'photography'],
  sync: false
});

if (result.job_id) {
  const completedJob = await client.waitForJob(result.job_id);
  console.log('Carousel created:', completedJob.details.post_url);
} else {
  console.log('Carousel created:', result.details.post_url);
}
```

## Security Considerations

1. **Always use HTTPS** in production
2. **Validate JWT tokens** are not expired
3. **Implement proper CORS** settings
4. **Monitor rate limits** and implement backoff
5. **Sanitize file uploads** and validate MIME types
6. **Use environment variables** for sensitive data
7. **Enable request logging** for audit trails

For more examples and integration guides, see the main README.md file.