"use client";

import { Shield, Users, UserCheck } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/lib/auth-store";
import { useGetUsersQuery } from "@/services/authApi";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AdminDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useGetUsersQuery({ limit: 100 });

  if (isLoading) return <LoadingSkeleton variant="page" />;

  const list = data?.data ?? [];
  const adminCount = list.filter((u) => {
    const role = typeof u.role === "string" ? u.role : u.role?.slug;
    return role === "admin";
  }).length;
  const userCount = list.length - adminCount;

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
      </div>

      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Benutzerverwaltung</CardTitle>
          <Button render={<Link href="/admin/users" />} size="sm" variant="outline">
            Alle anzeigen
          </Button>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Erstellen, aktualisieren und deaktivieren Sie Benutzerkonten. Auth-APIs sind
          an das Backend angebunden.
        </CardContent>
      </Card>
    </div>
  );
}
