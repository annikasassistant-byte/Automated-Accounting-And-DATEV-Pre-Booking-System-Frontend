"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  Account,
  AccountingRule,
  DatevExportJob,
  DuplicateItem,
  ImportBatch,
  PatternGroup,
  Transaction,
  TransactionSource,
  CompanySettings,
  DatevSettings,
  MatchMode,
} from "@/types/accounting";
import {
  mockAccounts,
  mockCompanySettings,
  mockDatevSettings,
  mockDuplicates,
  mockExports,
  mockImportBatches,
  mockPatterns,
  mockRules,
  mockTransactions,
} from "@/lib/accounting/mock-data";

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

interface AccountingState {
  accounts: Account[];
  rules: AccountingRule[];
  transactions: Transaction[];
  imports: ImportBatch[];
  patterns: PatternGroup[];
  exports: DatevExportJob[];
  duplicates: DuplicateItem[];
  company: CompanySettings;
  datev: DatevSettings;
  importedFileHashes: string[];

  addImportBatch: (batch: ImportBatch, rows: Transaction[]) => { duplicateFile: boolean };
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  bulkUpdateTransactions: (ids: string[], patch: Partial<Transaction>) => void;
  upsertRule: (rule: Omit<AccountingRule, "id" | "version" | "matchCount" | "createdAt" | "updatedAt" | "history"> & { id?: string }) => AccountingRule;
  setRuleEnabled: (id: string, enabled: boolean) => void;
  deleteRule: (id: string) => void;
  upsertAccount: (account: Omit<Account, "id"> & { id?: string }) => void;
  deleteAccount: (id: string) => void;
  setPatternStatus: (id: string, status: PatternGroup["status"]) => void;
  addExport: (job: DatevExportJob) => void;
  resolveDuplicate: (id: string, action: "merge" | "ignore") => void;
  setCompany: (patch: Partial<CompanySettings>) => void;
  setDatev: (patch: Partial<DatevSettings>) => void;
  applyRulesToTransactions: () => number;
}

function matchesRule(tx: Transaction, rule: AccountingRule): boolean {
  const hay = `${tx.counterparty} ${tx.description} ${tx.reference}`;
  const text = rule.caseSensitive ? hay : hay.toLowerCase();
  return rule.keywords.some((kw) => {
    const needle = rule.caseSensitive ? kw : kw.toLowerCase();
    switch (rule.matchMode) {
      case "starts_with":
        return text.startsWith(needle);
      case "ends_with":
        return text.endsWith(needle);
      case "exact":
        return text.trim() === needle.trim();
      case "regex":
        try {
          return new RegExp(kw, rule.caseSensitive ? "" : "i").test(hay);
        } catch {
          return false;
        }
      case "contains":
      default:
        return text.includes(needle);
    }
  });
}

