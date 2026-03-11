# Healthcare App - Production Deployment Changes Summary

## Overview
This document summarizes all changes made to prepare the Healthcare microservices application for production deployment on AWS EC2 Ubuntu instance.

## Files Modified

### 1. Docker Configuration

#### docker-compose.yml (Updated for Production)
**Changes:**
- Removed `volumes` from all services (hot-reload removed)
- Removed `links` (deprecated, using network DNS instead)
- Removed hardcoded IPv4 address (`http://13.201.25.15/`) from hostnames
- Added `restart: always` to all services
- Changed `NODE_ENV` from `development` to `production` in all services
- Added environment variable substitution for sensitive data
- Added `logging` configuration with json-file driver and max-size limits (10m)
- Added `LOG_LEVEL=info` to all services
- Added health checks to database and API gateway
- Added `expose` instead of hardcoded port mappings for internal services
- Updated database environment variables to use .env substitution
- Optimized DynamoDB configuration

**Key Updates:**
- API Gateway: `NODE_ENV=production`, added `ALLOWED_ORIGINS` variable
- Auth Service: Optimized DynamoDB settings, added `LOG_LEVEL`
- User Service: Added `LOG_LEVEL`, simplified configuration
- Doctor Service: Added `LOG_LEVEL`, removed hostname hardcoding
- Appointment Service: Added `LOG_LEVEL`, proper env variable substitution
- PostgreSQL: Data persistence with volume, proper user/password handling
- Frontend: Environment variable for API URL, removed dev volumes

#### docker-compose.prod.yml (New - Production Compose File)
**Features:**
- Complete production-optimized configuration
- Includes Nginx reverse proxy service
- Health checks for all critical services
- Proper service dependencies
- Volume persistence for database and certificates
- CloudWatch-compatible logging
- No development-related volumes or configurations

### 2. Environment Configuration

#### .env.example (New - Production Environment Template)
**Contents:**
- Database configuration placeholders
- Security variables (JWT, API Keys, encryption salts)
- Application environment settings
- Network and domain settings
- DynamoDB configuration
- gRPC service host/port mappings
- Session duration settings
- AWS integration options
- Monitoring and logging configuration

**Usage:** Copy to `.env` and fill in actual values

#### Service Environment Files (Updated)

**api-gateway/config/development.env:**
- `APP_NAME`: "ApiGateway" → "HealthCareAPI"
- `NODE_ENV`: "development" → "production"
- Added `LOG_LEVEL=info`
- Added `ALLOWED_ORIGINS` variable
- Changed hardcoded values to env variable substitution

**user-service/config/development.env:**
- `NODE_ENV`: "development" → "production"
- Added `LOG_LEVEL=info`
- Environment variable substitution for database

**auth-service/config/development.env:**
- `NODE_ENV`: "development" → "production"
- Added `LOG_LEVEL=info`
- Updated DynamoDB settings (increased timeouts, reduced retries)
- Changed from local/test credentials to variable substitution

**doctor-service/config/development.env:**
- `NODE_ENV`: "development" → "production"
- Added `LOG_LEVEL=info`
- Environment variable substitution

**appointment-service/config/development.env:**
- `NODE_ENV`: "development" → "production"
- Added `LOG_LEVEL=info`
- Environment variable substitution

### 3. API Gateway Security

#### api-gateway/src/modules/http/server.js (Updated)
**Major Changes:**
1. **CORS Configuration:**
   - Removed open CORS `cors()`
   - Implemented whitelist-based CORS with `ALLOWED_ORIGINS` env variable
   - Added credentials support
   - Configured allowed methods and headers
   - Set max age for preflight requests

2. **Security Headers (Helmet):**
   - Enhanced with Content-Security-Policy directives
   - Configured HSTS (HTTP Strict Transport Security)
   - Added preload support

3. **HTTPS Enforcement:**
   - Added middleware to redirect HTTP to HTTPS in production
   - Checks `X-Forwarded-Proto` header for load balancer scenarios

4. **Rate Limiting Ready:**
   - Structure allows easy addition of rate limiting middleware

### 4. Frontend Updates

#### frontend/public/index.html
**API Endpoint Change:**
- **Old:** `const baseUrl = 'http://' + window.location.hostname + ':3000';`
- **New:** Smart protocol detection and domain-based routing:
  ```javascript
  const baseUrl = window.location.protocol === 'https:' 
    ? 'https://' + window.location.host.replace('app.', 'api.')
    : 'http://' + window.location.hostname + ':3000';
  ```
