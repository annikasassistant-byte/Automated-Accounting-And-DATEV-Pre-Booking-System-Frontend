import type {
  Account,
  AccountingRule,
  DatevExportJob,
  DuplicateItem,
  ImportBatch,
  MatchMode,
  PatternGroup,
  ServerAccount,
  ServerDuplicate,
  ServerExportJob,
  ServerImportBatch,
  ServerRule,
  ServerRuleSuggestion,
  ServerTransaction,
  Transaction,
  TransactionStatus,
} from "@/types/accounting";

export function accountFromServer(s: ServerAccount): Account {
  return {
    id: s._id,
    number: s.number ?? "",
    name: s.name ?? "",
    type: s.type ?? "expense",
    description: s.notes ?? s.description ?? "",
    status:
      s.status === "active" || s.status === "inactive"
        ? s.status
        : s.active === false
          ? "inactive"
          : "active",
  };
}

export function ruleFromServer(s: ServerRule): AccountingRule {
  const keywords = s.keywords?.length
    ? s.keywords
    : s.conditions
        ?.filter((c) => c.field === "rawDescription" && c.operator === "any_of")
        .flatMap((c) => (Array.isArray(c.value) ? c.value : [c.value])) ?? [];

  const expenseAccountId = s.actions?.konto ?? s.konto ?? s.expenseAccountId ?? "";
  const offsetAccountId = s.actions?.gegenkonto ?? s.gegenkonto ?? s.offsetAccountId ?? "";

  return {
    id: s._id,
    name: s.name ?? "",
    keywords,
    matchMode: (s.matchMode as MatchMode) ?? "contains",
    caseSensitive: s.caseSensitive ?? false,
    expenseAccountId,
    offsetAccountId,
    priority: s.priority ?? 50,
    enabled: s.enabled ?? true,
    version: s.version ?? 1,
    matchCount: s.stats?.matchCount ?? s.matchCount ?? 0,
    createdAt: s.createdAt ?? "",
    updatedAt: s.updatedAt ?? "",
    history: (s.history ?? []).map((h) => ({
      ...h,
      id: h.id ?? `rh-${Math.random().toString(36).slice(2, 8)}`,
    })),
  };
}

const PAYPAL_TYPE_PREFIX =
  /^(Handyzahlung|PayPal Express-Zahlung|Allgemeine Zahlung|Zahlung im Einzugsverfahren mit Zahlungsrechnung|Website-Zahlung|Allgemeine Gutschrift|Überweisung als Zahlungsquelle|Bankgutschrift auf PayPal-Konto|Bankgutschrift|Rückzahlung|Sammelzahlung)\s*[—\-–]\s*/i;

function rawCsvField(raw: Record<string, string> | null | undefined, names: string[]): string {
  if (!raw) return "";
  const entries = Object.entries(raw).map(
    ([key, value]) => [key.trim().toLowerCase(), String(value ?? "").trim()] as const,
  );
  for (const name of names) {
    const hit = entries.find(([key]) => key === name.toLowerCase());
    if (hit?.[1]) return hit[1];
  }
  return "";
}

/** PayPal column P — Artikelbezeichnung. Never first-wins over Hinweis. */
export function resolvePaypalArticle(s: {
  article?: string | null;
  rawRow?: Record<string, string> | null;
}): string {
  const fromServer = String(s.article ?? "").trim();
  if (fromServer) return fromServer;
  return rawCsvField(s.rawRow, ["artikelbezeichnung", "article title"]);
}

/** PayPal column AL — Betreff. */
export function resolvePaypalSubject(s: {
  paypal?: { subject?: string | null };
  rawRow?: Record<string, string> | null;
}): string {
  const fromServer = String(s.paypal?.subject ?? "").trim();
  if (fromServer) return fromServer;
  return rawCsvField(s.rawRow, ["betreff", "subject"]);
}

