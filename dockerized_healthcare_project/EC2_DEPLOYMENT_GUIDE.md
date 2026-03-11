# Healthcare Microservices - EC2 Deployment Guide

## 1. ENVIRONMENT VARIABLES & CONFIGURATION CHANGES

### 1.1 docker-compose.yml Changes

**Current (Local):**
```
postgres:
  environment:
    POSTGRES_PASSWORD: password
    POSTGRES_DB: healthcare
```

**For EC2 Production:**
```
postgres:
  environment:
    POSTGRES_PASSWORD: <STRONG_RANDOM_PASSWORD>
    POSTGRES_DB: healthcare
  volumes:
    - postgres_data:/var/lib/postgresql/data
  ports:
    - "5432:5432"  # Only expose if on private subnet
```

### 1.2 Service Configuration Changes

**All Services (.env files or docker-compose env vars):**

| Service | Local | EC2 Production |
|---------|-------|--------|
| `DATABASE_HOST` | `postgres` (Docker DNS) | EC2 Private IP or RDS endpoint |
| `DATABASE_PORT` | `5432` | `5432` |
| `DATABASE_USER` | `postgres` | `postgres` |
| `DATABASE_PASSWORD` | `password` | Generate strong password |
| `NODE_ENV` | `development` | `production` |
| `APP_NAME` | `HealthCareAPI` | `HealthCareAPI-EC2` |
| `LOG_LEVEL` | `debug` | `info` |

### 1.3 API Gateway Configuration

**Local:**
```
api-gateway:
  environment:
    SERVER_PORT: 3000
    APP_NAME: HealthCareAPI
    NODE_ENV: development
```

**EC2 Production:**
```
api-gateway:
  environment:
    SERVER_PORT: 3000
    APP_NAME: HealthCareAPI
    NODE_ENV: production
    ALLOWED_ORIGINS: https://yourdomain.com,https://www.yourdomain.com
    LOG_LEVEL: info
```

### 1.4 Frontend Configuration

**Local:**
```html
const baseUrl = 'http://' + window.location.hostname + ':3000';
```

**EC2 Production:**
```html
const baseUrl = 'https://' + window.location.hostname + '/api';
```
OR
```html
const baseUrl = 'https://api.yourdomain.com';
```

---

## 2. SECURITY GROUPS CONFIGURATION

### 2.1 EC2 Instance Security Group - Inbound Rules

| Protocol | Port | Source | Purpose |
|----------|------|--------|---------|
| TCP | 80 | 0.0.0.0/0 | HTTP traffic to Nginx |
| TCP | 443 | 0.0.0.0/0 | HTTPS/SSL traffic to Nginx |
| TCP | 22 | YOUR_IP/32 | SSH (restrict to your IP) |
| TCP | 3000 | 0.0.0.0/0 | API Gateway (DELETE after Nginx setup) |
| TCP | 8080 | 0.0.0.0/0 | Frontend (DELETE after Nginx setup) |

### 2.2 EC2 Instance Security Group - Outbound Rules

| Protocol | Port | Destination | Purpose |
|----------|------|-------------|---------|
| TCP | 443 | 0.0.0.0/0 | HTTPS for docker pulls |
| TCP | 80 | 0.0.0.0/0 | HTTP for package downloads |
| TCP | 5432 | RDS_SECURITY_GROUP | PostgreSQL (if using RDS) |

### 2.3 Database Security Group (if using RDS)

| Protocol | Port | Source | Purpose |
|----------|------|--------|---------|
| TCP | 5432 | EC2_SECURITY_GROUP | PostgreSQL access from EC2 |

### 2.4 ALB (Application Load Balancer) Security Group

| Protocol | Port | Source | Purpose |
|----------|------|--------|---------|
| TCP | 80 | 0.0.0.0/0 | HTTP redirect to HTTPS |
| TCP | 443 | 0.0.0.0/0 | HTTPS from users |

---

## 3. ROUTING & NETWORKING ARCHITECTURE

### 3.1 DNS & Domain Routing

**Option A: Single Domain with Path-based Routing**
```
Domain: healthcareapp.com

Route 1: https://healthcareapp.com/         → Nginx (port 8080)
Route 2: https://healthcareapp.com/api/*    → API Gateway (port 3000)
Route 3: https://healthcareapp.com/health   → Health check endpoint
```

**Option B: Subdomain-based Routing (Recommended)**
```
Domain 1: https://app.healthcareapp.com     → Nginx Frontend (port 8080)
Domain 2: https://api.healthcareapp.com     → API Gateway (port 3000)

DNS Records:
app   A Record  → ALB IP
api   A Record  → ALB IP
```

