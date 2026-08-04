"use client";

import { useMemo } from "react";
import { GitMerge, Ban } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
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
import type { DuplicateItem, Transaction } from "@/types/accounting";

function TxCompare({ txs }: { txs: Transaction[] }) {
  if (!txs.length) {
    return <p className="text-sm text-muted-foreground">Transaktionen nicht gefunden.</p>;
  }
  return (
    <div className="overflow-auto rounded-xl border border-border/40">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Datum</TableHead>
            <TableHead>ID</TableHead>
            <TableHead>Quelle</TableHead>
            <TableHead>Gegenpartei</TableHead>
            <TableHead>Beschreibung</TableHead>
            <TableHead>Referenz</TableHead>
            <TableHead className="text-right">Betrag</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {txs.map((t) => (
            <TableRow key={t.id}>
              <TableCell className="tabular-nums whitespace-nowrap">{formatDate(t.date)}</TableCell>
              <TableCell className="font-mono text-xs">{t.transactionId}</TableCell>
              <TableCell>
                <StatusBadge status={t.source} />
              </TableCell>
              <TableCell className="max-w-[140px] truncate">{t.counterparty}</TableCell>
              <TableCell className="max-w-[160px] truncate text-muted-foreground">
                {t.description}
              </TableCell>
              <TableCell className="max-w-[120px] truncate font-mono text-xs">
                {t.reference || "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums whitespace-nowrap">
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
  );
}

function DuplicateCard({
  item,
  txs,
  onMerge,
  onIgnore,
}: {
  item: DuplicateItem;
  txs: Transaction[];
  onMerge: () => void;
  onIgnore: () => void;
}) {
  return (
    <Card className="border-border/40">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">Duplikat</CardTitle>
            <StatusBadge status={item.kind} />
          </div>
          <p className="text-sm text-muted-foreground">{item.reason}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onIgnore}>
            <Ban className="mr-1.5 h-3.5 w-3.5" />
            Ignorieren
          </Button>
          <Button size="sm" onClick={onMerge} disabled={item.transactionIds.length < 2}>
            <GitMerge className="mr-1.5 h-3.5 w-3.5" />
            Zusammenführen
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <TxCompare txs={txs} />
      </CardContent>
    </Card>
  );
}

export function DuplicatesPage() {
  const duplicates = useAccountingStore((s) => s.duplicates);
  const transactions = useAccountingStore((s) => s.transactions);
  const resolveDuplicate = useAccountingStore((s) => s.resolveDuplicate);

  const items = useMemo(
    () =>
      duplicates.map((d) => ({
        item: d,
        txs: d.transactionIds
          .map((id) => transactions.find((t) => t.id === id))
          .filter((t): t is Transaction => Boolean(t)),
      })),
    [duplicates, transactions]
  );

  const handleMerge = (id: string) => {
    resolveDuplicate(id, "merge");
    toast.success("Duplikat zusammengeführt — doppelte Buchungen entfernt");
  };

  const handleIgnore = (id: string) => {
    resolveDuplicate(id, "ignore");
    toast.success("Duplikat ignoriert");
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Duplikate"
        eyebrow="Qualität"
        description="Mögliche Doppelbuchungen prüfen und zusammenführen oder ignorieren."
      />

      {items.length === 0 ? (
        <EmptyState
          title="Keine offenen Duplikate"
          description="Alle erkannten Konflikte wurden bereits bearbeitet."
        />
      ) : (
        <div className="space-y-6">
          {items.map(({ item, txs }) => (
            <DuplicateCard
              key={item.id}
              item={item}
              txs={txs}
              onMerge={() => handleMerge(item.id)}
              onIgnore={() => handleIgnore(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
