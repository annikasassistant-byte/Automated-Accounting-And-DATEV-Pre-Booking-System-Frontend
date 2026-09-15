"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useGetAccrualJournalQuery,
  usePostAccrualJournalMutation,
  useLazyGetAccrualDatevPreviewQuery,
} from "@/services/accountingApi";
import { formatCurrencyPrecise, formatDateTime } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import { ACCRUAL_PERIODS, DEFAULT_ACCRUAL_PERIOD, type AccrualPeriodId } from "@/lib/accounting/accrual-period";

export function AccrualJournalPage() {
  const isAdmin = useAuthStore((s) => s.hasRole("admin"));
  const [periodId, setPeriodId] = useState<AccrualPeriodId>(DEFAULT_ACCRUAL_PERIOD.id);
  const period = ACCRUAL_PERIODS.find((p) => p.id === periodId) ?? DEFAULT_ACCRUAL_PERIOD;
  const { data, isLoading, refetch } = useGetAccrualJournalQuery({});
  const [postJournal, { isLoading: posting }] = usePostAccrualJournalMutation();
  const [loadPreview, { data: datevPreview, isFetching: previewLoading }] =
    useLazyGetAccrualDatevPreviewQuery();
  const entries = data?.items ?? [];

  const onPost = async (id: string) => {
    try {
      await postJournal({ id }).unwrap();
      toast.success("Journal gebucht");
      void refetch();
    } catch (err) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ?? "Buchen fehlgeschlagen",
      );
    }
  };

  if (isLoading) return <LoadingSkeleton variant="page" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accrual-Journal"
        description="Entwürfe und gebuchte Journalzeilen. DATEV-Vorschau liest nur gebuchte Accrual-Zeilen — kein Cash-Stapel, keine Sperre."
      />

      <div className="flex flex-wrap items-center gap-2">
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
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={previewLoading}
          onClick={async () => {
            try {
              const result = await loadPreview({ from: period.from, to: period.to }).unwrap();
              toast.success(`${result.rowCount} Accrual-DATEV-Zeilen (Vorschau)`);
            } catch (err) {
              toast.error(
                (err as { data?: { message?: string } })?.data?.message ?? "Vorschau fehlgeschlagen",
              );
            }
          }}
        >
          Accrual-DATEV Vorschau
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Journalbuchungen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Noch keine Journalbuchungen</p>
          ) : (
            entries.map((entry) => (
              <div
                key={entry._id}
                className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 text-sm"
              >
                <div>
                  <p className="font-medium">{entry.description}</p>
                  <p className="text-muted-foreground">{formatDateTime(entry.postingDate)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={entry.status} />
                  {isAdmin && entry.status === "draft" && (
                    <Button size="sm" disabled={posting} onClick={() => onPost(entry._id)}>
                      Buchen
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {datevPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Accrual-DATEV Vorschau ({datevPreview.rowCount} Zeilen)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {datevPreview.note && <p className="text-muted-foreground">{datevPreview.note}</p>}
            {(datevPreview.rows ?? []).slice(0, 20).map((row, i) => (
              <div key={`${String(row.journalEntryId)}-${i}`} className="flex flex-wrap justify-between gap-2 border-b py-1">
                <span>
                  {String(row.accountNumber)} · {String(row.sollHaben)} · {String(row.bookingText || "")}
                </span>
                <span>
                  {formatCurrencyPrecise(Number(row.amountCents || 0) / 100)}
                </span>
              </div>
            ))}
            {datevPreview.rowCount === 0 && (
              <p className="text-muted-foreground">Keine gebuchten Accrual-Zeilen in diesem Zeitraum.</p>
            )}
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Hinweis: Financial sales/revenue sind Clearing-Bewegungen, kein zweiter Umsatz. Accrual-DATEV
        ist nur Vorschau — Cash-DATEV (Bank/PayPal) bleibt unverändert und wird hier nicht gesperrt.
      </p>
    </div>
  );
}
