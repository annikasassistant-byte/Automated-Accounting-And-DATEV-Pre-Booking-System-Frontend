"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Download, FileSpreadsheet, Info } from "lucide-react";
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
import { useAuthStore } from "@/lib/auth-store";

type Period = DatevExportJob["period"];

const PERIOD_LABELS: Record<Period, string> = {
  daily: "Täglich",
  weekly: "Wöchentlich",
  monthly: "Monatlich",
  custom: "Benutzerdefiniert",
};

/** Local calendar date YYYY-MM-DD — avoids UTC shift from toISOString(). */
function localIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function calendarMonthRange(ref = new Date()) {
  const start = new Date(ref.getFullYear(), ref.getMonth(), 1);
  const end = new Date(ref.getFullYear(), ref.getMonth() + 1, 0);
  return { from: localIsoDate(start), to: localIsoDate(end) };
}

function july2026Range() {
  return { from: "2026-07-01", to: "2026-07-31" };
}

function rangeForPeriod(period: Period, customFrom: string, customTo: string) {
  const today = new Date();
  if (period === "custom") return { from: customFrom, to: customTo };
  if (period === "daily") {
    const d = localIsoDate(today);
    return { from: d, to: d };
  }
  if (period === "weekly") {
    const end = new Date(today);
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { from: localIsoDate(start), to: localIsoDate(end) };
  }
  return calendarMonthRange(today);
}

type PreviewResult = {
  transactionCount: number;
  total: number;
  warnings: string[];
  errors: string[];
  eligibility?: {
    requiredStatus?: string[];
    note?: string;
  } | null;
  exclusions?: {
    inPeriodBookable?: number;
    eligible?: number;
    alreadyExported?: number;
    notApproved?: number;
    incompleteBooking?: number;
    openOrConflict?: number;
    reasons?: { reason: string; count: number }[];
  } | null;
};

