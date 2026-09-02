/** Domain types for Automated Accounting & DATEV Pre-Booking */

export type TransactionSource = "bank" | "paypal";

/** Import batch sources including accrual paths */
export type ImportBatchSource =
  | TransactionSource
  | "jtl"
  | "marketplace_amazon"
  | "marketplace_backmarket"
  | "marketplace_refurbed";

export type TransactionStatus =
  | "imported"
  | "suggested"
  | "matched"
  | "open"
  | "conflict"
  | "reviewed"
  | "skipped"
  | "exported"
  | "duplicate"
  // Legacy aliases kept for compatibility
  | "new"
  | "approved"
  | "rejected";

export type ExportStatus = "not_exported" | "queued" | "exported" | "failed";

export type MatchMode = "contains" | "starts_with" | "ends_with" | "regex" | "exact";

export type AccountType = "expense" | "offset" | "revenue" | "asset" | "liability" | "clearing" | "other";

export type DuplicateKind = "already_exported" | "possible_duplicate" | "unique" | "conflict";

export type PatternAction = "pending" | "ignored" | "merged" | "split" | "rule_created";

export interface Account {
  id: string;
  number: string;
  name: string;
  type: AccountType;
  description: string;
  status: "active" | "inactive";
}

/** Server shape for accounts — mapped via accountFromServer() */
export interface ServerAccount {
  _id: string;
  number: string;
  name: string;
  type: AccountType;
  active?: boolean;
  status?: "active" | "inactive";
  notes?: string;
  description?: string;
}

/** Server rule condition */
export interface RuleCondition {
  field: string;
  operator: string;
  value: string | string[];
}

/** Server rule action */
export interface RuleAction {
  field: string;
  value: string;
}

export interface AccountingRule {
  id: string;
  name: string;
  keywords: string[];
  matchMode: MatchMode;
  caseSensitive: boolean;
  expenseAccountId: string;
  offsetAccountId: string;
  priority: number;
  enabled: boolean;
  version: number;
  matchCount: number;
  createdAt: string;
  updatedAt: string;
  history: RuleHistoryEntry[];
}

/** Server shape for rules — mapped via ruleFromServer() */
export interface ServerRule {
  _id: string;
  name: string;
  conditions?: RuleCondition[];
  actions?: { konto?: string; gegenkonto?: string; buKey?: string; bookingTextTemplate?: string };
  keywords?: string[];
  matchMode?: MatchMode;
  caseSensitive?: boolean;
  expenseAccountId?: string;
  offsetAccountId?: string;
  konto?: string;
  gegenkonto?: string;
  buKey?: string;
  bookingText?: string;
  priority?: number;
  enabled?: boolean;
  version?: number;
  matchCount?: number;
  stats?: { matchCount?: number };
  createdAt?: string;
  updatedAt?: string;
  history?: RuleHistoryEntry[];
}

export interface RuleHistoryEntry {
  id: string;
  version: number;
  changedAt: string;
  changedBy: string;
  summary: string;
}

/** Server transaction booking sub-document */
export interface TransactionBooking {
  konto?: string;
  gegenkonto?: string;
  buKey?: string;
  bookingText?: string;
  sollHaben?: "S" | "H";
}

export interface Transaction {
  id: string;
  date: string;
  transactionId: string;
  source: TransactionSource;
  counterparty: string;
  /** Verwendungszweck from CSV (`purpose` on the server). */
  purpose: string;
  description: string;
  rawDescription?: string;
  article?: string | null;
  paypalSubject?: string | null;
  paypalNote?: string | null;
  paypalType?: string | null;
  rawRow?: Record<string, string> | null;
  reference: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  matchedRuleId?: string | null;
  matchedRuleIds?: string[];
  suggestedRuleId?: string | null;
  suggestedKeywords?: string[];
  confidence?: number;
  expenseAccountId?: string | null;
  offsetAccountId?: string | null;
  booking?: TransactionBooking;
  exportStatus: ExportStatus;
  exportedInBatchId?: string | null;
  importBatchId?: string;
  hash: string;
  fingerprint?: string;
  bookability?: string;
  systemMatched?: boolean;
  systemRuleId?: string;
  history: TransactionHistoryEntry[];
  paypal?: {
    transactionCode?: string;
    type?: string | null;
    subject?: string | null;
    note?: string | null;
  };
}

