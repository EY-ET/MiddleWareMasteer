# API Documentation

This directory contains comprehensive API documentation for the TikTok Carousel Middleware service.

## Files

### `openapi.yaml`
Complete OpenAPI 3.0.3 specification that includes:
- **All endpoints** with detailed request/response schemas
- **Authentication** schemes (Admin API Key and JWT)
- **Error responses** with examples
- **Rate limiting** and upload constraints
- **Interactive documentation** support

### `postman-collection.json`
Ready-to-import Postman collection featuring:
- **Pre-configured requests** for all endpoints
- **Environment variables** for easy testing
- **Example responses** for common scenarios
- **Auto-extraction** of job IDs from async operations
- **Authentication helpers** with variable substitution

### `API.md`
Human-readable API reference with:
- Detailed endpoint descriptions
- Request/response examples
- Authentication guides
- Error handling patterns

## Usage

### Using OpenAPI Specification

#### Swagger UI (Interactive Documentation)
```bash
# Install swagger-ui-serve globally
npm install -g swagger-ui-serve

# Serve the documentation
swagger-ui-serve docs/openapi.yaml
# Open http://localhost:3000 in your browser
```

#### Generate Client SDKs
```bash
# Install OpenAPI Generator
npm install @openapitools/openapi-generator-cli -g

# Generate JavaScript/TypeScript client
openapi-generator-cli generate -i docs/openapi.yaml -g typescript-axios -o ./client

# Generate Python client
openapi-generator-cli generate -i docs/openapi.yaml -g python -o ./python-client

# Generate other clients (java, csharp, go, php, etc.)
openapi-generator-cli list # See available generators
```

#### Validate API Responses
```bash
# Install swagger-tools
npm install -g swagger-tools

# Validate the OpenAPI spec
swagger-tools validate docs/openapi.yaml
```

### Using Postman Collection

#### Import Collection
1. Open Postman
2. Click **Import** button
3. Select `docs/postman-collection.json`
4. Configure environment variables

#### Environment Variables
Set these variables in your Postman environment:
- `base_url`: Your API base URL (default: `http://localhost:5000`)
- `admin_key`: Your admin API key for protected endpoints
- `jwt_token`: JWT token for optional user authentication (optional)
- `job_id`: Auto-populated from async operation responses

#### Testing Workflow
1. **Start with Health Check**: Test basic connectivity
2. **Create Carousel**: Try different input methods (files, URLs, base64)
3. **Monitor Jobs**: Use async mode and track progress
4. **Test Webhooks**: Upload files via n8n webhook endpoint

## API Quick Reference

### Base URLs
- Development: `http://localhost:5000`
- Production: `https://your-domain.com`

### Authentication
```bash
# Admin endpoints
curl -H "X-Admin-Key: your-admin-key" \
  http://localhost:5000/api/health/detailed

# Optional JWT endpoints
curl -H "Authorization: Bearer your-jwt-token" \
  -d '{"caption":"test","image_urls":["https://example.com/image.jpg"]}' \
  http://localhost:5000/api/create-carousel
```

### Common Operations

#### Create Carousel (Sync)
```bash
curl -X POST http://localhost:5000/api/create-carousel \
  -H "Content-Type: application/json" \
  -d '{
    "caption": "Amazing carousel!",
    "tags": ["travel", "photos"],
    "image_urls": ["https://example.com/image1.jpg", "https://example.com/image2.png"],
    "sync": true
  }'
```

#### Create Carousel (Async)
```bash
# 1. Initiate carousel creation
curl -X POST http://localhost:5000/api/create-carousel \
  -H "Content-Type: application/json" \
  -d '{
    "caption": "Async carousel!",
    "image_urls": ["https://example.com/image.jpg"],
    "sync": false
  }'
# Returns: {"job_id": "job_123456_abc"}

# 2. Check job status
curl http://localhost:5000/api/jobs/job_123456_abc
```

#### Upload Files
```bash
curl -X POST http://localhost:5000/api/create-carousel \
  -F "caption=File upload test!" \
  -F "tags=[\"upload\", \"test\"]" \
  -F "sync=true" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.png"
```

### Error Handling
All endpoints return consistent error responses:
```json
{
  "success": false,
  "error": "Error description",
  "details": {
    "field": "specific_field",
    "received": "invalid_value"
  },
  "timestamp": "2023-09-19T12:00:00.000Z"
}
```

### Rate Limits
- Standard endpoints: 100 requests per 15 minutes
- Upload endpoints: Stricter limits due to processing overhead
- Rate limit headers included in responses:
  ```
  X-RateLimit-Limit: 100
  X-RateLimit-Remaining: 95
  X-RateLimit-Reset: 1695126900
  ```

## Integration Examples

### n8n Workflow Integration
```json
{
  "method": "POST",
  "url": "{{base_url}}/api/create-carousel",
  "headers": {
    "Authorization": "Bearer {{jwt_token}}"
  },
  "body": {
    "caption": "From n8n workflow",
    "image_urls": "{{$json.image_urls}}",
    "callback_url": "{{$json.callback_url}}",
    "sync": false
  }
}
```

### JavaScript/Node.js Client
```javascript
const axios = require('axios');

// Create carousel with error handling
async function createCarousel(images, caption) {
  try {
    const response = await axios.post('http://localhost:5000/api/create-carousel', {
      caption,
      image_urls: images,
      sync: false
    }, {
      headers: {
        'Authorization': 'Bearer ' + process.env.JWT_TOKEN
      }
    });
    
    // Monitor job progress
    const jobId = response.data.job_id;
    return await monitorJob(jobId);
  } catch (error) {
    console.error('Carousel creation failed:', error.response.data);
    throw error;
  }
}

async function monitorJob(jobId) {
  while (true) {
    const status = await axios.get(`http://localhost:5000/api/jobs/${jobId}`);
    
    if (status.data.status === 'completed') {
      return status.data.details.tiktok_post_id;
    } else if (status.data.status === 'failed') {
      throw new Error(status.data.details.error);
    }
    
    // Wait 5 seconds before checking again
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}
```

### Python Client
```python
import requests
import time
import json

def create_carousel(images, caption, base_url="http://localhost:5000"):
    """Create TikTok carousel and wait for completion"""
    
    payload = {
        "caption": caption,
        "image_urls": images,
        "sync": False
    }
    
    # Create carousel
    response = requests.post(f"{base_url}/api/create-carousel", json=payload)
    response.raise_for_status()
    
    job_id = response.json()["job_id"]
    
    # Monitor progress
    while True:
        status_response = requests.get(f"{base_url}/api/jobs/{job_id}")
        status_response.raise_for_status()
        
        job_data = status_response.json()
        
        if job_data["status"] == "completed":
            return job_data["details"]["tiktok_post_id"]
        elif job_data["status"] == "failed":
            raise Exception(f"Job failed: {job_data['details']['error']}")
        
        print(f"Progress: {job_data['progress']}%")
        time.sleep(5)

# Usage
if __name__ == "__main__":
    post_id = create_carousel(
        images=["https://example.com/image1.jpg", "https://example.com/image2.png"],
        caption="My amazing carousel! #travel #photos"
    )
    print(f"Carousel created: {post_id}")
```

## Support

For questions about the API or integration support:
- Check the comprehensive examples in this documentation
- Review error responses for specific guidance
- Test endpoints using the provided Postman collection
- Validate requests against the OpenAPI specification