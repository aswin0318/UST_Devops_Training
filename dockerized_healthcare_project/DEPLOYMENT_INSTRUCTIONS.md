# Healthcare App - EC2 Ubuntu Deployment Instructions

## Pre-Deployment Checklist

- [ ] EC2 Instance running Ubuntu 20.04 LTS or later (t3.medium or larger)
- [ ] Security groups configured (80, 443, 22, 3000, 8080, 5432)
- [ ] Domain name purchased and available
- [ ] Route 53 or external DNS provider ready
- [ ] SSH key pair downloaded and secured

## Step 1: Connect to EC2 Instance

```bash
# SSH into your EC2 instance
ssh -i "your-key.pem" ec2-user@YOUR_EC2_PUBLIC_IP

# Or if using Ubuntu AMI:
ssh -i "your-key.pem" ubuntu@YOUR_EC2_PUBLIC_IP
```

## Step 2: Update System & Install Dependencies

```bash
# Update system packages
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version

# Install Certbot and Nginx plugin
sudo apt-get install -y certbot python3-certbot-nginx

# Install Git (if not already installed)
sudo apt-get install -y git
```

## Step 3: Clone Application Repository

```bash
# Navigate to your preferred directory
cd /home/ubuntu

# Clone the repository
git clone <your-repo-url> healthcare
cd healthcare

# Check out the latest production branch
git checkout main  # or your production branch
```

## Step 4: Configure Environment Variables

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your actual values
nano .env
```

**Important values to update in .env:**
- `DATABASE_PASSWORD` - Generate a strong password: `openssl rand -base64 32`
- `DATABASE_HOST` - Keep as `postgres` (Docker DNS)
- `ALLOWED_ORIGINS` - Your domain URLs
- `DYNAMO_AWS_ACCESS_KEY_ID` and `DYNAMO_AWS_SECRET_ACCESS_KEY` - Your AWS credentials (if using real DynamoDB)

Example .env setup:
```bash
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_USERNAME=postgres
DATABASE_PASSWORD=<YOUR_STRONG_PASSWORD>
POSTGRES_PASSWORD=<YOUR_STRONG_PASSWORD>

NODE_ENV=production
LOG_LEVEL=info

ALLOWED_ORIGINS=https://app.yourdomain.com,https://www.yourdomain.com

DYNAMO_ENDPOINT=http://dynamodb:8000
DYNAMO_AWS_REGION=us-east-1
```

## Step 5: Setup SSL Certificates (Let's Encrypt)

```bash
# Generate certificates for your domains
sudo certbot certonly --standalone \
  -d api.yourdomain.com \
  -d app.yourdomain.com \
  -d yourdomain.com

# Verify certificates
sudo ls -la /etc/letsencrypt/live/

# Make certificates readable by Docker
sudo chmod -R 755 /etc/letsencrypt/
```

## Step 6: Create Volume and Directory Structure

```bash
# Create data directory for PostgreSQL
mkdir -p ~/healthcare/postgres_data
mkdir -p ~/healthcare/nginx/logs

# Set proper permissions
sudo chown -R $USER:$USER ~/healthcare
chmod -R 755 ~/healthcare
```

## Step 7: Deploy Application

```bash
cd ~/healthcare

# build and start production services with the EC2 compose file
# (adjust path/filename if you use a different compose variant)
docker-compose -f docker-compose_ec2.yml up -d --build
```

Deployment consists of building the images and bringing the containers up.  Any further
migration or configuration steps are described elsewhere in this guide.

## Step 8: Verify Deployment

```bash
# Check if all containers are running
docker-compose -f docker-compose_ec2.yml ps

# View logs
docker-compose -f docker-compose_ec2.yml logs -f

# Test API Gateway
curl http://localhost:3000/health

# Test Frontend  
curl http://localhost:8080
```

## Step 9: Configure DNS Records

### Using Route 53 (AWS)

1. Log into AWS Console
2. Go to Route 53 → Hosted Zones
3. Create records:
   - **Name:** `api.yourdomain.com`, **Type:** A Record, **Value:** Your EC2 Elastic IP
   - **Name:** `app.yourdomain.com`, **Type:** A Record, **Value:** Your EC2 Elastic IP
   - **Name:** `yourdomain.com`, **Type:** A Record, **Value:** Your EC2 Elastic IP

### Using External DNS Provider

Add these A records:
- `api.yourdomain.com` → EC2 Elastic IP
- `app.yourdomain.com` → EC2 Elastic IP
- `yourdomain.com` → EC2 Elastic IP

## Step 10: Configure Nginx with SSL

```bash
# Update Nginx configuration with your domain
sudo nano ~/healthcare/nginx/nginx.conf