### 3.2 Nginx Reverse Proxy Configuration

**Location: /etc/nginx/sites-available/default (or /etc/nginx/conf.d/healthcare.conf)**

```nginx
upstream api_gateway {
    server localhost:3000;
}

upstream frontend {
    server localhost:8080;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}

# HTTPS Frontend
server {
    listen 443 ssl http2;
    server_name app.healthcareapp.com;
    
    ssl_certificate /etc/letsencrypt/live/app.healthcareapp.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.healthcareapp.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# HTTPS API Gateway
server {
    listen 443 ssl http2;
    server_name api.healthcareapp.com;
    
    ssl_certificate /etc/letsencrypt/live/api.healthcareapp.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.healthcareapp.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    location / {
        proxy_pass http://api_gateway;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # For API timeouts
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

### 3.3 API Gateway Routes (Express)

**Location: api-gateway/src/modules/http/server.js**

```javascript
// Current routes that need CORS & HTTPS handling
app.post('/users', createUserHandler);                    // User registration
app.post('/login', loginHandler);                         // User login
app.post('/doctors', authenticateToken, affiliateDoctorHandler);
app.post('/doctors/:id/appointments', authenticateToken, createAppointmentHandler);
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Add for production:
app.use((req, res, next) => {
    // Enforce HTTPS redirect
    if (!req.secure && process.env.NODE_ENV === 'production') {
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
});
```

### 3.4 Frontend Page Routing

**Current routing structure (index.html):**

```
/                        → Shows all sections (register, login, doctor, appointment)
  ├── Register Section
  ├── Login Section
  ├── Doctor Affiliation Section
  └── Appointment Booking Section
```

**Production routing structure (Recommended - SPA with proper pages):**

```
https://app.healthcareapp.com/               → Landing page
https://app.healthcareapp.com/register       → Registration page
https://app.healthcareapp.com/login          → Login page
https://app.healthcareapp.com/dashboard      → Dashboard (after login)
  ├── /dashboard/affiliate-doctor
  ├── /dashboard/book-appointment
  ├── /dashboard/my-appointments
  └── /dashboard/profile

Redirect logic:
- Non-authenticated users → /login
- Authenticated users on /login → /dashboard
```

---

## 4. DATABASE CONFIGURATION

### 4.1 PostgreSQL Options

**Option A: Local PostgreSQL in Docker (Current)**
```yaml
postgres:
  image: postgres:15
  volumes:
    - postgres_data:/var/lib/postgresql/data
```
✅ Good for dev/testing
❌ Not recommended for production

**Option B: AWS RDS (Recommended for Production)**
```yaml
# Remove postgres container from docker-compose
# Set environment variables:
DATABASE_HOST: healthcare-db.cn3xlq5xdjwj.us-east-1.rds.amazonaws.com
DATABASE_PORT: 5432
DATABASE_USER: admin
DATABASE_PASSWORD: <SECRET_IN_SECRETS_MANAGER>
```

**Advantages:**
- Automated backups
- Multi-AZ high availability
- Automatic scaling
- SSL encryption in transit
- Read replicas for performance

### 4.2 Database Backup Strategy

```bash
# Automated daily backups (5 days retention)
0 2 * * * pg_dump -h $DB_HOST -U postgres healthcare | \
          gzip > /backups/healthcare-$(date +\%Y\%m\%d).sql.gz

# Keep backup size manageable - delete after 5 days
0 3 * * * find /backups -name "*.sql.gz" -mtime +5 -delete
```

---

## 5. DOCKER DEPLOYMENT CHANGES

### 5.1 docker-compose.yml Production Version

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    restart: always
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: healthcare
      POSTGRES_PASSWORD: ${DB_PASSWORD}  # Use env file
    networks:
      - healthcare_network
    # Don't expose port 5432 publicly

  api-gateway:
    build: ./api-gateway
    restart: always
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      SERVER_PORT: 3000
      DATABASE_HOST: postgres
      DATABASE_PORT: 5432
      APT_NAME: HealthCareAPI
    depends_on:
      - postgres
    networks:
      - healthcare_network
    logging:
      driver: "awslogs"  # CloudWatch logs
      options:
        awslogs-group: "/ecs/healthcare"
        awslogs-region: "us-east-1"
        awslogs-stream-prefix: "api-gateway"

  user-service:
    build: ./user-service
    restart: always
    environment:
      NODE_ENV: production
      DATABASE_HOST: postgres
    depends_on:
      - postgres
    networks:
      - healthcare_network
    logging:
      driver: "awslogs"

  doctor-service:
    build: ./doctor-service
    restart: always
    environment:
      NODE_ENV: production
      DATABASE_HOST: postgres
    depends_on:
      - postgres
    networks:
      - healthcare_network
    logging:
      driver: "awslogs"

  appointment-service:
    build: ./appointment-service
    restart: always
    environment:
      NODE_ENV: production
      DATABASE_HOST: postgres
    depends_on:
      - postgres
    networks:
      - healthcare_network
    logging:
      driver: "awslogs"

  auth-service:
    build: ./auth-service
    restart: always
    environment:
      NODE_ENV: production
      DATABASE_HOST: postgres
    depends_on:
      - postgres
    networks:
      - healthcare_network
    logging:
      driver: "awslogs"

  frontend:
    build: ./frontend
    restart: always
    ports:
      - "8080:80"
    environment:
      API_URL: https://api.healthcareapp.com
    networks:
      - healthcare_network
    logging:
      driver: "awslogs"

volumes:
  postgres_data:
    driver: local

networks:
  healthcare_network:
    driver: bridge
```

---

## 6. SSL/TLS CERTIFICATES

### 6.1 SSL Certificate Setup (Let's Encrypt)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Generate certificates for both domains
sudo certbot certonly --nginx \
  -d app.healthcareapp.com \
  -d api.healthcareapp.com \
  -d healthcareapp.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

### 6.2 Certificate Locations
```
/etc/letsencrypt/live/app.healthcareapp.com/
├── fullchain.pem
├── privkey.pem
├── cert.pem
└── chain.pem
```

---

## 7. ENVIRONMENT VARIABLES & SECRETS MANAGEMENT

### 7.1 Local .env File (EC2)

**File: /home/ec2-user/.env**

```env
# Database
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=<GENERATE_RANDOM_64_CHAR_PASSWORD>
POSTGRES_PASSWORD=${DATABASE_PASSWORD}

# Security
JWT_SECRET=<GENERATE_RANDOM_64_CHAR_SECRET>
API_KEY=<GENERATE_RANDOM_KEY>
ENCRYPTION_SALT=<GENERATE_RANDOM_SALT>

# Environment
NODE_ENV=production
APP_NAME=HealthCareAPI-Production
LOG_LEVEL=info

# Network
API_GATEWAY_URL=https://api.healthcareapp.com
FRONTEND_URL=https://app.healthcareapp.com
ALLOWED_ORIGINS=https://app.healthcareapp.com,https://www.healthcareapp.com

# Services (for gRPC)
USER_SERVICE_HOST=user-service
USER_SERVICE_PORT=50051
DOCTOR_SERVICE_HOST=doctor-service
DOCTOR_SERVICE_PORT=50051
APPOINTMENT_SERVICE_HOST=appointment-service
APPOINTMENT_SERVICE_PORT=50051
AUTH_SERVICE_HOST=auth-service
AUTH_SERVICE_PORT=50051
```

### 7.2 Using AWS Secrets Manager (Recommended)

```bash
aws secretsmanager create-secret \
  --name healthcareapp/db-password \
  --secret-string "$(openssl rand -base64 32)"

aws secretsmanager create-secret \
  --name healthcareapp/jwt-secret \
  --secret-string "$(openssl rand -base64 64)"
```

---

## 8. MONITORING & LOGGING

### 8.1 CloudWatch Logging

```bash
# Create log group
aws logs create-log-group --log-group-name /healthcare/api-gateway
aws logs create-log-group --log-group-name /healthcare/user-service
aws logs create-log-group --log-group-name /healthcare/doctor-service
aws logs create-log-group --log-group-name /healthcare/appointment-service

# Set retention to 30 days
aws logs put-retention-policy \
  --log-group-name /healthcare/api-gateway \
  --retention-in-days 30
```

### 8.2 Health Checks

```
API Gateway:  GET https://api.healthcareapp.com/health
Expected:     { "status": "ok" }
Timeout:      5 seconds
Interval:     30 seconds
Unhealthy:    3 consecutive failures
```

### 8.3 Alerts (CloudWatch Alarms)

```
- CPU Utilization > 80%
- Memory Usage > 85%
- Disk Space < 10%
- API Response Time > 2 seconds
- Error Rate > 5%
- Service Restart Count > 2 in 5 min
```

---

## 9. SCALING & PERFORMANCE

### 9.1 Recommended EC2 Instance Types

| Use Case | Instance | vCPU | RAM | Cost/Month |
|----------|----------|------|-----|-----------|
| Dev/Test | t3.small | 2 | 2GB | ~$15 |
| Small Production | t3.medium | 2 | 4GB | ~$30 |
| Medium Production | t3.large | 2 | 8GB | ~$60 |
| High Load | t3.xlarge | 4 | 16GB | ~$120 |

### 9.2 Database Scaling

```
RDS Instance Options:
- db.t3.micro (dev/test)
- db.t3.small (medium load)
- db.t3.medium (heavy load with multi-AZ)
- db.t3.large (ERP systems, if needed)

Read Replicas:
- Create cross-region replica for disaster recovery
- Use local replica for read-heavy operations
```

### 9.3 Caching with Redis (Optional)

```yaml
redis:
  image: redis:7-alpine
  restart: always
  ports:
    - "6379:6379"
  networks:
    - healthcare_network
  volumes:
    - redis_data:/data

# Use for:
# - Session caching
# - API response caching
# - Rate limiting
```

---

## 10. SECURITY BEST PRACTICES

### 10.1 CORS Configuration

```javascript
// In api-gateway/src/modules/http/server.js
const allowedOrigins = [
  'https://app.healthcareapp.com',
  'https://www.healthcareapp.com'
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

### 10.2 Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});

app.use('/api/', limiter);
app.use('/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 5 })); // Stricter for login
```

### 10.3 HTTPS/TLS Enforcement

```javascript
// In EC2, force HTTPS
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && !req.secure) {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});
```

### 10.4 Input Validation & Sanitization

```javascript
// Validate all inputs
const { body, validationResult } = require('express-validator');

app.post('/users', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('name').trim().escape()
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // Continue with signup
});
```

### 10.5 IAM Roles for EC2

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    },
    {
      "Effect": "Allow",
      "Action": "secretsmanager:GetSecretValue",
      "Resource": "arn:aws:secretsmanager:*:*:secret:healthcareapp/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ecr:GetAuthorizationToken",
        "ecr:BatchGetImage",
        "ecr:GetDownloadUrlForLayer"
      ],
      "Resource": "*"
    }
  ]
}
```

---

## 11. DEPLOYMENT CHECKLIST

- [ ] Acquire domain name (Route 53 or external)
- [ ] Create EC2 instance (t3.medium or larger)
- [ ] Configure security groups (HTTP/HTTPS/SSH)
- [ ] Install Docker and Docker Compose
- [ ] Set up RDS PostgreSQL or local postgres container
- [ ] Generate SSL certificates (Let's Encrypt)
- [ ] Install and configure Nginx as reverse proxy
- [ ] Create .env file with production secrets
- [ ] Update docker-compose.yml for production
- [ ] Update frontend API endpoint in index.html
- [ ] Build and push Docker images to ECR (optional)
- [ ] Update API Gateway CORS/security headers
- [ ] Set up CloudWatch logging
- [ ] Configure Route 53 DNS records
- [ ] Run docker-compose up -d
- [ ] Test all endpoints (register, login, doctor, appointment)
- [ ] Run security check (SSL Labs, OWASP)
- [ ] Set up monitoring and alerting
- [ ] Create backup strategy
- [ ] Document runbook for team

---

## 12. POST-DEPLOYMENT MAINTENANCE

### 12.1 Regular Tasks

```bash
# Weekly
docker system prune -a  # Remove unused images

