/**
 * Sign-in for the dashboard. The API checks the email and password with Supabase Auth and hands back an
 * access token (sent with every request) and a refresh token (used to stay signed in).
 *
 * The session is kept in this browser's local storage. That keeps a reload signed in, but it means any
 * script running on this site could read it, so the site must never load untrusted scripts.
 */

const API = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
).replace(/\/$/, "");
const KEY = "shipproof_auth";
const EVENT = "shipproof-auth";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "PACKER";
}

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  /** Milliseconds since 1970 when the access token stops working. */
  expiresAt: number;
  user: AuthUser;
}

/** The raw stored session, for useSyncExternalStore. Null when signed out. */
export function getRawSession(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function subscribeAuth(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}

export function readSession(): StoredSession | null {
  const raw = getRawSession();
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

function saveSession(session: StoredSession) {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // Storage is blocked: the session lasts only until the page is reloaded.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY);
    // The old fake sign-in left this behind.
    localStorage.removeItem("shipproof_user");
  } catch {
    // Nothing to clear.
  }
  window.dispatchEvent(new Event(EVENT));
}

async function post<T>(
  path: string,
  body: unknown,
  token?: string,
): Promise<{
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
}> {
  const res = await fetch(`${API}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const json = await res.json().catch(() => null);
  return {
    ok: res.ok && !!json?.success,
    status: res.status,
    data: json?.data ?? null,
    error: json?.error ?? null,
  };
}

/** Signs in. Throws an Error with a message fit to show the person. */
export async function login(
  email: string,
  password: string,
): Promise<StoredSession> {
  let result;
  try {
    result = await post<StoredSession>("/api/auth/login", { email, password });
  } catch {
    throw new Error(
      "Can't reach the ShipProof server. Check that it is running and try again.",
    );
  }
  if (!result.ok || !result.data)
    throw new Error(result.error || "Sign-in failed. Try again.");
  saveSession(result.data);
  return result.data;
}

let refreshing: Promise<StoredSession | null> | null = null;

/** Gets a new access token. Signs the person out when the server says the session has ended. */
export function refreshSession(): Promise<StoredSession | null> {
  if (refreshing) return refreshing;
  const current = readSession();
  if (!current) return Promise.resolve(null);
  refreshing = (async () => {
    try {
      const result = await post<StoredSession>("/api/auth/refresh", {
        refreshToken: current.refreshToken,
      });
      if (result.ok && result.data) {
        saveSession(result.data);
        return result.data;
      }
      // The server answered and said no: the session is over. A server error keeps the session.
      if (result.status === 401 || result.status === 400) clearSession();
      return null;
    } catch {
      // The server could not be reached. Stay signed in and try again later.
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/** A valid access token, refreshed first when it is about to run out. Null when signed out. */
export async function getAccessToken(): Promise<string | null> {
  const session = readSession();
  if (!session) return null;
  if (session.expiresAt - Date.now() > 60_000) return session.accessToken;
  const fresh = await refreshSession();
  return (
    fresh?.accessToken ??
    (session.expiresAt > Date.now() ? session.accessToken : null)
  );
}

/** fetch with the access token attached. A 401 triggers one refresh and one retry. */
export async function authFetch(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const send = (token: string | null) =>
    fetch(url, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  let res = await send(await getAccessToken());
  if (res.status === 401 && readSession()) {
    const fresh = await refreshSession();
    if (fresh) res = await send(fresh.accessToken);
    if (res.status === 401) clearSession();
  }
  return res;
}

export async function logout() {
  const token = readSession()?.accessToken;
  clearSession();
  if (token) {
    try {
      await post("/api/auth/logout", {}, token);
    } catch {
      // The token expires on its own.
    }
  }
}
