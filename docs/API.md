# BudgetBuddy API Documentation

Base URL: `http://localhost:4000` (the frontend reaches it through its `/api/*` proxy).

## Authentication & Security

- Authentication uses a server-side session stored in an httpOnly cookie. `register` and `login` set the cookie; send it back on every request (`credentials: "include"`).
- Every route requires a valid session except `GET /health`, `POST /auth/register`, `POST /auth/login`, and `POST /auth/logout`. Requests without one get `401`.
- All data is scoped to the authenticated user at the service level.
- Ids in requests and responses are public 6-character ids (`[0-9a-z]{6}`).
- Amounts are positive integers in Toman. Months are `YYYY-MM` (Gregorian, UTC).
- Request bodies are validated; unknown fields are rejected with `400`.

## Endpoints

### Health

- `GET /health` — `{ status: "ok" }` when the database is reachable

### Authentication

- `POST /auth/register` — body `{ name, email, password }` (password ≥ 8 chars); returns `{ user }`
- `POST /auth/login` — body `{ email, password }`; returns `{ user, expiresAt }`
- `POST /auth/logout` — revokes the session; `204`
- `GET /auth/me` — returns `{ user }`
- `POST /auth/change-password` — body `{ currentPassword, newPassword }`; `204`

### Users

- `PATCH /users/me` — body `{ name }`

### Accounts

- `GET /accounts` — each with its computed `balance`
- `POST /accounts` — body `{ name, type? }`; `type` is `CASH | BANK | CARD | DIGITAL_WALLET`
- `PATCH /accounts/:id`
- `DELETE /accounts/:id` — also deletes the account's transactions; `204`

### Categories

- `GET /categories`
- `POST /categories` — body `{ name, color?, icon? }`; `color` is a hex code; duplicate names return `409`
- `PATCH /categories/:id`
- `DELETE /categories/:id` — its transactions become uncategorized, its budgets are deleted; `204`

### Transactions

- `GET /transactions` — query `type`, `accountId`, `categoryId`, `from`, `to`, `q` (description search), `limit` (1–500, default 200)
- `GET /transactions/summary` — query `month?`; monthly income/expense/net, total balance, expense by category, 6-month trend, and recent transactions
- `POST /transactions` — body `{ type, amount, accountId, categoryId?, transactionDate?, description? }`; `type` is `INCOME | EXPENSE`
- `PATCH /transactions/:id`
- `DELETE /transactions/:id` — `204`

### Budgets

- `GET /budgets` — query `month?`; each with the amount `spent` in its category that month
- `POST /budgets` — body `{ categoryId, month, limitAmount }`; one budget per category per month (`409` otherwise)
- `PATCH /budgets/:id` — body `{ limitAmount }`
- `DELETE /budgets/:id` — `204`
