export type AccrualCsvChannel = "amazon" | "backmarket" | "refurbed";
export type AccrualMarketplace = AccrualCsvChannel | "kaufland";

export type AccrualImportKind = "jtl" | AccrualCsvChannel;

export type AmazonOnlyClassification = "CANCEL" | "INVOICE_PENDING" | "UNMATCHED";

export type JournalSkipReason =
  | "ORDER_CREATED"
  | "CANCELLATION"
  | "invoice_pending"
  | "void"
  | "already_exists"
  | "zero_amount"
  | "not_bookable"
  | "missing_accounts"
  | "not_found"
  | "already_posted"
  | "unbalanced"
  | string;

export interface AccrualImportResult {
  batch: { _id: string; rowCount?: number; createdCount?: number; duplicateCount?: number };
  status: string;
  createdCount?: number;
  duplicateCount?: number;
  eventCount?: number;
  errorCount?: number;
  message?: string;
}

export interface BusinessEventFx {
  originalCurrency?: string | null;
  originalAmountCents?: number | null;
  eurAmountCents?: number | null;
  exchangeRate?: number | null;
  exchangeRateDate?: string | null;
  exchangeRateSource?: string | null;
}

export interface BusinessEventMetadata {
  fxReview?: boolean;
  provisionalFx?: {
    eurAmountCents?: number | null;
    exchangeRate?: number | null;
    exchangeRateSource?: string | null;
  };
  fxTrueUp?: {
    posted?: boolean;
    deltaCents?: number | null;
  };
  [key: string]: unknown;
}

export interface BusinessEvent {
  _id: string;
  eventType: string;
  marketplace?: string | null;
  marketplaceOrderId?: string | null;
  eventDate: string;
  status: string;
  matchStatus?: string | null;
  source: string;
  sourceRecordId: string;
  fx?: BusinessEventFx | null;
  feeVatTreatment?: "auto" | "reverse_charge_13b" | "input_vat_de" | "none";
  metadata?: BusinessEventMetadata | null;
  journalEntryId?: string | null;
}

export interface AccountingException {
  _id: string;
  exceptionType: string;
  status: string;
  title: string;
  detail?: string;
  message?: string;
  type?: string;
  marketplace?: string | null;
  marketplaceOrderId?: string | null;
  businessEventId?: string | null;
  sourceRecordId?: string | null;
  createdAt: string;
}

export interface AccrualInbox {
  openExceptionCount: number;
  openExceptions: AccountingException[];
  consolidatedExceptions?: Array<{
    title: string;
    count: number;
    ids: string[];
    sample?: AccountingException;
  }>;
  pendingEvents: BusinessEvent[];
  pendingEventsListed?: number;
  pendingEventsTotal?: number;
  invoicePendingCount?: number;
  recentImports: Array<{ _id: string; source: string; filename: string; createdAt: string }>;
  periodFrom?: string | null;
  periodTo?: string | null;
  listNote?: string;
  julyOpsSteps?: string[];
}

export interface PayoutOverviewRow {
  marketplace: string;
  expectedCents: number;
  actualPayoutCents: number;
  differenceCents: number;
  salesCents?: number;
  feesCents?: number;
  refundsCents?: number;
  settlementCents?: number;
  payoutCount?: number;
  salesCount?: number;
  settlementCount?: number;
  deferredReleasedCount?: number;
  deferredRetainedCount?: number;
  dataStatus?: string;
  periodFrom?: string | null;
  periodTo?: string | null;
  components?: Record<string, number | null>;
  note?: string;
}

export interface AccrualOverview {
  period: { from: string | null; to: string | null };
  revenueByMarketplace: Array<{
    marketplace: string;
    revenueAccount: string | null;
    salesCents: number;
    salesCount: number;
    refundsCents: number;
    feesCents: number;
    adjustmentsCents: number;
    settlementCents?: number;
    expectedPayoutCents?: number;
    actualPayoutCents?: number;
    payoutDifferenceCents?: number;
    netCents: number;
  }>;
  cancellationsCount: number;
  invoicePendingCount: number;
  invoicePending: BusinessEvent[];
  openExceptionCount: number;
  unclassifiedCashCount: number;
  unclassifiedCash: unknown[];
  classifiedExpenses: Array<{
    id: string;
    bookingDate?: string;
    counterpartyName?: string;
    purpose?: string;
    amountCents?: number;
    konto?: string;
    status?: string;
  }>;
  decisionsNeeded: Array<{
    kind: string;
    id: string;
    title: string;
    marketplace?: string | null;
  }>;
}

export interface JournalEntry {
  _id: string;
  businessEventId: string;
  postingDate: string;
  description: string;
  status: string;
}

export interface JournalLine {
  _id: string;
  accountNumber: string;
  sollHaben: "S" | "H";
  amountCents: number;
  bookingText: string;
}

