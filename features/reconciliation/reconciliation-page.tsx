"use client";

import { useMemo } from "react";
import { CheckCircle2, Scale, ArrowDownLeft, ArrowUpRight, Copy, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrencyPrecise, formatDate } from "@/lib/format";
import { useAccountingStore } from "@/store/accounting-store";

export function ReconciliationPage() {
  const transactions = useAccountingStore((s) => s.transactions);
  const duplicates = useAccountingStore((s) => s.duplicates);

  const summary = useMemo(() => {
    const importedAmount = transactions.reduce((s, t) => s + t.amount, 0);
    const exportedAmount = transactions
      .filter((t) => t.exportStatus === "exported")
      .reduce((s, t) => s + t.amount, 0);
    const difference = importedAmount - exportedAmount;
    const missing = transactions.filter((t) => t.exportStatus !== "exported");
    const duplicateTxs = transactions.filter(
      (t) => t.status === "duplicate" || duplicates.some((d) => d.transactionIds.includes(t.id))
    );
    const balanced = Math.abs(difference) < 0.005 && missing.length === 0;

    return {
      importedAmount,
      exportedAmount,
      difference,
      missing,
      duplicateTxs,
      duplicateCount: duplicates.length,
      validationStatus: balanced ? ("balanced" as const) : ("unbalanced" as const),
    };
  }, [transactions, duplicates]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Abstimmung"
        eyebrow="Kontrolle"
        description="Importierte Beträge mit DATEV-Exporten abgleichen und fehlende Buchungen finden."
        action={<StatusBadge status={summary.validationStatus} />}
      />

      {summary.validationStatus === "balanced" && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Ausgeglichen</p>
            <p className="text-emerald-700/80 dark:text-emerald-400/80">
              Alle importierten Beträge sind exportiert — keine offene Differenz.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Importiert"
          value={formatCurrencyPrecise(summary.importedAmount)}
          subtitle="Summe aller Transaktionen"
          icon={ArrowDownLeft}
          delay={0}
        />
        <MetricCard
          title="Exportiert"
          value={formatCurrencyPrecise(summary.exportedAmount)}
          subtitle="exportStatus = exported"
          icon={ArrowUpRight}
          delay={0.05}
        />
        <MetricCard
          title="Differenz"
          value={formatCurrencyPrecise(summary.difference)}
          subtitle={`${summary.missing.length} nicht exportiert`}
          icon={Scale}
          delay={0.1}
        />
        <MetricCard
          title="Duplikate"
          value={String(summary.duplicateCount)}
          subtitle={`${summary.duplicateTxs.length} betroffene Buchungen`}
          icon={Copy}
          delay={0.15}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              Fehlende Exporte
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary.missing.length === 0 ? (
              <EmptyState
                title="Nichts offen"
                description="Alle Transaktionen wurden exportiert."
                className="py-10"
              />
            ) : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Gegenpartei</TableHead>
                      <TableHead className="text-right">Betrag</TableHead>
                      <TableHead>Export</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.missing.slice(0, 25).map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="tabular-nums whitespace-nowrap">
                          {formatDate(t.date)}
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate">{t.counterparty}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrencyPrecise(t.amount)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={t.exportStatus} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Copy className="h-4 w-4 text-orange-600" />
              Duplikat-Transaktionen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary.duplicateTxs.length === 0 ? (
              <EmptyState
                title="Keine Duplikate"
                description="Derzeit sind keine doppelten Buchungen markiert."
                className="py-10"
              />
            ) : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Gegenpartei</TableHead>
                      <TableHead className="text-right">Betrag</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.duplicateTxs.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="tabular-nums whitespace-nowrap">
                          {formatDate(t.date)}
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate">{t.counterparty}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrencyPrecise(t.amount)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={t.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
