"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  Scale,
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  AlertCircle,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatBookingPeriod, formatCurrencyPrecise } from "@/lib/format";
import {
  useGetReconciliationSummaryQuery,
  useGetImportsQuery,
  useGetPaypalBalanceQuery,
} from "@/services/accountingApi";

const JULY = { from: "2026-07-01", to: "2026-07-31" };

export function ReconciliationPage() {
  const [from, setFrom] = useState(JULY.from);
  const [to, setTo] = useState(JULY.to);
  const [paypalImportId, setPaypalImportId] = useState<string>("");

  const period = useMemo(() => ({ from: from || undefined, to: to || undefined }), [from, to]);

  const {
    data: summary,
    isLoading,
    isError,
    refetch,
  } = useGetReconciliationSummaryQuery(period);

  const { data: paypalImports = [] } = useGetImportsQuery({ source: "paypal", limit: 20 });

  const selectedPaypalId = paypalImportId || paypalImports[0]?.id || "";
  const {
    data: paypalBalance,
    isFetching: paypalLoading,
    isError: paypalError,
  } = useGetPaypalBalanceQuery(selectedPaypalId, { skip: !selectedPaypalId });

  if (isLoading && !summary) return <LoadingSkeleton variant="page" />;

  if (isError || !summary) {
    return (
      <div className="space-y-8">
        <PageHeader title="Abstimmung" eyebrow="Kontrolle" />
        <EmptyState
          title="Abstimmung nicht ladbar"
          description="Die API /reconciliation/summary hat nicht geantwortet."
          actionLabel="Erneut versuchen"
          onAction={() => void refetch()}
        />
      </div>
    );
  }

  const statusRows = Object.entries(summary.byStatus || {}).sort((a, b) =>
    a[0].localeCompare(b[0]),
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title="Abstimmung"
        eyebrow="Kontrolle"
        description="Vergleicht importierte Buchungsbeträge mit DATEV-Exporten im gewählten Buchungszeitraum. Das ist kein Abgleich mit dem Kontostand 1201. PayPal-Guthaben unten kommt aus der CSV-Spalte Guthaben des gewählten Imports."
        action={<StatusBadge status={summary.validationStatus} />}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Buchungszeitraum</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <Label htmlFor="from">Von</Label>
            <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to">Bis</Label>
            <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setFrom(JULY.from);
              setTo(JULY.to);
            }}
          >
            Juli 2026
          </Button>
          <Button variant="outline" onClick={() => void refetch()}>
            Aktualisieren
          </Button>
        </CardContent>
      </Card>

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
          subtitle={`${summary.totalCount ?? "—"} Transaktionen`}
          icon={ArrowDownLeft}
          delay={0}
        />
        <MetricCard
          title="Exportiert"
          value={formatCurrencyPrecise(summary.exportedAmount)}
          subtitle="Status = exported"
          icon={ArrowUpRight}
          delay={0.05}
        />
        <MetricCard
          title="Differenz"
          value={formatCurrencyPrecise(summary.difference)}
          subtitle={`${summary.missingCount} nicht exportiert · ${summary.openCount ?? 0} offen/Konflikt`}
          icon={Scale}
          delay={0.1}
        />
        <MetricCard
          title="Duplikate"
          value={String(summary.duplicateCount)}
          subtitle="offene Duplikatgruppen"
          icon={Copy}
          delay={0.15}
        />
      </div>

      {(summary.blockers?.length || summary.validationStatus === "unbalanced") && (
        <Card className="border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              Blocker / Differenz
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              Differenz von{" "}
              <strong className="text-foreground">
                {formatCurrencyPrecise(summary.difference)}
              </strong>{" "}
              zwischen importierten und exportierten Beträgen.
            </p>
            {(summary.blockers || []).map((b) => (
              <p key={b}>• {b}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {statusRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status-Aufschlüsselung</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Anzahl</th>
                    <th className="px-3 py-2">Summe</th>
                  </tr>
                </thead>
                <tbody>
                  {statusRows.map(([status, val]) => (
                    <tr key={status} className="border-t">
                      <td className="px-3 py-2">
                        <StatusBadge status={status} />
                      </td>
                      <td className="px-3 py-2 tabular-nums">{val.count}</td>
                      <td className="px-3 py-2 tabular-nums">
                        {formatCurrencyPrecise(val.totalCents / 100)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-4 w-4" />
            PayPal-Guthaben (CSV, je Import)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Laufendes Guthaben aus der PayPal-CSV-Spalte „Guthaben“ für genau diesen Import — kein Abgleich mit Konto 1203.
          </p>
          {paypalImports.length === 0 ? (
            <EmptyState
              title="Kein PayPal-Import"
              description="Importieren Sie zuerst eine PayPal-CSV."
            />
          ) : (
            <>
              <div className="max-w-xl space-y-2">
                <Label>PayPal-Import wählen</Label>
                <Select
                  value={selectedPaypalId}
                  onValueChange={(v) => setPaypalImportId(v ?? "")}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Import wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {paypalImports.map((imp) => (
                      <SelectItem key={imp.id} value={imp.id}>
                        {imp.fileName} · {formatBookingPeriod(imp.periodStart, imp.periodEnd)} ·{" "}
                        {imp.rowCount} Zeilen
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {paypalLoading && <LoadingSkeleton />}
              {paypalError && (
                <EmptyState
                  title="Guthaben nicht ladbar"
                  description="API /reconciliation/paypal-balance fehlgeschlagen."
                />
              )}
              {paypalBalance && !paypalLoading && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Eingänge</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {formatCurrencyPrecise(paypalBalance.totalIn / 100)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Ausgänge</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {formatCurrencyPrecise(paypalBalance.totalOut / 100)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Gebühren</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {formatCurrencyPrecise(paypalBalance.feeTotal / 100)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">Netto / Txns</p>
                    <p className="text-lg font-semibold tabular-nums">
                      {formatCurrencyPrecise(paypalBalance.net / 100)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {paypalBalance.transactionCount} Transaktionen
                    </p>
                  </div>
                </div>
              )}
              {paypalBalance?.balanceCheck && (
                <div
                  className={`rounded-lg border p-3 text-sm ${
                    paypalBalance.balanceCheck.matched
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                  }`}
                >
                  <p className="font-medium">
                    Datei-Guthaben:{" "}
                    {paypalBalance.balanceCheck.matched ? "Stimmt überein" : "Abweichung"}
                  </p>
                  <p>
                    Erwartet:{" "}
                    {Number(paypalBalance.balanceCheck.expectedGuthaben ?? 0).toFixed(2)} € ·
                    Berechnet:{" "}
                    {Number(paypalBalance.balanceCheck.calculatedGuthaben ?? 0).toFixed(2)} €
                  </p>
                  {paypalBalance.balanceCheck.note && <p>{paypalBalance.balanceCheck.note}</p>}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
