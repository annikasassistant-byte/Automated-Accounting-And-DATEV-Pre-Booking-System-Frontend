/** Domain types for Automated Accounting & DATEV Pre-Booking */

export type TransactionSource = "bank" | "paypal";

export type TransactionStatus =
  | "new"
  | "suggested"
  | "matched"
  | "approved"
  | "rejected"
  | "exported"
  | "duplicate";

export type ExportStatus = "not_exported" | "queued" | "exported" | "failed";

export type MatchMode = "contains" | "starts_with" | "ends_with" | "regex" | "exact";

export type AccountType = "expense" | "offset" | "revenue" | "asset" | "liability";

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

export interface RuleHistoryEntry {
  id: string;
  version: number;
  changedAt: string;
  changedBy: string;
  summary: string;
}

export interface Transaction {
  id: string;
  date: string;
  transactionId: string;
  source: TransactionSource;
  counterparty: string;
  description: string;
  reference: string;
  amount: number;
  currency: string;
  status: TransactionStatus;
  matchedRuleId?: string | null;
  suggestedRuleId?: string | null;
  suggestedKeywords?: string[];
  confidence?: number;
  expenseAccountId?: string | null;
  offsetAccountId?: string | null;
  exportStatus: ExportStatus;
  importBatchId?: string;
  hash: string;
  history: TransactionHistoryEntry[];
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
  source: TransactionSource;
  fileName: string;
  fileHash: string;
  importedAt: string;
  rowCount: number;
  successCount: number;
  errorCount: number;
  duplicateCount: number;
  status: "processing" | "completed" | "failed";
  errors: ImportError[];
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

export interface DuplicateItem {
  id: string;
  kind: DuplicateKind;
  transactionIds: string[];
  reason: string;
}

export interface ReconciliationSummary {
  importedAmount: number;
  exportedAmount: number;
  difference: number;
  missingCount: number;
  duplicateCount: number;
  validationStatus: "balanced" | "unbalanced" | "pending";
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
}
