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

export function AccountingInboxPage() {
  const isAdmin = useAuthStore((s) => s.hasRole("admin"));
  const { data, isLoading, isError, refetch } = useGetAccrualInboxQuery();
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
        description="Nur echte Ausnahmen — Amazon-Storno ohne SALE; Rechnung ausstehend bleibt offen bis JTL-Rechnung"
      />

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
          <CardContent className="text-3xl font-semibold">{data.pendingEvents.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rechnung ausstehend</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {data.invoicePendingCount ?? data.pendingEvents.filter((e) => e.status === "invoice_pending").length}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Letzte Importe</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{data.recentImports.length}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Ausnahmen</CardTitle>
          {isAdmin && data.openExceptions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={toggleAllOpen}>
                {selected.size === data.openExceptions.length ? "Auswahl aufheben" : "Alle wählen"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={bulkResolving || selected.size === 0}
                onClick={() => onBulk("resolved")}
              >
                Auswahl erledigen
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={bulkResolving || selected.size === 0}
                onClick={() => onBulk("dismissed")}
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
            data.openExceptions.map((ex) => {
              const isFx = ex.exceptionType === "FX_REVIEW";
              return (
                <div
                  key={ex._id}
                  className={`flex flex-wrap items-start justify-between gap-4 border-b pb-3 ${
                    isFx ? "rounded-md border border-amber-500/40 bg-amber-500/10 px-3 pt-3" : ""
                  }`}
                >
                  <div className="flex gap-3">
                    {isAdmin && (
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4"
                        checked={selected.has(ex._id)}
                        onChange={() => toggle(ex._id)}
                        aria-label={`Ausnahme ${ex.title} auswählen`}
                      />
                    )}
                    <div>
                      <p className="font-medium">
                        {isFx ? "FX-Prüfung · " : ""}
                        {ex.title}
                      </p>
                      <p className="text-sm text-muted-foreground">{ex.detail || ex.exceptionType}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={ex.status} />
                    {isFx && <StatusBadge status="open" label="FX_REVIEW" />}
                    {isAdmin && isFx && ex.businessEventId && (
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
                          onClick={() => onResolve(ex._id, "resolved")}
                        >
                          Erledigen
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={resolving}
                          onClick={() => onResolve(ex._id, "dismissed")}
                        >
                          Verwerfen
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Geschäftsvorfälle (wartend)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.pendingEvents.map((ev) => (
            <div key={ev._id} className="flex justify-between border-b pb-2 text-sm">
              <span>
                {ev.eventType} · {ev.marketplaceOrderId || ev.sourceRecordId}
              </span>
              <StatusBadge status={ev.status} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Import-Historie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {data.recentImports.map((imp) => (
            <div key={imp._id} className="flex justify-between">
              <span>
                {imp.source}: {imp.filename}
              </span>
              <span className="text-muted-foreground">{formatDateTime(imp.createdAt)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
