/**
 * Smoke test: visit all app routes and report HTTP status + console errors.
 * Run: node scripts/smoke-routes.mjs (requires dev server on BASE_URL)
 */
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";

const PUBLIC_ROUTES = [
  "/",
  "/login",
  "/forgot-password",
  "/verify-otp",
  "/reset-password",
  "/unauthorized",
];

const USER_ROUTES = [
  "/dashboard",
  "/dashboard/profile",
  "/dashboard/settings",
];

const ADMIN_ROUTES = [
  "/admin/dashboard",
  "/admin/users",
  "/admin/settings",
  "/admin/profile",
];

async function login(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.getByLabel(/E-Mail|Email/i).fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: /Weiter|Continue|Anmelden/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 15000 });
}

async function visit(page, path, errors) {
  const pageErrors = [];
  const onConsole = (msg) => {
    if (msg.type() === "error") pageErrors.push(msg.text());
  };
  const onPageError = (err) => pageErrors.push(`PAGE ERROR: ${err.message}`);
  page.on("console", onConsole);
  page.on("pageerror", onPageError);

  let status = 0;
  try {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: "networkidle", timeout: 30000 });
    status = res?.status() ?? 0;
    await page.waitForTimeout(800);
    const title = await page.title();
    const bodyText = await page.locator("body").innerText();
    const crashed =
      bodyText.includes("Application error") ||
      bodyText.includes("Unhandled Runtime Error") ||
      bodyText.includes("Something went wrong");
    errors.push({
      path,
      status,
      title,
      crashed,
      consoleErrors: [...pageErrors],
      finalUrl: page.url(),
    });
  } catch (e) {
    errors.push({
      path,
      status: 0,
      title: "",
      crashed: true,
      consoleErrors: [...pageErrors, String(e)],
      finalUrl: page.url(),
    });
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const errors = [];

  const publicPage = await browser.newPage();
  for (const path of PUBLIC_ROUTES) {
    await visit(publicPage, path, errors);
  }
  await publicPage.close();

  const userPage = await browser.newPage();
  await login(
    userPage,
    process.env.SMOKE_USER_EMAIL || "user@automatedaccounting.local",
    process.env.SMOKE_USER_PASSWORD || "ChangeMeUser123!"
  );
  for (const path of USER_ROUTES) {
    await visit(userPage, path, errors);
  }
  await userPage.close();

  const adminPage = await browser.newPage();
  await login(
    adminPage,
    process.env.SMOKE_ADMIN_EMAIL || "admin@automatedaccounting.local",
    process.env.SMOKE_ADMIN_PASSWORD || "ChangeMeAdmin123!"
  );
  for (const path of ADMIN_ROUTES) {
    await visit(adminPage, path, errors);
  }
  await adminPage.close();

  await browser.close();

  const failed = errors.filter((e) => e.crashed || e.status >= 400 || e.consoleErrors.length);
  console.log(JSON.stringify({ total: errors.length, failed: failed.length, results: errors }, null, 2));
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
