export function getUserInitials(name?: string | null, fallback = "U"): string {
  if (!name?.trim()) return fallback;
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
