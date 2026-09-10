"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  useGetMarketplacePayoutReconciliationQuery,
  useMatchMarketplacePayoutMutation,
} from "@/services/accountingApi";
import { formatCurrencyPrecise } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";

export function PayoutReconciliationPage() {
  const isAdmin = useAuthStore((s) => s.hasRole("admin"));
  const { data, isLoading, refetch } = useGetMarketplacePayoutReconciliationQuery({});
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
        description="Erwartete Auszahlung (Settlement+Fees+Refunds+Adjustments) gegen tatsächliche Payouts und Bank/PayPal — kein Umsatz, kein 1:1 Order-Match"
      />

      {summaries.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {summaries.map((s) => (
            <Card key={s.marketplace}>
              <CardHeader>
                <CardTitle className="text-base capitalize">{s.marketplace}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p>Erwartet: {formatCurrencyPrecise((s.expectedCents || 0) / 100)}</p>
                <p>Tatsächlich: {formatCurrencyPrecise((s.actualPayoutCents || 0) / 100)}</p>
                <p className="font-medium">
                  Differenz: {formatCurrencyPrecise((s.differenceCents || 0) / 100)}
                </p>
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
            <p className="text-sm text-muted-foreground">Keine Payout-Ereignisse</p>
          ) : (
            rows.map((row) => (
              <div key={row.payout._id} className="rounded-lg border p-4 text-sm space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">
                    {row.payout.marketplace} ·{" "}
                    {row.payout.marketplaceOrderId || row.payout.sourceRecordId}
                  </span>
                  <StatusBadge status={row.reconStatus.toLowerCase()} />
                </div>
                <p className="text-muted-foreground">
                  Kandidaten (Bank/PayPal): {row.candidateTransactions.length}
                </p>
                {isAdmin && row.reconStatus !== "MATCHED" && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      className="max-w-xs"
                      placeholder="Bank/PayPal Transaction-ID"
                      value={txIds[row.payout._id] || ""}
                      onChange={(e) =>
                        setTxIds((prev) => ({ ...prev, [row.payout._id]: e.target.value }))
                      }
                    />
                    <Button
                      size="sm"
                      disabled={matching}
                      onClick={() => onMatch(row.payout._id)}
                    >
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