# Find and replace:
# - app.yourdomain.com (2 occurrences)
# - api.yourdomain.com

# Restart Nginx to apply changes
docker-compose -f docker-compose.prod.yml restart nginx
```

## Step 11: Test HTTPS Access

```bash
# Test API endpoint
curl -k https://api.yourdomain.com/health

# Test Frontend
curl -k https://app.yourdomain.com

# Check SSL certificate
curl -I https://api.yourdomain.com
```

## Step 12: Setup Auto-Renewal of Certificates

```bash
# Test certificate renewal
sudo certbot renew --dry-run

# The renewal should happen automatically via cron
# Check cron job
sudo systemctl status certbot.timer
sudo systemctl enable certbot.timer  # Enable auto-renewal
```

## Step 13: Setup Monitoring & Logging

```bash
# Check application logs
docker logs -f api-gateway

# Check Nginx logs
docker logs -f nginx

# View compose logs
docker-compose -f docker-compose.prod.yml logs --tail 100

# Setup log rotation (optional)
sudo nano /etc/logrotate.d/docker-compose
```

Add content:
```
/home/ubuntu/healthcare/logs/* {
  daily
  rotate 7
  compress
  delaycompress
  notifempty
  create 0000 root root
  sharedscripts
  postrotate
    docker-compose -f docker-compose.prod.yml kill -s SIGHUP api-gateway
  endscript
}
```

## Step 14: Setup Systemd Service (Optional but Recommended)

Create `/etc/systemd/system/healthcare.service`:

```bash
sudo nano /etc/systemd/system/healthcare.service
```

Add:
```ini
[Unit]
Description=Healthcare Microservices
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
WorkingDirectory=/home/ubuntu/healthcare
ExecStart=/usr/local/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.prod.yml down
RemainAfterExit=yes
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Then enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable healthcare.service
sudo systemctl start healthcare.service
sudo systemctl status healthcare.service
```

## Backup & Recovery

### Database Backup

```bash
# Create backup directory
mkdir -p ~/healthcare/backups

# Manual backup
docker-compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U postgres healthcare | gzip > ~/healthcare/backups/healthcare-$(date +%Y%m%d-%H%M%S).sql.gz

# Automated daily backup (add to crontab)
crontab -e

# Add this line for daily backup at 2 AM
0 2 * * * docker-compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U postgres healthcare | gzip > /home/ubuntu/healthcare/backups/healthcare-$(date +\%Y\%m\%d).sql.gz

# Keep backup for 7 days
0 3 * * * find /home/ubuntu/healthcare/backups -name "*.sql.gz" -mtime +7 -delete
```

### Database Restore

```bash
# List backups
ls -lh ~/healthcare/backups/

# Restore from backup
gunzip < ~/healthcare/backups/healthcare-backup.sql.gz | \
  docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U postgres
```

## Troubleshooting

### Containers not starting
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Rebuild containers
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

### SSL/Certificate issues
```bash
# Check certificate validity
sudo certbot certificates

# Force renewal
sudo certbot renew --force-renewal

# Validate Nginx config
sudo nginx -t
```

### Database connection issues
```bash
# Test database connection
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -c "SELECT 1"

# Check database tables
docker-compose -f docker-compose.prod.yml exec postgres \
  psql -U postgres -l
```

### High resource usage
```bash
# Check resource usage
docker stats

# Check disk space
df -h

# Clean up unused Docker objects
docker system prune -a --volumes
```

## Performance Optimization

### Enable Swap (if needed)
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### Increase file descriptors
```bash
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf
```

### Optimize Docker daemon
Create `/etc/docker/daemon.json`:
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2"
}
```

## Production Checklist - Post Deployment

- [ ] All services running successfully
- [ ] SSL certificates valid and auto-renewing
- [ ] DNS records pointing correctly
- [ ] Health checks passing
- [ ] Database backups working
- [ ] Logs being collected and rotated
- [ ] Monitoring and alerts set up
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Team trained on maintenance procedures

## Support & Documentation

- API Documentation: https://api.yourdomain.com/docs (if available)
- Database Migrations: See `infrastructure/postgres/migrations/`
- Service Logs: Check `./logs/` directory
- Troubleshooting: See EC2_DEPLOYMENT_GUIDE.md

## Emergency Procedures

### Stop all services
```bash
docker-compose -f docker-compose.prod.yml down
```

### Quick restart
```bash
# restart the compose stack directly
docker-compose -f docker-compose_ec2.yml restart
```

### Full reset (careful!)
```bash
docker-compose -f docker-compose.prod.yml down -v
docker-compose -f docker-compose.prod.yml up -d
```

---

For more detailed information, refer to the main EC2_DEPLOYMENT_GUIDE.md file.
