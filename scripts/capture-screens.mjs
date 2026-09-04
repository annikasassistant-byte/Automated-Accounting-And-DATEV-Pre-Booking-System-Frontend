/**
 * Capture full-page screenshots of auth + admin + user + live API pages.
 * Writes into client/docs/screenshots and copies the same tree to server/docs/screenshots.
 *
 *   npm run docs:screens
 *   BASE_URL=... API_BASE_URL=... node scripts/capture-screens.mjs
 */
import { chromium } from "playwright";
import { mkdir, cp } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_ROOT = path.resolve(__dirname, "..");
const SERVER_SHOTS = path.resolve(CLIENT_ROOT, "..", "server", "docs", "screenshots");
const CLIENT_SHOTS = path.resolve(CLIENT_ROOT, "docs", "screenshots");

const BASE = (process.env.BASE_URL || "https://automated-accounting-and-datev-pre.vercel.app").replace(
  /\/$/,
  ""
);
const API_BASE = (
  process.env.API_BASE_URL || "https://automated-accounting-and-datev-pre-3lr4.onrender.com"
).replace(/\/$/, "");
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@automatedaccounting.local";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ChangeMeAdmin123!";
const USER_EMAIL = process.env.USER_EMAIL || "user@automatedaccounting.local";
const USER_PASSWORD = process.env.USER_PASSWORD || "ChangeMeUser123!";

const AUTH_ROUTES = [
  ["/login", "login"],
  ["/forgot-password", "forgot-password"],
  ["/verify-otp", "verify-otp"],
  ["/reset-password", "reset-password"],
  ["/unauthorized", "unauthorized"],
];

const ACCOUNTING = [
  ["/import/bank", "import-bank"],
  ["/import/paypal", "import-paypal"],
  ["/transactions", "transactions"],
  ["/transactions?status=open", "transactions-open"],
  ["/transactions?status=conflict", "transactions-conflict"],
  ["/patterns", "patterns"],
  ["/rules", "rules"],
  ["/accounts", "accounts"],
  ["/accounts/overview", "accounts-overview"],
  ["/export", "export"],
  ["/duplicates", "duplicates"],
  ["/reconciliation", "reconciliation"],
  ["/reports", "reports"],
  ["/settings", "settings"],
  ["/settings/company", "settings-company"],
  ["/profile", "profile"],
];

const ADMIN_ROUTES = [
  ["/admin/dashboard", "dashboard"],
  ["/admin/users", "users"],
  ["/admin/settings/system-policies", "system-policies"],
  ...ACCOUNTING.map(([p, n]) => [`/admin${p}`, n]),
];

const USER_ROUTES = [["/dashboard", "dashboard"], ...ACCOUNTING.map(([p, n]) => [`/dashboard${p}`, n])];

function fileSlug(name) {
  return name.replace(/[^\w.-]+/g, "-");
}

async function shot(page, destDir, name) {
  await mkdir(destDir, { recursive: true });
  const file = path.join(destDir, `${fileSlug(name)}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log("  saved", path.relative(CLIENT_ROOT, file));
  return file;
}

async function gotoReady(page, pathAndQuery) {
  const url = `${BASE}${pathAndQuery}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForLoadState("networkidle", { timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(900);
}

async function login(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("#email", { timeout: 20000 });
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /Weiter|Anmelden/i }).click();
  await page.waitForURL((u) => !u.pathname.includes("/login"), { timeout: 30000 });
  await page.waitForLoadState("networkidle", { timeout: 45000 }).catch(() => {});
  await page.waitForTimeout(1200);
}

async function logout(page) {
  await page.evaluate(() => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
  });
  await page.context().clearCookies();
}

async function main() {
  console.log("BASE", BASE);
  await mkdir(path.join(CLIENT_SHOTS, "auth"), { recursive: true });
  await mkdir(path.join(CLIENT_SHOTS, "admin"), { recursive: true });
  await mkdir(path.join(CLIENT_SHOTS, "user"), { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    locale: "de-DE",
  });
  const page = await context.newPage();

  console.log("Auth screens");
  for (const [route, name] of AUTH_ROUTES) {
    await gotoReady(page, route);
    await shot(page, path.join(CLIENT_SHOTS, "auth"), name);
  }

  console.log("Admin screens");
  await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  for (const [route, name] of ADMIN_ROUTES) {
    await gotoReady(page, route);
    await shot(page, path.join(CLIENT_SHOTS, "admin"), name);
  }

  console.log("User screens");
  await logout(page);
  await login(page, USER_EMAIL, USER_PASSWORD);
  for (const [route, name] of USER_ROUTES) {
    await gotoReady(page, route);
    await shot(page, path.join(CLIENT_SHOTS, "user"), name);
  }

  console.log("Live API screens");
  await mkdir(path.join(CLIENT_SHOTS, "live"), { recursive: true });
  for (const [url, name] of [
    [`${API_BASE}/`, "live"],
    [`${API_BASE}/api/v1/health`, "health"],
    [`${API_BASE}/api/docs`, "swagger"],
  ]) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90000 });
    await page.waitForLoadState("networkidle", { timeout: 45000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await shot(page, path.join(CLIENT_SHOTS, "live"), name);
  }

  await browser.close();

  await mkdir(SERVER_SHOTS, { recursive: true });
  await cp(CLIENT_SHOTS, SERVER_SHOTS, { recursive: true });
  console.log("Copied to", SERVER_SHOTS);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