export function DatevExportPage() {
  const { data: exports = [], isLoading: exportsLoading } = useGetExportsQuery();
  const { data: datev } = useGetDatevSettingsQuery();
  const isAdmin = useAuthStore((s) => s.hasRole("admin"));
  const [previewExport] = usePreviewExportMutation();
  const [validateExport] = useValidateExportMutation();
  const [createExport, { isLoading: creating }] = useCreateExportMutation();
  const [downloadExport] = useDownloadExportMutation();

  const [period, setPeriod] = useState<Period>("custom");
  const [customFrom, setCustomFrom] = useState(july2026Range().from);
  const [customTo, setCustomTo] = useState(july2026Range().to);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
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

  const setPeriodSafe = (p: Period) => {
    setPeriod(p);
    setPreview(null);
    setValidation(null);
    if (p === "monthly") {
      const r = calendarMonthRange();
      setCustomFrom(r.from);
      setCustomTo(r.to);
    } else if (p === "custom" && (!customFrom || !customTo)) {
      const r = july2026Range();
      setCustomFrom(r.from);
      setCustomTo(r.to);
    }
  };

  const handlePreview = async () => {
    try {
      const result = await previewExport({ from, to, periodType: PERIOD_TO_TYPE[period] }).unwrap();
      setPreview(result);
      setValidation(null);
      if (result.transactionCount === 0) {
        toast.warning("0 exportierbare Buchungen — siehe Ausschlussgründe unten");
      } else {
        toast.success(`${result.transactionCount} Buchungen im Zeitraum`);
      }
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
      toast.success("Bestehenden Export erneut heruntergeladen (keine neuen Sperren)");
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
        description={
          isAdmin
            ? "Zeitraum wählen, Vorschau prüfen, validieren und EXTF erzeugen. Erzeugen sperrt Cash-Transaktionen. Download aus der Historie lädt nur erneut — ohne neue Sperre."
            : "Zeitraum wählen und Vorschau/Validierung prüfen. DATEV CSV erzeugen ist nur für Admins."
        }
        action={
          isAdmin ? (
            <Button onClick={handleGenerate} disabled={creating} className="min-h-11 w-full sm:w-auto">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              DATEV CSV erzeugen
            </Button>
          ) : undefined
        }
      />

      <div className="flex items-start gap-2 rounded-xl border border-border/40 bg-muted/20 p-3 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="space-y-1 text-muted-foreground">
          <p>
            <strong className="text-foreground">Exportierbar:</strong> Status{" "}
            <code className="text-xs">reviewed</code> (ggf. auch{" "}
            <code className="text-xs">matched</code>, falls in den Unternehmenseinstellungen
            erlaubt), buchbar, Konto+Gegenkonto gesetzt, noch nicht exportiert.
          </p>
          <p>
            Leerer Juli-Export bedeutet meist: Buchungen sind bereits gesperrt, nicht freigegeben
            oder unvollständig — die Vorschau listet die Ausschlussgründe.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border/40 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Zeitraum</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Periode</Label>
              <Select value={period} onValueChange={(v) => v && setPeriodSafe(v as Period)}>
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
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const r = july2026Range();
                  setPeriod("custom");
                  setCustomFrom(r.from);
                  setCustomTo(r.to);
                  setPreview(null);
                  setValidation(null);
                }}
              >
                Juli 2026
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const r = calendarMonthRange();
                  setPeriod("monthly");
                  setCustomFrom(r.from);
                  setCustomTo(r.to);
                  setPreview(null);
                  setValidation(null);
                }}
              >
                Aktueller Monat
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="from">Von</Label>
                <Input
                  id="from"
                  type="date"
                  value={period === "custom" ? customFrom : from}
                  onChange={(e) => {
                    setPeriod("custom");
                    setCustomFrom(e.target.value);
                    setPreview(null);
                    setValidation(null);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="to">Bis</Label>
                <Input
                  id="to"
                  type="date"
                  value={period === "custom" ? customTo : to}
                  onChange={(e) => {
                    setPeriod("custom");
                    setCustomTo(e.target.value);
                    setPreview(null);
                    setValidation(null);
                  }}
                />
              </div>
            </div>
            <div className="rounded-xl bg-muted/40 p-3 text-sm">
              <p className="text-muted-foreground">Gewählter Zeitraum</p>
              <p className="mt-1 font-medium tabular-nums">
                {from} – {to}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Kalenderdaten (lokale Zeitzone), nicht UTC-verschoben.
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
                <p className="text-sm text-muted-foreground">Exportierbar</p>
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

            {preview?.eligibility?.note && (
              <p className="text-sm text-muted-foreground">{preview.eligibility.note}</p>
            )}

            {preview?.exclusions && (
              <div className="space-y-2 rounded-xl border border-border/40 p-4 text-sm">
                <p className="font-medium">Ausschlüsse im Zeitraum</p>
                <p className="text-muted-foreground">
                  Buchbar im Zeitraum: {preview.exclusions.inPeriodBookable ?? "—"} · Exportierbar:{" "}
                  {preview.exclusions.eligible ?? preview.transactionCount}
                </p>
                <ul className="space-y-1">
                  {(preview.exclusions.reasons || []).map((r) => (
                    <li key={r.reason} className="flex justify-between gap-2 tabular-nums">
                      <span>{r.reason}</span>
                      <span className="font-medium">{r.count}</span>
                    </li>
                  ))}
                  {(preview.exclusions.reasons || []).length === 0 && (
                    <li className="text-muted-foreground">Keine Ausschlüsse gemeldet</li>
                  )}
                </ul>
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
          <div>
            <CardTitle className="text-base">Export-Historie</CardTitle>
            <p className="text-sm text-muted-foreground">
              Download = bestehenden Stapel erneut laden. „DATEV CSV erzeugen“ = neu exportierbare
              Postings (mit Sperre).
            </p>
          </div>
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
                        {String(job.from).slice(0, 10)} – {String(job.to).slice(0, 10)}
                      </TableCell>
                      <TableCell className="tabular-nums">{job.transactionCount}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">
                        {job.fileName ?? "—"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={job.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => handleDownload(job)}>
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                          Erneut laden
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
