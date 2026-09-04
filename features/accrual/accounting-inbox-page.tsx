"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useGetAccrualInboxQuery,
  useResolveAccrualExceptionMutation,
} from "@/services/accountingApi";
import { formatDateTime } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";

export function AccountingInboxPage() {
  const isAdmin = useAuthStore((s) => s.hasRole("admin"));
  const { data, isLoading, isError, refetch } = useGetAccrualInboxQuery();
  const [resolveEx, { isLoading: resolving }] = useResolveAccrualExceptionMutation();

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

  if (isLoading) return <LoadingSkeleton variant="page" />;
  if (isError || !data) {
    return <p className="text-destructive">Posteingang konnte nicht geladen werden.</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buchhaltungs-Posteingang"
        description="Nur echte Ausnahmen — automatisch abgestimmte Fälle verlassen die Queue"
      />

      <div className="grid gap-4 md:grid-cols-3">
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
            <CardTitle className="text-base">Letzte Importe</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{data.recentImports.length}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ausnahmen</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.openExceptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine offenen Ausnahmen</p>
          ) : (
            data.openExceptions.map((ex) => (
              <div key={ex._id} className="flex flex-wrap items-start justify-between gap-4 border-b pb-3">
                <div>
                  <p className="font-medium">{ex.title}</p>
                  <p className="text-sm text-muted-foreground">{ex.detail || ex.exceptionType}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={ex.status} />
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
            ))
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
