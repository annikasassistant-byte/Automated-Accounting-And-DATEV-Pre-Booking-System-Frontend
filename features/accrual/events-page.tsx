"use client";

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
import { formatDateTime } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";

const NON_BOOKABLE = new Set(["ORDER_CREATED", "CANCELLATION"]);

export function AccrualEventsPage() {
  const isAdmin = useAuthStore((s) => s.hasRole("admin"));
  const { data, isLoading } = useGetAccrualEventsQuery({ limit: 50 });
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
        description="ORDER_CREATED ≠ Umsatz; Financial sales/revenue = Clearing (SETTLEMENT)"
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
