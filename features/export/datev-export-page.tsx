"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Download, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
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
import { formatCurrencyPrecise, formatDate } from "@/lib/format";
import { TableScroll } from "@/components/shared/table-scroll";
import {
  usePreviewExportMutation,
  useValidateExportMutation,
  useCreateExportMutation,
  useGetExportsQuery,
  useDownloadExportMutation,
  useGetDatevSettingsQuery,
} from "@/services/accountingApi";
import type { DatevExportJob } from "@/types/accounting";

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
  if (period === "custom") return { from: customFrom, to: customTo };
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

export function DatevExportPage() {
  const { data: exports = [], isLoading: exportsLoading } = useGetExportsQuery();
  const { data: datev } = useGetDatevSettingsQuery();
  const [previewExport] = usePreviewExportMutation();
  const [validateExport] = useValidateExportMutation();
  const [createExport, { isLoading: creating }] = useCreateExportMutation();
  const [downloadExport] = useDownloadExportMutation();

  const [period, setPeriod] = useState<Period>("monthly");
  const [customFrom, setCustomFrom] = useState("2026-07-01");
  const [customTo, setCustomTo] = useState("2026-07-31");
  const [preview, setPreview] = useState<{
    transactionCount: number;
    total: number;
    warnings: string[];
    errors: string[];
  } | null>(null);
  const [validation, setValidation] = useState<{
    valid: boolean;
    warnings: string[];
    errors: string[];
  } | null>(null);

  const { from, to } = useMemo(
    () => rangeForPeriod(period, customFrom, customTo),
    [period, customFrom, customTo]
  );

  const PERIOD_TO_TYPE: Record<string, string> = {
    daily: "day",
    weekly: "week",
    monthly: "month",
    custom: "custom",
  };

  const handlePreview = async () => {
    try {
      const result = await previewExport({ from, to, periodType: PERIOD_TO_TYPE[period] }).unwrap();
      setPreview(result);
      setValidation(null);
      toast.success(`${result.transactionCount} Buchungen im Zeitraum`);
    } catch {
      toast.error("Vorschau fehlgeschlagen");
    }
  };

  const handleValidate = async () => {
    try {
      const result = await validateExport({ from, to, periodType: PERIOD_TO_TYPE[period] }).unwrap();
      setValidation(result);
      if (result.valid) {
        toast.success("Validierung erfolgreich");
      } else {
        toast.warning(`${result.errors.length} Fehler, ${result.warnings.length} Warnungen`);
      }
    } catch {
      toast.error("Validierung fehlgeschlagen");
    }
  };

  const handleGenerate = async () => {
    if (validation && !validation.valid && validation.errors.length) {
      toast.error("Validierungsfehler — Export nicht möglich");
      return;
    }
    try {
      const job = await createExport({ from, to, periodType: PERIOD_TO_TYPE[period] }).unwrap();
      toast.success(`DATEV-Export mit ${job.transactionCount} Buchungen erzeugt`);
      if (job.id) {
        await downloadExport({ id: job.id, fileName: job.fileName }).unwrap();
      }
    } catch {
      toast.error("Export fehlgeschlagen");
    }
  };

  const handleDownload = async (job: DatevExportJob) => {
    try {
      await downloadExport({ id: job.id, fileName: job.fileName }).unwrap();
    } catch {
      toast.error("Download fehlgeschlagen");
    }
  };

  if (exportsLoading) return <LoadingSkeleton variant="page" />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="DATEV Export"
        eyebrow="Export"
        description="Zeitraum wählen, validieren und EXTF-Buchungsstapel herunterladen."
        action={
          <Button onClick={handleGenerate} disabled={creating} className="min-h-11 w-full sm:w-auto">
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
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" className="min-h-11 w-full sm:w-auto" onClick={handlePreview}>
                Vorschau
              </Button>
              <Button variant="outline" className="min-h-11 w-full sm:w-auto" onClick={handleValidate}>
                Validieren
              </Button>
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
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {preview?.transactionCount ?? "—"}
                </p>
              </div>
              <div className="rounded-xl border border-border/40 p-4">
                <p className="text-sm text-muted-foreground">Summe</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {preview ? formatCurrencyPrecise(preview.total) : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-border/40 p-4">
                <p className="text-sm text-muted-foreground">Warnungen / Fehler</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {validation
                    ? `${validation.warnings.length} / ${validation.errors.length}`
                    : "—"}
                </p>
              </div>
            </div>

            {datev && (!datev.consultantNumber || !datev.clientNumber) && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                Berater- oder Mandantennummer fehlt in den DATEV-Einstellungen
              </div>
            )}

            {validation && (
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
            <TableScroll>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Erstellt</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead>Zeitraum</TableHead>
                  <TableHead>Anzahl</TableHead>
                  <TableHead>Datei</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aktion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exports.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="tabular-nums">{formatDate(job.createdAt)}</TableCell>
                    <TableCell>{PERIOD_LABELS[job.period] ?? job.period}</TableCell>
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
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(job)}
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </TableScroll>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
