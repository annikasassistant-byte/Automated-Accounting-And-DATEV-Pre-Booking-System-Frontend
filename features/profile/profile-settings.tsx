"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/auth-store";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getUserInitials } from "@/lib/user-display";
import {
  useChangePasswordMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
} from "@/services/authApi";
import { getApiErrorMessage, mapServerUserToClient } from "@/services/auth-mappers";
import { hardNavigate } from "@/lib/hard-navigate";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { StatusBadge } from "@/components/shared/status-badge";

export function ProfileSettings() {
  const setUser = useAuthStore((s) => s.setUser);
  const localUser = useAuthStore((s) => s.user);
  const { data: profile, isLoading, isError } = useGetProfileQuery();
  const [updateProfile, { isLoading: isSaving }] = useUpdateProfileMutation();
  const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (!profile) return;
    setFirstName(profile.firstName || "");
    setLastName(profile.lastName || "");
    setPhone(profile.phone || "");
    setUser(mapServerUserToClient(profile));
  }, [profile, setUser]);

  if (isLoading) return <LoadingSkeleton variant="page" />;

  const displayName =
    [firstName, lastName].filter(Boolean).join(" ") || localUser?.name || profile?.email || "Benutzer";
  const initials = getUserInitials(displayName);
  const role = localUser?.role || "user";

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profil</h1>
        <p className="text-sm text-muted-foreground">Verwalten Sie Ihre persönlichen und Kontaktdaten.</p>
      </div>
      {isError && (
        <p className="text-sm text-destructive">Profil konnte nicht vom Server geladen werden.</p>
      )}
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <CardTitle>{displayName}</CardTitle>
            <p className="text-sm text-muted-foreground">{profile?.email || localUser?.email}</p>
            <StatusBadge status={role} />
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">Vorname</Label>
            <Input
              id="firstName"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Nachname</Label>
            <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>E-Mail</Label>
            <Input value={profile?.email || localUser?.email || ""} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefon</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <Button
            className="sm:col-span-2 w-fit"
            disabled={isSaving}
            onClick={async () => {
              try {
                const updated = await updateProfile({
                  firstName: firstName.trim(),
                  lastName: lastName.trim(),
                  phone: phone.trim() || null,
                }).unwrap();
                setUser(mapServerUserToClient(updated));
                toast.success("Profil aktualisiert");
              } catch (error) {
                toast.error(getApiErrorMessage(error, "Profil konnte nicht aktualisiert werden"));
              }
            }}
          >
            {isSaving ? "Wird gespeichert…" : "Änderungen speichern"}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Passwort</CardTitle>
        </CardHeader>
        <CardContent className="grid max-w-md gap-3">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Aktuelles Passwort</Label>
            <PasswordInput
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">Neues Passwort</Label>
            <PasswordInput
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <Button
            variant="outline"
            disabled={isChangingPassword}
            onClick={async () => {
              if (!currentPassword || !newPassword) {
                toast.error("Aktuelles und neues Passwort eingeben");
                return;
              }
              try {
                await changePassword({ currentPassword, newPassword }).unwrap();
                setCurrentPassword("");
                setNewPassword("");
                toast.success("Passwort aktualisiert — bitte erneut anmelden");
                useAuthStore.getState().logout();
                hardNavigate("/login", { replace: true });
              } catch (error) {
                toast.error(getApiErrorMessage(error, "Passwort konnte nicht geändert werden"));
              }
            }}
          >
            {isChangingPassword ? "Wird aktualisiert…" : "Passwort aktualisieren"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
