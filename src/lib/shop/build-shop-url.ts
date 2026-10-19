/** Builds a `/shop` URL by merging `updates` into the current filters —
 * shared by every filter control so they all edit the same query string
 * instead of each hand-rolling their own URLSearchParams logic. A value of
 * `null` removes that param entirely. */
export function buildShopUrl(
  current: Record<string, string | undefined>,
  updates: Record<string, string | null>,
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(current)) {
    if (value) params.set(key, value);
  }
  for (const [key, value] of Object.entries(updates)) {
    if (value === null) params.delete(key);
    else params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/shop?${qs}` : "/shop";
}
