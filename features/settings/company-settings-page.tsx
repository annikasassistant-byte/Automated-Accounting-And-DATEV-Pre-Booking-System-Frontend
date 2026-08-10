"use client";

import { useEffect, useState } from "react";
import { Link2, Save } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuthStore } from "@/lib/auth-store";
import type { CompanySettings, DatevSettings } from "@/types/accounting";
import {
  useGetCompanySettingsQuery,
  useUpdateCompanySettingsMutation,
  useGetDatevSettingsQuery,
  useUpdateDatevSettingsMutation,
} from "@/services/accountingApi";

export function CompanySettingsPage() {
  const { data: company, isLoading: companyLoading } = useGetCompanySettingsQuery();
  const { data: datev, isLoading: datevLoading } = useGetDatevSettingsQuery();
  const [updateCompany] = useUpdateCompanySettingsMutation();
  const [updateDatev] = useUpdateDatevSettingsMutation();
  const isAdmin = useAuthStore((s) => s.hasRole("admin"));

  const [companyForm, setCompanyForm] = useState<CompanySettings>({
    companyName: "",
    taxId: "",
    street: "",
    city: "",
    postalCode: "",
    country: "",
  });
  const [datevForm, setDatevForm] = useState<DatevSettings>({
    consultantNumber: "",
    clientNumber: "",
    chartOfAccounts: "",
    fiscalYearStart: "",
    defaultExpenseAccount: "",
    defaultOffsetAccount: "",
    blockExportIfOpen: false,
  });

  useEffect(() => {
    if (company) setCompanyForm(company);
  }, [company]);

  useEffect(() => {
    if (datev) setDatevForm(datev);
  }, [datev]);

  const saveCompany = async () => {
    if (!companyForm.companyName.trim()) {
      toast.error("Firmenname ist erforderlich");
      return;
    }
    try {
      await updateCompany(companyForm).unwrap();
      toast.success("Firmeneinstellungen gespeichert");
    } catch {
      toast.error("Fehler beim Speichern");
    }
  };

  const saveDatev = async () => {
    if (!datevForm.consultantNumber.trim() || !datevForm.clientNumber.trim()) {
      toast.error("Berater- und Mandantennummer sind erforderlich");
      return;
    }
    try {
      await updateDatev(datevForm).unwrap();
      toast.success("DATEV-Einstellungen gespeichert");
    } catch {
      toast.error("Fehler beim Speichern");
    }
  };

  if (companyLoading || datevLoading) return <LoadingSkeleton variant="page" />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Firmen- & DATEV-Einstellungen"
        eyebrow="Konfiguration"
        description="Stammdaten für Exporte. Design/Theme bleibt in den allgemeinen Einstellungen."
      />

      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company">Firma</TabsTrigger>
          <TabsTrigger value="datev">DATEV</TabsTrigger>
          <TabsTrigger value="links">Zuordnungen</TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-6">
          <Card className="border-border/40">
            <CardHeader>
              <CardTitle>Firmendaten</CardTitle>
              <CardDescription>Werden in Export-Metadaten und Berichten verwendet.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="companyName">Firmenname</Label>
                <Input
                  id="companyName"
                  value={companyForm.companyName}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, companyName: e.target.value }))}
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="taxId">USt-IdNr.</Label>
                <Input
                  id="taxId"
                  value={companyForm.taxId}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, taxId: e.target.value }))}
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="country">Land</Label>
                <Input
                  id="country"
                  value={companyForm.country}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, country: e.target.value }))}
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="street">Straße</Label>
                <Input
                  id="street"
                  value={companyForm.street}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, street: e.target.value }))}
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="postalCode">PLZ</Label>
                <Input
                  id="postalCode"
                  value={companyForm.postalCode}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, postalCode: e.target.value }))}
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="city">Ort</Label>
                <Input
                  id="city"
                  value={companyForm.city}
                  onChange={(e) => setCompanyForm((f) => ({ ...f, city: e.target.value }))}
                  disabled={!isAdmin}
                />
              </div>
              {isAdmin && (
                <div className="sm:col-span-2">
                  <Button onClick={saveCompany}>
                    <Save className="mr-2 h-4 w-4" />
                    Firma speichern
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="datev" className="mt-6">
          <Card className="border-border/40">
            <CardHeader>
              <CardTitle>DATEV-Parameter</CardTitle>
              <CardDescription>Berater, Mandant und Standardkonten für den Buchungsstapel.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="consultantNumber">Beraternummer</Label>
                <Input
                  id="consultantNumber"
                  value={datevForm.consultantNumber}
                  onChange={(e) =>
                    setDatevForm((f) => ({ ...f, consultantNumber: e.target.value }))
                  }
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clientNumber">Mandantennummer</Label>
                <Input
                  id="clientNumber"
                  value={datevForm.clientNumber}
                  onChange={(e) => setDatevForm((f) => ({ ...f, clientNumber: e.target.value }))}
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="chartOfAccounts">Kontenrahmen</Label>
                <Input
                  id="chartOfAccounts"
                  value={datevForm.chartOfAccounts}
                  onChange={(e) =>
                    setDatevForm((f) => ({ ...f, chartOfAccounts: e.target.value }))
                  }
                  placeholder="SKR03 / SKR04"
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fiscalYearStart">Wirtschaftsjahresbeginn</Label>
                <Input
                  id="fiscalYearStart"
                  type="date"
                  value={datevForm.fiscalYearStart}
                  onChange={(e) =>
                    setDatevForm((f) => ({ ...f, fiscalYearStart: e.target.value }))
                  }
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="defaultExpenseAccount">Standard Aufwandskonto</Label>
                <Input
                  id="defaultExpenseAccount"
                  value={datevForm.defaultExpenseAccount}
                  onChange={(e) =>
                    setDatevForm((f) => ({ ...f, defaultExpenseAccount: e.target.value }))
                  }
                  disabled={!isAdmin}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="defaultOffsetAccount">Standard Gegenkonto</Label>
                <Input
                  id="defaultOffsetAccount"
                  value={datevForm.defaultOffsetAccount}
                  onChange={(e) =>
                    setDatevForm((f) => ({ ...f, defaultOffsetAccount: e.target.value }))
                  }
                  disabled={!isAdmin}
                />
              </div>
              {isAdmin && (
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <Checkbox
                    checked={datevForm.blockExportIfOpen ?? false}
                    onCheckedChange={(v) =>
                      setDatevForm((f) => ({ ...f, blockExportIfOpen: !!v }))
                    }
                  />
                  Export blockieren, wenn offene Posten vorhanden
                </label>
              )}
              {isAdmin && (
                <div className="sm:col-span-2">
                  <Button onClick={saveDatev}>
                    <Save className="mr-2 h-4 w-4" />
                    DATEV speichern
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="links" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-border/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Link2 className="h-4 w-4 text-primary" />
                  Kontenplan
                </CardTitle>
                <CardDescription>
                  Konten (z. B. 3220, 1361, 4910) unter Stammdaten → Kontenplan
                  pflegen. Der hier gewählte Kontenrahmen ({datevForm.chartOfAccounts || "—"}) sollte
                  zum DATEV-Mandanten passen.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-border/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Link2 className="h-4 w-4 text-primary" />
                  CSV-Mapping
                </CardTitle>
                <CardDescription>
                  Bank- und PayPal-Spalten werden beim Import automatisch auf Datum, Betrag,
                  Gegenpartei und Verwendungszweck gemappt. Detaillierte Mapping-Regeln liegen in
                  den Import-Assistenten.
                </CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-border/40 md:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Darstellung / Theme</CardTitle>
                <CardDescription>
                  Hell-/Dunkelmodus und Benachrichtigungen werden in den bestehenden allgemeinen
                  Einstellungen verwaltet — nicht auf dieser Seite.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
