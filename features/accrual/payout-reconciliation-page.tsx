"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccrualQueryState } from "@/components/shared/accrual-query-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { useGetMarketplacePayoutReconciliationQuery } from "@/services/accountingApi";

export function PayoutReconciliationPage() {
  const { data, isLoading, isError } = useGetMarketplacePayoutReconciliationQuery({});
  const rows = data?.items ?? [];

  return (
    <AccrualQueryState
      isLoading={isLoading}
      isError={isError}
      title="Marktplatz-Auszahlungen nicht verfügbar"
    >
    <div className="space-y-6">
      <PageHeader
        title="Marktplatz-Auszahlungen"
        description="Payout-Ereignisse mit Bank/PayPal-Transaktionen abstimmen"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payout-Abstimmung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine Payout-Ereignisse</p>
          ) : (
            rows.map((row) => (
              <div key={row.payout._id} className="rounded-lg border p-4 text-sm">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium">
                    {row.payout.marketplace} · {row.payout.marketplaceOrderId || row.payout.sourceRecordId}
                  </span>
                  <StatusBadge status={row.reconStatus.toLowerCase()} />
                </div>
                <p className="text-muted-foreground">
                  Kandidaten (Bank/PayPal): {row.candidateTransactions.length}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
    </AccrualQueryState>
  );
}
