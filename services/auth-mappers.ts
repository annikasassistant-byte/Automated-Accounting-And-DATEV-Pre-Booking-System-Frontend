import type { User, UserRole } from "@/types";
import type { ServerUser } from "@/services/types";

const ADMIN_SLUGS = new Set(["super_admin", "admin", "manager"]);

export function mapServerRoleToClient(role: ServerUser["role"]): UserRole {
  const slug =
    typeof role === "object" && role
      ? String(role.slug || "").toLowerCase()
      : String(role || "").toLowerCase();
  return ADMIN_SLUGS.has(slug) ? "admin" : "user";
}

export function mapServerUserToClient(user: ServerUser): User {
  const first = user.firstName?.trim() || "";
  const last = user.lastName?.trim() || "";
  const name = [first, last].filter(Boolean).join(" ") || user.email;

  return {
    id: String(user._id || user.id),
    name,
    email: user.email,
    role: mapServerRoleToClient(user.role),
    avatar: user.avatar || undefined,
    phone: user.phone || undefined,
    company: undefined,
    title: undefined,
    joinedAt: user.createdAt || new Date().toISOString(),
  };
}

export function getRedirectForRole(role: UserRole): string {
  return role === "admin" ? "/admin/dashboard" : "/dashboard";
}

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong"): string {
  if (!error || typeof error !== "object") return fallback;
  const err = error as {
    data?: { message?: string; errors?: Array<{ msg?: string; message?: string }> };
    error?: string;
    status?: number | string;
  };
  if (err.data?.message) return err.data.message;
  const first = err.data?.errors?.[0];
  if (first?.msg) return first.msg;
  if (first?.message) return first.message;
  if (typeof err.error === "string" && err.error !== "FETCH_ERROR") return err.error;
  return fallback;
}
