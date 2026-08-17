"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  useGetProfileQuery,
  useUpdateNotificationPreferencesMutation,
} from "@/services/authApi";
import { getApiErrorMessage } from "@/services/auth-mappers";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";

const PREF_FIELDS = [
  { key: "emailAlerts", label: "E-Mail-Benachrichtigungen" },
  { key: "platformAnnouncements", label: "Plattform-Mitteilungen" },
] as const;

type PrefKey = (typeof PREF_FIELDS)[number]["key"];

export function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { data: profile, isLoading } = useGetProfileQuery();
  const [updatePrefs, { isLoading: saving }] = useUpdateNotificationPreferencesMutation();
  const [mounted, setMounted] = useState(false);
  const [prefs, setPrefs] = useState<Record<PrefKey, boolean>>({
    emailAlerts: true,
    platformAnnouncements: true,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const p = profile?.notificationPreferences as
      | { emailAlerts?: boolean; platformAnnouncements?: boolean }
      | undefined;
    if (!p) return;
    setPrefs({
      emailAlerts: p.emailAlerts !== false,
      platformAnnouncements: p.platformAnnouncements !== false,
    });
  }, [profile]);

  if (isLoading) return <LoadingSkeleton variant="page" />;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Einstellungen</h1>
        <p className="text-sm text-muted-foreground">Darstellung und Benachrichtigungseinstellungen.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Darstellung</CardTitle>
          <CardDescription>Passen Sie das Erscheinungsbild des Portals an.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Label>Design</Label>
            {mounted ? (
              <Select value={theme} onValueChange={(v) => v && setTheme(v)}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Design" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Hell</SelectItem>
                  <SelectItem value="dark">Dunkel</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="h-9 w-full rounded-lg border border-border/50 bg-muted/30 sm:w-40" />
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Benachrichtigungen</CardTitle>
          <CardDescription>Werden auf dem Server in Ihrem Konto gespeichert.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {PREF_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <Label htmlFor={key} className="min-w-0 flex-1 leading-snug">{label}</Label>
              <Switch
                id={key}
                checked={prefs[key]}
                disabled={saving}
                onCheckedChange={async (checked) => {
                  const next = { ...prefs, [key]: checked };
                  setPrefs(next);
                  try {
                    await updatePrefs(next).unwrap();
                    toast.success("Einstellung gespeichert");
                  } catch (error) {
                    setPrefs(prefs);
                    toast.error(
                      getApiErrorMessage(error, "Einstellung konnte nicht gespeichert werden")
                    );
                  }
                }}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
