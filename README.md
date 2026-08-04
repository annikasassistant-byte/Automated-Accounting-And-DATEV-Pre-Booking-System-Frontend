# Automated Accounting — Frontend

Next.js auth portal wired to the Automated Accounting API.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, shadcn/ui, RTK Query, Zustand, Socket.IO client.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Set `NEXT_PUBLIC_API_URL` to the API origin (see `.env.example`).

- Local default: `http://localhost:5000`
- Production Render: `https://automated-accounting-and-datev-pre-3lr4.onrender.com`

## Demo credentials (from server seed)

| Role | Email | Password |
|------|-------|----------|
| Administrator | admin@automatedaccounting.local | ChangeMeAdmin123! |
| User | user@automatedaccounting.local | ChangeMeUser123! |

## Routes

- **User:** `/dashboard`, profile, settings
- **Admin:** `/admin/dashboard`, `/admin/users`, settings, profile
- **Auth:** `/login`, `/forgot-password`, `/verify-otp`, `/reset-password`, `/unauthorized`