/** PayPal column AM — Hinweis. */
export function resolvePaypalNote(s: {
  paypal?: { note?: string | null };
  rawRow?: Record<string, string> | null;
}): string {
  const fromServer = String(s.paypal?.note ?? "").trim();
  if (fromServer) return fromServer;
  return rawCsvField(s.rawRow, ["hinweis", "note", "notiz"]);
}

/** Bank Verwendungszweck — never the PayPal type alone. Does not hide Hinweis. */
export function resolveVerwendungszweck(s: {
  purpose?: string;
  description?: string;
  article?: string | null;
  rawRow?: Record<string, string> | null;
  paypal?: { type?: string | null };
}): string {
  const bankPurpose = rawCsvField(s.rawRow, ["verwendungszweck"]);
  if (bankPurpose) return bankPurpose;
  if (s.article?.trim()) return s.article.trim();
  const combined = String(s.purpose || s.description || "").trim();
  const stripped = combined.replace(PAYPAL_TYPE_PREFIX, "").trim();
  const paypalType = (s.paypal?.type || "").trim();
  if (stripped && stripped.toLowerCase() !== paypalType.toLowerCase()) return stripped;
  if (combined && combined.toLowerCase() !== paypalType.toLowerCase()) return combined;
  return stripped || combined;
}

function mapStatus(raw?: string): TransactionStatus {
  if (!raw) return "imported";
  const s = raw as TransactionStatus;
  const valid: TransactionStatus[] = [
    "imported",
    "suggested",
    "matched",
    "open",
    "conflict",
    "reviewed",
    "skipped",
    "exported",
    "duplicate",
    "new",
    "approved",
    "rejected",
  ];
  return valid.includes(s) ? s : "imported";
}

export function transactionFromServer(s: ServerTransaction): Transaction {
  const amountCents = s.amountCents ?? 0;
  const amount = s.amount ?? amountCents / 100;
  const paypalArticle = resolvePaypalArticle(s);
  const paypalSubject = resolvePaypalSubject(s);
  const paypalNote = resolvePaypalNote(s);
  const purpose = resolveVerwendungszweck(s);

  return {
    id: s._id,
    date: s.bookingDate ?? s.date ?? "",
    transactionId: s.transactionId ?? s._id,
    source: s.source ?? "bank",
    counterparty: s.counterpartyName ?? s.counterparty ?? "",
    purpose,
    description: purpose,
    rawDescription: s.rawDescription,
    article: paypalArticle || s.article || null,
    paypalSubject: paypalSubject || null,
    paypalNote: paypalNote || null,
    paypalType: s.paypal?.type ?? null,
    rawRow: s.rawRow ?? null,
    reference: s.reference ?? s.bank?.customerRef ?? "",
    amount,
    currency: s.currency ?? "EUR",
    status: mapStatus(s.status),
    matchedRuleId: s.matchedRuleIds?.[0] ?? s.matchedRuleId ?? null,
    matchedRuleIds: s.matchedRuleIds ?? [],
    suggestedRuleId: s.suggestedRuleId ?? null,
    suggestedKeywords: s.suggestedKeywords ?? [],
    confidence: s.confidence,
    expenseAccountId: s.booking?.konto ?? s.expenseAccountId ?? null,
    offsetAccountId: s.booking?.gegenkonto ?? s.offsetAccountId ?? null,
    booking: s.booking,
    exportStatus: s.exportedInBatchId ? "exported" : (s.exportStatus ?? "not_exported"),
    exportedInBatchId: s.exportedInBatchId ?? null,
    importBatchId: s.importBatchId,
    hash: s.hash ?? s.fingerprint ?? "",
    fingerprint: s.fingerprint,
    bookability: s.bookability,
    systemMatched: s.systemMatched,
    systemRuleId: s.systemRuleId,
    history: (s.history ?? []).map((h) => ({
      id: h.id ?? `th-${Math.random().toString(36).slice(2, 8)}`,
      at: h.at ?? "",
      action: h.action ?? "",
      actor: h.actorLabel ?? h.actor ?? "",
      detail: h.note ?? h.detail,
    })),
    paypal: {
      transactionCode: s.paypal?.transactionCode,
      type: s.paypal?.type ?? null,
      subject: paypalSubject || s.paypal?.subject || null,
      note: paypalNote || s.paypal?.note || null,
    },
  };
}

