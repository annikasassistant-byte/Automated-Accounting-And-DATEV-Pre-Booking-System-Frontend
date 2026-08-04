"use client";

import { useMemo, useState } from "react";
import { Download, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { downloadTextFile, parseCsvText } from "@/lib/accounting/csv";
import { useAccountingStore } from "@/store/accounting-store";
import type { Account, AccountType } from "@/types/accounting";

const TYPE_LABELS: Record<AccountType, string> = {
  expense: "Aufwand",
  offset: "Gegenkonto",
  revenue: "Erlöse",
  asset: "Aktiv",
  liability: "Passiv",
};

const EMPTY_FORM: Omit<Account, "id"> = {
  number: "",
  name: "",
  type: "expense",
  description: "",
  status: "active",
};

export function AccountsPage() {
  const accounts = useAccountingStore((s) => s.accounts);
  const upsertAccount = useAccountingStore((s) => s.upsertAccount);
  const deleteAccount = useAccountingStore((s) => s.deleteAccount);

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.filter((a) => {
      if (typeFilter !== "all" && a.type !== typeFilter) return false;
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (!q) return true;
      return (
        a.number.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
      );
    });
  }, [accounts, query, typeFilter, statusFilter]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (account: Account) => {
    setEditingId(account.id);
    setForm({
      number: account.number,
      name: account.name,
      type: account.type,
      description: account.description,
      status: account.status,
    });
    setDialogOpen(true);
  };

  const saveAccount = () => {
    if (!form.number.trim() || !form.name.trim()) {
      toast.error("Kontonummer und Name sind erforderlich");
      return;
    }
    upsertAccount(editingId ? { ...form, id: editingId } : form);
    toast.success(editingId ? "Konto aktualisiert" : "Konto angelegt");
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteAccount(id);
    toast.success("Konto gelöscht");
  };

  const exportCsv = () => {
    const header = "number;name;type;description;status";
    const lines = accounts.map(
      (a) =>
        `${a.number};${a.name};${a.type};"${a.description.replace(/"/g, '""')}";${a.status}`
    );
    downloadTextFile("kontenplan.csv", [header, ...lines].join("\n"));
    toast.success("Kontenplan exportiert");
  };

  const runImport = () => {
    const parsed = parseCsvText(importText);
    if (!parsed.rows.length) {
      toast.error("Keine gültigen Zeilen gefunden");
      return;
    }
    let count = 0;
    for (const row of parsed.rows) {
      const number = (row.number || row.Nummer || row.Kontonummer || "").trim();
      const name = (row.name || row.Name || row.Bezeichnung || "").trim();
      if (!number || !name) continue;
      const typeRaw = (row.type || row.Typ || "expense").toLowerCase();
      const type = (
        ["expense", "offset", "revenue", "asset", "liability"].includes(typeRaw)
          ? typeRaw
          : "expense"
      ) as AccountType;
      const statusRaw = (row.status || row.Status || "active").toLowerCase();
      const status = statusRaw === "inactive" ? "inactive" : "active";
      const description = row.description || row.Beschreibung || "";
      const existing = accounts.find((a) => a.number === number);
      upsertAccount({
        id: existing?.id,
        number,
        name,
        type,
        description,
        status,
      });
      count += 1;
    }
    toast.success(`${count} Konten importiert / aktualisiert`);
    setImportOpen(false);
    setImportText("");
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Kontenplan"
        eyebrow="Stammdaten"
        description="Aufwands-, Gegen- und Erlöskonten für die DATEV-Vorbebuchung pflegen."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button variant="outline" onClick={exportCsv}>
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Konto
            </Button>
          </div>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Nummer, Name oder Beschreibung…"
          className="max-w-md"
        />
        <Select value={typeFilter} onValueChange={(v) => v && setTypeFilter(v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Typ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Typen</SelectItem>
            {(Object.keys(TYPE_LABELS) as AccountType[]).map((t) => (
              <SelectItem key={t} value={t}>
                {TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="active">Aktiv</SelectItem>
            <SelectItem value="inactive">Inaktiv</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Keine Konten gefunden"
          description="Passen Sie die Filter an oder legen Sie ein neues Konto an."
          actionLabel="Konto anlegen"
          onAction={openCreate}
        />
      ) : (
        <Card className="border-border/40">
          <CardContent className="overflow-auto p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nummer</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Typ</TableHead>
                  <TableHead>Beschreibung</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-mono tabular-nums">{account.number}</TableCell>
                    <TableCell className="font-medium">{account.name}</TableCell>
                    <TableCell>{TYPE_LABELS[account.type]}</TableCell>
                    <TableCell className="max-w-[240px] truncate text-muted-foreground">
                      {account.description || "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={account.status} />
                    </TableCell>
                    <TableCell className="space-x-1 text-right">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEdit(account)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(account.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "Konto bearbeiten" : "Konto anlegen"}</DialogTitle>
            <DialogDescription>
              Kontonummer und Bezeichnung für die Buchungslogik hinterlegen.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="acc-number">Nummer</Label>
              <Input
                id="acc-number"
                value={form.number}
                onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
                placeholder="z. B. 4400"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-name">Name</Label>
              <Input
                id="acc-name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Typ</Label>
              <Select
                value={form.type}
                onValueChange={(v) => v && setForm((f) => ({ ...f, type: v as AccountType }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_LABELS) as AccountType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="acc-desc">Beschreibung</Label>
              <Input
                id="acc-desc"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  v && setForm((f) => ({ ...f, status: v as "active" | "inactive" }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Aktiv</SelectItem>
                  <SelectItem value="inactive">Inaktiv</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={saveAccount}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Konten importieren</DialogTitle>
            <DialogDescription>
              CSV mit Spalten number;name;type;description;status einfügen oder Datei wählen.
              Vorhandene Nummern werden aktualisiert.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setImportText(await f.text());
                }}
              />
              <Button variant="outline" render={<span />} className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                CSV-Datei wählen
              </Button>
            </label>
            <textarea
              className="min-h-[160px] w-full rounded-lg border border-input bg-background p-3 font-mono text-xs"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={"number;name;type;description;status\n4400;Wareneingang;expense;Einkauf;active"}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={runImport} disabled={!importText.trim()}>
              Upsert starten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
