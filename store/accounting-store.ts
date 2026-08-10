"use client";

import type { Account, AccountingRule } from "@/types/accounting";

/**
 * Ephemeral UI helpers only.
 * All domain data now lives on the server and is fetched via accountingApi (RTK Query).
 */

export function accountLabel(accounts: Account[], id?: string | null) {
  if (!id) return "—";
  const a = accounts.find((x) => x.id === id || x.number === id);
  return a ? `${a.number} · ${a.name}` : id;
}

export function ruleLabel(rules: AccountingRule[], id?: string | null) {
  if (!id) return "—";
  return rules.find((r) => r.id === id)?.name ?? "—";
}