/** Server shape for transactions — mapped via transactionFromServer() */
export interface ServerTransaction {
  _id: string;
  bookingDate?: string;
  date?: string;
  amountCents?: number;
  amount?: number;
  source?: TransactionSource;
  counterpartyName?: string;
  counterparty?: string;
  purpose?: string;
  description?: string;
  rawDescription?: string;
  article?: string | null;
  rawRow?: Record<string, string> | null;
  paypal?: {
    transactionCode?: string;
    type?: string | null;
    subject?: string | null;
    note?: string | null;
  };
  bank?: { bookingText?: string | null; customerRef?: string | null };
  reference?: string;
  status?: string;
  booking?: TransactionBooking;
  matchedRuleIds?: string[];
  matchedRuleId?: string;
  confidence?: number;
  exportedInBatchId?: string | null;
  exportStatus?: ExportStatus;
  fingerprint?: string;
  importBatchId?: string;
  history?: Array<{ id?: string; at?: string; action?: string; actor?: string; actorLabel?: string; detail?: string; note?: string }>;
  bookability?: string;
  systemMatched?: boolean;
  systemRuleId?: string;
  transactionId?: string;
  currency?: string;
  hash?: string;
  suggestedRuleId?: string;
  suggestedKeywords?: string[];
  expenseAccountId?: string;
  offsetAccountId?: string;
}

export interface TransactionHistoryEntry {
  id: string;
  at: string;
  action: string;
  actor: string;
  detail?: string;
}

export interface ImportBatch {
  id: string;
  source: ImportBatchSource;
  fileName: string;
  fileHash: string;
  importedAt: string;
  rowCount: number;
  successCount: number;
  errorCount: number;
  duplicateCount: number;
  matchedCount?: number;
  openCount?: number;
  conflictCount?: number;
  skippedCount?: number;
  periodStart?: string | null;
  periodEnd?: string | null;
  status: "processing" | "completed" | "failed" | "duplicate_file";
  errors: ImportError[];
  balanceCheck?: { expectedGuthaben: number; calculatedGuthaben: number; matched: boolean; note?: string } | null;
  message?: string;
}

export interface ServerImportBatch {
  _id: string;
  source?: TransactionSource;
  fileName?: string;
  filename?: string;
  fileHash?: string;
  importedAt?: string;
  createdAt?: string;
  rowCount?: number;
  successCount?: number;
  createdCount?: number;
  errorCount?: number;
  duplicateCount?: number;
  matchedCount?: number;
  openCount?: number;
  conflictCount?: number;
  skippedCount?: number;
  periodStart?: string | null;
  periodEnd?: string | null;
  status?: "processing" | "completed" | "failed" | "duplicate_file";
  errors?: ImportError[];
  importErrors?: ImportError[];
  balanceCheck?: { expectedGuthaben: number; calculatedGuthaben: number; matched: boolean; note?: string } | null;
}

export interface ImportError {
  row: number;
  message: string;
}

export interface PatternGroup {
  id: string;
  keyword: string;
  confidence: number;
  transactionIds: string[];
  suggestedRuleName: string;
  expenseAccountId?: string;
  offsetAccountId?: string;
  status: PatternAction;
}

export interface ServerRuleSuggestion {
  _id: string;
  keyword?: string;
  pattern?: string;
  patternSignature?: string;
  confidence?: number;
  transactionIds?: string[];
  derivedFromTransactionIds?: string[];
  suggestedRuleName?: string;
  suggestedName?: string;
  proposedName?: string;
  proposedActions?: { konto?: string; gegenkonto?: string; buKey?: string };
  expenseAccountId?: string;
  offsetAccountId?: string;
  status?: PatternAction | "pending" | "accepted" | "rejected" | "ignored";
  count?: number;
}

export interface DatevExportJob {
  id: string;
  period: "daily" | "weekly" | "monthly" | "custom";
  from: string;
  to: string;
  transactionCount: number;
  createdAt: string;
  createdBy: string;
  status: "draft" | "validated" | "completed" | "failed";
  warnings: string[];
  errors: string[];
  fileName?: string;
}

