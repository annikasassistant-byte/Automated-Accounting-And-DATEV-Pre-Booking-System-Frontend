"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
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
  useGetRulesQuery,
  useBulkUpdateStatusMutation,
} from "@/services/accountingApi";
import { TransactionDetailDrawer } from "@/features/transactions/transaction-detail-drawer";

export function TransactionsPage() {
  const searchParams = useSearchParams();
  const statusFilter = searchParams.get("status") || undefined;
  const { data: txData, isLoading: txLoading } = useGetTransactionsQuery({
    limit: 500,
    ...(statusFilter ? { status: statusFilter } : {}),
  });
  const { data: accounts = [] } = useGetAccountsQuery();
  const { data: rules = [] } = useGetRulesQuery();
  const [bulkUpdateStatus] = useBulkUpdateStatusMutation();

  const transactions = useMemo(() => {
    const items = txData?.items ?? [];
    if (statusFilter === "open" || statusFilter === "conflict") {
      return items.filter(
        (t) => t.bookability !== "skipped" && t.bookability !== "balance_only"
      );
    }
    return items;
  }, [txData?.items, statusFilter]);

  const [sorting, setSorting] = useState<SortingState>([{ id: "date", desc: true }]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [detailId, setDetailId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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
        accessorFn: (row) => row.purpose || row.description,
        header: "Verwendungszweck",
        cell: ({ row }) => {
          const text = row.original.purpose || row.original.description || "—";
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
    state: { sorting, globalFilter, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.id,
    initialState: { pagination: { pageSize: 10 } },
    globalFilterFn: (row, _columnId, filterValue) => {
      const q = String(filterValue).toLowerCase().trim();
      if (!q) return true;
      const t = row.original;
      const hay = [
        t.transactionId,
        t.counterparty,
        t.purpose,
        t.description,
        t.rawDescription,
        t.reference,
        t.status,
        t.source,
        t.currency,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    },
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
              : "Importierte Bewegungen prüfen, zuordnen und freigeben."
        }
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-border/40 bg-muted/15 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <SearchInput
          value={globalFilter}
          onChange={setGlobalFilter}
          placeholder="Transaktionen durchsuchen…"
          className="w-full sm:max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!selectedIds.length}
            onClick={() => handleBulkStatus("reviewed")}
          >
            Auswahl freigeben
          </Button>
          <Button
            variant="destructive"
            size="sm"
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
          <div className="max-h-[min(640px,70vh)] overflow-auto">
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
          <span className="font-medium text-foreground">
            {table.getState().pagination.pageIndex + 1}
          </span>{" "}
          von{" "}
          <span className="font-medium text-foreground">
            {table.getPageCount() || 1}
          </span>
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
            Zurück
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
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
