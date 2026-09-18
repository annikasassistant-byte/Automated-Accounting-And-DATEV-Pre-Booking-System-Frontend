export type AccrualCsvChannel = "amazon" | "backmarket" | "refurbed";
export type AccrualMarketplace = AccrualCsvChannel | "kaufland";

export type AccrualImportKind = "jtl" | AccrualCsvChannel;

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
}

export interface AccountingException {
  _id: string;
  exceptionType: string;
  status: string;
  title: string;
  detail?: string;
  marketplace?: string | null;
  marketplaceOrderId?: string | null;
  createdAt: string;
}

export interface AccrualInbox {
  openExceptionCount: number;
  openExceptions: AccountingException[];
  pendingEvents: BusinessEvent[];
  invoicePendingCount?: number;
  recentImports: Array<{ _id: string; source: string; filename: string; createdAt: string }>;
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