export interface FeeVatMarketplaceConfig {
  treatment?: "reverse_charge_13b" | "input_vat_de" | "none";
  ratePercent?: number;
  inputVatAccount?: string | null;
  outputVatAccount?: string | null;
}

export interface ClearingConfig {
  revenueAccountDefault?: string | null;
  fxPolicyNote?: string;
  provisionalFxEnabled?: boolean;
  feeVat?: Record<string, FeeVatMarketplaceConfig>;
  marketplaces?: Record<
    string,
    {
      clearingAccount?: string | null;
      feeAccount?: string | null;
      refundAccount?: string | null;
      debtorAccount?: string | null;
      revenueAccount?: string | null;
      adjustmentAccount?: string | null;
      fxGainAccount?: string | null;
      fxLossAccount?: string | null;
    }
  >;
}

export interface PeriodCoverageMarketplaceSource {
  orderBatches: number;
  financialBatches: number;
  events: number;
}

export interface PeriodCoverage {
  period: { from: string | null; to: string | null };
  sources: {
    jtl: { batches: number; rows: number; events: number };
    amazon: PeriodCoverageMarketplaceSource;
    backmarket: PeriodCoverageMarketplaceSource;
    refurbed: PeriodCoverageMarketplaceSource;
  };
  exceptionsOpen: number;
  journalPostedLines: number;
  journalDraftEntries: number;
  gaps: string[];
}

export interface JournalBulkSkipped {
  eventId: string;
  reason: JournalSkipReason;
}

export interface JournalBulkBuildResult {
  built: number;
  skipped: JournalBulkSkipped[];
}

export interface JournalBulkPostResult {
  posted: number;
  skipped: JournalBulkSkipped[];
}

export interface FxTrueUpResult {
  eventId?: string;
  deltaCents?: number;
  provisionalEurCents?: number;
  actualEurCents?: number;
  posted?: boolean;
  message?: string;
  built?: number;
  skipped?: JournalBulkSkipped[];
  results?: Array<{ eventId: string; deltaCents?: number; posted?: boolean; message?: string }>;
}

export interface AccrualDatevPreviewResult {
  rowCount: number;
  from?: string;
  to?: string;
  validation?: { errors?: string[]; warnings?: string[]; passed?: boolean };
  samples?: Array<Record<string, unknown>>;
  settings?: { advisorNumber?: string; clientNumber?: string };
  note?: string;
}

export interface AccrualDatevValidateResult {
  valid?: boolean;
  passed?: boolean;
  errors?: string[];
  warnings?: string[];
  rowCount?: number;
  validation?: { errors?: string[]; warnings?: string[]; passed?: boolean };
}

export interface AccrualDatevJob {
  _id: string;
  periodStart?: string;
  periodEnd?: string;
  fileName?: string;
  rowCount?: number;
  status?: string;
  createdAt?: string;
  validationResults?: { errors?: string[]; warnings?: string[]; passed?: boolean };
}

export interface AccrualMonthPack {
  status: "OK" | "MISSING_DATA" | string;
  message?: string;
  period: { from: string | null; to: string | null };
  overview?: {
    revenueByMarketplace: AccrualOverview["revenueByMarketplace"];
    cancellationsCount: number;
    invoicePendingCount: number;
    openExceptionCount: number;
  };
  abgleich?: {
    matchedCount: number;
    amazonOnlyCount: number;
    jtlOnlyCount: number;
    amazonOrderCount: number;
  };
  journal?: {
    postedEntries: number;
    postedLines: number;
    draftEntries: number;
  };
  feePreviewSummary?: {
    note?: string;
    feesCentsByMarketplace?: Array<{ marketplace: string; feesCents: number }>;
  };
}

export interface TaxCode {
  _id: string;
  code: string;
  label: string;
  description?: string;
  buKey?: string | null;
  vatRatePercent?: number | null;
  classification?: string | null;
  enabled?: boolean;
}

export interface BulkResolveExceptionsResult {
  updated?: number;
  matched?: number;
  ids?: string[];
}

export const JOURNAL_SKIP_REASON_LABELS: Record<string, string> = {
  ORDER_CREATED: "Bestellung angelegt (kein Umsatz)",
  CANCELLATION: "Stornierung (kein Umsatz)",
  invoice_pending: "Rechnung ausstehend",
  void: "Storniert / ungültig",
  already_exists: "Journal existiert bereits",
  zero_amount: "Betrag ist null",
  not_bookable: "Nicht buchbar",
  missing_accounts: "Clearing-Konten fehlen",
  not_found: "Nicht gefunden",
  already_posted: "Bereits gebucht",
  unbalanced: "Journal nicht ausgeglichen",
};

export const AMAZON_ONLY_CLASSIFICATION_LABELS: Record<AmazonOnlyClassification, string> = {
  CANCEL: "Storno",
  INVOICE_PENDING: "Rechnung ausstehend",
  UNMATCHED: "Unzugeordnet",
};