# Monthly
certbot renew --dry-run  # Test certificate renewal
pg_dump backup            # Manual database backup

# Quarterly
Security audit
Performance review
Cost optimization
```

### 12.2 Common Commands

```bash
# View logs
docker logs -f api-gateway

# Restart service
docker restart healthcare-api-gateway-1

# Full restart
docker-compose down && docker-compose up -d

# Database backup
docker exec postgres pg_dump -U postgres healthcare | gzip > backup.sql.gz

# SSH into EC2
ssh -i "your-key.pem" ec2-user@your-ec2-ip
```

---

## 13. COST ESTIMATION (AWS)

| Resource | Type | Estimated Monthly Cost |
|----------|------|----------------------|
| EC2 t3.medium | On-demand | $30 |
| RDS db.t3.small | PostgreSQL | $30 |
| EBS Volume (30GB) | Storage | $3 |
| Data Transfer | Outbound | $0.09/GB |
| Route 53 | DNS | $0.50 |
| CloudWatch Logs | 5GB/month | $2.50 |
| **TOTAL** | | ~**$100-150/month** |

---

## NEXT STEPS

1. **Review** this document with your DevOps/infrastructure team
2. **Plan** AWS infrastructure (VPC, subnets, security groups)
3. **Prepare** domain name and DNS configuration
4. **Set up** EC2 instance with required specs
5. **Configure** environment variables and secrets
6. **Deploy** using provided docker-compose production version
7. **Test** all endpoints thoroughly
8. **Monitor** and iterate based on performance

