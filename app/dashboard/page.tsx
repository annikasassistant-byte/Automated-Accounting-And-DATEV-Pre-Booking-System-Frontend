"use client";

import { LayoutDashboard, User as UserIcon } from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { useAuthStore } from "@/lib/auth-store";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";

export default function UserDashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-10">
      <PageHeader
        hero
        eyebrow="Portal"
        title="Willkommen zurück"
        description="Verwalten Sie Ihr Profil und Ihre Kontoeinstellungen."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Konto"
          value={user?.name || "—"}
          icon={UserIcon}
          subtitle={user?.email}
        />
        <MetricCard
          title="Rolle"
          value="Benutzer"
          icon={LayoutDashboard}
          subtitle="Standardzugriff"
        />
        <MetricCard
          title="Mitglied seit"
          value={user?.joinedAt ? formatDate(user.joinedAt) : "—"}
          icon={UserIcon}
        />
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Schnellstart</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Nutzen Sie die Navigation, um Ihr Profil zu bearbeiten oder
          Benachrichtigungseinstellungen anzupassen. Weitere Module folgen.
        </CardContent>
      </Card>
    </div>
  );
}
