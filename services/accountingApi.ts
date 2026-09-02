import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "@/services/baseQuery";
import type { ApiSuccess } from "@/services/types";
import type {
  Account,
  AccountingRule,
  AccountLedgerResult,
  AccountOverviewRow,
  AccountTotalReport,
  CompanySettings,
  DatevExportJob,
  DatevSettings,
  DuplicateItem,
  ImportBatch,
  PatternGroup,
  PaypalBalanceResult,
  ReconciliationSummary,
  ServerAccount,
  ServerDuplicate,
  ServerExportJob,
  ServerImportBatch,
  ServerRule,
  ServerRuleSuggestion,
  ServerTransaction,
  StatusBreakdownReport,
  SystemPolicyConfig,
  Transaction,
} from "@/types/accounting";
import {
  accountFromServer,
  duplicateFromServer,
  exportJobFromServer,
  importBatchFromServer,
  ruleFromServer,
  suggestionFromServer,
  transactionFromServer,
} from "@/lib/accounting/mappers";
import { downloadAuthenticatedFile } from "@/lib/download";
import type {
  AccrualImportResult,
  AccrualInbox,
  AccrualMarketplace,
  AccountingException,
  BusinessEvent,
  ClearingConfig,
  JournalEntry,
  JournalLine,
} from "@/types/accrual";

type Paginated<T> = { items: T[]; meta?: { page?: number; limit?: number; total?: number } };

function paginatedFromApi<T>(r: ApiSuccess<T[]>): Paginated<T> {
  return {
    items: r.data ?? [],
    meta: r.meta as Paginated<T>["meta"],
  };
}

