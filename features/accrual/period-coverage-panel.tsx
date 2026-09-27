"use client";

import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { useGetAccrualPeriodCoverageQuery } from "@/services/accountingApi";

export function PeriodCoveragePanel({ from, to }: { from: string; to: string }) {
  const { data, isLoading, isError } = useGetAccrualPeriodCoverageQuery(
    { from, to },
    { skip: !from || !to },
  );

  if (isLoading) return <LoadingSkeleton variant="card" />;
  if (isError || !data) {
    return (
      <Card>
        <CardContent className="py-4 text-sm text-destructive">
          Periodenabdeckung konnte nicht geladen werden.
        </CardContent>
      </Card>
    );
  }

  const rows = [
    {
      source: "JTL",
      counts: `${data.sources.jtl.batches} Batches · ${data.sources.jtl.rows} Zeilen · ${data.sources.jtl.events} Ereignisse`,
    },
    {
      source: "Amazon",
      counts: `${data.sources.amazon.orderBatches} Order · ${data.sources.amazon.financialBatches} Financial · ${data.sources.amazon.events} Ereignisse`,
    },
    {
      source: "Back Market",
      counts: `${data.sources.backmarket.orderBatches} Order · ${data.sources.backmarket.financialBatches} Financial · ${data.sources.backmarket.events} Ereignisse`,
    },
    {
      source: "Refurbed",
      counts: `${data.sources.refurbed.orderBatches} Order · ${data.sources.refurbed.financialBatches} Financial · ${data.sources.refurbed.events} Ereignisse`,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Periodenabdeckung (Accrual)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-muted-foreground">
          Zeitraum {data.period.from || "—"} – {data.period.to || "—"} · offene Ausnahmen{" "}
          {data.exceptionsOpen} · Journal gebucht {data.journalPostedLines} Zeilen · Entwürfe{" "}
          {data.journalDraftEntries}
        </p>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="p-2">Quelle</th>
                <th className="p-2">Bestände</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.source} className="border-t">
                  <td className="p-2 font-medium">{row.source}</td>
                  <td className="p-2 text-muted-foreground">{row.counts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(data.gaps ?? []).length > 0 && (
          <ul className="space-y-1">
            {data.gaps.map((gap) => (
              <li key={gap} className="flex items-start gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{gap}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
