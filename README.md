# Automated Accounting — Frontend

Next.js German accounting portal wired to the Automated Accounting API (Mongo-backed). Supports the **cash DATEV MVP** and the parallel **accrual** path (JTL + marketplace imports, inbox, journal).

This repository is the **frontend**: a Next.js portal with Admin (`/admin`) and User (`/dashboard`) screens. All accounting data comes from the Express API (MongoDB) via RTK Query.

Companion docs: server [`../server/README.md`](../server/README.md).

## Live

| Layer | URL |
|-------|-----|
| Frontend | [https://automated-accounting-and-datev-pre.vercel.app](https://automated-accounting-and-datev-pre.vercel.app) |
| Backend API | [https://automated-accounting-and-datev-pre-3lr4.onrender.com/api/v1](https://automated-accounting-and-datev-pre-3lr4.onrender.com/api/v1) |
| Health | [https://automated-accounting-and-datev-pre-3lr4.onrender.com/api/v1/health](https://automated-accounting-and-datev-pre-3lr4.onrender.com/api/v1/health) |

Login: [https://automated-accounting-and-datev-pre.vercel.app/login](https://automated-accounting-and-datev-pre.vercel.app/login)

### Screenshots

Full-page captures of every live screen (admin, user, and auth) live in [`docs/screenshots/`](docs/screenshots/).

| Portal | Folder |
|--------|--------|
| Auth | [`docs/screenshots/auth/`](docs/screenshots/auth/) |
| Admin | [`docs/screenshots/admin/`](docs/screenshots/admin/) |
| User | [`docs/screenshots/user/`](docs/screenshots/user/) |

![Admin dashboard](docs/screenshots/admin/dashboard.png)

![User dashboard](docs/screenshots/user/dashboard.png)

---

## Tech Stack

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)
![shadcn/ui](https://img.shields.io/badge/shadcn%2Fui-UI-000000?logo=shadcnui&logoColor=white)
![Redux Toolkit](https://img.shields.io/badge/Redux_Toolkit-RTK_Query-764ABC?logo=redux&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-Session-443E38?logo=react&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-Client-010101?logo=socketdotio&logoColor=white)
![Zod](https://img.shields.io/badge/Zod-Validation-3E67B1)
![React Hook Form](https://img.shields.io/badge/React_Hook_Form-Forms-EC5990?logo=reacthookform&logoColor=white)
![TanStack Table](https://img.shields.io/badge/TanStack-Table-FF4154?logo=reactquery&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-Charts-8884d8)
![Vercel](https://img.shields.io/badge/Vercel-Hosting-000000?logo=vercel&logoColor=white)

| Symbol | Piece | Choice |
|--------|-------|--------|
| ⬛ | Framework | Next.js 16 App Router |
| ⚛️ | UI | React 19, TypeScript, Tailwind CSS v4, shadcn/ui |
| 🔄 | Data | RTK Query (`authApi` + `accountingApi`) |
| 🔐 | Session | Zustand persist `aa-auth` (user only) |
| 📡 | Realtime | Socket.IO client |
| 📝 | Forms / tables | react-hook-form + Zod, TanStack Table |
| 📊 | Charts / toasts | Recharts, Sonner |
| 🧪 | Smoke tests | Playwright |
| ☁️ | Hosting | Vercel |

`@tanstack/react-query` is installed and wrapped but **unused**. Use RTK Query for new API calls.

**No `middleware.ts`.** Route protection is client `AuthGuard` on layouts.

---

## Quick start

```bash
cd client
npm install
# .env.local (optional): NEXT_PUBLIC_API_URL=http://localhost:5000
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → `/login`.

| Role | Email | Password |
|------|-------|----------|
| admin | `admin@automatedaccounting.local` | `ChangeMeAdmin123!` |
| user | `user@automatedaccounting.local` | `ChangeMeUser123!` |

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next dev server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run test:smoke` | Route smoke (`scripts/smoke-routes.mjs`) |

- **Auth:** `/login`, `/forgot-password`, `/verify-otp`, `/reset-password`, `/unauthorized`
- **Accounting (cash):** import bank/paypal, transactions, open items, patterns, rules, accounts, DATEV export, duplicates, reconciliation, reports, company settings
- **Accrual:** JTL + marketplace imports, accounting inbox, business events, accrual journal, marketplace payout reconciliation
- **Admin only:** `/admin/users`, `/admin/settings/clearing`, plus write actions on rules/accounts/company settings and accrual journal posting

## Coding structure

```text
client/
├── app/                    # App Router pages (thin wrappers)
│   ├── layout.tsx          # html lang=de, AppProviders
│   ├── page.tsx            # redirects to /login
│   ├── login|forgot-password|verify-otp|reset-password|unauthorized/
│   ├── admin/              # AuthGuard admin + admin nav
│   └── dashboard/          # AuthGuard user + user nav
├── features/               # Real screens (shared by both portals)
│   ├── auth/login-page.tsx
│   ├── import/csv-import-page.tsx
│   ├── transactions/
│   ├── rules/
│   ├── patterns/
│   ├── accounts/
│   ├── export/datev-export-page.tsx
│   ├── duplicates/
│   ├── reconciliation/
│   ├── reports/
│   ├── settings/           # company, system-policies, settings
│   └── profile/
├── components/
│   ├── auth/               # AuthGuard, auth-flow-shell
│   ├── layout/             # sidebar, top-navbar
│   ├── shared/             # PageHeader, EmptyState, LoadingSkeleton, …
│   ├── dashboard/          # MetricCard, charts
│   ├── tables/
│   └── ui/                 # shadcn primitives
├── services/               # RTK Query APIs
│   ├── baseQuery.ts        # Bearer + cookies + 401 refresh
│   ├── authApi.ts
│   ├── accountingApi.ts
│   ├── config.ts           # API_V1, sessionStorage tokens
│   └── auth-mappers.ts
├── store/                  # Redux store (RTK Query only)
├── lib/
│   ├── auth-store.ts       # Zustand session
│   ├── accounting/         # server → client mappers
│   └── format.ts, download.ts, hard-navigate.ts
├── providers/              # Redux, theme, QueryClient, Socket.IO
├── constants/navigation.ts # adminNavGroups + userNavGroups
├── types/                  # User, accounting DTOs
└── hooks/use-mobile.ts
```

### Patterns to follow

- **Dual portal:** `app/admin/*` and `app/dashboard/*` re-export the same `features/*` component. Do not duplicate screen logic.
- **German copy** hardcoded in features (no i18n library).
- **RTK Query** + tag invalidation. Map server DTOs in `lib/accounting/mappers.ts`.
- **Sonner** toasts. Use `EmptyState` / `LoadingSkeleton` for empty and loading.
- **Role gates:** hide admin writes in the UI **and** rely on server 403. `hasRole("admin")` is not enough by itself.
- Tokens: memory + `sessionStorage` (`aa-access-token` / `aa-refresh-token`). `credentials: "include"`. 401 → `POST /auth/refresh`.
- After login: admin → `/admin/dashboard`, user → `/dashboard`. Use `hardNavigate` to avoid App Router unmount races.

---

## Implemented features

### Auth

| Screen | Route | Status |
|--------|-------|--------|
| Login | `/login` | Implemented |
| Forgot password | `/forgot-password` | Implemented |
| Verify OTP | `/verify-otp` | Implemented |
| Reset password | `/reset-password` | Implemented |
| Unauthorized | `/unauthorized` | Implemented |
| Public register page | — | **Not built** (API exists; admin creates users) |

Session: Zustand `aa-auth` (user + `isAuthenticated`). Profile refresh via `GET /users/me`. Socket `server:force_logout` clears session; `server:user_updated` invalidates Profile.

### Dual portals

| Portal | Layout gate | Extra nav |
|--------|-------------|-----------|
| Admin `/admin/*` | `allowedRoles={["admin"]}` | Dashboard, Benutzer, Unternehmen, Systemrichtlinien, Einstellungen, Profil |
| User `/dashboard/*` | `allowedRoles={["user"]}` | Dashboard, Unternehmen (read-only), Einstellungen, Profil |

Shared Buchhaltung nav (both prefixes): Bank-Import, PayPal-Import, Transaktionen, Offene Posten, Konflikte, Mustererkennung, Regelwerk, Kontenplan, Kontenübersicht, DATEV-Export, Duplikate, Abstimmung, Berichte.

### Buchhaltung screens (implemented)

| Feature module | Routes | What it does |
|----------------|--------|----------------|
| `features/import` | `…/import/bank`, `…/import/paypal` | CSV upload, import history, Guthaben check, reprocess |
| `features/transactions` | `…/transactions`, `?status=open`, `?status=conflict` | List, assign, bulk status, apply-rules, detail drawer, create-rule (admin) |
| `features/patterns` | `…/patterns` | Analyze + HITL accept/reject suggestions (writes admin) |
| `features/rules` | `…/rules` | CRUD, enable/disable, test, inventory seed (writes admin) |
| `features/accounts` | `…/accounts`, `…/accounts/overview` | Chart CRUD/seed/CSV, overview + ledger (writes admin) |
| `features/export` | `…/export` | DATEV preview → validate → create → download |
| `features/duplicates` | `…/duplicates` | List + resolve (merge / ignore / keep_both) |
| `features/reconciliation` | `…/reconciliation` | Period summary + PayPal balance by import |
| `features/reports` | `…/reports` | Account totals + status breakdown |
| `features/settings` | `…/settings/company`, `/admin/settings/system-policies` | Company/DATEV (admin write); system policies (admin only) |
| `features/profile` | `…/profile` | Name, phone, password, notification prefs |
| Admin users | `/admin/users` | Create / update / deactivate users |

Admin-only **writes** (UI + API): rules, accounts seed/CRUD, company/DATEV/system-policies, pattern analyze, suggestion accept/reject, create-rule from transaction. Users **can** import CSVs and process transactions.

### Data layer (implemented)

- `accountingApi` — accounts, imports, transactions, rules, suggestions, DATEV, recon, duplicates, settings, reports
- `authApi` — login/logout/OTP/reset, profile, admin user CRUD
- `baseQueryWithReauth` — Bearer header, `X-Device-Id`, cookie credentials, refresh on 401

### Partial / stub

- Notification bell in the navbar is **UI-only** (not wired to API/socket notifications)
- Open/conflict queues mostly use `getTransactions?status=` (dedicated RTK hooks exist but are unused on those screens)
- Accrual: Financial sales/revenue treated as **Clearing**; BM Order vs Financial import selector; exception resolve + payout match wired for admin
- Accrual → DATEV export **not** in UI yet (cash DATEV unchanged)
- Fee-invoice monthly control + FX true-up posting still pending server/client follow-up
- Amazon channel ON HOLD (no client source data)

<!--
## Keeping this README current
Cursor rule: ../.cursor/rules/update-readme-on-features.mdc
When a frontend feature or bug fix lands, update this file (and the root README Frontend section) in the same change.
-->
