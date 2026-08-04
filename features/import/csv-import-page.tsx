"use client";

import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FileUp, Upload, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/shared/status-badge";
import type { TransactionSource } from "@/types/accounting";
import { hashFile, parseCsvText } from "@/lib/accounting/csv";
import {
  createTransactionsFromRows,
  useAccountingStore,
} from "@/store/accounting-store";

type Phase = "idle" | "parsing" | "preview" | "importing" | "done" | "error";

export function CsvImportPage({ source }: { source: TransactionSource }) {
  const importedFileHashes = useAccountingStore((s) => s.importedFileHashes);
  const addImportBatch = useAccountingStore((s) => s.addImportBatch);
  const applyRulesToTransactions = useAccountingStore((s) => s.applyRulesToTransactions);

  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [fileHash, setFileHash] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Array<Record<string, string>>>([]);
  const [errors, setErrors] = useState<Array<{ row: number; message: string }>>([]);
  const [duplicateFile, setDuplicateFile] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  const title = source === "bank" ? "Bank-CSV Import" : "PayPal-CSV Import";
  const eyebrow = source === "bank" ? "Bank" : "PayPal";

  const previewRows = useMemo(() => rows.slice(0, 20), [rows]);

  const reset = () => {
    setPhase("idle");
    setProgress(0);
    setFile(null);
    setFileHash("");
    setHeaders([]);
    setRows([]);
    setErrors([]);
    setDuplicateFile(false);
    setImportedCount(0);
  };

  const processFile = useCallback(
    async (f: File) => {
      if (!f.name.toLowerCase().endsWith(".csv")) {
        toast.error("Nur CSV-Dateien werden unterstützt");
        setPhase("error");
        return;
      }
      setFile(f);
      setPhase("parsing");
      setProgress(15);
      try {
        const hash = await hashFile(f);
        setFileHash(hash);
        setDuplicateFile(importedFileHashes.includes(hash));
        setProgress(40);
        const text = await f.text();
        setProgress(70);
        const parsed = parseCsvText(text);
        setHeaders(parsed.headers);
        setRows(parsed.rows);
        setErrors(parsed.errors);
        setProgress(100);
        if (!parsed.rows.length) {
          setPhase("error");
          toast.error("Keine gültigen Zeilen gefunden");
          return;
        }
        setPhase("preview");
        toast.success(`${parsed.rows.length} Zeilen gelesen`);
      } catch {
        setPhase("error");
        toast.error("Datei konnte nicht gelesen werden");
      }
    },
    [importedFileHashes]
  );

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) await processFile(f);
  };

  const runImport = async () => {
    if (!file) return;
    setPhase("importing");
    setProgress(10);
    const batchId = `batch-${Date.now()}`;
    await new Promise((r) => setTimeout(r, 350));
    setProgress(45);
    const txs = createTransactionsFromRows(source, rows, batchId);
    setProgress(75);
    const wasDuplicateFile = duplicateFile || importedFileHashes.includes(fileHash || file.name);
    const { duplicateFile: dup } = addImportBatch(
      {
        id: batchId,
        source,
        fileName: file.name,
        fileHash: fileHash || file.name,
        importedAt: new Date().toISOString(),
        rowCount: rows.length,
        successCount: txs.length,
        errorCount: errors.length,
        duplicateCount: wasDuplicateFile ? 1 : 0,
        status: errors.length && !txs.length ? "failed" : "completed",
        errors,
      },
      txs
    );
    const applied = applyRulesToTransactions();
    setProgress(100);
    setImportedCount(txs.length);
    setDuplicateFile(dup || wasDuplicateFile);
    setPhase("done");
    toast.success(`${txs.length} Transaktionen importiert · ${applied} Regeln angewendet`);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={title}
        eyebrow={eyebrow}
        description="CSV hochladen, validieren und Transaktionen für die Regelengine vorbereiten."
        action={
          phase !== "idle" ? (
            <Button variant="outline" onClick={reset}>
              Neuer Import
            </Button>
          ) : undefined
        }
      />

      {(phase === "idle" || phase === "error") && (
        <Card
          className="border-dashed border-border/60"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        >
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Upload className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold">CSV hierher ziehen</p>
              <p className="text-sm text-muted-foreground">
                oder Datei auswählen · große Dateien werden clientseitig verarbeitet
              </p>
            </div>
            <label>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void processFile(f);
                }}
              />
              <Button render={<span />} className="cursor-pointer">
                <FileUp className="mr-2 h-4 w-4" />
                Datei durchsuchen
              </Button>
            </label>
            {phase === "error" && (
              <EmptyState
                title="Import fehlgeschlagen"
                description="Prüfen Sie das CSV-Format (Delimiter ; oder ,) und Pflichtfelder Datum/Betrag."
              />
            )}
          </CardContent>
        </Card>
      )}

      {(phase === "parsing" || phase === "importing") && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {phase === "parsing" ? "Datei wird gelesen…" : "Import läuft…"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={progress} />
            <p className="text-sm text-muted-foreground">{file?.name}</p>
          </CardContent>
        </Card>
      )}

      {phase === "preview" && (
        <div className="space-y-6">
          {duplicateFile && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
              <div>
                <p className="font-medium">Mögliche Duplikat-Datei</p>
                <p className="text-muted-foreground">
                  Diese Datei wurde bereits importiert (gleicher Hash). Sie können fortfahren —
                  Zeilen-Duplikate werden markiert.
                </p>
              </div>
            </motion.div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Zeilen</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold tabular-nums">{rows.length}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Validierungsfehler</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold tabular-nums">{errors.length}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Quelle</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusBadge status={source} />
              </CardContent>
            </Card>
          </div>

          {errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Validierungsfehler</CardTitle>
              </CardHeader>
              <CardContent className="max-h-40 space-y-1 overflow-auto text-sm">
                {errors.slice(0, 30).map((e, i) => (
                  <p key={`${e.row}-${i}`} className="text-destructive">
                    Zeile {e.row}: {e.message}
                  </p>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Vorschau (erste 20 Zeilen)</CardTitle>
              <Button onClick={runImport} disabled={!rows.length}>
                Import starten
              </Button>
            </CardHeader>
            <CardContent className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {headers.slice(0, 8).map((h) => (
                      <TableHead key={h}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.map((row, idx) => (
                    <TableRow key={idx}>
                      {headers.slice(0, 8).map((h) => (
                        <TableCell key={h} className="max-w-[180px] truncate text-sm">
                          {row[h]}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {phase === "done" && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
            <div className="space-y-1">
              <p className="text-xl font-semibold">Import erfolgreich</p>
              <p className="text-sm text-muted-foreground">
                {importedCount} Transaktionen aus {file?.name} übernommen.
                {duplicateFile ? " Datei-Hash war bereits bekannt." : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={reset}>Weiteren Import</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
