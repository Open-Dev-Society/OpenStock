---
description: Deploy OpenStock application using Docker Compose
---

# OpenStock Deployment Workflow

This workflow guides you through deploying OpenStock to your server using Docker Compose.

## Prerequisites

- Docker and Docker Compose installed
- Git installed
- Required API keys (Finnhub, Gemini, etc.)

## Deployment Steps

### 1. Clone the repository (if not already done)
```bash
git clone https://github.com/Open-Dev-Society/OpenStock.git .
```

### 2. Configure environment variables

Edit the `.env` file and replace placeholder values with your actual API keys:

- `BETTER_AUTH_SECRET`: Generate a random secret string
- `NEXT_PUBLIC_FINNHUB_API_KEY`: Get from https://finnhub.io/
- `GEMINI_API_KEY`: Get from Google AI Studio
- `INNGEST_SIGNING_KEY`: Get from https://app.inngest.com/
- `NODEMAILER_EMAIL` and `NODEMAILER_PASSWORD`: Your Gmail credentials

### 3. Start MongoDB first
// turbo
```bash
docker compose up -d mongodb
```

Wait for MongoDB to be healthy (check with `docker compose ps`)

### 4. Build and start the application
// turbo
```bash
docker compose up -d --build
```

### 5. Check the status
// turbo
```bash
docker compose ps
```

### 6. View logs
// turbo
```bash
docker compose logs -f openstock
```

### 7. Access the application

Open your browser and navigate to:
- Application: http://localhost:3000
- Or use your server's IP: http://YOUR_SERVER_IP:3000

## Useful Commands

### Stop the application
```bash
docker compose down
```

### Stop and remove volumes (WARNING: deletes database data)
```bash
docker compose down -v
```

### Restart the application
```bash
docker compose restart
```

### View all logs
```bash
docker compose logs -f
```

### Rebuild after code changes
```bash
docker compose up -d --build
```

## Troubleshooting

### Check container status
```bash
docker compose ps
```

### Check logs for errors
```bash
docker compose logs openstock
docker compose logs mongodb
```

### Enter the container shell
```bash
docker compose exec openstock sh
```

### Test MongoDB connection
```bash
docker compose exec mongodb mongosh -u root -p example
```
