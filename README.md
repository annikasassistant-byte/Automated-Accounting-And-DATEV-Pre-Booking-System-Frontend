# Automated Accounting — Frontend

Next.js German accounting portal wired to the Automated Accounting API (Mongo-backed). Supports the **cash DATEV MVP** and the parallel **accrual** path (JTL + marketplace imports, inbox, journal).

> **`production` branch:** [PRODUCTION.md](./PRODUCTION.md) (git promote steps + [package.json](./package.json) · [server/package.json](../server/package.json))

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui, RTK Query (`authApi` + `accountingApi`), Socket.IO client.

## Getting started

```bash
npm install
# .env.local — match server port (this repo uses 5001):
# NEXT_PUBLIC_API_URL=http://localhost:5001
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) (or the port Next prints).

## Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Administrator | admin@automatedaccounting.local | ChangeMeAdmin123! |
| User | user@automatedaccounting.local | ChangeMeUser123! |

## Routes

- **Auth:** `/login`, `/forgot-password`, `/verify-otp`, `/reset-password`, `/unauthorized`
- **Accounting (cash):** import bank/paypal, transactions, open items, patterns, rules, accounts, DATEV export, duplicates, reconciliation, reports, company settings
- **Accrual:** JTL + marketplace imports, accounting inbox, business events, accrual journal, marketplace payout reconciliation
- **Admin only:** `/admin/users`, `/admin/settings/clearing`, plus write actions on rules/accounts/company settings and accrual journal posting

Accounting domain data is loaded via **`accountingApi` → `/api/v1`** (not localStorage mocks).
