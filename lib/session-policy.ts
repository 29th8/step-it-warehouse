export const SESSION_IDLE_MS = 2 * 60 * 60 * 1000;
export const SESSION_ABSOLUTE_MS = 12 * 60 * 60 * 1000;
export const SESSION_WARNING_MS = 5 * 60 * 1000;

export function sessionDeadline(token: { loginAt?: unknown; activeAt?: unknown }, now = Date.now()): number | null {
  const { loginAt, activeAt } = token;
  if (typeof loginAt !== "number" || typeof activeAt !== "number" || !Number.isFinite(loginAt) || !Number.isFinite(activeAt)) return null;
  if (loginAt > now || activeAt > now || activeAt < loginAt) return null;
  return Math.min(loginAt + SESSION_ABSOLUTE_MS, activeAt + SESSION_IDLE_MS);
}

export function isSessionCurrent(token: { loginAt?: unknown; activeAt?: unknown }, now = Date.now()): boolean {
  const deadline = sessionDeadline(token, now);
  return deadline !== null && now < deadline;
}
