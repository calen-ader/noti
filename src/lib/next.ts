// Where to go after signing in. Only the app's own pages are allowed, so a sign-in link can't be made to send
// someone to another site (a check on the first characters isn't enough: browsers read "/\evil.com" as "//evil.com").
export function safeNext(next: string | null | undefined): string | null {
  if (!next) return null;
  return /^\/(estudio(\?p=[A-Za-z0-9_-]+)?|unirse\/[A-Za-z0-9_-]+)$/.test(next) ? next : null;
}
