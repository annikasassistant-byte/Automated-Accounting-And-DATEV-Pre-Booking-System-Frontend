"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  useGetMarketplacePayoutReconciliationQuery,
  useMatchMarketplacePayoutMutation,
} from "@/services/accountingApi";
import { formatCurrencyPrecise } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import { ACCRUAL_PERIODS, type AccrualPeriodId } from "@/lib/accounting/accrual-period";

const DATA_STATUS_LABEL: Record<string, string> = {
  no_data: "Keine Daten importiert",
  zero: "Bestätigtes Null-Ergebnis",
  open: "Differenz offen",
  reconciled: "Abgestimmt",
};

export function PayoutReconciliationPage() {
  const isAdmin = useAuthStore((s) => s.hasRole("admin"));
  const [periodId, setPeriodId] = useState<AccrualPeriodId | "all">("july");
  const period = periodId === "all" ? null : ACCRUAL_PERIODS.find((p) => p.id === periodId);
  const params = {
    ...(period ? { from: period.from, to: period.to } : {}),
  };
  const { data, isLoading, refetch } = useGetMarketplacePayoutReconciliationQuery(params);
  const [matchPayout, { isLoading: matching }] = useMatchMarketplacePayoutMutation();
  const [txIds, setTxIds] = useState<Record<string, string>>({});
  const rows = data?.items ?? [];
  const summaries = data?.overview?.summaries ?? [];

  const onMatch = async (payoutEventId: string) => {
    const transactionId = txIds[payoutEventId]?.trim();
    if (!transactionId) {
      toast.error("Transaktions-ID (Bank/PayPal) eingeben");
      return;
    }
    try {
      await matchPayout({ payoutEventId, transactionId }).unwrap();
      toast.success("Payout zugeordnet (Clearing — kein Umsatz)");
      void refetch();
    } catch (err) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ?? "Zuordnung fehlgeschlagen",
      );
    }
  };

  if (isLoading) return <LoadingSkeleton variant="page" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Marktplatz-Auszahlungen"
        description="Erwartete Auszahlung gegen tatsächliche Payouts und Bank/PayPal — Clearing, kein Umsatz. Zeitraum wählen für nachvollziehbare Zahlen."
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={periodId === "all" ? "default" : "outline"}
          onClick={() => setPeriodId("all")}
        >
          Gesamt
        </Button>
        {ACCRUAL_PERIODS.map((p) => (
          <Button
            key={p.id}
            type="button"
            size="sm"
            variant={periodId === p.id ? "default" : "outline"}
            onClick={() => setPeriodId(p.id)}
          >
            {p.label}
          </Button>
        ))}
      </div>
      {period && (
        <p className="text-sm text-muted-foreground">
          Berichtszeitraum: {period.from} – {period.to}
        </p>
      )}

      {summaries.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {summaries.map((s) => (
            <Card key={s.marketplace}>
              <CardHeader>
                <CardTitle className="text-base capitalize">{s.marketplace}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="text-xs font-medium text-muted-foreground">
                  {DATA_STATUS_LABEL[s.dataStatus || ""] || s.dataStatus || "—"}
                </p>
                <p>Erwartet: {formatCurrencyPrecise((s.expectedCents || 0) / 100)}</p>
                <p>Tatsächlich: {formatCurrencyPrecise((s.actualPayoutCents || 0) / 100)}</p>
                <p className="font-medium">
                  Differenz: {formatCurrencyPrecise((s.differenceCents || 0) / 100)}
                </p>
                {s.components && (
                  <div className="mt-2 space-y-0.5 border-t pt-2 text-xs text-muted-foreground">
                    <p>Settlement: {formatCurrencyPrecise((s.components.settlements || 0) / 100)}</p>
                    <p>Fees: {formatCurrencyPrecise((s.components.fees || 0) / 100)}</p>
                    <p>Refunds: {formatCurrencyPrecise((s.components.refunds || 0) / 100)}</p>
                    <p>Adjustments: {formatCurrencyPrecise((s.components.adjustments || 0) / 100)}</p>
                    <p>
                      deferred released/retained: {s.deferredReleasedCount ?? 0} /{" "}
                      {s.deferredRetainedCount ?? 0}
                    </p>
                  </div>
                )}
                {s.note && <p className="pt-1 text-xs text-muted-foreground">{s.note}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payout-Abstimmung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Keine Payout-Ereignisse im gewählten Zeitraum (unterscheide „keine Daten“ von „Null
              abgestimmt“ oben).
            </p>
          ) : (
            rows.map((row) => (
              <div key={row.payout._id} className="space-y-2 rounded-lg border p-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {row.payout.marketplace} ·{" "}
                    {row.payout.marketplaceOrderId || row.payout.sourceRecordId}
                  </span>
                  <StatusBadge status={row.reconStatus.toLowerCase()} />
                </div>
                <p className="text-muted-foreground">
                  Klassifikation: {(row as { classification?: string }).classification || "—"} ·
                  Kandidaten Bank/PayPal: {row.candidateTransactions.length}
                </p>
                {isAdmin && row.reconStatus !== "MATCHED" && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Label className="sr-only">Transaction-ID</Label>
                    <Input
                      className="max-w-xs"
                      placeholder="Bank/PayPal Transaction-ID"
                      value={txIds[row.payout._id] || ""}
                      onChange={(e) =>
                        setTxIds((prev) => ({ ...prev, [row.payout._id]: e.target.value }))
                      }
                    />
                    <Button size="sm" disabled={matching} onClick={() => onMatch(row.payout._id)}>
                      Zuordnen
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
