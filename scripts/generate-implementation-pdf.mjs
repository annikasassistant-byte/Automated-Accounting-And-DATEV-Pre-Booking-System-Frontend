import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const htmlPath = path.join(root, "docs/qa/IMPLEMENTATION_STATUS_CLIENT_REPORT_20260902.html");
const pdfPath = path.join(root, "docs/qa/IMPLEMENTATION_STATUS_CLIENT_REPORT_20260902.pdf");

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`, { waitUntil: "networkidle" });
await page.pdf({
  path: pdfPath,
  format: "A4",
  printBackground: true,
  margin: { top: "12mm", bottom: "12mm", left: "12mm", right: "12mm" },
});
await browser.close();
console.log(`PDF written: ${pdfPath}`);
