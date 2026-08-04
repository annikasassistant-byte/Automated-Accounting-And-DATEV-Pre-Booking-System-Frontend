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
import { useAccountingStore } from "@/store/accounting-store";
import { formatCurrencyPrecise } from "@/lib/format";

export default function AdminDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useGetUsersQuery({ limit: 100 });
  const transactions = useAccountingStore((s) => s.transactions);
  const rules = useAccountingStore((s) => s.rules);

  if (isLoading) return <LoadingSkeleton variant="page" />;

  const list = data?.data ?? [];
  const adminCount = list.filter((u) => {
    const role = typeof u.role === "string" ? u.role : u.role?.slug;
    return role === "admin";
  }).length;
  const userCount = list.length - adminCount;
  const openTx = transactions.filter((t) => !["exported", "rejected"].includes(t.status)).length;
  const volume = transactions.reduce((s, t) => s + Math.abs(t.amount), 0);

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
        <MetricCard title="Offene Transaktionen" value={String(openTx)} icon={ArrowLeftRight} />
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
