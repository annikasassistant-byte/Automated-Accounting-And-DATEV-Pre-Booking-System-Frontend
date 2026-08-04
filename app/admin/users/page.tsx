"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { SearchInput } from "@/components/shared/search-input";
import { Button } from "@/components/ui/button";
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
  useDeleteUserMutation,
  useGetUsersQuery,
  useUpdateUserMutation,
} from "@/services/authApi";
import { getApiErrorMessage } from "@/services/auth-mappers";
import { toast } from "sonner";
import type { ServerUser } from "@/services/types";

function roleOf(user: ServerUser): "admin" | "user" {
  if (typeof user.role === "string") {
    return user.role === "admin" ? "admin" : "user";
  }
  return user.role?.slug === "admin" ? "admin" : "user";
}

function displayName(user: ServerUser) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading, refetch } = useGetUsersQuery({ limit: 100, search: search || undefined });
  const [updateUser, { isLoading: updating }] = useUpdateUserMutation();
  const [deleteUser, { isLoading: deleting }] = useDeleteUserMutation();

  const users = useMemo(() => data?.data ?? [], [data]);

  if (isLoading) return <LoadingSkeleton variant="page" />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Benutzer"
        description="Konten verwalten — Rollen, Status und Soft-Delete."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Name oder E-Mail suchen…"
          className="max-w-sm"
        />
        <Button variant="outline" onClick={() => refetch()}>
          Aktualisieren
        </Button>
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
    </div>
  );
}
