"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccrualQueryState } from "@/components/shared/accrual-query-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useGetAccrualEventsQuery,
  useBuildJournalDraftMutation,
} from "@/services/accountingApi";
import { formatDateTime } from "@/lib/format";

export function AccrualEventsPage() {
  const { data, isLoading, isError } = useGetAccrualEventsQuery({ limit: 50 });
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

  return (
    <AccrualQueryState isLoading={isLoading} isError={isError} title="Geschäftsvorfälle nicht verfügbar">
    <div className="space-y-6">
      <PageHeader
        title="Geschäftsvorfälle (Accrual)"
        description="JTL- und Marktplatz-Ereignisse parallel zum Cash-Pfad"
      />

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
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={ev.status} />
                  {ev.status === "matched" && (
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
    </AccrualQueryState>
  );
}
