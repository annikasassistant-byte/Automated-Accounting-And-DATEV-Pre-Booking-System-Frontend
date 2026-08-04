"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { downloadTextFile } from "@/lib/accounting/csv";
import { formatCurrencyPrecise, formatDate } from "@/lib/format";
import { accountLabel, useAccountingStore } from "@/store/accounting-store";
import type { Account, DatevExportJob, Transaction } from "@/types/accounting";

type Period = DatevExportJob["period"];

const PERIOD_LABELS: Record<Period, string> = {
  daily: "Täglich",
  weekly: "Wöchentlich",
  monthly: "Monatlich",
  custom: "Benutzerdefiniert",
};

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function rangeForPeriod(period: Period, customFrom: string, customTo: string) {
  const today = new Date();
  if (period === "custom") {
    return { from: customFrom, to: customTo };
  }
  if (period === "daily") {
    const d = isoDate(today);
    return { from: d, to: d };
  }
  if (period === "weekly") {
    const end = new Date(today);
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { from: isoDate(start), to: isoDate(end) };
  }
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { from: isoDate(start), to: isoDate(end) };
}

function isExportable(t: Transaction) {
  return t.status === "approved" || t.status === "matched" || t.status === "exported";
}

function buildDatevCsv(txs: Transaction[], accounts: Account[]) {
  const header = [
    "Umsatz (ohne Soll/Haben-Kz)",
    "Soll/Haben-Kennzeichen",
    "WKZ Umsatz",
    "Konto",
    "Gegenkonto (ohne BU-Schlüssel)",
    "Belegdatum",
    "Buchungstext",
    "Belegfeld 1",
  ].join(";");

  const lines = txs.map((t) => {
    const sollHaben = t.amount < 0 ? "S" : "H";
    const umsatz = Math.abs(t.amount).toFixed(2).replace(".", ",");
    const konto =
      accounts.find((a) => a.id === t.expenseAccountId)?.number ??
      t.expenseAccountId ??
      "";
    const gegen =
      accounts.find((a) => a.id === t.offsetAccountId)?.number ??
      t.offsetAccountId ??
      "";
    const belegdatum = t.date.slice(8, 10) + t.date.slice(5, 7);
    const text = `${t.counterparty} ${t.description}`.trim().slice(0, 60);
    return [umsatz, sollHaben, t.currency || "EUR", konto, gegen, belegdatum, text, t.reference]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(";");
  });

  return ["EXTF;700;21;Buchungsstapel;12;...", header, ...lines].join("\n");
}