export const accountingApi = createApi({
  reducerPath: "accountingApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Accounts",
    "Imports",
    "Transactions",
    "Rules",
    "Suggestions",
    "Exports",
    "Duplicates",
    "Settings",
    "Reports",
    "Reconciliation",
    "Ledger",
    "Accrual",
  ],
  endpoints: (builder) => ({
    // ──────────── Accounts ────────────
    getAccounts: builder.query<Account[], void>({
      query: () => "/accounts",
      transformResponse: (r: ApiSuccess<ServerAccount[]>) =>
        (r.data ?? []).map(accountFromServer),
      providesTags: ["Accounts"],
    }),

    getAccountsOverview: builder.query<
      AccountOverviewRow[],
      { from?: string; to?: string; includeEmpty?: boolean } | void
    >({
      query: (args) => ({
        url: "/accounts/overview",
        params: {
          from: args?.from,
          to: args?.to,
          includeEmpty: args?.includeEmpty ? "true" : "false",
        },
      }),
      transformResponse: (r: ApiSuccess<{ accounts?: AccountOverviewRow[] }>) =>
        r.data?.accounts ?? [],
      providesTags: ["Accounts", "Ledger"],
    }),

    getAccountLedger: builder.query<
      AccountLedgerResult,
      { number: string; from?: string; to?: string }
    >({
      query: ({ number, from, to }) => ({
        url: `/accounts/${encodeURIComponent(number)}/ledger`,
        params: { from, to },
      }),
      transformResponse: (r: ApiSuccess<AccountLedgerResult>) => r.data,
      providesTags: (_r, _e, arg) => [{ type: "Ledger", id: arg.number }],
    }),

    createAccount: builder.mutation<Account, Partial<ServerAccount>>({
      query: (body) => ({ url: "/accounts", method: "POST", body }),
      transformResponse: (r: ApiSuccess<ServerAccount>) => accountFromServer(r.data),
      invalidatesTags: ["Accounts"],
    }),

    updateAccount: builder.mutation<Account, { id: string; body: Partial<ServerAccount> }>({
      query: ({ id, body }) => ({ url: `/accounts/${id}`, method: "PATCH", body }),
      transformResponse: (r: ApiSuccess<ServerAccount>) => accountFromServer(r.data),
      invalidatesTags: ["Accounts"],
    }),

    seedAccounts: builder.mutation<void, void>({
      query: () => ({ url: "/accounts/seed", method: "POST" }),
      invalidatesTags: ["Accounts"],
    }),

    importAccountsCsv: builder.mutation<void, FormData>({
      query: (body) => ({ url: "/accounts/import-csv", method: "POST", body }),
      invalidatesTags: ["Accounts"],
    }),

    exportAccountsCsv: builder.query<void, void>({
      queryFn: async () => {
        try {
          await downloadAuthenticatedFile("/accounts/export-csv", "kontenplan.csv");
          return { data: undefined };
        } catch (e) {
          return { error: { status: "CUSTOM_ERROR", error: String(e) } as never };
        }
      },
    }),

    // ──────────── Imports ────────────
    importBank: builder.mutation<ImportBatch, FormData>({
      query: (body) => ({ url: "/imports/bank", method: "POST", body }),
      transformResponse: (r: ApiSuccess<any>) => {
        const payload = r.data;
        const batch = payload?.batch ?? payload;
        const mapped = importBatchFromServer(batch);
        return {
          ...mapped,
          status: payload?.status === "duplicate_file" ? "duplicate_file" : mapped.status,
          balanceCheck: batch?.balanceCheck ?? null,
          message: payload?.message,
        } as ImportBatch;
      },
      invalidatesTags: ["Imports", "Transactions", "Ledger"],
    }),

    importPaypal: builder.mutation<ImportBatch, FormData>({
      query: (body) => ({ url: "/imports/paypal", method: "POST", body }),
      transformResponse: (r: ApiSuccess<any>) => {
        const payload = r.data;
        const batch = payload?.batch ?? payload;
        const mapped = importBatchFromServer(batch);
        return {
          ...mapped,
          status: payload?.status === "duplicate_file" ? "duplicate_file" : mapped.status,
          balanceCheck: batch?.balanceCheck ?? null,
          message: payload?.message,
        } as ImportBatch;
      },
      invalidatesTags: ["Imports", "Transactions", "Ledger"],
    }),

    getImports: builder.query<ImportBatch[], { source?: string; limit?: number; page?: number } | void>({
      query: (params) => ({
        url: "/imports",
        params: { limit: 50, sort: "-createdAt", ...(params || {}) },
      }),
      transformResponse: (r: ApiSuccess<ServerImportBatch[]>) =>
        (Array.isArray(r.data) ? r.data : []).map(importBatchFromServer),
      providesTags: ["Imports"],
    }),

    getImport: builder.query<ImportBatch, string>({
      query: (id) => `/imports/${id}`,
      transformResponse: (r: ApiSuccess<ServerImportBatch>) => importBatchFromServer(r.data),
      providesTags: ["Imports"],
    }),

    reprocessImport: builder.mutation<
      { batchId: string; processed: number; matchedCount: number; openCount: number; conflictCount: number },
      string
    >({
      query: (id) => ({ url: `/imports/${id}/reprocess`, method: "POST" }),
      transformResponse: (r: ApiSuccess) =>
        r.data as {
          batchId: string;
          processed: number;
          matchedCount: number;
          openCount: number;
          conflictCount: number;
        },
      invalidatesTags: ["Imports", "Transactions", "Reconciliation", "Duplicates", "Ledger"],
    }),

    // ──────────── Transactions ────────────
    getTransactions: builder.query<
      Paginated<Transaction>,
      {
        status?: string;
        source?: string;
        from?: string;
        to?: string;
        search?: string;
        account?: string;
        importId?: string;
        includeSkipped?: string;
        page?: number;
        limit?: number;
      } | void
    >({
      query: (params) => ({ url: "/transactions", params: params || {} }),
      transformResponse: (r: ApiSuccess<ServerTransaction[]> & { meta?: unknown }) => ({
        items: (r.data ?? []).map(transactionFromServer),
        meta: r.meta as Paginated<Transaction>["meta"],
      }),
      providesTags: ["Transactions"],
    }),

    getOpenTransactions: builder.query<Transaction[], void>({
      query: () => "/transactions/open",
      transformResponse: (r: ApiSuccess<ServerTransaction[]>) =>
        (r.data ?? []).map(transactionFromServer),
      providesTags: ["Transactions"],
    }),

    getConflictTransactions: builder.query<Transaction[], void>({
      query: () => "/transactions/conflicts",
      transformResponse: (r: ApiSuccess<ServerTransaction[]>) =>
        (r.data ?? []).map(transactionFromServer),
      providesTags: ["Transactions"],
    }),

    getTransaction: builder.query<Transaction, string>({
      query: (id) => `/transactions/${id}`,
      transformResponse: (r: ApiSuccess<ServerTransaction>) => transactionFromServer(r.data),
      providesTags: ["Transactions"],
    }),

    applyRules: builder.mutation<{ applied: number }, void>({
      query: () => ({ url: "/transactions/apply-rules", method: "POST" }),
      transformResponse: (r: ApiSuccess) => r.data as { applied: number },
      invalidatesTags: ["Transactions", "Ledger"],
    }),

    assignTransaction: builder.mutation<
      Transaction,
      {
        id: string;
        body: {
          konto?: string;
          gegenkonto?: string;
          buKey?: string;
          bookingText?: string;
        };
      }
    >({
      query: ({ id, body }) => ({
        url: `/transactions/${id}/assign`,
        method: "POST",
        body,
      }),
      transformResponse: (r: ApiSuccess<ServerTransaction>) => transactionFromServer(r.data),
      invalidatesTags: ["Transactions", "Ledger"],
    }),

    bulkAssignTransactions: builder.mutation<
      void,
      {
        ids: string[];
        konto?: string;
        gegenkonto?: string;
        buKey?: string;
        bookingText?: string;
      }
    >({
      query: (body) => ({ url: "/transactions/bulk-assign", method: "POST", body }),
      invalidatesTags: ["Transactions", "Ledger"],
    }),

    updateTransactionStatus: builder.mutation<
      Transaction,
      { id: string; body: { status: string } }
    >({
      query: ({ id, body }) => ({
        url: `/transactions/${id}/status`,
        method: "POST",
        body,
      }),
      transformResponse: (r: ApiSuccess<ServerTransaction>) => transactionFromServer(r.data),
      invalidatesTags: ["Transactions", "Ledger"],
    }),

    bulkUpdateStatus: builder.mutation<void, { ids: string[]; status: string }>({
      query: (body) => ({ url: "/transactions/bulk-status", method: "POST", body }),
      invalidatesTags: ["Transactions", "Ledger"],
    }),

    // ──────────── Rules ────────────
    getRules: builder.query<AccountingRule[], void>({
      query: () => "/rules",
      transformResponse: (r: ApiSuccess<ServerRule[]>) =>
        (r.data ?? []).map(ruleFromServer),
      providesTags: ["Rules"],
    }),

    createRule: builder.mutation<AccountingRule, Record<string, unknown>>({
      query: (body) => ({ url: "/rules", method: "POST", body }),
      transformResponse: (r: ApiSuccess<ServerRule>) => ruleFromServer(r.data),
      invalidatesTags: ["Rules"],
    }),

    createRuleFromTransaction: builder.mutation<
      AccountingRule,
      { id: string; body?: Record<string, unknown> }
    >({
      query: ({ id, body }) => ({
        url: `/transactions/${id}/create-rule`,
        method: "POST",
        body: body || {},
      }),
      transformResponse: (r: ApiSuccess<ServerRule>) => ruleFromServer(r.data),
      invalidatesTags: ["Rules", "Transactions", "Ledger"],
    }),

    getRule: builder.query<AccountingRule, string>({
      query: (id) => `/rules/${id}`,
      transformResponse: (r: ApiSuccess<ServerRule>) => ruleFromServer(r.data),
      providesTags: ["Rules"],
    }),

    updateRule: builder.mutation<AccountingRule, { id: string; body: Record<string, unknown> }>({
      query: ({ id, body }) => ({ url: `/rules/${id}`, method: "PATCH", body }),
      transformResponse: (r: ApiSuccess<ServerRule>) => ruleFromServer(r.data),
      invalidatesTags: ["Rules"],
    }),

    deleteRule: builder.mutation<void, string>({
      query: (id) => ({ url: `/rules/${id}`, method: "DELETE" }),
      invalidatesTags: ["Rules"],
    }),

    enableRule: builder.mutation<void, string>({
      query: (id) => ({ url: `/rules/${id}/enable`, method: "POST" }),
      invalidatesTags: ["Rules"],
    }),

    disableRule: builder.mutation<void, string>({
      query: (id) => ({ url: `/rules/${id}/disable`, method: "POST" }),
      invalidatesTags: ["Rules"],
    }),

    testRules: builder.mutation<unknown, Record<string, unknown>>({
      query: (body) => ({ url: "/rules/test", method: "POST", body }),
      transformResponse: (r: ApiSuccess) => r.data,
    }),

    seedRules: builder.mutation<void, void>({
      query: () => ({ url: "/rules/seed-optional", method: "POST" }),
      invalidatesTags: ["Rules"],
    }),

    // ──────────── Suggestions / Patterns ────────────
    getRuleSuggestions: builder.query<PatternGroup[], void>({
      query: () => "/rule-suggestions",
      transformResponse: (r: ApiSuccess<ServerRuleSuggestion[]>) =>
        (r.data ?? []).map(suggestionFromServer),
      providesTags: ["Suggestions"],
    }),

    acceptSuggestion: builder.mutation<void, string>({
      query: (id) => ({ url: `/rule-suggestions/${id}/accept`, method: "POST" }),
      invalidatesTags: ["Suggestions", "Rules"],
    }),

    rejectSuggestion: builder.mutation<void, string>({
      query: (id) => ({ url: `/rule-suggestions/${id}/reject`, method: "POST" }),
      invalidatesTags: ["Suggestions"],
    }),

    analyzePatterns: builder.mutation<PatternGroup[], void>({
      query: () => ({ url: "/patterns/analyze", method: "POST" }),
      transformResponse: (r: ApiSuccess<ServerRuleSuggestion[]>) =>
        (r.data ?? []).map(suggestionFromServer),
      invalidatesTags: ["Suggestions"],
    }),

    // ──────────── Exports ────────────
    previewExport: builder.mutation<
      { transactionCount: number; total: number; warnings: string[]; errors: string[] },
      { from: string; to: string; periodType?: string }
    >({
      query: (body) => ({ url: "/exports/datev/preview", method: "POST", body }),
      transformResponse: (r: ApiSuccess<any>) => {
        const d = r.data;
        return {
          transactionCount: d?.rowCount ?? d?.transactionCount ?? 0,
          total: d?.total ?? 0,
          warnings: d?.validation?.warnings ?? d?.warnings ?? [],
          errors: d?.validation?.errors ?? d?.errors ?? [],
        };
      },
    }),

    validateExport: builder.mutation<
      { valid: boolean; warnings: string[]; errors: string[] },
      { from: string; to: string; periodType?: string }
    >({
      query: (body) => ({ url: "/exports/datev/validate", method: "POST", body }),
      transformResponse: (r: ApiSuccess<any>) => {
        const d = r.data;
        return {
          valid: d?.valid ?? false,
          warnings: d?.validation?.warnings ?? d?.warnings ?? [],
          errors: d?.validation?.errors ?? d?.errors ?? [],
        };
      },
    }),

    createExport: builder.mutation<DatevExportJob, { from: string; to: string; periodType?: string }>({
      query: (body) => ({ url: "/exports/datev", method: "POST", body }),
      transformResponse: (r: ApiSuccess<ServerExportJob>) => exportJobFromServer(r.data),
      invalidatesTags: ["Exports", "Transactions", "Ledger"],
    }),

    getExports: builder.query<DatevExportJob[], void>({
      query: () => "/exports",
      transformResponse: (r: ApiSuccess<ServerExportJob[]>) =>
        (r.data ?? []).map(exportJobFromServer),
      providesTags: ["Exports"],
    }),

    downloadExport: builder.mutation<void, { id: string; fileName?: string }>({
      queryFn: async ({ id, fileName }) => {
        try {
          await downloadAuthenticatedFile(
            `/exports/${id}/download`,
            fileName ?? `DATEV_Export_${id}.csv`
          );
          return { data: undefined };
        } catch (e) {
          return { error: { status: "CUSTOM_ERROR", error: String(e) } as never };
        }
      },
    }),

    // ──────────── Reconciliation ────────────
    getReconciliationSummary: builder.query<
      ReconciliationSummary,
      { from?: string; to?: string } | void
    >({
      query: (params) => ({ url: "/reconciliation/summary", params: params || {} }),
      transformResponse: (r: ApiSuccess<ReconciliationSummary>) =>
        (r.data ?? {
          importedAmount: 0,
          exportedAmount: 0,
          difference: 0,
          missingCount: 0,
          duplicateCount: 0,
          validationStatus: "pending",
        }) as ReconciliationSummary,
      providesTags: ["Reconciliation"],
    }),

    getPaypalBalance: builder.query<PaypalBalanceResult, string>({
      query: (importId) => `/reconciliation/paypal-balance/${importId}`,
      transformResponse: (r: ApiSuccess<PaypalBalanceResult>) => r.data,
    }),

    // ──────────── Duplicates ────────────
    getDuplicates: builder.query<DuplicateItem[], void>({
      query: () => ({ url: "/duplicates", params: { limit: 100 } }),
      transformResponse: (r: ApiSuccess<ServerDuplicate[]>) =>
        (Array.isArray(r.data) ? r.data : []).map(duplicateFromServer),
      providesTags: ["Duplicates"],
    }),

    resolveDuplicate: builder.mutation<
      void,
      { id: string; action: "merge" | "ignore" | "keep_both" }
    >({
      query: ({ id, action }) => ({
        url: `/duplicates/${id}/resolve`,
        method: "POST",
        body: { action },
      }),
      invalidatesTags: ["Duplicates", "Transactions", "Ledger"],
    }),

    // ──────────── Settings ────────────
    getCompanySettings: builder.query<CompanySettings, void>({
      query: () => "/settings/company",
      transformResponse: (r: ApiSuccess<CompanySettings>) => r.data,
      providesTags: [{ type: "Settings", id: "company" }],
    }),

    updateCompanySettings: builder.mutation<CompanySettings, Partial<CompanySettings>>({
      query: (body) => ({ url: "/settings/company", method: "PATCH", body }),
      transformResponse: (r: ApiSuccess<CompanySettings>) => r.data,
      invalidatesTags: [{ type: "Settings", id: "company" }],
    }),

    getDatevSettings: builder.query<DatevSettings, void>({
      query: () => "/settings/datev",
      transformResponse: (r: ApiSuccess<DatevSettings>) => r.data,
      providesTags: [{ type: "Settings", id: "datev" }],
    }),

    updateDatevSettings: builder.mutation<DatevSettings, Partial<DatevSettings>>({
      query: (body) => ({ url: "/settings/datev", method: "PATCH", body }),
      transformResponse: (r: ApiSuccess<DatevSettings>) => r.data,
      invalidatesTags: [{ type: "Settings", id: "datev" }],
    }),

    getSystemPolicies: builder.query<SystemPolicyConfig, void>({
      query: () => "/settings/system-policies",
      transformResponse: (r: ApiSuccess<SystemPolicyConfig>) => r.data,
      providesTags: [{ type: "Settings", id: "system-policies" }],
    }),

    updateSystemPolicies: builder.mutation<SystemPolicyConfig, Partial<SystemPolicyConfig>>({
      query: (body) => ({ url: "/settings/system-policies", method: "PATCH", body }),
      transformResponse: (r: ApiSuccess<SystemPolicyConfig>) => r.data,
      invalidatesTags: [
        { type: "Settings", id: "system-policies" },
        { type: "Settings", id: "datev" },
      ],
    }),

    resetSystemPolicies: builder.mutation<SystemPolicyConfig, void>({
      query: () => ({ url: "/settings/system-policies/reset", method: "POST" }),
      transformResponse: (r: ApiSuccess<SystemPolicyConfig>) => r.data,
      invalidatesTags: [
        { type: "Settings", id: "system-policies" },
        { type: "Settings", id: "datev" },
      ],
    }),

    // ──────────── Reports ────────────
    getAccountTotals: builder.query<AccountTotalReport[], void>({
      query: () => "/reports/account-totals",
      transformResponse: (r: ApiSuccess<any>) => {
        const raw = r.data?.accounts ?? (Array.isArray(r.data) ? r.data : []);
        return raw.map((a: any) => ({
          accountNumber: a.accountNumber ?? a.number ?? "",
          accountName: a.accountName ?? a.name,
          total: a.total ?? 0,
          count: a.count ?? 0,
        })) as AccountTotalReport[];
      },
      providesTags: ["Reports"],
    }),

    getStatusBreakdown: builder.query<StatusBreakdownReport[], void>({
      query: () => "/reports/status-breakdown",
      transformResponse: (r: ApiSuccess<any>) => {
        const raw = r.data;
        if (Array.isArray(raw)) return raw as StatusBreakdownReport[];
        if (raw?.byStatus && typeof raw.byStatus === "object") {
          return Object.entries(raw.byStatus).map(([status, val]: [string, any]) => ({
            status,
            count: val?.count ?? (typeof val === "number" ? val : 0),
            total: val?.total ?? 0,
          })) as StatusBreakdownReport[];
        }
        return [];
      },
      providesTags: ["Reports"],
    }),

    // ──────────── Accrual ────────────
    importJtl: builder.mutation<AccrualImportResult, FormData>({
      query: (body) => ({ url: "/imports/jtl", method: "POST", body }),
      transformResponse: (r: ApiSuccess<AccrualImportResult>) => r.data,
      invalidatesTags: ["Accrual", "Imports"],
    }),

    importMarketplace: builder.mutation<
      AccrualImportResult,
      { channel: AccrualMarketplace; body: FormData }
    >({
      query: ({ channel, body }) => ({
        url: `/imports/marketplace/${channel}`,
        method: "POST",
        body,
      }),
      transformResponse: (r: ApiSuccess<AccrualImportResult>) => r.data,
      invalidatesTags: ["Accrual", "Imports"],
    }),

    getAccrualInbox: builder.query<AccrualInbox, void>({
      query: () => "/accrual/inbox",
      transformResponse: (r: ApiSuccess<AccrualInbox>) => r.data,
      providesTags: ["Accrual"],
    }),

    getAccrualEvents: builder.query<Paginated<BusinessEvent>, Record<string, string | number | undefined>>({
      query: (params) => ({ url: "/accrual/events", params }),
      transformResponse: (r: ApiSuccess<BusinessEvent[]>) => paginatedFromApi(r),
      providesTags: ["Accrual"],
    }),

    getAccrualExceptions: builder.query<
      Paginated<AccountingException>,
      Record<string, string | number | undefined>
    >({
      query: (params) => ({ url: "/accrual/exceptions", params }),
      transformResponse: (r: ApiSuccess<AccountingException[]>) => paginatedFromApi(r),
      providesTags: ["Accrual"],
    }),

    resolveAccrualException: builder.mutation<
      AccountingException,
      { id: string; status?: string; resolutionNote?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/accrual/exceptions/${id}`,
        method: "PATCH",
        body,
      }),
      transformResponse: (r: ApiSuccess<AccountingException>) => r.data,
      invalidatesTags: ["Accrual"],
    }),

    getClearingConfig: builder.query<ClearingConfig, void>({
      query: () => "/accrual/clearing",
      transformResponse: (r: ApiSuccess<ClearingConfig>) => r.data,
      providesTags: [{ type: "Accrual", id: "clearing" }],
    }),

    updateClearingConfig: builder.mutation<ClearingConfig, Partial<ClearingConfig>>({
      query: (body) => ({ url: "/accrual/clearing", method: "PATCH", body }),
      transformResponse: (r: ApiSuccess<ClearingConfig>) => r.data,
      invalidatesTags: [{ type: "Accrual", id: "clearing" }],
    }),

    getAccrualJournal: builder.query<Paginated<JournalEntry>, Record<string, string | undefined>>({
      query: (params) => ({ url: "/accrual/journal", params }),
      transformResponse: (r: ApiSuccess<JournalEntry[]>) => paginatedFromApi(r),
      providesTags: ["Accrual"],
    }),

    buildJournalDraft: builder.mutation<
      { entry: JournalEntry; lines: JournalLine[] },
      { eventId: string }
    >({
      query: ({ eventId }) => ({
        url: `/accrual/journal/build/${eventId}`,
        method: "POST",
      }),
      transformResponse: (r: ApiSuccess<{ entry: JournalEntry; lines: JournalLine[] }>) => r.data,
      invalidatesTags: ["Accrual"],
    }),

    postAccrualJournal: builder.mutation<
      { entry: JournalEntry; lines: JournalLine[] },
      { id: string }
    >({
      query: ({ id }) => ({ url: `/accrual/journal/${id}/post`, method: "POST" }),
      transformResponse: (r: ApiSuccess<{ entry: JournalEntry; lines: JournalLine[] }>) => r.data,
      invalidatesTags: ["Accrual"],
    }),

    getMarketplacePayoutReconciliation: builder.query<
      Paginated<{ payout: BusinessEvent; reconStatus: string; candidateTransactions: unknown[] }>,
      Record<string, string | undefined>
    >({
      query: (params) => ({ url: "/reconciliation/marketplace", params }),
      transformResponse: (r: ApiSuccess<any[]>) => paginatedFromApi(r),
      providesTags: ["Accrual", "Reconciliation"],
    }),

    matchMarketplacePayout: builder.mutation<
      unknown,
      { payoutEventId: string; transactionId: string }
    >({
      query: (body) => ({
        url: "/reconciliation/marketplace/match",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Accrual", "Reconciliation"],
    }),
  }),
});

export const {
  // Accounts
  useGetAccountsQuery,
  useGetAccountsOverviewQuery,
  useGetAccountLedgerQuery,
  useCreateAccountMutation,
  useUpdateAccountMutation,
  useSeedAccountsMutation,
  useImportAccountsCsvMutation,
  useLazyExportAccountsCsvQuery,
  // Imports
  useImportBankMutation,
  useImportPaypalMutation,
  useGetImportsQuery,
  useGetImportQuery,
  useReprocessImportMutation,
  // Transactions
  useGetTransactionsQuery,
  useGetOpenTransactionsQuery,
  useGetConflictTransactionsQuery,
  useGetTransactionQuery,
  useApplyRulesMutation,
  useAssignTransactionMutation,
  useBulkAssignTransactionsMutation,
  useUpdateTransactionStatusMutation,
  useBulkUpdateStatusMutation,
  // Rules
  useGetRulesQuery,
  useCreateRuleMutation,
  useCreateRuleFromTransactionMutation,
  useGetRuleQuery,
  useUpdateRuleMutation,
  useDeleteRuleMutation,
  useEnableRuleMutation,
  useDisableRuleMutation,
  useTestRulesMutation,
  useSeedRulesMutation,
  // Suggestions / Patterns
  useGetRuleSuggestionsQuery,
  useAcceptSuggestionMutation,
  useRejectSuggestionMutation,
  useAnalyzePatternsMutation,
  // Exports
  usePreviewExportMutation,
  useValidateExportMutation,
  useCreateExportMutation,
  useGetExportsQuery,
  useDownloadExportMutation,
  // Reconciliation
  useGetReconciliationSummaryQuery,
  useGetPaypalBalanceQuery,
  // Duplicates
  useGetDuplicatesQuery,
  useResolveDuplicateMutation,
  // Settings
  useGetCompanySettingsQuery,
  useUpdateCompanySettingsMutation,
  useGetDatevSettingsQuery,
  useUpdateDatevSettingsMutation,
  useGetSystemPoliciesQuery,
  useUpdateSystemPoliciesMutation,
  useResetSystemPoliciesMutation,
  // Reports
  useGetAccountTotalsQuery,
  useGetStatusBreakdownQuery,
  // Accrual
  useImportJtlMutation,
  useImportMarketplaceMutation,
  useGetAccrualInboxQuery,
  useGetAccrualEventsQuery,
  useGetAccrualExceptionsQuery,
  useResolveAccrualExceptionMutation,
  useGetClearingConfigQuery,
  useUpdateClearingConfigMutation,
  useGetAccrualJournalQuery,
  useBuildJournalDraftMutation,
  usePostAccrualJournalMutation,
  useGetMarketplacePayoutReconciliationQuery,
  useMatchMarketplacePayoutMutation,
} = accountingApi;
