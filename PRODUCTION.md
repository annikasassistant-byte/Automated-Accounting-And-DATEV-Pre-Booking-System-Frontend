# Production branch — client (Vercel)

You are on **`production`**. Vercel deploys this branch to live.

## package.json

| Repo | File |
|------|------|
| **Client (this repo)** | [package.json](./package.json) |
| **Server** | [../server/package.json](../server/package.json) |

Build scripts used on deploy: `npm run build` → `npm run start` (see [package.json](./package.json)).

---

## Promote to live (run in **both** `client/` and `server/`)

Run the full block below **inside this repo**, then repeat the same commands in **`server/`**.

```bash
git checkout before_production
git pull origin dev
git add .
git commit -m "take code from dev branch"
git push origin before_production
git checkout production
git pull origin before_production
git add .
git commit -m "take code from before_production"
git push origin production
```

Or use npm (recommended):

```bash
npm run promote              # full flow → returns you to dev
npm run promote:staging      # step 1 only — ends on before_production
npm run promote:production   # step 2 only — ends on production
```

**Why `before_production`?** `promote:staging` checks out that branch on purpose (staging snapshot). It does not go to live until you also run `promote:production` or use `npm run promote` for both steps.

---

## Before you promote (on `dev`)

```bash
npm install
npm run build
```

---

## More docs

- [deployment/PRODUCTION_BRANCH_PROMOTION.md](../deployment/PRODUCTION_BRANCH_PROMOTION.md)
- [deployment/PRODUCTION_CHECKLIST.md](../deployment/PRODUCTION_CHECKLIST.md)