export function DatevExportPage() {
  const transactions = useAccountingStore((s) => s.transactions);
  const accounts = useAccountingStore((s) => s.accounts);
  const exports = useAccountingStore((s) => s.exports);
  const addExport = useAccountingStore((s) => s.addExport);
  const datev = useAccountingStore((s) => s.datev);

  const [period, setPeriod] = useState<Period>("monthly");
  const [customFrom, setCustomFrom] = useState("2026-07-01");
  const [customTo, setCustomTo] = useState("2026-07-31");

  const { from, to } = useMemo(
    () => rangeForPeriod(period, customFrom, customTo),
    [period, customFrom, customTo]
  );

  const inRange = useMemo(
    () => transactions.filter((t) => t.date >= from && t.date <= to && isExportable(t)),
    [transactions, from, to]
  );

  const validation = useMemo(() => {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (!from || !to) errors.push("Zeitraum ist unvollständig");
    if (from && to && from > to) errors.push("Von-Datum liegt nach Bis-Datum");
    if (!datev.consultantNumber || !datev.clientNumber) {
      warnings.push("Berater- oder Mandantennummer fehlt in den DATEV-Einstellungen");
    }
    if (!inRange.length) warnings.push("Keine freigegebenen / zugeordneten Transaktionen im Zeitraum");

    const missingAccount = inRange.filter((t) => !t.expenseAccountId || !t.offsetAccountId);
    if (missingAccount.length) {
      warnings.push(`${missingAccount.length} Buchungen ohne vollständige Kontierung`);
    }
    const already = inRange.filter((t) => t.exportStatus === "exported");
    if (already.length) {
      warnings.push(`${already.length} Transaktionen bereits exportiert`);
    }

    return { warnings, errors };
  }, [from, to, datev, inRange]);

  const generate = () => {
    if (validation.errors.length) {
      toast.error("Validierungsfehler — Export nicht möglich");
      return;
    }
    const fileName = `EXTF_Buchungsstapel_${from}_${to}.csv`;
    const csv = buildDatevCsv(inRange, accounts);
    downloadTextFile(fileName, csv);

    const job: DatevExportJob = {
      id: `exp-${Date.now()}`,
      period,
      from,
      to,
      transactionCount: inRange.length,
      createdAt: new Date().toISOString(),
      createdBy: "Benutzer",
      status: validation.warnings.length ? "validated" : "completed",
      warnings: validation.warnings,
      errors: [],
      fileName,
    };
    addExport(job);
    toast.success(`DATEV-CSV mit ${inRange.length} Buchungen erzeugt`);
  };

  const previewTotal = inRange.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-8">
      <PageHeader
        title="DATEV Export"
        eyebrow="Export"
        description="Zeitraum wählen, validieren und EXTF-Buchungsstapel als CSV herunterladen."
        action={
          <Button onClick={generate} disabled={!!validation.errors.length}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            DATEV CSV erzeugen
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border/40 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Zeitraum</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Periode</Label>
              <Select value={period} onValueChange={(v) => v && setPeriod(v as Period)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {PERIOD_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {period === "custom" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="from">Von</Label>
                  <Input
                    id="from"
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="to">Bis</Label>
                  <Input
                    id="to"
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                  />
                </div>
              </div>
            )}
            <div className="rounded-xl bg-muted/40 p-3 text-sm">
              <p className="text-muted-foreground">Gewählter Zeitraum</p>
              <p className="mt-1 font-medium tabular-nums">
                {from} – {to}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Validierung & Vorschau</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border/40 p-4">
                <p className="text-sm text-muted-foreground">Transaktionen</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">{inRange.length}</p>
              </div>
              <div className="rounded-xl border border-border/40 p-4">
                <p className="text-sm text-muted-foreground">Summe</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {formatCurrencyPrecise(previewTotal)}
                </p>
              </div>
              <div className="rounded-xl border border-border/40 p-4">
                <p className="text-sm text-muted-foreground">Warnungen / Fehler</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {validation.warnings.length} / {validation.errors.length}
                </p>
              </div>
            </div>

            {(validation.errors.length > 0 || validation.warnings.length > 0) && (
              <div className="space-y-2">
                {validation.errors.map((e) => (
                  <div
                    key={e}
                    className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    {e}
                  </div>
                ))}
                {validation.warnings.map((w) => (
                  <div
                    key={w}
                    className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    {w}
                  </div>
                ))}
              </div>
            )}

            {inRange.length > 0 && (
              <div className="overflow-auto rounded-xl border border-border/40">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Datum</TableHead>
                      <TableHead>Gegenpartei</TableHead>
                      <TableHead>Konto</TableHead>
                      <TableHead className="text-right">Betrag</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inRange.slice(0, 8).map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="tabular-nums">{formatDate(t.date)}</TableCell>
                        <TableCell className="max-w-[160px] truncate">{t.counterparty}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {accountLabel(accounts, t.expenseAccountId)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCurrencyPrecise(t.amount)}
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

      <Card className="border-border/40">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Export-Historie</CardTitle>
          <Download className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {exports.length === 0 ? (
            <EmptyState
              title="Noch keine Exporte"
              description="Erzeugen Sie den ersten DATEV-Buchungsstapel."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Erstellt</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Zeitraum</TableHead>
                  <TableHead>Anzahl</TableHead>
                  <TableHead>Datei</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exports.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="tabular-nums">{formatDate(job.createdAt)}</TableCell>
                    <TableCell>{PERIOD_LABELS[job.period]}</TableCell>
                    <TableCell className="tabular-nums text-sm">
                      {job.from} – {job.to}
                    </TableCell>
                    <TableCell className="tabular-nums">{job.transactionCount}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">
                      {job.fileName ?? "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={job.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
