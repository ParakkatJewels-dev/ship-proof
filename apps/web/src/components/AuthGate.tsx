"use client";

import React, { useEffect, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getRawSession, subscribeAuth } from "../lib/auth";
import { AppDataProvider } from "./AppData";

/**
 * Keeps signed-out visitors on the login page and signed-in ones off it. The dashboard's data (orders,
 * camera, live connection) only starts once someone is signed in, and stops when they sign out.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  // undefined while the page is still loading in the browser, then the stored session or null.
  const raw = useSyncExternalStore<string | null | undefined>(
    subscribeAuth,
    getRawSession,
    () => undefined,
  );
  const signedIn = !!raw;
  const onLogin = pathname === "/login";
  // The customer watch page is public: it never needs a dashboard sign-in.
  const isPublic = pathname.startsWith("/watch/");

  useEffect(() => {
    if (raw === undefined || isPublic) return;
    if (!signedIn && !onLogin) router.replace("/login");
    else if (signedIn && onLogin) router.replace("/");
  }, [raw, signedIn, onLogin, isPublic, router]);

  if (isPublic) return <>{children}</>;

  const redirecting = raw === undefined || signedIn === onLogin;
  if (redirecting) {
    return (
      <div
        role="status"
        className="min-h-screen flex items-center justify-center bg-canvas text-sm text-muted"
      >
        Loading…
      </div>
    );
  }

  return signedIn ? (
    <AppDataProvider>{children}</AppDataProvider>
  ) : (
    <>{children}</>
  );
}
