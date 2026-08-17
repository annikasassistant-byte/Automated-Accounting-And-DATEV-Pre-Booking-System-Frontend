"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, Eye, Zap } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrencyPrecise, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import type { Transaction } from "@/types/accounting";
import { accountLabel, ruleLabel } from "@/store/accounting-store";
import {
  useGetTransactionsQuery,
  useGetAccountsQuery,
  useBulkUpdateStatusMutation,
} from "@/services/accountingApi";
import { TransactionDetailDrawer } from "@/features/transactions/transaction-detail-drawer";
import { TableScroll } from "@/components/shared/table-scroll";

export function TransactionsPage() {
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") || undefined;
  const sourceParam = searchParams.get("source");
  const sourceFilter =
    sourceParam === "bank" || sourceParam === "paypal" ? sourceParam : undefined;

  const PAGE_SIZE = 50;
  const [page, setPage] = useState(1);
  const [sorting, setSorting] = useState<SortingState>([{ id: "date", desc: true }]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [detailId, setDetailId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: txData, isLoading: txLoading } = useGetTransactionsQuery({
    page,
    limit: PAGE_SIZE,
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(sourceFilter ? { source: sourceFilter } : {}),
    ...(globalFilter.trim() ? { search: globalFilter.trim() } : {}),
  });
  const { data: accounts = [] } = useGetAccountsQuery();
  const [bulkUpdateStatus] = useBulkUpdateStatusMutation();

  const total = txData?.meta?.total ?? txData?.items.length ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const transactions = useMemo(() => {
    const items = txData?.items ?? [];
    if (statusFilter === "open" || statusFilter === "conflict") {
      return items.filter(
        (t) => t.bookability !== "skipped" && t.bookability !== "balance_only"
      );
    }
    return items;
  }, [txData?.items, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, sourceFilter]);

  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        id: "select",
        enableSorting: false,
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Alle auswählen"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            aria-label="Zeile auswählen"
          />
        ),
      },
      {
        accessorKey: "date",
        header: "Datum",
        cell: ({ row }) => formatDate(row.original.date),
      },
      {
        accessorKey: "source",
        header: "Quelle",
        cell: ({ row }) => <StatusBadge status={row.original.source} />,
      },
      {
        accessorKey: "counterparty",
        header: "Gegenpartei",
        cell: ({ row }) => (
          <span className="max-w-[160px] truncate block">{row.original.counterparty}</span>
        ),
      },
      {
        id: "purpose",
        accessorFn: (row) =>
          [
            row.purpose,
            row.description,
            row.article,
            row.paypalSubject,
            row.paypalNote,
          ]
            .filter(Boolean)
            .join(" "),
        header: "Verwendungszweck",
        cell: ({ row }) => {
          const tx = row.original;
          if (tx.source === "paypal") {
            const parts = [
              tx.article ? { label: "Artikel", value: tx.article } : null,
              tx.paypalSubject ? { label: "Betreff", value: tx.paypalSubject } : null,
              tx.paypalNote ? { label: "Hinweis", value: tx.paypalNote } : null,
            ].filter(Boolean) as { label: string; value: string }[];
            if (!parts.length) {
              const fallback = tx.purpose || tx.description || "—";
              return (
                <span className="block min-w-[220px] max-w-[320px] whitespace-normal break-words text-sm">
                  {fallback}
                </span>
              );
            }
            return (
              <div className="min-w-[220px] max-w-[320px] space-y-1 text-sm">
                {parts.map((p) => (
                  <p key={p.label} className="whitespace-normal break-words" title={p.value}>
                    <span className="mr-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {p.label}
                    </span>
                    {p.value}
                  </p>
                ))}
              </div>
            );
          }
          const text = tx.purpose || tx.description || "—";
          return (
            <span
              title={text === "—" ? undefined : text}
              className="block min-w-[220px] max-w-[320px] whitespace-normal break-words text-sm"
            >
              {text}
            </span>
          );
        },
      },
      {
        accessorKey: "amount",
        header: "Betrag",
        cell: ({ row }) => (
          <span className="tabular-nums font-medium">
            {formatCurrencyPrecise(row.original.amount, row.original.currency)}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <div className="flex items-center gap-1.5">
            <StatusBadge status={row.original.status} />
            {(row.original.systemMatched || row.original.booking?.konto === "1361") && (
              <Badge variant="secondary" className="gap-1 text-[10px]">
                <Zap className="h-3 w-3" />
                1361
              </Badge>
            )}
          </div>
        ),
      },
      {
        id: "konto",
        header: "Konto",
        accessorFn: (row) =>
          row.booking?.konto ?? accountLabel(accounts, row.expenseAccountId),
        cell: ({ row }) =>
          row.original.booking?.konto ??
          accountLabel(accounts, row.original.expenseAccountId),
      },
      {
        id: "gegenkonto",
        header: "Gegenkonto",
        accessorFn: (row) =>
          row.booking?.gegenkonto ?? accountLabel(accounts, row.offsetAccountId),
        cell: ({ row }) =>
          row.original.booking?.gegenkonto ??
          accountLabel(accounts, row.original.offsetAccountId),
      },
      {
        accessorKey: "exportStatus",
        header: "Exportstatus",
        cell: ({ row }) => <StatusBadge status={row.original.exportStatus} />,
      },
      {
        id: "actions",
        enableSorting: false,
        header: () => <span className="sr-only">Aktionen</span>,
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setDetailId(row.original.id);
              setDrawerOpen(true);
            }}
          >
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            Details
          </Button>
        ),
      },
    ],
    [accounts]
  );

  const table = useReactTable({
    data: transactions,
    columns,
    state: { sorting, rowSelection, pagination: { pageIndex: page - 1, pageSize: PAGE_SIZE } },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    manualPagination: true,
    pageCount,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getRowId: (row) => row.id,
  });

  const selectedIds = table.getFilteredSelectedRowModel().rows.map((r) => r.original.id);

  const handleBulkStatus = async (status: string) => {
    if (!selectedIds.length) return;
    try {
      await bulkUpdateStatus({ ids: selectedIds, status }).unwrap();
      setRowSelection({});
      toast.success(`${selectedIds.length} Transaktion(en) auf „${status}" gesetzt`);
    } catch {
      toast.error("Fehler beim Aktualisieren");
    }
  };

  if (txLoading) return <LoadingSkeleton variant="page" />;

  const hasRows = table.getRowModel().rows.length > 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title={statusFilter === "conflict" ? "Konflikte" : statusFilter === "open" ? "Offene Posten" : "Transaktionen"}
        eyebrow="Buchhaltung"
        description={
          statusFilter === "conflict"
            ? "Konfliktbehaftete Buchungen prüfen und auflösen."
            : statusFilter === "open"
              ? "Offene Buchungen manuell zuordnen oder Regeln anlegen."
              : "Buchbare Bewegungen prüfen, zuordnen und freigeben. PayPal-Einbehalte sind beim Import ausgeschlossen und erscheinen hier nicht."
        }
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-muted/15 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <SearchInput
          value={globalFilter}
          onChange={(v) => {
            setGlobalFilter(v);
            setPage(1);
          }}
          placeholder="Transaktionen durchsuchen…"
          className="w-full sm:max-w-sm"
        />
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 w-full sm:w-auto"
            disabled={!selectedIds.length}
            onClick={() => handleBulkStatus("reviewed")}
          >
            Auswahl freigeben
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="min-h-11 w-full sm:w-auto"
            disabled={!selectedIds.length}
            onClick={() => handleBulkStatus("skipped")}
          >
            Auswahl überspringen
          </Button>
        </div>
      </div>

      {!hasRows ? (
        <EmptyState
          title="Keine Transaktionen"
          description="Passen Sie die Suche an oder importieren Sie eine CSV-Datei."
          actionLabel="Suche zurücksetzen"
          onAction={() => setGlobalFilter("")}
        />
      ) : (
        <div
          className="overflow-hidden rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm"
          style={{ boxShadow: "var(--shadow-card)" }}
        >
          <TableScroll className="max-h-[min(640px,70vh)] p-0">
            <div className="min-w-[720px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/90 backdrop-blur-md">
                {table.getHeaderGroups().map((hg) => (
                  <TableRow key={hg.id} className="border-border/40 hover:bg-transparent">
                    {hg.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className="h-11 whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                        onClick={
                          header.column.getCanSort()
                            ? header.column.getToggleSortingHandler()
                            : undefined
                        }
                        style={{
                          cursor: header.column.getCanSort() ? "pointer" : undefined,
                        }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {{
                          asc: " ↑",
                          desc: " ↓",
                        }[header.column.getIsSorted() as string] ?? null}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    className="border-border/30 transition-colors duration-200 hover:bg-primary/[0.03]"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-3 text-sm">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </TableScroll>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-border/30 bg-muted/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {selectedIds.length > 0 && (
            <span className="mr-3 font-medium text-foreground">
              {selectedIds.length} ausgewählt ·
            </span>
          )}
          Seite{" "}
          <span className="font-medium text-foreground">{page}</span>
          {" "}
          von{" "}
          <span className="font-medium text-foreground">{pageCount}</span>
          <span className="ml-2">· {total} Buchungen</span>
        </p>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 flex-1 rounded-xl sm:flex-none"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Zurück
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="min-h-11 flex-1 rounded-xl sm:flex-none"
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={page >= pageCount}
          >
            Weiter
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <TransactionDetailDrawer
        transactionId={detailId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
