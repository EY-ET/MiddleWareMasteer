# SSL Certificate Directory

This directory should contain your SSL certificates for HTTPS.

## Production Setup

For production deployment, you need to provide:
- `cert.pem` - Your SSL certificate
- `key.pem` - Your private key

## Development Setup

For development, you can create self-signed certificates:

```bash
# Generate self-signed certificate for development
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
```

## Let's Encrypt (Recommended for Production)

For automated certificate management in production, consider using:

1. **Certbot with Nginx companion:**
   ```yaml
   # Add to docker-compose.yml
   certbot:
     image: certbot/certbot
     volumes:
       - ./nginx/ssl:/etc/letsencrypt
     command: certonly --webroot --webroot-path=/var/www/certbot --email your-email@domain.com --agree-tos --no-eff-email -d yourdomain.com
   ```

2. **nginx-proxy-companion for automatic SSL:**
   ```yaml
   nginx-proxy:
     image: nginxproxy/nginx-proxy
     # ... configuration
   
   nginx-proxy-companion:
     image: nginxproxy/acme-companion
     # ... configuration for Let's Encrypt
   ```

3. **Manual renewal cron job:**
   ```bash
   # Add to crontab for automatic renewal
   0 12 * * * /usr/bin/certbot renew --quiet && docker-compose exec nginx nginx -s reload
   ```

## Security Notes

- Keep private keys secure and never commit them to version control
- Use strong encryption (RSA 2048+ or ECDSA)
- Set appropriate file permissions (600 for keys, 644 for certificates)
- Monitor certificate expiration dates
- Consider using certificate transparency monitoring