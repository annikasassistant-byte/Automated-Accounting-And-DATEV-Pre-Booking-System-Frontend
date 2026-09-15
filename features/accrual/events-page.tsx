"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useGetAccrualEventsQuery,
  useBuildJournalDraftMutation,
} from "@/services/accountingApi";
import { formatCurrencyPrecise, formatDateTime } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import { ACCRUAL_PERIODS, DEFAULT_ACCRUAL_PERIOD, type AccrualPeriodId } from "@/lib/accounting/accrual-period";

const NON_BOOKABLE = new Set(["ORDER_CREATED", "CANCELLATION"]);

export function AccrualEventsPage() {
  const isAdmin = useAuthStore((s) => s.hasRole("admin"));
  const [periodId, setPeriodId] = useState<AccrualPeriodId>(DEFAULT_ACCRUAL_PERIOD.id);
  const period = ACCRUAL_PERIODS.find((p) => p.id === periodId) ?? DEFAULT_ACCRUAL_PERIOD;
  const { data, isLoading } = useGetAccrualEventsQuery({
    limit: 200,
    from: period.from,
    to: period.to,
  });
  const [buildDraft, { isLoading: building }] = useBuildJournalDraftMutation();

  const events = data?.items ?? [];

  const onBuild = async (eventId: string) => {
    try {
      await buildDraft({ eventId }).unwrap();
      toast.success("Journal-Entwurf erstellt");
    } catch (err) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ?? "Entwurf fehlgeschlagen",
      );
    }
  };

  if (isLoading) return <LoadingSkeleton variant="page" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Geschäftsvorfälle (Accrual)"
        description="Amazon-Status ist führend. ORDER_CREATED ≠ Umsatz; Financial = Clearing. Rechnung ausstehend bleibt offen."
      />

      <div className="flex flex-wrap gap-2">
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ereignisse</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Accrual-Ereignisse</p>
          ) : (
            events.map((ev) => (
              <div
                key={ev._id}
                className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {ev.eventType} · {ev.marketplace || ev.source}
                  </p>
                  <p className="text-muted-foreground">
                    {ev.marketplaceOrderId || ev.sourceRecordId} ·{" "}
                    {formatDateTime(ev.eventDate)}
                  </p>
                  {ev.fx?.originalCurrency && (
                    <p className="text-xs text-muted-foreground">
                      {ev.fx.originalAmountCents != null
                        ? formatCurrencyPrecise((ev.fx.originalAmountCents || 0) / 100, ev.fx.originalCurrency)
                        : null}
                      {ev.fx.eurAmountCents != null && ev.fx.originalCurrency !== "EUR"
                        ? ` → ${formatCurrencyPrecise(ev.fx.eurAmountCents / 100)} (${ev.fx.exchangeRateSource || "FX"})`
                        : null}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={ev.status} />
                  {isAdmin &&
                    ev.status === "matched" &&
                    !NON_BOOKABLE.has(ev.eventType) && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={building}
                        onClick={() => onBuild(ev._id)}
                      >
                        Journal-Entwurf
                      </Button>
                    )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