- Supports both development (localhost:3000) and production (https://api.domain.com)

### 5. Nginx Reverse Proxy

#### nginx/nginx.conf (New)
**Configuration:**
- HTTP to HTTPS automatic redirect
- Separate upstream definitions for API gateway and frontend
- TLS/SSL configuration for both services
- Security headers (HSTS, X-Frame-Options, X-Content-Type-Options, etc.)
- Gzip compression enabled
- Rate limiting configuration (API: 100 req/s, Login: 5 req/min)
- Proper header forwarding to backend services
- Health check endpoints
- SSL session caching
- Performance optimizations (buffering, timeouts)

**Virtual Hosts:**
- `app.yourdomain.com` → Frontend (port 8080)
- `api.yourdomain.com` → API Gateway (port 3000)
- Automatic HTTP → HTTPS redirect for all traffic

#### nginx/Dockerfile (New)
- Alpine Linux base for minimal image size
- Custom nginx configuration mounting
- Health check configured
- Proper signal handling for graceful shutdown

### 6. Deployment Scripts

*The helper scripts (`deploy.sh`, `healthcheck.sh`, `restart.sh`) that were originally
introduced for managing a `docker-compose.prod.yml` stack have been removed from the
repository.  A production compose file (`docker-compose.prod.yml`) is not shipped, and
deployment is now performed directly with the `docker-compose_ec2.yml` file or via the
instructions contained in the EC2 deployment guide.*

### 7. Configuration Files

### 7. Configuration Files

#### .gitignore (Updated)
**Added Entries:**
- `.env` and environment files
- Certificates (*.pem, *.key, *.crt)
- Logs and backups
- Sensitive files and directories

### 8. Documentation

#### DEPLOYMENT_INSTRUCTIONS.md (New)
**Contents:**
- Pre-deployment checklist
- Step-by-step EC2 setup instructions
- System dependency installation
- Environment configuration guide
- SSL/TLS certificate setup with Let's Encrypt
- DNS configuration (Route 53 & external providers)
- Nginx SSL setup
- Systemd service configuration
- Backup and recovery procedures
- Troubleshooting guide
- Performance optimization tips
- Production checklist

## Key Changes Summary

| Component | Development | Production |
|-----------|-------------|-----------|
| NODE_ENV | development | production |
| CORS | Open | Whitelist-based |
| Volumes | Hot-reload enabled | Removed |
| Restart Policy | None | Always |
| Logging | stdout | json-file with size limits |
| SSL/TLS | None | Let's Encrypt with Nginx |
| Database | Local postgres | Docker with persistence |
| Reverse Proxy | None | Nginx with rate limiting |
| Health Checks | None | Implemented |
| Secrets | Hardcoded | Environment variables |

## Environment Variables Required

### Critical (Must Set)
```
DATABASE_PASSWORD=<STRONG_PASSWORD_MIN_32_CHARS>
ALLOWED_ORIGINS=https://app.yourdomain.com,https://www.yourdomain.com
```

### Recommended (Security)
```
JWT_SECRET=<RANDOM_64_CHARS>
API_KEY=<RANDOM_KEY>
ENCRYPTION_SALT=<RANDOM_SALT>
```

### Optional (AWS Integration)
```
DYNAMO_AWS_ACCESS_KEY_ID=<AWS_KEY>
DYNAMO_AWS_SECRET_ACCESS_KEY=<AWS_SECRET>
```

## Deployment Architecture

```
┌─────────────────────────────────────────────┐
│         EC2 Instance (Ubuntu 20.04)         │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐  │
│  │   Nginx Reverse Proxy               │  │
│  │  - HTTPS/SSL Termination            │  │
│  │  - Rate Limiting                    │  │
│  │  - Security Headers                 │  │
│  │  - Load Balancing                   │  │
│  └─────────────────────────────────────┘  │
│           ↓                ↓                │
│  ┌──────────────────┐  ┌──────────────┐   │
│  │ API Gateway      │  │  Frontend    │   │
│  │ Port: 3000       │  │  Port: 8080  │   │
│  └──────────────────┘  └──────────────┘   │
│           ↓                                │
│  ┌──────────────────────────────────────┐ │
│  │     Microservices Network             │ │
│  │  - User Service (gRPC:50051)         │ │
│  │  - Auth Service (gRPC:50051)         │ │
│  │  - Doctor Service (gRPC:50051)       │ │
│  │  - Appointment Service (gRPC:50051)  │ │
│  │  - DynamoDB Local                    │ │
│  └──────────────────────────────────────┘ │
│           ↓                                │
│  ┌──────────────────────────────────────┐ │
│  │  PostgreSQL Database                 │ │
│  │  - Data Persistence Volume           │ │
│  │  - Multi-database Support            │ │
│  └──────────────────────────────────────┘ │
│                                             │
└─────────────────────────────────────────────┘
```

## SSL/TLS Certificate Setup

The application uses Let's Encrypt for SSL certificates:

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificates
sudo certbot certonly --standalone \
  -d api.yourdomain.com \
  -d app.yourdomain.com

# Auto-renewal enabled via systemd timer
sudo systemctl enable certbot.timer
```

## Database Persistence

- PostgreSQL data stored in Docker volume `postgres_data`
- Automatic backups can be scheduled via cron
- Recovery procedures documented in DEPLOYMENT_INSTRUCTIONS.md

## Monitoring & Logging

- Container logs limited to 10MB max-size, 3 files retained
- Health checks configured for critical services
- Log rotation via json-file driver
- Application logs available via `docker logs` command

## Security Enhancements

1. **Network Security:**
   - Removed public port exposure for gRPC services
   - Only Nginx and essential ports exposed
   - Nginx rate limiting (API: 100 req/s, Login: 5 req/min)

2. **Application Security:**
   - HTTPS/TLS only in production
   - HSTS with preload support
   - Content Security Policy headers
   - X-Frame-Options prevention
   - CORS whitelist enforcement

3. **Secrets Management:**
   - Environment variables for all sensitive data
   - .gitignore prevents accidental commits

## Next Steps

1. Copy `.env.example` to `.env` and configure
2. Deploy the stack using the EC2 compose file, e.g.: 
   ```bash
   docker-compose -f docker-compose_ec2.yml up -d --build
   ```
3. Configure DNS records
4. Set up SSL certificates with Let's Encrypt
5. Monitor logs: `docker-compose -f docker-compose_ec2.yml logs -f`


## Rollback Procedure

```bash
# To rollback to previous version:
git checkout <previous-commit>
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

---

**All changes are backward compatible with existing development setup.**
**Use `docker-compose up -d` for development.**
**Use `docker-compose -f docker-compose.prod.yml up -d` for production.**
