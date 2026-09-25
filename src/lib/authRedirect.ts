/** Only checkout destinations may be carried through the public signup flow. */
export function checkoutDestination(value: string | null): string | null {
  if (!value) return null;
  return /^\/checkout\/[a-z0-9-]+$/.test(value) ? value : null;
}

export function authPath(page: 'login' | 'cadastro', next: string | null): string {
  return `/${page}${next ? `?next=${encodeURIComponent(next)}` : ''}`;
}