export function importBatchFromServer(s: ServerImportBatch): ImportBatch {
  const errs = s.importErrors ?? s.errors ?? [];
  return {
    id: s._id,
    source: s.source ?? "bank",
    fileName: s.fileName ?? s.filename ?? "",
    fileHash: s.fileHash ?? "",
    importedAt: s.importedAt ?? s.createdAt ?? "",
    rowCount: s.rowCount ?? 0,
    successCount: s.successCount ?? s.createdCount ?? 0,
    errorCount: s.errorCount ?? errs.length,
    duplicateCount: s.duplicateCount ?? 0,
    matchedCount: s.matchedCount ?? 0,
    openCount: s.openCount ?? 0,
    conflictCount: s.conflictCount ?? 0,
    skippedCount: s.skippedCount ?? 0,
    periodStart: s.periodStart ?? null,
    periodEnd: s.periodEnd ?? null,
    status: s.status ?? "completed",
    errors: errs,
    balanceCheck: s.balanceCheck ?? null,
  };
}

export function suggestionFromServer(s: ServerRuleSuggestion): PatternGroup {
  return {
    id: s._id,
    keyword: s.keyword ?? s.pattern ?? s.patternSignature ?? "",
    confidence: s.confidence ?? 0,
    transactionIds: s.transactionIds ?? s.derivedFromTransactionIds ?? [],
    suggestedRuleName: s.suggestedRuleName ?? s.suggestedName ?? s.proposedName ?? "",
    expenseAccountId: s.expenseAccountId ?? s.proposedActions?.konto,
    offsetAccountId: s.offsetAccountId ?? s.proposedActions?.gegenkonto,
    status: s.status === "accepted" ? "rule_created" : ((s.status as PatternGroup["status"]) ?? "pending"),
  };
}

const PERIOD_TYPE_MAP: Record<string, DatevExportJob["period"]> = {
  day: "daily",
  week: "weekly",
  month: "monthly",
  daily: "daily",
  weekly: "weekly",
  monthly: "monthly",
  custom: "custom",
};

export function exportJobFromServer(s: ServerExportJob): DatevExportJob {
  return {
    id: s._id,
    period: PERIOD_TYPE_MAP[s.periodType ?? s.period ?? ""] ?? "custom",
    from: s.periodStart ?? s.from ?? "",
    to: s.periodEnd ?? s.to ?? "",
    transactionCount: s.rowCount ?? s.transactionCount ?? 0,
    createdAt: s.createdAt ?? "",
    createdBy: s.createdBy ?? "",
    status: s.fileName ? "completed" : ((s.status as DatevExportJob["status"]) ?? "draft"),
    warnings: s.warnings ?? [],
    errors: s.errors ?? [],
    fileName: s.fileName,
  };
}

export function duplicateFromServer(s: ServerDuplicate): DuplicateItem {
  const raw = s.transactionIds ?? [];
  const transactions = raw.map((entry) => {
    if (entry == null) {
      return { id: "" };
    }
    if (typeof entry === "string") {
      return { id: entry };
    }
    const obj = entry as { _id?: string; id?: string; bookingDate?: string; amountCents?: number; counterpartyName?: string; purpose?: string; status?: string; fingerprint?: string };
    return {
      id: String(obj._id ?? obj.id ?? ""),
      bookingDate: obj.bookingDate,
      amountCents: obj.amountCents,
      counterpartyName: obj.counterpartyName,
      purpose: obj.purpose,
      status: obj.status,
      fingerprint: obj.fingerprint,
    };
  }).filter((t) => t.id);

  return {
    id: s._id,
    kind: s.kind ?? "possible_duplicate",
    transactionIds: transactions.map((t) => t.id),
    transactions,
    reason: s.reason ?? "",
  };
}
