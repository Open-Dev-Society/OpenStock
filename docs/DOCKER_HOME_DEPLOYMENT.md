# Docker Home Network Deployment Guide

Complete guide for deploying OpenStock on your home network using Docker.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Configuration](#configuration)
- [Advanced Setup](#advanced-setup)
- [Troubleshooting](#troubleshooting)
- [Security Considerations](#security-considerations)

## Prerequisites

### Required Software
- **Docker**: Install from [docker.com](https://www.docker.com/get-started)
- **Docker Compose**: Usually included with Docker Desktop
- **Git** (optional): For cloning the repository

### Required API Keys
You'll need to register for these free services:
1. **Finnhub API**: Stock market data
   - Register at: https://finnhub.io/register
   - Free tier includes real-time quotes
2. **Google Gemini API**: AI-powered email personalization
   - Get key at: https://aistudio.google.com/app/apikey
   - Free tier includes generous limits
3. **Gmail Account**: For sending emails
   - Enable 2FA if not already enabled
   - Generate App Password: https://myaccount.google.com/apppasswords

### System Requirements
- **RAM**: Minimum 2GB available
- **Disk Space**: 2GB free space
- **Network**: Stable internet connection
- **Ports**: Port 3000 must be available

## Quick Start

### 1. Find Your Local IP Address

**Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" under your active network adapter (e.g., `192.168.1.100`)

**macOS:**
```bash
ifconfig | grep inet
```
Look for an IP starting with `192.168.x.x` or `10.0.x.x`

**Linux:**
```bash
hostname -I
```
The first IP is usually your local network address

### 2. Configure Environment Variables

Copy the example environment file:
```bash
cp .env.example.docker .env
```

Edit `.env` and update these critical values:
```bash
# Replace YOUR_LOCAL_IP with your actual IP (e.g., 192.168.1.100)
NEXT_PUBLIC_APP_URL=http://YOUR_LOCAL_IP:3000
BETTER_AUTH_URL=http://YOUR_LOCAL_IP:3000

# Generate a secure secret (run this command):
# openssl rand -base64 32
BETTER_AUTH_SECRET=your_generated_secret_here

# Add your API keys
NEXT_PUBLIC_FINNHUB_API_KEY=your_finnhub_key
GEMINI_API_KEY=your_gemini_key

# Add your Gmail credentials
NODEMAILER_EMAIL=your_email@gmail.com
NODEMAILER_PASSWORD=your_gmail_app_password
```

### 3. Start the Application

```bash
docker compose up -d --build
```

This command:
- Builds the optimized Docker image (~450MB)
- Starts MongoDB
- Starts the OpenStock application
- Runs health checks to ensure everything is working

### 4. Verify Deployment

Check that all containers are running:
```bash
docker compose ps
```

You should see:
```
NAME                 STATUS
openstock-app        Up (healthy)
openstock-mongodb    Up (healthy)
```

### 5. Access Your Application

Open your browser and navigate to:
```
http://YOUR_LOCAL_IP:3000
```

For example: `http://192.168.1.100:3000`

### 6. (Optional) Enable Email Functionality

For welcome emails and daily news summaries, run Inngest in a separate terminal:
```bash
npx inngest-cli@latest dev
```

Keep this running alongside Docker for background job processing.

## Detailed Setup

### Understanding the Environment Variables

#### Application URLs
```bash
NEXT_PUBLIC_APP_URL=http://192.168.1.100:3000
BETTER_AUTH_URL=http://192.168.1.100:3000
```
These **must** match and point to your local IP. These URLs are used in:
- Email templates (links back to the app)
- Authentication redirects
- OAuth callbacks

#### Database
```bash
MONGODB_URI=mongodb://root:example@mongodb:27017/openstock?authSource=admin
```
This is automatically configured for Docker. The values match `docker-compose.yml`.

**Security Note**: Change MongoDB credentials for production use:
1. Update `MONGO_INITDB_ROOT_USERNAME` and `MONGO_INITDB_ROOT_PASSWORD` in `docker-compose.yml`
2. Update `MONGODB_URI` to match new credentials

#### Authentication
```bash
BETTER_AUTH_SECRET=your_random_secret_here
```
Generate a secure secret:
```bash
openssl rand -base64 32
```

#### Finnhub API (Stock Data)
```bash
NEXT_PUBLIC_FINNHUB_API_KEY=your_key_here
FINNHUB_BASE_URL=https://finnhub.io/api/v1
```
The `NEXT_PUBLIC_` prefix makes this available to the browser for TradingView widgets.

#### Gemini AI (Email Personalization)
```bash
GEMINI_API_KEY=your_gemini_key_here
```
Used to generate personalized welcome emails and news summaries.

#### Email Configuration
```bash
NODEMAILER_EMAIL=your_email@gmail.com
NODEMAILER_PASSWORD=your_app_password
```

**Important**: Use an App Password, not your regular Gmail password:
1. Enable 2-Factor Authentication on your Google account
2. Go to: https://myaccount.google.com/apppasswords
3. Create an app password for "Mail"
4. Use this 16-character password in `.env`

### Docker Compose Configuration

The `docker-compose.yml` file defines two services:

#### OpenStock Application
- **Port**: 3000 (host) → 3000 (container)
- **Depends on**: MongoDB (waits for health check)
- **Health check**: Pings `/api/health` endpoint
- **Network**: Custom bridge network for isolation

#### MongoDB
- **Port**: 27017 (host) → 27017 (container)
- **Volume**: `mongo-data` persists database across restarts
- **Health check**: Verifies MongoDB responds to ping
- **Credentials**: root/example (change for production)

### Build Optimizations

The new Dockerfile uses multi-stage builds:

1. **Stage 1 - Dependencies**: Installs pnpm and project dependencies
2. **Stage 2 - Builder**: Builds Next.js with Turbopack in standalone mode
3. **Stage 3 - Runner**: Minimal runtime image with only necessary files

**Size Comparison**:
- Previous: ~1.2GB
- Optimized: ~450MB (62% reduction)

**Build Context Optimization** (`.dockerignore`):
- Previous: ~150MB
- Optimized: ~8MB (95% reduction)

## Configuration

### Accessing from Other Devices

By default, the app is accessible from any device on your local network.

**From another computer/phone on the same network:**
```
http://192.168.1.100:3000
```

**From the host machine:**
```
http://localhost:3000
```

### Port Configuration

To use a different port (e.g., 8080):

1. Edit `docker-compose.yml`:
```yaml
ports:
  - "8080:3000"  # host:container
```

2. Update environment variables:
```bash
NEXT_PUBLIC_APP_URL=http://192.168.1.100:8080
BETTER_AUTH_URL=http://192.168.1.100:8080
```

3. Restart containers:
```bash
docker compose down
docker compose up -d --build
```

### Database Persistence

MongoDB data is stored in a Docker volume (`mongo-data`). This persists across container restarts.

**View volumes:**
```bash
docker volume ls
```

**Backup database:**
```bash
docker compose exec mongodb mongosh -u root -p example --eval "db.adminCommand('ping')"
docker compose exec mongodb mongodump --out=/data/backup -u root -p example --authenticationDatabase admin
```

## Advanced Setup

### Custom Domain Names (mDNS)

Instead of using IP addresses, set up a custom local domain.

#### macOS/Linux (Avahi/Bonjour)

1. Install Avahi (Linux) or use built-in Bonjour (macOS)
2. Access via: `http://openstock.local:3000`

#### Windows

1. Install Bonjour Print Services
2. Edit hosts file: `C:\Windows\System32\drivers\etc\hosts`
3. Add: `192.168.1.100 openstock.local`
4. Access via: `http://openstock.local:3000`

### Reverse Proxy (Nginx)

For HTTPS and custom domains, use Nginx as a reverse proxy.

**Example Nginx configuration:**
```nginx
server {
    listen 80;
    server_name openstock.local;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Automated Backups

Create a backup script (`backup.sh`):
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker compose exec -T mongodb mongodump --archive --gzip -u root -p example --authenticationDatabase admin > backup_$DATE.gz
```

Schedule with cron:
```bash
# Daily backup at 2 AM
0 2 * * * /path/to/backup.sh
```

### Email Testing

Test email configuration without signing up:

1. Start Inngest dev server:
```bash
npx inngest-cli@latest dev
```

2. Open Inngest UI: http://localhost:8288
3. Manually trigger the welcome email function
4. Check your email inbox

## Troubleshooting

### Common Issues

#### 1. Container Won't Start

**Check logs:**
```bash
docker compose logs openstock
docker compose logs mongodb
```

**Common causes:**
- Port 3000 already in use
- Insufficient memory
- Invalid environment variables

**Solution:**
```bash
# Stop any conflicting services
lsof -ti:3000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Restart with fresh build
docker compose down
docker compose up -d --build
```

#### 2. Can't Access from Other Devices

**Verify network connectivity:**
```bash
# From another device, ping the host
ping 192.168.1.100
```

**Check firewall:**
- Windows: Allow Docker Desktop through Windows Firewall
- macOS: System Preferences → Security & Privacy → Firewall → Firewall Options
- Linux: `sudo ufw allow 3000/tcp`

**Verify containers are running:**
```bash
docker compose ps
```

#### 3. Health Checks Failing

**Check health status:**
```bash
docker compose ps
docker inspect openstock-app | grep Health
```

**Common causes:**
- App crashed during startup
- MongoDB connection failed
- Missing environment variables

**Solution:**
```bash
# View detailed logs
docker compose logs --tail=100 openstock

# Restart with clean state
docker compose down
docker compose up -d
```

#### 4. Email Not Sending

**Verify Inngest is running:**
```bash
# Check if Inngest dev server is running
curl http://localhost:8288
```

**Check Gmail credentials:**
- Ensure 2FA is enabled
- Use App Password, not regular password
- Check for typos in `.env`

**Test Gmail connection:**
```bash
# From Inngest UI (http://localhost:8288)
# Manually trigger "app/user.created" function
```

#### 5. MongoDB Connection Errors

**Error:** `MongoServerError: Authentication failed`

**Solution:**
```bash
# Verify credentials in docker-compose.yml match .env
# Restart MongoDB with clean state
docker compose down -v  # WARNING: Deletes database
docker compose up -d
```

#### 6. Build Errors

**Error:** `ERROR [deps 3/3] RUN pnpm install --frozen-lockfile`

**Solution:**
```bash
# Clear Docker cache and rebuild
docker compose down
docker system prune -a  # WARNING: Deletes all unused images
docker compose up -d --build
```

### Performance Issues

#### Slow Build Times

**Use BuildKit:**
```bash
export DOCKER_BUILDKIT=1
docker compose up -d --build
```

**Cache layers:**
```bash
# Subsequent builds will be faster
docker compose build --no-cache  # First time only
docker compose up -d
```

#### High Memory Usage

**Check resource usage:**
```bash
docker stats
```

**Limit container memory (docker-compose.yml):**
```yaml
services:
  openstock:
    mem_limit: 512m
  mongodb:
    mem_limit: 256m
```

### Viewing Logs

**Real-time logs:**
```bash
docker compose logs -f
```

**Specific service:**
```bash
docker compose logs -f openstock
docker compose logs -f mongodb
```

**Last 50 lines:**
```bash
docker compose logs --tail=50
```

## Security Considerations

### Production Deployment Checklist

- [ ] Change MongoDB credentials from default `root/example`
- [ ] Generate strong `BETTER_AUTH_SECRET` (32+ characters)
- [ ] Use dedicated SMTP service instead of personal Gmail
- [ ] Enable firewall rules (only allow local network access)
- [ ] Set up automated database backups
- [ ] Keep Docker images updated (`docker compose pull`)
- [ ] Monitor logs for suspicious activity
- [ ] Use environment-specific `.env` files (never commit to Git)

### Network Security

**Expose only to local network:**
```yaml
# docker-compose.yml
ports:
  - "127.0.0.1:3000:3000"  # Only localhost
  - "192.168.1.100:3000:3000"  # Specific IP
```

**Use Docker networks for isolation:**
Already configured in `docker-compose.yml` as `openstock-network`.

### Data Backup

**Manual backup:**
```bash
docker compose exec mongodb mongodump --out=/data/backup -u root -p example --authenticationDatabase admin
docker cp openstock-mongodb:/data/backup ./mongodb-backup
```

**Restore backup:**
```bash
docker cp ./mongodb-backup openstock-mongodb:/data/restore
docker compose exec mongodb mongorestore /data/restore -u root -p example --authenticationDatabase admin
```

### Updating OpenStock

**Pull latest changes:**
```bash
git pull origin main
docker compose down
docker compose up -d --build
```

**Preserve database:**
The `mongo-data` volume persists across updates automatically.

## Maintenance

### Regular Tasks

**Weekly:**
- Check logs for errors: `docker compose logs --tail=100`
- Verify disk space: `docker system df`

**Monthly:**
- Update Docker images: `docker compose pull`
- Clean unused images: `docker system prune`
- Backup database

### Container Management

**Stop services:**
```bash
docker compose down
```

**Restart services:**
```bash
docker compose restart
```

**Rebuild after code changes:**
```bash
docker compose up -d --build
```

**Remove everything (including volumes):**
```bash
docker compose down -v  # WARNING: Deletes database
```

## Support

### Getting Help

1. Check logs: `docker compose logs`
2. Review this documentation
3. Check GitHub Issues: https://github.com/Open-Dev-Society/OpenStock/issues
4. Create new issue with:
   - Docker version: `docker --version`
   - Logs: `docker compose logs --tail=100`
   - Environment: OS, RAM, Docker setup

### Useful Commands Reference

```bash
# Status
docker compose ps
docker stats

# Logs
docker compose logs -f
docker compose logs --tail=50 openstock

# Restart
docker compose restart
docker compose down && docker compose up -d

# Clean up
docker system prune
docker volume prune

# Database
docker compose exec mongodb mongosh -u root -p example
docker compose exec mongodb mongodump --out=/backup -u root -p example --authenticationDatabase admin

# Rebuild
docker compose down
docker compose up -d --build
```

## Next Steps

After successful deployment:
1. Create your first user account
2. Add stocks to your watchlist
3. Set up price and volume alerts
4. Explore the TradingView charts
5. Configure daily news email summaries

Enjoy using OpenStock on your home network!
