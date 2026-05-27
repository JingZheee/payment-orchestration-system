# Deployment Runbook

**Server IP:** 136.110.30.128  
**SSH:** `ssh root@136.110.30.128`  
**App URLs:** `http://136.110.30.128/store` · `http://136.110.30.128/login`

---

## First-Time Deployment

Run once when setting up the server from scratch.

```bash
# 1. Install Docker
curl -fsSL https://get.docker.com | sh

# 2. Clone the repo
git clone https://github.com/YOUR_USERNAME/payment-orchestration-system.git
cd payment-orchestration-system

# 3. Create the secrets file
cp .env.example .env
nano .env   # fill in all values

# 4. Build and start everything
docker compose -f docker-compose.prod.yml up -d --build

# 5. Watch startup logs (wait for "Started PaymentOrchestrationApplication")
docker compose -f docker-compose.prod.yml logs backend -f
```

---

## Routine Deployments (After Every Code Change)

### Backend changed (Java code, pom.xml, application.yml)

```bash
# Local machine — commit and push
git add .
git commit -m "your message"
git push

# On VM
git pull
docker compose -f docker-compose.prod.yml up -d --build --no-deps backend

# Wait ~2 min for build + startup, then start frontend if it stopped
docker compose -f docker-compose.prod.yml up -d frontend
```

### Frontend changed (React/TypeScript, nginx.conf)

```bash
# Local machine — commit and push
git add .
git commit -m "your message"
git push

# On VM
git pull
docker compose -f docker-compose.prod.yml up -d --build --no-deps frontend
```

### Both backend and frontend changed

```bash
# Local machine — commit and push
git add .
git commit -m "your message"
git push

# On VM — rebuild both (backend first, frontend waits for it to be healthy)
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

### Only .env secrets changed (no code change)

```bash
# On VM — edit the file then restart affected service
nano .env
docker compose -f docker-compose.prod.yml up -d --no-build backend
```

---

## Monitoring Commands

```bash
# Check all container statuses
docker compose -f docker-compose.prod.yml ps

# Live logs for a specific service
docker compose -f docker-compose.prod.yml logs backend -f
docker compose -f docker-compose.prod.yml logs frontend -f

# Last 50 lines of logs
docker compose -f docker-compose.prod.yml logs backend --tail=50

# Check backend health manually
docker exec payment-orchestration-system-backend-1 wget -qO- http://localhost:9080/actuator/health

# Check disk and memory usage
df -h
free -h
```

---

## Restart / Stop Commands

```bash
# Restart a single service (no rebuild)
docker compose -f docker-compose.prod.yml restart backend

# Stop everything (data is preserved in volumes)
docker compose -f docker-compose.prod.yml down

# Start everything back up (no rebuild)
docker compose -f docker-compose.prod.yml up -d

# Nuclear option — stops and DELETES all data volumes (fresh start)
docker compose -f docker-compose.prod.yml down -v
```

---

## Troubleshooting

| Symptom | Command to run |
|---|---|
| Frontend not showing | `docker compose -f docker-compose.prod.yml up -d frontend` |
| Backend keeps restarting | `docker compose -f docker-compose.prod.yml logs backend --tail=50` |
| 401 on API calls | Check `.env` has correct JWT_SECRET |
| DB connection error | Check `DB_PASSWORD` matches in `.env` |
| Port 80 not reachable | Check GCE firewall allows HTTP in Cloud Console |
| Out of disk space | `docker system prune -f` (removes unused images/containers) |

---

## Access RabbitMQ Management UI

The management UI is not exposed publicly. Use SSH tunnelling:

```bash
# Run this on your LOCAL machine
ssh -L 15672:localhost:15672 root@136.110.30.128

# Then open in browser
http://localhost:15672
# Login with RABBITMQ_USER and RABBITMQ_PASS from your .env
```
