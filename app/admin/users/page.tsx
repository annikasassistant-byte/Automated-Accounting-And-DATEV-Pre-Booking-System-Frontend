"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useCreateUserMutation,
  useDeleteUserMutation,
  useGetUsersQuery,
  useUpdateUserMutation,
} from "@/services/authApi";
import { getApiErrorMessage } from "@/services/auth-mappers";
import { toast } from "sonner";
import type { ServerUser } from "@/services/types";
import { Plus } from "lucide-react";

function roleOf(user: ServerUser): "admin" | "user" {
  if (typeof user.role === "string") {
    return user.role === "admin" ? "admin" : "user";
  }
  return user.role?.slug === "admin" ? "admin" : "user";
}

function displayName(user: ServerUser) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
}

const emptyForm = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  role: "user" as "admin" | "user",
};

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const { data, isLoading, refetch } = useGetUsersQuery({ limit: 100, search: search || undefined });
  const [createUser, { isLoading: creating }] = useCreateUserMutation();
  const [updateUser, { isLoading: updating }] = useUpdateUserMutation();
  const [deleteUser, { isLoading: deleting }] = useDeleteUserMutation();

  const users = useMemo(() => data?.data ?? [], [data]);

  const handleCreate = async () => {
    if (!form.email.trim() || !form.password || !form.firstName.trim() || !form.lastName.trim()) {
      toast.error("Bitte E-Mail, Passwort, Vor- und Nachname ausfüllen");
      return;
    }
    try {
      await createUser({
        email: form.email.trim(),
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        role: form.role,
      }).unwrap();
      toast.success("Benutzer angelegt");
      setCreateOpen(false);
      setForm(emptyForm);
      refetch();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Benutzer konnte nicht angelegt werden"));
    }
  };

  if (isLoading) return <LoadingSkeleton variant="page" />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Benutzer"
        description="Konten verwalten — anlegen, Rollen, Status und Soft-Delete."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Name oder E-Mail suchen…"
          className="max-w-sm"
        />
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()}>
            Aktualisieren
          </Button>
          <Button
            onClick={() => {
              setForm(emptyForm);
              setCreateOpen(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Benutzer anlegen
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-border/50">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>E-Mail</TableHead>
              <TableHead>Rolle</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Keine Benutzer gefunden
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const id = String(user._id || user.id);
                const role = roleOf(user);
                return (
                  <TableRow key={id}>
                    <TableCell className="font-medium">{displayName(user)}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Select
                        value={role}
                        disabled={updating}
                        onValueChange={async (value) => {
                          if (!value || value === role) return;
                          try {
                            await updateUser({
                              id,
                              body: { role: value as "admin" | "user" },
                            }).unwrap();
                            toast.success("Rolle aktualisiert");
                          } catch (error) {
                            toast.error(getApiErrorMessage(error, "Rolle konnte nicht geändert werden"));
                          }
                        }}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="user">Benutzer</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={user.isActive === false ? "inactive" : "active"} />
                    </TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updating}
                        onClick={async () => {
                          try {
                            await updateUser({
                              id,
                              body: { isActive: user.isActive === false },
                            }).unwrap();
                            toast.success(
                              user.isActive === false ? "Benutzer aktiviert" : "Benutzer deaktiviert"
                            );
                          } catch (error) {
                            toast.error(
                              getApiErrorMessage(error, "Status konnte nicht geändert werden")
                            );
                          }
                        }}
                      >
                        {user.isActive === false ? "Aktivieren" : "Deaktivieren"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={deleting}
                        onClick={async () => {
                          if (!window.confirm(`Benutzer ${user.email} wirklich löschen?`)) return;
                          try {
                            await deleteUser(id).unwrap();
                            toast.success("Benutzer gelöscht");
                          } catch (error) {
                            toast.error(
                              getApiErrorMessage(error, "Benutzer konnte nicht gelöscht werden")
                            );
                          }
                        }}
                      >
                        Löschen
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Benutzer anlegen</DialogTitle>
            <DialogDescription>
              Neues Konto mit E-Mail, Passwort und Rolle erstellen.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="user-email">E-Mail</Label>
              <Input
                id="user-email"
                type="email"
                autoComplete="off"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="user-first">Vorname</Label>
                <Input
                  id="user-first"
                  value={form.firstName}
                  onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="user-last">Nachname</Label>
                <Input
                  id="user-last"
                  value={form.lastName}
                  onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="user-password">Passwort</Label>
              <Input
                id="user-password"
                type="password"
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Min. 8 Zeichen, Buchstabe + Zahl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Rolle</Label>
              <Select
                value={form.role}
                onValueChange={(v) =>
                  v && setForm((f) => ({ ...f, role: v as "admin" | "user" }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Benutzer</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Abbrechen
            </Button>
            <Button disabled={creating} onClick={handleCreate}>
              {creating ? "Wird angelegt…" : "Anlegen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
