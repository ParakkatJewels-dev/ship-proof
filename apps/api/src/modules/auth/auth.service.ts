import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";
import { UserRole } from "@shipproof/shared";
import { config } from "../../config/env.config.js";
import { isMockSupabase, supabase } from "../../integrations/supabase/db.client.js";
import { logger } from "../../utils/logger.js";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  /** When the access token stops working, in milliseconds since 1970. */
  expiresAt: number;
  user: AuthUser;
}

/** A sign-in problem the packer should be told about (wrong password, expired session, and so on). */
export class AuthError extends Error {
  constructor(
    message: string,
    public status = 401,
  ) {
    super(message);
  }
}

const ACCESS_SECONDS = 60 * 60;
const REFRESH_SECONDS = 7 * 24 * 60 * 60;

/**
 * Without a Supabase project, a single development account lets the login flow be tried. It is never
 * available in production. With a Supabase project, accounts live in Supabase Auth.
 */
const devAccount = {
  id: "dev-admin",
  email: (process.env.DEV_LOGIN_EMAIL || "admin@shipproof.test").toLowerCase(),
  password: process.env.DEV_LOGIN_PASSWORD || "ShipProof#123",
  name: "Admin",
  role: UserRole.ADMIN,
};
const devLoginEnabled = isMockSupabase && config.nodeEnv !== "production";
if (devLoginEnabled) {
  logger.warn(
    `Supabase is not configured: sign in with the development account ${devAccount.email} (password in DEV_LOGIN_PASSWORD, default ShipProof#123).`,
  );
}

/** A client of its own for sign-in calls, so a user session never replaces the server service key. */
const authClient = () =>
  createClient(config.supabase.url, config.supabase.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

const asRole = (value: unknown): UserRole =>
  value === UserRole.ADMIN ? UserRole.ADMIN : UserRole.PACKER;

async function loadProfile(id: string, email: string, metaName?: string): Promise<AuthUser> {
  const { data } = await supabase.from("profiles").select("full_name, role").eq("id", id).maybeSingle();
  return {
    id,
    email,
    name: data?.full_name || metaName || email.split("@")[0],
    role: asRole(data?.role),
  };
}

function signDevSession(user: AuthUser): AuthSession {
  const base = { id: user.id, email: user.email, name: user.name, role: user.role };
  return {
    accessToken: jwt.sign({ ...base, typ: "access" }, config.jwtSecret, { expiresIn: ACCESS_SECONDS }),
    refreshToken: jwt.sign({ ...base, typ: "refresh" }, config.jwtSecret, { expiresIn: REFRESH_SECONDS }),
    expiresAt: Date.now() + ACCESS_SECONDS * 1000,
    user,
  };
}

const devUser = (): AuthUser => ({
  id: devAccount.id,
  email: devAccount.email,
  name: devAccount.name,
  role: devAccount.role,
});

/** A short memory of recently verified tokens, so frequent dashboard requests do not each ask Supabase. */
const verified = new Map<string, { user: AuthUser; until: number }>();
const VERIFY_CACHE_MS = 30_000;

export class AuthService {
  async login(email: string, password: string): Promise<AuthSession> {
    const clean = email.trim().toLowerCase();
    if (!clean || !password) throw new AuthError("Enter your email and password.", 400);

    if (isMockSupabase) {
      if (!devLoginEnabled || clean !== devAccount.email || password !== devAccount.password) {
        throw new AuthError("Incorrect email or password.");
      }
      return signDevSession(devUser());
    }

    const { data, error } = await authClient().auth.signInWithPassword({ email: clean, password });
    if (error || !data.session || !data.user) {
      // Wrong password and unknown email look the same on purpose.
      if (error && error.status && error.status >= 500) {
        logger.error("Supabase sign-in failed", error);
        throw new AuthError("Sign-in is unavailable right now. Try again in a moment.", 503);
      }
      throw new AuthError("Incorrect email or password.");
    }
    const user = await loadProfile(data.user.id, data.user.email ?? clean, data.user.user_metadata?.full_name);
    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: (data.session.expires_at ?? Math.floor(Date.now() / 1000) + ACCESS_SECONDS) * 1000,
      user,
    };
  }

  async refresh(refreshToken: string): Promise<AuthSession> {
    if (!refreshToken) throw new AuthError("Your session has ended. Sign in again.");

    if (isMockSupabase) {
      try {
        const d = jwt.verify(refreshToken, config.jwtSecret) as any;
        if (d.typ !== "refresh") throw new Error("not a refresh token");
        return signDevSession({ id: d.id, email: d.email, name: d.name, role: asRole(d.role) });
      } catch {
        throw new AuthError("Your session has ended. Sign in again.");
      }
    }

    const { data, error } = await authClient().auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session || !data.user) throw new AuthError("Your session has ended. Sign in again.");
    const user = await loadProfile(data.user.id, data.user.email ?? "", data.user.user_metadata?.full_name);
    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: (data.session.expires_at ?? Math.floor(Date.now() / 1000) + ACCESS_SECONDS) * 1000,
      user,
    };
  }

  /** Who a bearer token belongs to. Throws AuthError when it is invalid or expired. */
  async verify(token: string): Promise<AuthUser> {
    const hit = verified.get(token);
    if (hit && hit.until > Date.now()) return hit.user;

    let user: AuthUser;
    if (isMockSupabase) {
      try {
        const d = jwt.verify(token, config.jwtSecret) as any;
        if (d.typ !== "access") throw new Error("not an access token");
        user = { id: d.id, email: d.email, name: d.name, role: asRole(d.role) };
      } catch {
        throw new AuthError("Invalid or expired token");
      }
    } else {
      const { data, error } = await supabase.auth.getUser(token);
      if (error || !data.user) throw new AuthError("Invalid or expired token");
      user = await loadProfile(data.user.id, data.user.email ?? "", data.user.user_metadata?.full_name);
    }
    verified.set(token, { user, until: Date.now() + VERIFY_CACHE_MS });
    if (verified.size > 500) verified.clear();
    return user;
  }

  async logout(token: string) {
    verified.delete(token);
    if (isMockSupabase) return;
    try {
      await supabase.auth.admin.signOut(token);
    } catch (err) {
      logger.warn("Supabase sign-out failed (the token will expire on its own).", err);
    }
  }
}

export const authService = new AuthService();
