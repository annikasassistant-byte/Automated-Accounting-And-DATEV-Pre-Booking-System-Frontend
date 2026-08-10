"use client";

import { useMemo, useState } from "react";
import { Download, Pencil, Plus, Trash2, Upload, Database } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
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
import { useAuthStore } from "@/lib/auth-store";
import {
  useGetAccountsQuery,
  useCreateAccountMutation,
  useUpdateAccountMutation,
  useSeedAccountsMutation,
  useImportAccountsCsvMutation,
  useLazyExportAccountsCsvQuery,
} from "@/services/accountingApi";
import type { Account, AccountType } from "@/types/accounting";

const TYPE_LABELS: Record<AccountType, string> = {
  expense: "Aufwand",
  offset: "Gegenkonto",
  revenue: "Erlöse",
  asset: "Aktiv",
  liability: "Passiv",
  clearing: "Verrechnungskonto",
  other: "Sonstige",
};

type AccountForm = {
  number: string;
  name: string;
  type: AccountType;
  description: string;
  status: "active" | "inactive";
};

const EMPTY_FORM: AccountForm = {
  number: "",
  name: "",
  type: "expense",
  description: "",
  status: "active",
};

export function AccountsPage() {
  const { data: accounts = [], isLoading } = useGetAccountsQuery();
  const [createAccount] = useCreateAccountMutation();
  const [updateAccount] = useUpdateAccountMutation();
  const [seedAccounts, { isLoading: seeding }] = useSeedAccountsMutation();
  const [importAccountsCsv] = useImportAccountsCsvMutation();
  const [triggerExport] = useLazyExportAccountsCsvQuery();
  const isAdmin = useAuthStore((s) => s.hasRole("admin"));

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AccountForm>(EMPTY_FORM);
  const [importOpen, setImportOpen] = useState(false);

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

  const saveAccount = async () => {
    if (!form.number.trim() || !form.name.trim()) {
      toast.error("Kontonummer und Name sind erforderlich");
      return;
    }
    try {
      if (editingId) {
        await updateAccount({
          id: editingId,
          body: {
            number: form.number,
            name: form.name,
            type: form.type,
            notes: form.description,
            active: form.status === "active",
          },
        }).unwrap();
        toast.success("Konto aktualisiert");
      } else {
        await createAccount({
          number: form.number,
          name: form.name,
          type: form.type,
          notes: form.description,
          active: form.status === "active",
        } as never).unwrap();
        toast.success("Konto angelegt");
      }
      setDialogOpen(false);
    } catch {
      toast.error("Fehler beim Speichern");
    }
  };

  const handleSeed = async () => {
    try {
      await seedAccounts().unwrap();
      toast.success("Kontenplan mit Standardkonten initialisiert");
    } catch {
      toast.error("Seed fehlgeschlagen");
    }
  };

  const handleExportCsv = () => {
    triggerExport();
    toast.success("CSV-Download gestartet");
  };

  const handleImportCsv = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      await importAccountsCsv(formData).unwrap();
      toast.success("Konten importiert");
      setImportOpen(false);
    } catch {
      toast.error("Import fehlgeschlagen");
    }
  };

  if (isLoading) return <LoadingSkeleton variant="page" />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Kontenplan"
        eyebrow="Stammdaten"
        description="Aufwands-, Gegen- und Erlöskonten für die DATEV-Vorbebuchung pflegen."
        action={
          <div className="flex flex-wrap gap-2">
            {isAdmin && (
              <Button variant="outline" onClick={handleSeed} disabled={seeding}>
                <Database className="mr-2 h-4 w-4" />
                Seed
              </Button>
            )}
            <Button variant="outline" onClick={() => setImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button variant="outline" onClick={handleExportCsv}>
              <Download className="mr-2 h-4 w-4" />
              CSV
            </Button>
            {isAdmin && (
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Konto
              </Button>
            )}
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
          actionLabel={isAdmin ? "Konto anlegen" : undefined}
          onAction={isAdmin ? openCreate : undefined}
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
                  {isAdmin && (
                    <TableHead className="text-right">Aktionen</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-mono tabular-nums">{account.number}</TableCell>
                    <TableCell className="font-medium">{account.name}</TableCell>
                    <TableCell>{TYPE_LABELS[account.type] ?? account.type}</TableCell>
                    <TableCell className="max-w-[240px] truncate text-muted-foreground">
                      {account.description || "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={account.status} />
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="space-x-1 text-right">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(account)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            updateAccount({
                              id: account.id,
                              body: { active: false },
                            })
                              .unwrap()
                              .then(() => toast.success("Konto deaktiviert"))
                              .catch(() => toast.error("Fehler"));
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
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
              CSV-Datei mit Konten hochladen. Der Server aktualisiert bestehende Nummern automatisch.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleImportCsv(f);
                }}
              />
              <Button variant="outline" render={<span />} className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                CSV-Datei wählen
              </Button>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>
              Abbrechen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
