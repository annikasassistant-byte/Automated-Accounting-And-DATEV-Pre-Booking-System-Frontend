"use client";

import Link from "next/link";
import { ArrowLeftRight, FileOutput, Scale, Shield, UserCheck, Users } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth-store";
import { useGetUsersQuery } from "@/services/authApi";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { formatCurrencyPrecise } from "@/lib/format";
import {
  useGetTransactionsQuery,
  useGetRulesQuery,
  useGetReconciliationSummaryQuery,
} from "@/services/accountingApi";

export default function AdminDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data: usersData, isLoading: usersLoading } = useGetUsersQuery({ limit: 100 });
  const { data: txData, isLoading: txLoading } = useGetTransactionsQuery({ limit: 1 });
  const { data: recon, isLoading: reconLoading } = useGetReconciliationSummaryQuery();
  const { data: rules = [], isLoading: rulesLoading } = useGetRulesQuery();

  if (usersLoading || txLoading || rulesLoading || reconLoading) return <LoadingSkeleton variant="page" />;

  const list = usersData?.data ?? [];
  const adminCount = list.filter((u) => {
    const role = typeof u.role === "string" ? u.role : u.role?.slug;
    return role === "admin";
  }).length;
  const userCount = list.length - adminCount;
  const totalTx = txData?.meta?.total ?? 0;
  const volume = Math.abs(recon?.importedAmount ?? 0);

  return (
    <div className="space-y-10">
      <PageHeader
        hero
        eyebrow="Verwaltung"
        title="Admin-Übersicht"
        description={`Angemeldet als ${user?.name || user?.email || "Admin"}.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard title="Benutzer gesamt" value={String(list.length)} icon={Users} />
        <MetricCard title="Administratoren" value={String(adminCount)} icon={Shield} />
        <MetricCard title="Standardbenutzer" value={String(userCount)} icon={UserCheck} />
        <MetricCard title="Transaktionen" value={String(totalTx)} icon={ArrowLeftRight} />
        <MetricCard title="Aktive Regeln" value={String(rules.filter((r) => r.enabled).length)} icon={Scale} />
        <MetricCard title="Importvolumen" value={formatCurrencyPrecise(volume)} icon={FileOutput} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Benutzerverwaltung</CardTitle>
            <Button
              render={<Link href="/admin/users" />}
              nativeButton={false}
              size="sm"
              variant="outline"
            >
              Alle anzeigen
            </Button>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Konten erstellen, Rollen setzen und Benutzer deaktivieren.
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Buchhaltung</CardTitle>
            <Button
              render={<Link href="/admin/transactions" />}
              nativeButton={false}
              size="sm"
              variant="outline"
            >
              Transaktionen
            </Button>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            CSV-Import, Regelengine und DATEV-Export sind über die Navigation erreichbar.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
