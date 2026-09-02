"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { useGetAccrualInboxQuery } from "@/services/accountingApi";
import { formatDateTime } from "@/lib/format";

export function AccountingInboxPage() {
  const { data, isLoading, isError } = useGetAccrualInboxQuery();

  if (isLoading) return <LoadingSkeleton variant="page" />;
  if (isError || !data) {
    return (
      <EmptyState
        title="Posteingang nicht verfügbar"
        description="Der Accrual-API-Endpunkt antwortet nicht. Prüfen Sie, ob der Server mit Accrual-Routen läuft."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buchhaltungs-Posteingang"
        description="Offene Ausnahmen, wartende Matches und aktuelle Accrual-Importe"
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
              <div key={ex._id} className="flex items-start justify-between gap-4 border-b pb-3">
                <div>
                  <p className="font-medium">{ex.title}</p>
                  <p className="text-sm text-muted-foreground">{ex.detail || ex.exceptionType}</p>
                </div>
                <StatusBadge status={ex.status} />
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
          {data.pendingEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Keine wartenden Ereignisse</p>
          ) : (
            data.pendingEvents.map((ev) => (
              <div key={ev._id} className="flex justify-between border-b pb-2 text-sm">
                <span>
                  {ev.eventType} · {ev.marketplaceOrderId || ev.sourceRecordId}
                </span>
                <StatusBadge status={ev.status} />
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
            <p className="text-muted-foreground">Noch keine Accrual-Importe</p>
          ) : (
            data.recentImports.map((imp) => (
              <div key={imp._id} className="flex justify-between">
                <span>
                  {imp.source}: {imp.filename}
                </span>
                <span className="text-muted-foreground">{formatDateTime(imp.createdAt)}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
