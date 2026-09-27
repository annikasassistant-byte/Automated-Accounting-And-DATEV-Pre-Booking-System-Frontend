"use client";

import { AlertTriangle, Download, Printer } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { useGetAccrualMonthPackQuery } from "@/services/accountingApi";
import { formatCurrencyPrecise } from "@/lib/format";

export function AccrualMonthPackPanel({ from, to }: { from: string; to: string }) {
  const { data, isLoading, isError, refetch } = useGetAccrualMonthPackQuery(
    { from, to },
    { skip: !from || !to },
  );

  if (isLoading) return <LoadingSkeleton variant="card" />;
  if (isError || !data) {
    return (
      <Card>
        <CardContent className="py-4 text-sm text-destructive">
          Monats-Paket konnte nicht geladen werden.
        </CardContent>
      </Card>
    );
  }

  const downloadJson = () => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `accrual-month-pack-${from}_${to}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("JSON heruntergeladen");
    } catch {
      toast.error("Download fehlgeschlagen");
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-base">Accrual Monats-Paket</CardTitle>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => void refetch()}>
            Neu laden
          </Button>
          {data.status === "OK" && (
            <>
              <Button type="button" size="sm" variant="outline" onClick={downloadJson}>
                <Download className="mr-1 h-3.5 w-3.5" />
                JSON
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => window.print()}>
                <Printer className="mr-1 h-3.5 w-3.5" />
                Drucken
              </Button>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {data.status === "MISSING_DATA" ? (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-amber-900 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Unvollständige Daten</p>
              <p>
                {data.message ||
                  "Keine gebuchten Accrual-Journalzeilen im Zeitraum — Monats-Paket nicht verfügbar."}
              </p>
            </div>
          </div>
        ) : (
          <>
            <p className="text-muted-foreground">
              Zeitraum {data.period.from} – {data.period.to}
            </p>
            {data.journal && (
              <p>
                Journal: {data.journal.postedEntries} gebuchte Einträge · {data.journal.postedLines}{" "}
                Zeilen · {data.journal.draftEntries} Entwürfe
              </p>
            )}
            {data.overview && (
              <div className="grid gap-2 md:grid-cols-3">
                <p>Stornierungen: {data.overview.cancellationsCount}</p>
                <p>Rechnung ausstehend: {data.overview.invoicePendingCount}</p>
                <p>Offene Ausnahmen: {data.overview.openExceptionCount}</p>
              </div>
            )}
            {data.abgleich && (
              <p className="text-muted-foreground">
                Amazon/JTL: {data.abgleich.matchedCount} zugeordnet · {data.abgleich.amazonOnlyCount}{" "}
                nur Amazon · {data.abgleich.jtlOnlyCount} nur JTL
              </p>
            )}
            {data.overview?.revenueByMarketplace?.length ? (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-left">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="p-2">Marktplatz</th>
                      <th className="p-2">Umsatz</th>
                      <th className="p-2">Erstattungen</th>
                      <th className="p-2">Gebühren</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.overview.revenueByMarketplace.map((row) => (
                      <tr key={row.marketplace} className="border-t">
                        <td className="p-2 capitalize">{row.marketplace}</td>
                        <td className="p-2">{formatCurrencyPrecise(row.salesCents / 100)}</td>
                        <td className="p-2">{formatCurrencyPrecise(row.refundsCents / 100)}</td>
                        <td className="p-2">{formatCurrencyPrecise(row.feesCents / 100)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
