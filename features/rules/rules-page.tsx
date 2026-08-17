"use client";

import { useMemo, useState } from "react";
import { Pencil, Plus, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { TableScroll } from "@/components/shared/table-scroll";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";
import type { AccountingRule, MatchMode } from "@/types/accounting";
import { accountLabel } from "@/store/accounting-store";
import { useAuthStore } from "@/lib/auth-store";
import {
  useGetRulesQuery,
  useGetAccountsQuery,
  useDeleteRuleMutation,
  useEnableRuleMutation,
  useDisableRuleMutation,
  useApplyRulesMutation,
} from "@/services/accountingApi";
import { RuleWizardDialog } from "@/features/rules/rule-wizard-dialog";

const MATCH_MODE_LABELS: Record<MatchMode, string> = {
  contains: "Enthält",
  starts_with: "Beginnt mit",
  ends_with: "Endet mit",
  exact: "Exakt",
  regex: "Regex",
};

export function RulesPage() {
  const { data: rules = [], isLoading } = useGetRulesQuery();
  const { data: accounts = [] } = useGetAccountsQuery();
  const [deleteRuleMut] = useDeleteRuleMutation();
  const [enableRule] = useEnableRuleMutation();
  const [disableRule] = useDisableRuleMutation();
  const [applyRules] = useApplyRulesMutation();
  const isAdmin = useAuthStore((s) => s.hasRole("admin"));

  const [search, setSearch] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<AccountingRule> | undefined>();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = [...rules].sort((a, b) => a.priority - b.priority);
    if (!q) return list;
    return list.filter((r) => {
      const hay = [
        r.name,
        r.keywords.join(" "),
        MATCH_MODE_LABELS[r.matchMode],
        accountLabel(accounts, r.expenseAccountId),
        accountLabel(accounts, r.offsetAccountId),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rules, accounts, search]);

  const handleApply = async () => {
    try {
      const result = await applyRules().unwrap();
      toast.success(`${result.applied ?? 0} Transaktion(en) mit Regeln aktualisiert`);
    } catch {
      toast.error("Fehler beim Anwenden der Regeln");
    }
  };

  const openCreate = () => {
    setEditing(undefined);
    setWizardOpen(true);
  };

  const openEdit = (rule: AccountingRule) => {
    setEditing(rule);
    setWizardOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteRuleMut(deleteId).unwrap();
      toast.success("Regel gelöscht");
    } catch {
      toast.error("Fehler beim Löschen");
    }
    setDeleteId(null);
  };

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      if (enabled) {
        await enableRule(id).unwrap();
      } else {
        await disableRule(id).unwrap();
      }
      toast.success(enabled ? "Regel aktiviert" : "Regel deaktiviert");
    } catch {
      toast.error("Fehler beim Umschalten");
    }
  };

  if (isLoading) return <LoadingSkeleton variant="page" />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Buchungsregeln"
        eyebrow="Automatisierung"
        description="Keywords und Konten zuordnen — Regeln priorisieren und anwenden."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={handleApply}>
              <Play className="mr-2 h-4 w-4" />
              Regel anwenden
            </Button>
            {isAdmin && (
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Neue Regel
              </Button>
            )}
          </div>
        }
      />

      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Regeln durchsuchen…"
        className="max-w-sm"
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="Keine Regeln"
          description="Erstellen Sie eine Regel oder passen Sie die Suche an."
          actionLabel={isAdmin ? "Regel erstellen" : undefined}
          onAction={isAdmin ? openCreate : undefined}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/40 bg-card/60">
          <TableScroll className="max-h-[min(640px,70vh)]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/90 backdrop-blur-md">
                <TableRow className="hover:bg-transparent">
                  <TableHead>Aktiv</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Keywords</TableHead>
                  <TableHead>Modus</TableHead>
                  <TableHead>Aufwand</TableHead>
                  <TableHead>Gegenkonto</TableHead>
                  <TableHead>Priorität</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Treffer</TableHead>
                  <TableHead>Aktualisiert</TableHead>
                  {isAdmin && (
                    <TableHead className="text-right">Aktionen</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>
                      <Switch
                        checked={rule.enabled}
                        onCheckedChange={(v) => handleToggle(rule.id, v)}
                        disabled={!isAdmin}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{rule.name}</TableCell>
                    <TableCell>
                      <div className="flex max-w-[200px] flex-wrap gap-1">
                        {rule.keywords.slice(0, 3).map((kw) => (
                          <StatusBadge key={kw} status="suggested" label={kw} />
                        ))}
                        {rule.keywords.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{rule.keywords.length - 3}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {MATCH_MODE_LABELS[rule.matchMode]}
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate text-sm">
                      {accountLabel(accounts, rule.expenseAccountId)}
                    </TableCell>
                    <TableCell className="max-w-[140px] truncate text-sm">
                      {accountLabel(accounts, rule.offsetAccountId)}
                    </TableCell>
                    <TableCell className="tabular-nums">{rule.priority}</TableCell>
                    <TableCell className="tabular-nums">v{rule.version}</TableCell>
                    <TableCell className="tabular-nums">{rule.matchCount}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(rule.updatedAt)}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="space-x-2 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(rule)}
                        >
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Bearbeiten
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteId(rule.id)}
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          Löschen
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableScroll>
        </div>
      )}

      <RuleWizardDialog
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        initial={editing}
      />

      <Dialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Regel löschen?</DialogTitle>
            <DialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden. Zugeordnete
              Transaktionen behalten ihre bisherigen Konten.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Endgültig löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
