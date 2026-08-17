"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrencyPrecise, formatDate } from "@/lib/format";
import {
  useGetAccountLedgerQuery,
  useGetAccountsOverviewQuery,
} from "@/services/accountingApi";

const JULY = { from: "2026-07-01", to: "2026-07-31" };

export function AccountOverviewPage() {
  const [from, setFrom] = useState(JULY.from);
  const [to, setTo] = useState(JULY.to);
  const [includeEmpty, setIncludeEmpty] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);

  const period = useMemo(
    () => ({ from: from || undefined, to: to || undefined, includeEmpty }),
    [from, to, includeEmpty],
  );

  const {
    data: accounts = [],
    isLoading,
    isError,
    refetch,
  } = useGetAccountsOverviewQuery(period);

  const {
    data: ledger,
    isFetching: ledgerLoading,
  } = useGetAccountLedgerQuery(
    { number: selectedNumber || "", from: period.from, to: period.to },
    { skip: !selectedNumber },
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        a.accountNumber.toLowerCase().includes(q) ||
        a.accountName.toLowerCase().includes(q),
    );
  }, [accounts, query]);

  if (isLoading) return <LoadingSkeleton variant="page" />;

  if (isError) {
    return (
      <div className="space-y-8">
        <PageHeader title="Kontenübersicht" eyebrow="Buchhaltung" />
        <EmptyState
          title="Kontenübersicht nicht ladbar"
          description="Die API /accounts/overview hat nicht geantwortet."
          actionLabel="Erneut versuchen"
          onAction={() => void refetch()}
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Kontenübersicht"
        eyebrow="Buchhaltung"
        description="Soll, Haben und Saldo je Konto für den gewählten Zeitraum. Ein Konto öffnen, um jede einzelne Buchung zu sehen."
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-muted/15 p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="overview-from">Von</Label>
              <Input
                id="overview-from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="overview-to">Bis</Label>
              <Input
                id="overview-to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <Checkbox
                checked={includeEmpty}
                onCheckedChange={(v) => setIncludeEmpty(!!v)}
              />
              Leere Konten anzeigen
            </label>
          </div>
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Suchen Sie nach Kontenname oder Kontonummer"
            className="w-full lg:max-w-sm"
          />
        </div>
      </div>

      {!filtered.length ? (
        <EmptyState
          title="Keine Konten im Zeitraum"
          description="Für den gewählten Zeitraum liegen noch keine Buchungen mit Konto und Gegenkonto vor."
        />
      ) : (
        <div
          className="overflow-hidden rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <div className="max-h-[min(640px,70vh)] overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/90 backdrop-blur-md">
                <TableRow className="border-border/40 hover:bg-transparent">
                  <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Konto
                  </TableHead>
                  <TableHead className="h-11 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Bezeichnung
                  </TableHead>
                  <TableHead className="h-11 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Umsatz Soll
                  </TableHead>
                  <TableHead className="h-11 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Umsatz Haben
                  </TableHead>
                  <TableHead className="h-11 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Saldo
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow
                    key={row.accountNumber}
                    className="cursor-pointer border-border/30 transition-colors duration-200 hover:bg-primary/[0.03]"
                    onClick={() => setSelectedNumber(row.accountNumber)}
                  >
                    <TableCell className="py-3 font-mono text-sm font-medium">
                      {row.accountNumber}
                    </TableCell>
                    <TableCell className="py-3 text-sm">{row.accountName || "—"}</TableCell>
                    <TableCell className="py-3 text-right tabular-nums text-sm">
                      {formatCurrencyPrecise(row.debit)}
                    </TableCell>
                    <TableCell className="py-3 text-right tabular-nums text-sm">
                      {formatCurrencyPrecise(row.credit)}
                    </TableCell>
                    <TableCell className="py-3 text-right tabular-nums text-sm font-medium">
                      {formatCurrencyPrecise(row.balance)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Sheet
        open={!!selectedNumber}
        onOpenChange={(open) => {
          if (!open) setSelectedNumber(null);
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-2xl"
        >
          <SheetHeader className="border-b border-border/40">
            <SheetTitle>Kontoauszug</SheetTitle>
            <SheetDescription>
              {ledger
                ? `${ledger.accountNumber} · ${ledger.accountName}`
                : selectedNumber
                  ? `Konto ${selectedNumber}`
                  : "Kein Konto ausgewählt"}
            </SheetDescription>
          </SheetHeader>

          {ledgerLoading ? (
            <div className="p-4">
              <LoadingSkeleton variant="card" />
            </div>
          ) : !ledger ? (
            <div className="p-4">
              <EmptyState
                title="Kein Kontoauszug"
                description="Buchungen für dieses Konto erscheinen hier, sobald Konto und Gegenkonto gesetzt sind."
              />
            </div>
          ) : (
            <div className="flex-1 space-y-6 overflow-y-auto p-4">
              <dl className="grid gap-3 text-sm sm:grid-cols-3">
                <div>
                  <dt className="text-muted-foreground">Umsatz Soll</dt>
                  <dd className="font-medium tabular-nums">
                    {formatCurrencyPrecise(ledger.debit)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Umsatz Haben</dt>
                  <dd className="font-medium tabular-nums">
                    {formatCurrencyPrecise(ledger.credit)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Saldo</dt>
                  <dd className="font-medium tabular-nums">
                    {formatCurrencyPrecise(ledger.balance)}
                  </dd>
                </div>
              </dl>

              {!ledger.lines.length ? (
                <EmptyState
                  title="Keine Buchungen"
                  description="In diesem Zeitraum gibt es keine Buchungen auf diesem Konto."
                />
              ) : (
                <div className="overflow-hidden rounded-xl border border-border/40">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Buchungsdatum</TableHead>
                        <TableHead>Zahlungsdatum</TableHead>
                        <TableHead className="text-right">Soll</TableHead>
                        <TableHead className="text-right">Haben</TableHead>
                        <TableHead>Gegenkonto</TableHead>
                        <TableHead>Verwendungszweck</TableHead>
                        <TableHead>Quelle</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ledger.lines.map((line) => (
                        <TableRow key={`${line.transactionId}-${line.side}`}>
                          <TableCell className="whitespace-nowrap text-sm">
                            {formatDate(line.bookingDate)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap text-sm">
                            {formatDate(line.paymentDate)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm">
                            {line.side === "S"
                              ? formatCurrencyPrecise(Math.abs(line.amountCents) / 100)
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-sm">
                            {line.side === "H"
                              ? formatCurrencyPrecise(Math.abs(line.amountCents) / 100)
                              : "—"}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {line.contraAccount || "—"}
                          </TableCell>
                          <TableCell className="max-w-[180px] whitespace-normal break-words text-sm">
                            {line.purpose || "—"}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={line.source} />
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={line.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <Button variant="outline" onClick={() => setSelectedNumber(null)}>
                Schließen
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
