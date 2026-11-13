/**
 * The claims a JWT carries, read without checking its signature. Only for showing things in the
 * UI: the APIs verify every token they are sent, so nothing read here grants anything.
 */
export function readClaims(token: string): Record<string, unknown> {
  const payload = token.split('.')[1] ?? '';
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));

  return JSON.parse(new TextDecoder().decode(bytes));
}
