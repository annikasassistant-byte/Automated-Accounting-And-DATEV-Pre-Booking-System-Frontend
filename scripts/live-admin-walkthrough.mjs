/**
 * Live admin nav walkthrough — all routes from navigation.ts
 * Run from client/: node ../docs/qa/scripts/live-admin-walkthrough.mjs
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.BASE_URL || "https://automated-accounting-and-datev-pre.vercel.app";
const API = process.env.API_BASE || "https://automated-accounting-and-datev-pre-3lr4.onrender.com/api/v1";

const ADMIN_ROUTES = [
  { path: "/admin/dashboard", title: "Dashboard" },
  { path: "/admin/users", title: "Benutzer" },
  { path: "/admin/import/bank", title: "Bank-Import" },
  { path: "/admin/import/paypal", title: "PayPal-Import" },
  { path: "/admin/import/jtl", title: "JTL-Import" },
  { path: "/admin/import/marketplace/amazon", title: "Amazon-Import" },
  { path: "/admin/import/marketplace/backmarket", title: "Back Market-Import" },
  { path: "/admin/import/marketplace/refurbed", title: "Refurbed-Import" },
  { path: "/admin/accounting-inbox", title: "Buchhaltungs-Posteingang" },
  { path: "/admin/accrual/events", title: "Geschäftsvorfälle" },
  { path: "/admin/accrual/journal", title: "Accrual-Journal" },
  { path: "/admin/reconciliation/marketplace", title: "Marktplatz-Auszahlungen" },
  { path: "/admin/transactions", title: "Transaktionen" },
  { path: "/admin/transactions?status=open", title: "Offene Posten" },
  { path: "/admin/transactions?status=conflict", title: "Konflikte" },
  { path: "/admin/patterns", title: "Mustererkennung" },
  { path: "/admin/rules", title: "Regelwerk" },
  { path: "/admin/accounts", title: "Kontenplan" },
  { path: "/admin/accounts/overview", title: "Kontenübersicht" },
  { path: "/admin/export", title: "DATEV-Export" },
  { path: "/admin/duplicates", title: "Duplikate" },
  { path: "/admin/reconciliation", title: "Abstimmung" },
  { path: "/admin/reports", title: "Berichte" },
  { path: "/admin/settings/company", title: "Unternehmen" },
  { path: "/admin/settings/clearing", title: "Marktplatz-Clearing" },
  { path: "/admin/settings/system-policies", title: "Systemrichtlinien" },
  { path: "/admin/settings", title: "Einstellungen" },
  { path: "/admin/profile", title: "Profil" },
];

const ACCRUAL_API = [
  "/accrual/inbox",
  "/accrual/events",
  "/accrual/journal",
  "/accrual/clearing",
  "/reconciliation/marketplace",
];

async function login(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.getByLabel(/E-Mail/i).fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /Weiter/i }).click();
  await page.waitForURL((url) => url.pathname.includes("/admin"), { timeout: 30000 });
}

async function visitRoute(page, { path, title }) {
  const apiErrors = [];
  const onResponse = (res) => {
    const u = res.url();
    if (u.includes("/api/v1/") && res.status() >= 400) {
      apiErrors.push({ url: u.replace(/^https?:\/\/[^/]+/, ""), status: res.status() });
    }
  };
  page.on("response", onResponse);

  let status = 0;
  let heading = "";
  let bodySnippet = "";
  let loadError = false;

  try {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 45000 });
    status = res?.status() ?? 0;
    await page.waitForTimeout(1200);
    const h1 = page.locator("h1").first();
    heading = (await h1.textContent({ timeout: 5000 }).catch(() => ""))?.trim() || "";
    bodySnippet = (await page.locator("body").innerText()).slice(0, 500);
    loadError =
      bodySnippet.includes("konnte nicht geladen werden") ||
      bodySnippet.includes("Etwas ist schiefgelaufen") ||
      bodySnippet.includes("Application error") ||
      bodySnippet.includes("Unhandled Runtime Error") ||
      (bodySnippet.includes("404") && bodySnippet.includes("not found"));
  } catch (e) {
    bodySnippet = String(e);
    loadError = true;
  } finally {
    page.off("response", onResponse);
  }

  const accrualApiFail = apiErrors.some((e) => e.url.includes("/accrual/") || e.url.includes("/marketplace"));

  let verdict = "PASS";
  if (status >= 400 || loadError) verdict = "FAIL";
  else if (accrualApiFail) verdict = "WARN"; // page renders but accrual API 404

  return {
    path,
    navTitle: title,
    httpStatus: status,
    heading,
    verdict,
    loadError,
    accrualApiErrors: apiErrors.filter((e) => e.url.includes("accrual") || e.url.includes("marketplace")),
    apiErrors: apiErrors.slice(0, 5),
    bodyHint: bodySnippet.replace(/\s+/g, " ").slice(0, 120),
  };
}

async function checkAccrualApi(token) {
  const out = [];
  for (const p of ACCRUAL_API) {
    const res = await fetch(`${API}${p}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    out.push({ path: p, status: res.status });
  }
  return out;
}

async function main() {
  const email = process.env.SMOKE_ADMIN_EMAIL || process.env.SQA_ADMIN_EMAIL;
  const password = process.env.SMOKE_ADMIN_PASSWORD || process.env.SQA_ADMIN_PASSWORD;
  if (!email || !password) {
    console.error("Set SMOKE_ADMIN_EMAIL and SMOKE_ADMIN_PASSWORD");
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const results = [];

  await login(page, email, password);

  // Get token from sessionStorage for API checks
  const token = await page.evaluate(() => sessionStorage.getItem("aa-access-token"));
  const accrualApi = token ? await checkAccrualApi(token) : [];

  for (const route of ADMIN_ROUTES) {
    results.push(await visitRoute(page, route));
  }

  await browser.close();

  const summary = {
    base: BASE,
    api: API,
    testedAt: new Date().toISOString(),
    total: results.length,
    pass: results.filter((r) => r.verdict === "PASS").length,
    warn: results.filter((r) => r.verdict === "WARN").length,
    fail: results.filter((r) => r.verdict === "FAIL").length,
    accrualApi,
    routes: results,
  };

  const outDir = path.join(__dirname, "../evidence");
  // When run from client/scripts copy, also mirror to docs/qa/evidence
  const mirrorDir = path.resolve(__dirname, "../../../docs/qa/evidence");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `live-admin-walkthrough-${Date.now()}.json`);
  fs.writeFileSync(outFile, JSON.stringify(summary, null, 2));
  try {
    fs.mkdirSync(mirrorDir, { recursive: true });
    fs.writeFileSync(path.join(mirrorDir, path.basename(outFile)), JSON.stringify(summary, null, 2));
  } catch {
    /* optional mirror when run from client/scripts */
  }

  console.log(`\n=== Live Admin Walkthrough ===`);
  console.log(`PASS=${summary.pass} WARN=${summary.warn} FAIL=${summary.fail}`);
  console.log(`Evidence: ${outFile}\n`);
  for (const r of results) {
    const icon = r.verdict === "PASS" ? "✅" : r.verdict === "WARN" ? "⚠️" : "❌";
    console.log(`${icon} ${r.path} — ${r.heading || r.bodyHint.slice(0, 60)}`);
  }
  console.log("\nAccrual API (authenticated):");
  for (const a of accrualApi) {
    console.log(`  ${a.status === 404 ? "❌" : a.status < 400 ? "✅" : "⚠️"} ${a.path} → ${a.status}`);
  }

  process.exit(summary.fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
