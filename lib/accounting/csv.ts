/** Lightweight CSV parser for Bank / PayPal imports (client-side preview & import). */

export interface ParsedCsv {
  headers: string[];
  rows: Array<Record<string, string>>;
  errors: Array<{ row: number; message: string }>;
}

function splitLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

function detectDelimiter(headerLine: string): string {
  const commas = (headerLine.match(/,/g) || []).length;
  const semis = (headerLine.match(/;/g) || []).length;
  return semis > commas ? ";" : ",";
}

export function parseCsvText(text: string): ParsedCsv {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return { headers: [], rows: [], errors: [{ row: 0, message: "Datei ist leer" }] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitLine(lines[0], delimiter).map((h) => h.replace(/^"|"$/g, ""));
  if (headers.length < 2) {
    return {
      headers,
      rows: [],
      errors: [{ row: 1, message: "Ungültiger CSV-Header — mindestens 2 Spalten erforderlich" }],
    };
  }

  const rows: Array<Record<string, string>> = [];
  const errors: Array<{ row: number; message: string }> = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cols = splitLine(lines[i], delimiter).map((c) => c.replace(/^"|"$/g, ""));
    if (cols.every((c) => !c)) continue;
    if (cols.length < Math.min(2, headers.length)) {
      errors.push({ row: i + 1, message: "Zu wenige Spalten" });
      continue;
    }
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });
    // Normalize common DE/EN aliases onto canonical keys for import
    row.date = row.date || row.Datum || row.Date || "";
    row.amount = row.amount || row.Betrag || row.Amount || "";
    row.description = row.description || row.Verwendungszweck || row.Beschreibung || row.Description || "";
    row.counterparty = row.counterparty || row.Auftraggeber || row.Name || row.Empfänger || "";
    row.reference = row.reference || row.Referenz || row.Beleg || row.Reference || "";
    row.transactionId = row.transactionId || row.ID || row.Transaktion || row["Transaction ID"] || "";
    row.currency = row.currency || row.Waehrung || row.Währung || row.Currency || "EUR";

    if (!row.date) errors.push({ row: i + 1, message: "Datum fehlt" });
    if (!row.amount) errors.push({ row: i + 1, message: "Betrag fehlt" });
    rows.push(row);
  }

  return { headers, rows, errors };
}

export async function hashFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function downloadTextFile(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
