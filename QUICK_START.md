# 🚀 Quick Start Guide

Get the Land Registry System up and running in 10 minutes!

## Prerequisites (5 min)
```bash
# Check Node.js version (need 18+)
node --version
npm --version

# Check Docker
docker --version
docker-compose --version
```

## Setup (5 min)

### 1. Install & Configure
```bash
cd /home/zephren/New/land-registry-system

# Backend dependencies
cd backend && npm install && cd ..

# Frontend dependencies  
cd frontend && npm install && cd ..
```

### 2. Create Environment Files
```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

### 3. Start Services (Choose One)

#### Docker Compose (Easiest - Recommended):
```bash
# Start PostgreSQL + Backend + Frontend
docker-compose up

# In another terminal, run migrations:
docker exec land_registry_backend npx prisma migrate deploy
```

#### Manual Start (Development):
```bash
# Terminal 1: Ganache
ganache-cli --host 0.0.0.0 --port 7545 \
  --mnemonic "magic credit degree shaft scare salt simple sister skull junior mixture moment" \
  --accounts 20 --defaultBalanceEther 100

# Terminal 2: PostgreSQL
docker run --name postgres -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=land_registry -p 5432:5432 postgres:15-alpine

# Terminal 3: Backend
cd backend && npx prisma migrate deploy && npm run dev

# Terminal 4: Frontend
cd frontend && npm run dev
```

## Access Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Ganache**: http://127.0.0.1:7545
- **API Health**: http://localhost:3001/health

## Default Test Accounts

**Citizen:**
- Email: `citizen@example.com`
- Password: `Password123!`
- Role: CITIZEN

**Officer:**
- Email: `officer@example.com`
- Password: `Password123!`
- Role: OFFICER

**Auditor:**
- Email: `auditor@example.com`
- Password: `Password123!`
- Role: AUDITOR

**Admin:**
- Email: `admin@example.com`
- Password: `Password123!`
- Role: ADMIN

## First Steps

1. **Register a new account** or use test account above
2. **Login** with your credentials
3. **Register a land** (Citizen only)
4. **Approve land** (Officer only)
5. **Transfer ownership** (Citizen initiates, Officer approves)
6. **Verify integrity** (Auditor/Admin)

## Stop Services

```bash
# Docker Compose
docker-compose down

# Or kill manually
pkill -f "npm run dev"
pkill -f ganache
```

## Need Help?

- See [README.md](README.md) for full documentation
- Check [API Documentation](README.md#-api-documentation)
- Review [Troubleshooting](README.md#-troubleshooting) section
