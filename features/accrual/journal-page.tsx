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
  useBulkBuildAccrualJournalMutation,
  useBulkPostAccrualJournalMutation,
  useFxTrueUpPeriodMutation,
} from "@/services/accountingApi";
import { formatDateTime } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import { ACCRUAL_PERIODS, DEFAULT_ACCRUAL_PERIOD, type AccrualPeriodId } from "@/lib/accounting/accrual-period";
import { JOURNAL_SKIP_REASON_LABELS, type JournalBulkSkipped } from "@/types/accrual";
import { AccrualDatevExportPanel } from "@/features/accrual/accrual-datev-export-panel";
import { PeriodCoveragePanel } from "@/features/accrual/period-coverage-panel";

function SkippedTable({ rows }: { rows: JournalBulkSkipped[] }) {
  if (!rows.length) return null;
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/40">
          <tr>
            <th className="p-2">Ereignis / Journal</th>
            <th className="p-2">Grund</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 50).map((row) => (
            <tr key={`${row.eventId}-${row.reason}`} className="border-t">
              <td className="p-2 font-mono text-xs">{row.eventId}</td>
              <td className="p-2">{JOURNAL_SKIP_REASON_LABELS[row.reason] || row.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > 50 && (
        <p className="p-2 text-xs text-muted-foreground">… und {rows.length - 50} weitere</p>
      )}
    </div>
  );
}

export function AccrualJournalPage() {
  const isAdmin = useAuthStore((s) => s.hasRole("admin"));
  const [periodId, setPeriodId] = useState<AccrualPeriodId>(DEFAULT_ACCRUAL_PERIOD.id);
  const period = ACCRUAL_PERIODS.find((p) => p.id === periodId) ?? DEFAULT_ACCRUAL_PERIOD;
  const { data, isLoading, refetch } = useGetAccrualJournalQuery({
    from: period.from,
    to: period.to,
  });
  const [postJournal, { isLoading: posting }] = usePostAccrualJournalMutation();
  const [bulkBuild, { isLoading: building }] = useBulkBuildAccrualJournalMutation();
  const [bulkPost, { isLoading: bulkPosting }] = useBulkPostAccrualJournalMutation();
  const [fxPeriod, { isLoading: fxRunning }] = useFxTrueUpPeriodMutation();
  const [skipped, setSkipped] = useState<JournalBulkSkipped[]>([]);
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

  const onBulkBuild = async () => {
    try {
      const result = await bulkBuild({ from: period.from, to: period.to }).unwrap();
      setSkipped(result.skipped ?? []);
      toast.success(`${result.built} Entwürfe erzeugt · ${result.skipped?.length ?? 0} übersprungen`);
      void refetch();
    } catch (err) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ?? "Bulk-Entwürfe fehlgeschlagen",
      );
    }
  };

  const onBulkPost = async () => {
    try {
      const result = await bulkPost({ from: period.from, to: period.to }).unwrap();
      setSkipped(result.skipped ?? []);
      toast.success(`${result.posted} Entwürfe gebucht · ${result.skipped?.length ?? 0} übersprungen`);
      void refetch();
    } catch (err) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ?? "Bulk-Buchen fehlgeschlagen",
      );
    }
  };

  const onFxPeriod = async () => {
    try {
      const result = await fxPeriod({ from: period.from, to: period.to }).unwrap();
      toast.success(result.message || "FX-Nachbuchung Periode ausgeführt");
      void refetch();
    } catch (err) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ?? "FX-Nachbuchung fehlgeschlagen",
      );
    }
  };

  if (isLoading) return <LoadingSkeleton variant="page" />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accrual-Journal"
        description="Entwürfe und gebuchte Journalzeilen. Accrual-DATEV sperrt keine Cash-Transaktionen."
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
        {isAdmin && (
          <>
            <Button type="button" size="sm" variant="secondary" disabled={building} onClick={onBulkBuild}>
              Entwürfe erzeugen
            </Button>
            <Button type="button" size="sm" disabled={bulkPosting} onClick={onBulkPost}>
              Entwürfe buchen
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={fxRunning} onClick={onFxPeriod}>
              FX-Nachbuchung (Periode)
            </Button>
          </>
        )}
      </div>

      <PeriodCoveragePanel from={period.from} to={period.to} />

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

      {skipped.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Übersprungen ({skipped.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <SkippedTable rows={skipped} />
          </CardContent>
        </Card>
      )}

      <AccrualDatevExportPanel from={period.from} to={period.to} />

      <p className="text-xs text-muted-foreground">
        Hinweis: Financial sales/revenue sind Clearing-Bewegungen, kein zweiter Umsatz. Accrual-DATEV
        ist vom Cash-DATEV (Bank/PayPal) getrennt und sperrt keine Transaktionen.
      </p>
    </div>
  );
}
