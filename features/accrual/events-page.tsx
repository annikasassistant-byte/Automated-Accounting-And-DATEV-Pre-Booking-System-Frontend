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
  usePatchAccrualEventMutation,
  useBulkBuildAccrualJournalMutation,
  useBulkPostAccrualJournalMutation,
  useFxTrueUpEventMutation,
} from "@/services/accountingApi";
import { formatCurrencyPrecise, formatDateTime } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import { ACCRUAL_PERIODS, DEFAULT_ACCRUAL_PERIOD, type AccrualPeriodId } from "@/lib/accounting/accrual-period";
import { JOURNAL_SKIP_REASON_LABELS, type JournalBulkSkipped } from "@/types/accrual";

const NON_BOOKABLE = new Set(["ORDER_CREATED", "CANCELLATION"]);

function needsFxTrueUp(ev: {
  metadata?: { fxReview?: boolean; fxTrueUp?: { posted?: boolean } } | null;
  fx?: { eurAmountCents?: number | null; originalCurrency?: string | null; exchangeRate?: number | null } | null;
}): boolean {
  if (ev.metadata?.fxTrueUp?.posted) return false;
  if (ev.metadata?.fxReview) return true;
  const cur = (ev.fx?.originalCurrency || "EUR").toUpperCase();
  if (cur !== "EUR" && (ev.fx?.eurAmountCents == null || ev.fx?.exchangeRate == null)) return true;
  return false;
}

export function AccrualEventsPage() {
  const isAdmin = useAuthStore((s) => s.hasRole("admin"));
  const [periodId, setPeriodId] = useState<AccrualPeriodId>(DEFAULT_ACCRUAL_PERIOD.id);
  const period = ACCRUAL_PERIODS.find((p) => p.id === periodId) ?? DEFAULT_ACCRUAL_PERIOD;
  const { data, isLoading, refetch } = useGetAccrualEventsQuery({
    limit: 200,
    from: period.from,
    to: period.to,
  });
  const [buildDraft, { isLoading: building }] = useBuildJournalDraftMutation();
  const [patchEvent] = usePatchAccrualEventMutation();
  const [bulkBuild, { isLoading: bulkBuilding }] = useBulkBuildAccrualJournalMutation();
  const [bulkPost, { isLoading: bulkPosting }] = useBulkPostAccrualJournalMutation();
  const [fxTrueUp, { isLoading: fxLoading }] = useFxTrueUpEventMutation();
  const [skipped, setSkipped] = useState<JournalBulkSkipped[]>([]);

  const events = data?.items ?? [];

  const onBuild = async (eventId: string) => {
    try {
      await buildDraft({ eventId }).unwrap();
      toast.success("Journal-Entwurf erstellt");
      void refetch();
    } catch (err) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ?? "Entwurf fehlgeschlagen",
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

  const onFx = async (eventId: string) => {
    try {
      const result = await fxTrueUp({ eventId }).unwrap();
      toast.success(result.message || "FX-Nachbuchung ausgeführt");
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
        {isAdmin && (
          <>
            <Button type="button" size="sm" variant="secondary" disabled={bulkBuilding} onClick={onBulkBuild}>
              Entwürfe erzeugen
            </Button>
            <Button type="button" size="sm" disabled={bulkPosting} onClick={onBulkPost}>
              Entwürfe buchen
            </Button>
          </>
        )}
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
                  {ev.fx && (ev.fx.originalCurrency || ev.fx.eurAmountCents != null) && (
                    <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                      <p>
                        FX: Kurs {ev.fx.exchangeRate ?? "—"} · Quelle{" "}
                        {ev.fx.exchangeRateSource || "—"}
                        {ev.metadata?.fxReview ? " · Prüfung nötig" : ""}
                      </p>
                      <p>
                        {ev.fx.originalAmountCents != null
                          ? formatCurrencyPrecise(
                              (ev.fx.originalAmountCents || 0) / 100,
                              ev.fx.originalCurrency || "EUR",
                            )
                          : null}
                        {ev.fx.eurAmountCents != null
                          ? ` → ${formatCurrencyPrecise(ev.fx.eurAmountCents / 100)} EUR`
                          : " → EUR ausstehend"}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={ev.status} />
                  {ev.metadata?.fxReview && (
                    <StatusBadge status="open" label="FX-Prüfung" />
                  )}
                  {isAdmin && ev.eventType === "FEE" && (
                    <select
                      className="h-9 rounded-md border bg-transparent px-2 text-xs"
                      defaultValue={ev.feeVatTreatment || "auto"}
                      onChange={async (e) => {
                        try {
                          await patchEvent({
                            id: ev._id,
                            feeVatTreatment: e.target.value as NonNullable<typeof ev.feeVatTreatment>,
                          }).unwrap();
                          toast.success("Fee-USt Ausnahme gespeichert");
                        } catch (err) {
                          toast.error(
                            (err as { data?: { message?: string } })?.data?.message ??
                              "USt-Override fehlgeschlagen",
                          );
                        }
                      }}
                    >
                      <option value="auto">USt auto</option>
                      <option value="reverse_charge_13b">§13b RC</option>
                      <option value="input_vat_de">DE Vorsteuer</option>
                      <option value="none">Keine USt</option>
                    </select>
                  )}
                  {isAdmin && needsFxTrueUp(ev) && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={fxLoading}
                      onClick={() => onFx(ev._id)}
                    >
                      FX-Nachbuchung
                    </Button>
                  )}
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

      {skipped.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Übersprungen ({skipped.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="p-2">Ereignis</th>
                    <th className="p-2">Grund</th>
                  </tr>
                </thead>
                <tbody>
                  {skipped.slice(0, 50).map((row) => (
                    <tr key={`${row.eventId}-${row.reason}`} className="border-t">
                      <td className="p-2 font-mono text-xs">{row.eventId}</td>
                      <td className="p-2">{JOURNAL_SKIP_REASON_LABELS[row.reason] || row.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
