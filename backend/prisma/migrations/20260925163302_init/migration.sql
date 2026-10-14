-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "app";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "auth";

-- CreateEnum
CREATE TYPE "app"."AccountType" AS ENUM ('CASH', 'BANK', 'CARD', 'DIGITAL_WALLET');

-- CreateEnum
CREATE TYPE "app"."TransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- CreateTable
CREATE TABLE "app"."users" (
    "rowId" BIGSERIAL NOT NULL,
    "randId" VARCHAR(6) NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("rowId")
);

-- CreateTable
CREATE TABLE "app"."accounts" (
    "rowId" BIGSERIAL NOT NULL,
    "randId" VARCHAR(6) NOT NULL,
    "userRowId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "app"."AccountType" NOT NULL DEFAULT 'CASH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("rowId")
);

-- CreateTable
CREATE TABLE "app"."categories" (
    "rowId" BIGSERIAL NOT NULL,
    "randId" VARCHAR(6) NOT NULL,
    "userRowId" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "icon" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("rowId")
);

-- CreateTable
CREATE TABLE "app"."transactions" (
    "rowId" BIGSERIAL NOT NULL,
    "randId" VARCHAR(6) NOT NULL,
    "userRowId" BIGINT NOT NULL,
    "accountRowId" BIGINT NOT NULL,
    "categoryRowId" BIGINT,
    "type" "app"."TransactionType" NOT NULL,
    "amount" BIGINT NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("rowId")
);

-- CreateTable
CREATE TABLE "app"."budgets" (
    "rowId" BIGSERIAL NOT NULL,
    "randId" VARCHAR(6) NOT NULL,
    "userRowId" BIGINT NOT NULL,
    "categoryRowId" BIGINT NOT NULL,
    "month" VARCHAR(7) NOT NULL,
    "limitAmount" BIGINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("rowId")
);

-- CreateTable
CREATE TABLE "auth"."credentials" (
    "rowId" BIGSERIAL NOT NULL,
    "userRowId" BIGINT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("rowId")
);

-- CreateTable
CREATE TABLE "auth"."sessions" (
    "rowId" BIGSERIAL NOT NULL,
    "randId" VARCHAR(6) NOT NULL,
    "userRowId" BIGINT NOT NULL,
    "tokenHash" CHAR(64) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userAgent" TEXT,
    "ip" TEXT,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("rowId")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_randId_key" ON "app"."users"("randId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "app"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_randId_key" ON "app"."accounts"("randId");

-- CreateIndex
CREATE INDEX "accounts_userRowId_idx" ON "app"."accounts"("userRowId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_randId_key" ON "app"."categories"("randId");

-- CreateIndex
CREATE INDEX "categories_userRowId_idx" ON "app"."categories"("userRowId");

-- CreateIndex
CREATE UNIQUE INDEX "categories_userRowId_name_key" ON "app"."categories"("userRowId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_randId_key" ON "app"."transactions"("randId");

-- CreateIndex
CREATE INDEX "transactions_userRowId_transactionDate_idx" ON "app"."transactions"("userRowId", "transactionDate");

-- CreateIndex
CREATE INDEX "transactions_accountRowId_idx" ON "app"."transactions"("accountRowId");

-- CreateIndex
CREATE INDEX "transactions_categoryRowId_idx" ON "app"."transactions"("categoryRowId");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_randId_key" ON "app"."budgets"("randId");

-- CreateIndex
CREATE INDEX "budgets_userRowId_idx" ON "app"."budgets"("userRowId");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_userRowId_categoryRowId_month_key" ON "app"."budgets"("userRowId", "categoryRowId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "credentials_userRowId_key" ON "auth"."credentials"("userRowId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_randId_key" ON "auth"."sessions"("randId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "auth"."sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userRowId_idx" ON "auth"."sessions"("userRowId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "auth"."sessions"("expiresAt");

-- AddForeignKey
ALTER TABLE "app"."accounts" ADD CONSTRAINT "accounts_userRowId_fkey" FOREIGN KEY ("userRowId") REFERENCES "app"."users"("rowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."categories" ADD CONSTRAINT "categories_userRowId_fkey" FOREIGN KEY ("userRowId") REFERENCES "app"."users"("rowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."transactions" ADD CONSTRAINT "transactions_userRowId_fkey" FOREIGN KEY ("userRowId") REFERENCES "app"."users"("rowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."transactions" ADD CONSTRAINT "transactions_accountRowId_fkey" FOREIGN KEY ("accountRowId") REFERENCES "app"."accounts"("rowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."transactions" ADD CONSTRAINT "transactions_categoryRowId_fkey" FOREIGN KEY ("categoryRowId") REFERENCES "app"."categories"("rowId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."budgets" ADD CONSTRAINT "budgets_userRowId_fkey" FOREIGN KEY ("userRowId") REFERENCES "app"."users"("rowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app"."budgets" ADD CONSTRAINT "budgets_categoryRowId_fkey" FOREIGN KEY ("categoryRowId") REFERENCES "app"."categories"("rowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth"."credentials" ADD CONSTRAINT "credentials_userRowId_fkey" FOREIGN KEY ("userRowId") REFERENCES "app"."users"("rowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth"."sessions" ADD CONSTRAINT "sessions_userRowId_fkey" FOREIGN KEY ("userRowId") REFERENCES "app"."users"("rowId") ON DELETE CASCADE ON UPDATE CASCADE;

-- ───────────── Access control ─────────────
-- `auth` (password + session hashes) is private: nobody but the owner (the API's
-- DB user) can read it. `app` is readable by a restricted reporting role.
REVOKE ALL ON SCHEMA "auth" FROM PUBLIC;
REVOKE ALL ON ALL TABLES IN SCHEMA "auth" FROM PUBLIC;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'budgetbuddy_readonly') THEN
    CREATE ROLE budgetbuddy_readonly NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA "app" TO budgetbuddy_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA "app" TO budgetbuddy_readonly;
