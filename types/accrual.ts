export type AccrualMarketplace = "amazon" | "backmarket" | "refurbed";

export type AccrualImportKind = "jtl" | AccrualMarketplace;

export interface AccrualImportResult {
  batch: { _id: string; rowCount?: number; createdCount?: number; duplicateCount?: number };
  status: string;
  createdCount?: number;
  duplicateCount?: number;
  eventCount?: number;
  errorCount?: number;
  message?: string;
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
  recentImports: Array<{ _id: string; source: string; filename: string; createdAt: string }>;
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

export interface ClearingConfig {
  revenueAccountDefault?: string | null;
  fxPolicyNote?: string;
  marketplaces?: Record<
    string,
    {
      clearingAccount?: string | null;
      feeAccount?: string | null;
      refundAccount?: string | null;
      debtorAccount?: string | null;
    }
  >;
}
