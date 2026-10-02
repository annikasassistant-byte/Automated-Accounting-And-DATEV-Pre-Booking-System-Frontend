"use client";

import { useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useGetAccrualInboxQuery,
  useResolveAccrualExceptionMutation,
  useBulkResolveAccrualExceptionsMutation,
  useFxTrueUpEventMutation,
} from "@/services/accountingApi";
import { formatDateTime } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";
import { ACCRUAL_PERIODS, DEFAULT_ACCRUAL_PERIOD, type AccrualPeriodId } from "@/lib/accounting/accrual-period";

export function AccountingInboxPage() {
  const isAdmin = useAuthStore((s) => s.hasRole("admin"));
  const [periodId, setPeriodId] = useState<AccrualPeriodId | "all">("july");
  const period =
    periodId === "all"
      ? null
      : ACCRUAL_PERIODS.find((p) => p.id === periodId) ?? DEFAULT_ACCRUAL_PERIOD;

  const { data, isLoading, isError, refetch } = useGetAccrualInboxQuery(
    period ? { from: period.from, to: period.to } : undefined,
  );
  const [resolveEx, { isLoading: resolving }] = useResolveAccrualExceptionMutation();
  const [bulkResolve, { isLoading: bulkResolving }] = useBulkResolveAccrualExceptionsMutation();
  const [fxTrueUp, { isLoading: fxLoading }] = useFxTrueUpEventMutation();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const onResolve = async (id: string, status: "resolved" | "dismissed") => {
    try {
      await resolveEx({ id, status }).unwrap();
      toast.success(status === "resolved" ? "Ausnahme erledigt" : "Ausnahme verworfen");
      void refetch();
    } catch (err) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ?? "Aktualisierung fehlgeschlagen",
      );
    }
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllOpen = () => {
    if (!data) return;
    const openIds = data.openExceptions.map((e) => e._id);
    setSelected((prev) => {
      if (prev.size === openIds.length) return new Set();
      return new Set(openIds);
    });
  };

  const onBulk = async (status: "resolved" | "dismissed") => {
    const ids = Array.from(selected);
    if (!ids.length) {
      toast.warning("Keine Ausnahmen ausgewählt");
      return;
    }
    try {
      await bulkResolve({ ids, status }).unwrap();
      toast.success(
        status === "resolved"
          ? `${ids.length} Ausnahmen erledigt`
          : `${ids.length} Ausnahmen verworfen`,
      );
      setSelected(new Set());
      void refetch();
    } catch (err) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ?? "Sammelaktion fehlgeschlagen",
      );
    }
  };

  if (isLoading) return <LoadingSkeleton variant="page" />;
  if (isError || !data) {
    return <p className="text-destructive">Posteingang konnte nicht geladen werden.</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buchhaltungs-Posteingang"
        description="Ausnahmeliste — nicht der vollständige Monatsabschluss. Zugeordnet ≠ gebucht."
      />

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={periodId === "all" ? "default" : "outline"}
          onClick={() => setPeriodId("all")}
        >
          Alle Perioden
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
      {data.listNote && <p className="text-xs text-muted-foreground">{data.listNote}</p>}

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Offene Ausnahmen</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{data.openExceptionCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Wartende Ereignisse</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {data.pendingEventsTotal ?? data.pendingEvents.length}
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              (Liste {data.pendingEventsListed ?? data.pendingEvents.length})
            </span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rechnung ausstehend</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {data.invoicePendingCount ??
              data.pendingEvents.filter((e) => e.status === "invoice_pending").length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Letzte Importe</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{data.recentImports.length}</CardContent>
        </Card>
      </div>

      {data.julyOpsSteps && data.julyOpsSteps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Betriebsablauf Accrual (Monat)</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
              {data.julyOpsSteps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {data.consolidatedExceptions && data.consolidatedExceptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Wiederholte Ausnahmen (konsolidiert)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.consolidatedExceptions.slice(0, 30).map((row) => (
              <div key={row.title} className="flex justify-between gap-2 border-b pb-2">
                <span>{row.title}</span>
                <span className="tabular-nums font-medium">{row.count}×</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Offene Ausnahmen</CardTitle>
          {isAdmin && (
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={toggleAllOpen}>
                Alle auswählen
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={bulkResolving || !selected.size}
                onClick={() => void onBulk("resolved")}
              >
                Auswahl erledigen
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={bulkResolving || !selected.size}
                onClick={() => void onBulk("dismissed")}
              >
                Auswahl verwerfen
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {data.openExceptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine offenen Ausnahmen</p>
          ) : (
            data.openExceptions.map((ex) => (
              <div
                key={ex._id}
                className="flex flex-wrap items-start justify-between gap-2 border-b pb-3 text-sm"
              >
                <div className="flex gap-2">
                  {isAdmin && (
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selected.has(ex._id)}
                      onChange={() => toggle(ex._id)}
                    />
                  )}
                  <div>
                    <p className="font-medium">{ex.title || ex.exceptionType || ex.type}</p>
                    <p className="text-muted-foreground">{ex.detail || ex.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(ex.createdAt)}
                      {ex.businessEventId ? ` · Event ${ex.businessEventId}` : ""}
                      {ex.sourceRecordId ? ` · Quelle ${ex.sourceRecordId}` : ""}
                      {ex.marketplaceOrderId ? ` · Order ${ex.marketplaceOrderId}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={(ex.exceptionType || ex.type || "open").toLowerCase()} />
                  {isAdmin && /FX_REVIEW/i.test(String(ex.exceptionType || ex.type)) && ex.businessEventId && (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={fxLoading}
                      onClick={async () => {
                        try {
                          const result = await fxTrueUp({ eventId: ex.businessEventId! }).unwrap();
                          toast.success(result.message || "FX-Nachbuchung ausgeführt");
                          void refetch();
                        } catch (err) {
                          toast.error(
                            (err as { data?: { message?: string } })?.data?.message ??
                              "FX-Nachbuchung fehlgeschlagen",
                          );
                        }
                      }}
                    >
                      FX-Nachbuchung
                    </Button>
                  )}
                  {isAdmin && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={resolving}
                        onClick={() => void onResolve(ex._id, "resolved")}
                      >
                        Erledigen
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={resolving}
                        onClick={() => void onResolve(ex._id, "dismissed")}
                      >
                        Verwerfen
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Import-Historie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.recentImports.length === 0 ? (
            <p className="text-muted-foreground">Keine Accrual-Importe</p>
          ) : (
            data.recentImports.map((batch) => (
              <div key={batch._id} className="flex justify-between gap-2 border-b py-2">
                <div>
                  <p className="font-medium">{batch.filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {batch.source} · {formatDateTime(batch.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
