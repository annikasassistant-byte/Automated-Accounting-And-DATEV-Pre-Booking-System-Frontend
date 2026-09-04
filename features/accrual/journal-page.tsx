"use client";

import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useGetAccrualJournalQuery, usePostAccrualJournalMutation } from "@/services/accountingApi";
import { formatDateTime } from "@/lib/format";
import { useAuthStore } from "@/lib/auth-store";

export function AccrualJournalPage() {
  const isAdmin = useAuthStore((s) => s.hasRole("admin"));
  const { data, isLoading, refetch } = useGetAccrualJournalQuery({});
  const [postJournal, { isLoading: posting }] = usePostAccrualJournalMutation();
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
      <PageHeader title="Accrual-Journal" description="Entwürfe und gebuchte Journalzeilen" />

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

      <p className="text-xs text-muted-foreground">
        Hinweis: Financial sales/revenue sind Clearing-Bewegungen, kein zweiter Umsatz. Accrual→DATEV
        Export folgt separat — Cash-DATEV bleibt unverändert.
      </p>
    </div>
  );
}
