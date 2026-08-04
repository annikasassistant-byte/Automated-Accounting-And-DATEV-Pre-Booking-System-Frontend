import { toast } from "sonner";

/**
 * Full document navigation — avoids React 19 / App Router DOM races
 * (NotFoundError: Failed to execute 'removeChild' on 'Node') when
 * portals (toasts, menus) unmount during client-side transitions.
 */
export function hardNavigate(href: string) {
  if (typeof window === "undefined") return;
  try {
    toast.dismiss();
  } catch {
    // ignore
  }
  window.location.assign(href);
}
