"use client";

import { GitMerge, Ban, Split } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyPrecise, formatDate } from "@/lib/format";
import type { DuplicateItem, DuplicateTxnPreview } from "@/types/accounting";
import {
  useGetDuplicatesQuery,
  useResolveDuplicateMutation,
} from "@/services/accountingApi";

function DuplicateCard({
  item,
  busy,
  onMerge,
  onIgnore,
  onKeepBoth,
}: {
  item: DuplicateItem;
  busy: boolean;
  onMerge: () => void;
  onIgnore: () => void;
  onKeepBoth: () => void;
}) {
  const rows: DuplicateTxnPreview[] = item.transactions?.length
    ? item.transactions
    : item.transactionIds.map((id) => ({ id }));

  return (
    <Card className="border-border/40">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">Duplikatgruppe</CardTitle>
            <StatusBadge status={String(item.kind)} />
          </div>
          <p className="text-sm text-muted-foreground">{item.reason || "Kein Grund hinterlegt"}</p>
          <p className="text-xs text-muted-foreground">
            {rows.length} betroffene Transaktion{rows.length === 1 ? "" : "en"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={busy} onClick={onIgnore}>
            <Ban className="mr-1.5 h-3.5 w-3.5" />
            Ignorieren
          </Button>
          <Button variant="outline" size="sm" disabled={busy} onClick={onKeepBoth}>
            <Split className="mr-1.5 h-3.5 w-3.5" />
            Beide behalten
          </Button>
          <Button size="sm" disabled={busy || rows.length < 2} onClick={onMerge}>
            <GitMerge className="mr-1.5 h-3.5 w-3.5" />
            Zusammenführen
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">Datum</th>
                <th className="px-3 py-2">Gegenpartei</th>
                <th className="px-3 py-2">Betrag</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((tx) => (
                <tr key={tx.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{tx.id.slice(-8)}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {tx.bookingDate ? formatDate(tx.bookingDate) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div>{tx.counterpartyName || "—"}</div>
                    {tx.purpose && (
                      <div className="max-w-md truncate text-xs text-muted-foreground">
                        {tx.purpose}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {typeof tx.amountCents === "number"
                      ? formatCurrencyPrecise(tx.amountCents / 100)
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {tx.status ? <StatusBadge status={tx.status} /> : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function DuplicatesPage() {
  const { data: duplicates = [], isLoading, isError, refetch } = useGetDuplicatesQuery();
  const [resolveDuplicate, { isLoading: resolving }] = useResolveDuplicateMutation();

  const run = async (id: string, action: "merge" | "ignore" | "keep_both") => {
    try {
      await resolveDuplicate({ id, action }).unwrap();
      const msg =
        action === "merge"
          ? "Duplikat zusammengeführt — Folge-Buchungen als skipped markiert"
          : action === "ignore"
            ? "Duplikat ignoriert"
            : "Beide Transaktionen behalten — Gruppe geschlossen";
      toast.success(msg);
    } catch (err) {
      toast.error(
        (err as { data?: { message?: string } })?.data?.message ?? "Auflösung fehlgeschlagen",
      );
    }
  };

  if (isLoading) return <LoadingSkeleton variant="page" />;

  if (isError) {
    return (
      <div className="space-y-8">
        <PageHeader title="Duplikate" eyebrow="Qualität" />
        <EmptyState
          title="Duplikate nicht ladbar"
          description="API /duplicates fehlgeschlagen."
          actionLabel="Erneut versuchen"
          onAction={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Duplikate"
        eyebrow="Qualität"
        description="Mögliche Doppelbuchungen prüfen und zusammenführen, ignorieren oder beide behalten."
      />

      {duplicates.length === 0 ? (
        <EmptyState
          title="Keine offenen Duplikate"
          description="Gruppen entstehen z. B. beim erneuten Upload derselben CSV (Fingerprint). Danach erscheinen sie hier zur Auflösung."
        />
      ) : (
        <div className="space-y-6">
          {duplicates.map((item) => (
            <DuplicateCard
              key={item.id}
              item={item}
              busy={resolving}
              onMerge={() => void run(item.id, "merge")}
              onIgnore={() => void run(item.id, "ignore")}
              onKeepBoth={() => void run(item.id, "keep_both")}
            />
          ))}
        </div>
      )}
    </div>
  );
}
