# BudgetBuddy

A full-stack personal finance and expense tracking app built with Next.js, NestJS, Prisma, and PostgreSQL.

## Tech Stack

- **Frontend:** Next.js · TypeScript · Tailwind CSS · shadcn/ui
- **Backend:** NestJS · Prisma · PostgreSQL

## Project Structure

```
budgetbuddy/
├── backend/    # NestJS API (port 4000)
├── frontend/   # Next.js app (port 3000)
└── docs/       # Documentation
```

The browser only talks to the frontend. Requests to `/api/*` are proxied to the
backend (see `frontend/next.config.ts`), so the session cookie stays first-party.

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL

### 1. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure environment

Copy `backend/.env.example` to `backend/.env` and adjust the values:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/budgetbuddy"
PORT=4000
FRONTEND_URL="http://localhost:3000"
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/budgetbuddy_test"
```

`TEST_DATABASE_URL` is only needed for the e2e tests and must point to a
separate, disposable database.

If the backend does not run on `http://localhost:4000`, set `API_URL` for the
frontend (for example in `frontend/.env.local`).

### 3. Set up the database

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
```

The seed creates demo users (for example `demo@budgetbuddy.ir`) with the
password `Demo@1234`. It only runs on an empty database; use
`SEED_RESET=true npx prisma db seed` to wipe and re-seed.

### 4. Run the app

```bash
# Backend  → http://localhost:4000
cd backend && npm run start:dev

# Frontend → http://localhost:3000
cd frontend && npm run dev
```

### Tests

```bash
cd backend
npm test          # unit tests
npm run test:e2e  # e2e tests against TEST_DATABASE_URL
```

## Features

- Registration and login with server-side sessions in an httpOnly cookie
- Accounts, categories, and transactions with filtering and search
- Monthly budget limits per category, with spending progress
- Dashboard with monthly totals, 6-month trend, and spending by category
- All data is scoped to the authenticated user

## Documentation

API reference: [docs/API.md](docs/API.md)