export interface ServerExportJob {
  _id: string;
  period?: string;
  periodType?: string;
  from?: string;
  to?: string;
  periodStart?: string;
  periodEnd?: string;
  transactionCount?: number;
  rowCount?: number;
  createdAt?: string;
  createdBy?: string;
  status?: string;
  warnings?: string[];
  errors?: string[];
  fileName?: string;
}

export interface DuplicateTxnPreview {
  id: string;
  bookingDate?: string;
  amountCents?: number;
  counterpartyName?: string;
  purpose?: string;
  status?: string;
  fingerprint?: string;
}

export interface DuplicateItem {
  id: string;
  kind: DuplicateKind | string;
  transactionIds: string[];
  transactions: DuplicateTxnPreview[];
  reason: string;
}

export interface ServerDuplicate {
  _id: string;
  kind?: DuplicateKind | string;
  transactionIds?: Array<string | (DuplicateTxnPreview & { _id?: string })>;
  reason?: string;
}

export interface ReconciliationSummary {
  importedAmount: number;
  exportedAmount: number;
  difference: number;
  missingCount: number;
  duplicateCount: number;
  openCount?: number;
  totalCount?: number;
  validationStatus: "balanced" | "unbalanced" | "pending";
  blockers?: string[];
  byStatus?: Record<string, { count: number; totalCents: number }>;
  period?: { from?: string; to?: string };
}

export interface PaypalBalanceResult {
  importId: string;
  totalIn: number;
  totalOut: number;
  feeTotal: number;
  net: number;
  transactionCount: number;
  balanceCheck?: {
    expectedGuthaben: number | null;
    calculatedGuthaben: number | null;
    matched: boolean | null;
    note?: string | null;
  } | null;
}

export interface CompanySettings {
  companyName: string;
  taxId: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
}

export interface DatevSettings {
  consultantNumber: string;
  clientNumber: string;
  chartOfAccounts: string;
  fiscalYearStart: string;
  defaultExpenseAccount: string;
  defaultOffsetAccount: string;
  blockExportIfOpen?: boolean;
}

export interface SystemPolicyEnabled {
  s1ExcludePaypalTypes: boolean;
  s2GuthabenIntegrity: boolean;
  s3EurOnly: boolean;
  s5BankPaypalClearing: boolean;
  s9MarketplacePark: boolean;
  s10CommercialVatPark: boolean;
  s11OwnerRelatedPark: boolean;
  s12ForbiddenCollectives: boolean;
  s15Inventory: boolean;
}

export interface SystemPolicyConfig {
  accounts: {
    bank: string;
    paypal: string;
    clearing: string;
    privateInventory: string;
    forbiddenCollectives: string[];
  };
  enabled: SystemPolicyEnabled;
  paypalExcludeTypes: string[];
  marketplacePatterns: string[];
  bankPaypalCounterpartyPatterns: string[];
  bankPaypalPurposePatterns: string[];
  paypalBankTransferTypePatterns: string[];
  ownerRelatedPatterns: string[];
  commercialVatHints: string[];
  inventoryKeywords: string[];
  clearingBookingText: string;
}

export interface AccountTotalReport {
  accountNumber: string;
  accountName?: string;
  total: number;
  count: number;
}

/** Kontenübersicht trial-balance row (double-entry). */
export interface AccountOverviewRow {
  accountNumber: string;
  accountName: string;
  debit: number;
  credit: number;
  balance: number;
  count: number;
  lastBookingDate?: string | null;
}

export interface AccountLedgerLine {
  transactionId: string;
  bookingDate: string;
  paymentDate: string;
  amountCents: number;
  side: "S" | "H";
  contraAccount: string;
  purpose: string;
  source: TransactionSource;
  status: string;
}

export interface AccountLedgerResult {
  accountNumber: string;
  accountName: string;
  debit: number;
  credit: number;
  balance: number;
  lines: AccountLedgerLine[];
}

export interface StatusBreakdownReport {
  status: string;
  count: number;
  total: number;
}
