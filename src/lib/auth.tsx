import type { Session } from "@supabase/supabase-js";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import { supabase } from "./supabase";
import type { Profile } from "./types";

/**
 * Auth context value exposed to the entire app.
 * - loading: true while the initial session is being restored from storage.
 * - session: the raw Supabase session (null when signed out).
 * - profile: the household profile row for the signed-in user (null if
 *            missing, inactive, or not yet loaded).
 */
interface AuthValue {
  loading: boolean;
  session: Session | null;
  profile: Profile | null;
  /** Returns null on success or a user-visible error message. */
  signIn: (username: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

async function loadProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error || !data) return null;
  return data as Profile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    // A session without an active household profile is useless — drop it so the
    // app returns to the login screen instead of hanging. This runs on initial
    // load (getSession) and on every auth state change (listener).
    async function applySession(nextSession: Session | null) {
      setSession(nextSession);
      if (nextSession) {
        const nextProfile = await loadProfile(nextSession.user.id);
        if (!nextProfile || !nextProfile.active) {
          await supabase.auth.signOut();
          setSession(null);
          setProfile(null);
          return;
        }
        setProfile(nextProfile);
      } else {
        setProfile(null);
      }
    }

    supabase.auth.getSession().then(async ({ data }) => {
      await applySession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void applySession(nextSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      loading,
      session,
      profile,
      async signIn(username, password) {
        const email = `${username.trim().toLowerCase()}@udh304.local`;
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        // Auth failures that look like network issues get a friendlier message
        // so users don't think their password is wrong.
        if (error) {
          // Network failures must not masquerade as wrong credentials.
          if (error.name === "AuthRetryableFetchError" || /fetch|network|failed/i.test(error.message)) {
            return "Cannot reach the server. Check your internet connection and try again.";
          }
          return "Username or password is incorrect.";
        }
        if (!data.session) return "Username or password is incorrect.";
        const nextProfile = await loadProfile(data.session.user.id);
        if (!nextProfile) {
          await supabase.auth.signOut();
          return "No household profile exists for this account.";
        }
        if (!nextProfile.active) {
          await supabase.auth.signOut();
          return "This account has been deactivated. Ask your household admin for help.";
        }
        setSession(data.session);
        setProfile(nextProfile);
        return null;
      },
      async signOut() {
        await supabase.auth.signOut();
        setSession(null);
        setProfile(null);
      },
      async refreshProfile() {
        if (session) setProfile(await loadProfile(session.user.id));
      },
    }),
    [loading, session, profile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

/**
 * AuthProvider wraps the app and keeps the session + profile in sync with
 * Supabase Auth. Any screen can call useAuth() to read state or trigger
 * sign-in / sign-out / profile refresh.
 */