export const useAccountingStore = create<AccountingState>()(
  persist(
    (set, get) => ({
      accounts: mockAccounts,
      rules: mockRules,
      transactions: mockTransactions,
      imports: mockImportBatches,
      patterns: mockPatterns,
      exports: mockExports,
      duplicates: mockDuplicates,
      company: mockCompanySettings,
      datev: mockDatevSettings,
      importedFileHashes: mockImportBatches.map((b) => b.fileHash),

      addImportBatch: (batch, rows) => {
        const hashes = get().importedFileHashes;
        const duplicateFile = hashes.includes(batch.fileHash);
        set((s) => ({
          imports: [batch, ...s.imports],
          transactions: [...rows, ...s.transactions],
          importedFileHashes: duplicateFile ? s.importedFileHashes : [batch.fileHash, ...s.importedFileHashes],
        }));
        return { duplicateFile };
      },

      updateTransaction: (id, patch) =>
        set((s) => ({
          transactions: s.transactions.map((t) =>
            t.id === id
              ? {
                  ...t,
                  ...patch,
                  history: [
                    {
                      id: uid("th"),
                      at: new Date().toISOString(),
                      action: "updated",
                      actor: "Benutzer",
                      detail: Object.keys(patch).join(", "),
                    },
                    ...t.history,
                  ],
                }
              : t
          ),
        })),

      bulkUpdateTransactions: (ids, patch) =>
        set((s) => ({
          transactions: s.transactions.map((t) =>
            ids.includes(t.id)
              ? {
                  ...t,
                  ...patch,
                  history: [
                    {
                      id: uid("th"),
                      at: new Date().toISOString(),
                      action: "bulk_updated",
                      actor: "Benutzer",
                      detail: Object.keys(patch).join(", "),
                    },
                    ...t.history,
                  ],
                }
              : t
          ),
        })),

      upsertRule: (input) => {
        const now = new Date().toISOString();
        if (input.id) {
          let updated!: AccountingRule;
          set((s) => ({
            rules: s.rules.map((r) => {
              if (r.id !== input.id) return r;
              updated = {
                ...r,
                ...input,
                id: r.id,
                version: r.version + 1,
                updatedAt: now,
                history: [
                  {
                    id: uid("rh"),
                    version: r.version + 1,
                    changedAt: now,
                    changedBy: "Benutzer",
                    summary: "Regel aktualisiert",
                  },
                  ...r.history,
                ],
              };
              return updated;
            }),
          }));
          return updated;
        }
        const created: AccountingRule = {
          id: uid("rule"),
          name: input.name,
          keywords: input.keywords,
          matchMode: input.matchMode as MatchMode,
          caseSensitive: input.caseSensitive,
          expenseAccountId: input.expenseAccountId,
          offsetAccountId: input.offsetAccountId,
          priority: input.priority,
          enabled: input.enabled,
          version: 1,
          matchCount: 0,
          createdAt: now,
          updatedAt: now,
          history: [],
        };
        set((s) => ({ rules: [created, ...s.rules] }));
        return created;
      },

      setRuleEnabled: (id, enabled) =>
        set((s) => ({
          rules: s.rules.map((r) => (r.id === id ? { ...r, enabled, updatedAt: new Date().toISOString() } : r)),
        })),

      deleteRule: (id) => set((s) => ({ rules: s.rules.filter((r) => r.id !== id) })),

      upsertAccount: (input) =>
        set((s) => {
          if (input.id) {
            return {
              accounts: s.accounts.map((a) => (a.id === input.id ? { ...a, ...input, id: a.id } : a)),
            };
          }
          return {
            accounts: [{ ...input, id: uid("acc") }, ...s.accounts],
          };
        }),

      deleteAccount: (id) => set((s) => ({ accounts: s.accounts.filter((a) => a.id !== id) })),

      setPatternStatus: (id, status) =>
        set((s) => ({
          patterns: s.patterns.map((p) => (p.id === id ? { ...p, status } : p)),
        })),

      addExport: (job) =>
        set((s) => {
          const ids = s.transactions
            .filter(
              (t) =>
                t.date >= job.from &&
                t.date <= job.to &&
                (t.status === "approved" || t.status === "matched" || t.status === "exported")
            )
            .map((t) => t.id);
          return {
            exports: [job, ...s.exports],
            transactions: s.transactions.map((t) =>
              ids.includes(t.id) ? { ...t, exportStatus: "exported", status: "exported" } : t
            ),
          };
        }),

      resolveDuplicate: (id, action) =>
        set((s) => {
          const item = s.duplicates.find((d) => d.id === id);
          if (!item) return s;
          if (action === "merge" && item.transactionIds.length > 1) {
            const [, ...rest] = item.transactionIds;
            return {
              duplicates: s.duplicates.filter((d) => d.id !== id),
              transactions: s.transactions.filter((t) => !rest.includes(t.id)),
            };
          }
          return { duplicates: s.duplicates.filter((d) => d.id !== id) };
        }),

      setCompany: (patch) => set((s) => ({ company: { ...s.company, ...patch } })),
      setDatev: (patch) => set((s) => ({ datev: { ...s.datev, ...patch } })),

      applyRulesToTransactions: () => {
        const rules = [...get().rules].filter((r) => r.enabled).sort((a, b) => a.priority - b.priority);
        let applied = 0;
        set((s) => ({
          transactions: s.transactions.map((t) => {
            if (t.status === "exported" || t.status === "approved" || t.status === "duplicate") return t;
            const rule = rules.find((r) => matchesRule(t, r));
            if (!rule) return t;
            applied += 1;
            return {
              ...t,
              status: "matched",
              matchedRuleId: rule.id,
              suggestedRuleId: rule.id,
              expenseAccountId: rule.expenseAccountId,
              offsetAccountId: rule.offsetAccountId,
              confidence: 95,
              suggestedKeywords: rule.keywords,
            };
          }),
          rules: s.rules.map((r) => ({
            ...r,
            matchCount: s.transactions.filter((t) => matchesRule(t, r)).length,
          })),
        }));
        return applied;
      },
    }),
    {
      name: "aa-accounting",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);

export function accountLabel(accounts: Account[], id?: string | null) {
  if (!id) return "—";
  const a = accounts.find((x) => x.id === id);
  return a ? `${a.number} · ${a.name}` : "—";
}

export function ruleLabel(rules: AccountingRule[], id?: string | null) {
  if (!id) return "—";
  return rules.find((r) => r.id === id)?.name ?? "—";
}

export function createTransactionsFromRows(
  source: TransactionSource,
  rows: Array<Record<string, string>>,
  batchId: string
): Transaction[] {
  return rows.map((row, i) => {
    const amount = Number(String(row.amount ?? row.Betrag ?? "0").replace(",", "."));
    const date = row.date || row.Datum || new Date().toISOString().slice(0, 10);
    const description = row.description || row.Verwendungszweck || row.Beschreibung || "";
    const counterparty = row.counterparty || row.Auftraggeber || row.Name || "Unbekannt";
    const reference = row.reference || row.Referenz || row.Beleg || "";
    const transactionId =
      row.transactionId || row.ID || row.Transaktion || `${source.toUpperCase()}-${Date.now()}-${i}`;
    const hash = `${date}|${amount}|${reference}|${description}`.toLowerCase();
    return {
      id: uid("tx"),
      date,
      transactionId,
      source,
      counterparty,
      description,
      reference,
      amount: Number.isFinite(amount) ? amount : 0,
      currency: row.currency || row.Waehrung || "EUR",
      status: "new",
      exportStatus: "not_exported",
      importBatchId: batchId,
      hash,
      history: [
        {
          id: uid("th"),
          at: new Date().toISOString(),
          action: "imported",
          actor: "System",
          detail: `${source} CSV`,
        },
      ],
    };
  });
}
