'use client';

import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getSupabase, isCloudEnabled, type ProfileRow } from './supabase';

const PENDING_USERNAME_KEY = 'thelot.pendingUsername.v1';

export type AuthStatus = 'loading' | 'authed' | 'anon';

export interface SignUpResult {
  error?: string;
  needsConfirmation?: boolean;
}

/** Same normalization as the mobile app: lowercase, letters/numbers/_ only. */
export function normalizeUsername(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 20);
}

/** Load the user's profile, creating it on first sight (covers the
 *  email-confirmation signup flow where no session existed at signup time). */
async function ensureProfile(userId: string): Promise<ProfileRow | null> {
  const sb = getSupabase();
  const { data, error } = await sb.from('profiles').select('*').eq('id', userId).maybeSingle();
  if (error) {
    console.warn('[cloud-auth] ensureProfile: load failed', error.message);
    return null;
  }
  if (data) return data as ProfileRow;

  let username = normalizeUsername(localStorage.getItem(PENDING_USERNAME_KEY) || '');
  if (username.length < 3) {
    username = `user_${userId.slice(0, 8)}`;
  }
  const { data: taken } = await sb.from('profiles').select('id').eq('username', username).maybeSingle();
  if (taken) {
    username = `${username}_${Math.floor(1000 + Math.random() * 9000)}`;
  }
  const { data: created, error: createError } = await sb
    .from('profiles')
    .upsert({ id: userId, username })
    .select()
    .single();
  if (createError) {
    console.warn('[cloud-auth] ensureProfile: create failed', createError.message);
    return null;
  }
  localStorage.removeItem(PENDING_USERNAME_KEY);
  return created as ProfileRow;
}

interface CloudAuthContextValue {
  status: AuthStatus;
  session: Session | null;
  profile: ProfileRow | null;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, username: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
}

const CloudAuthContext = createContext<CloudAuthContextValue | null>(null);

export function CloudAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);

  useEffect(() => {
    if (!isCloudEnabled) {
      // No Supabase credentials: behave exactly like stock Relisten.
      setStatus('anon');
      return;
    }

    let mounted = true;

    const applySession = async (s: Session | null) => {
      if (!mounted) return;
      setSession(s);
      if (s?.user) {
        const p = await ensureProfile(s.user.id);
        if (!mounted) return;
        setProfile(p);
        setStatus('authed');
      } else {
        setProfile(null);
        setStatus('anon');
      }
    };

    getSupabase()
      .auth.getSession()
      .then(({ data }) => {
        if (mounted) applySession(data.session);
      })
      .catch(() => {
        if (mounted) setStatus('anon');
      });

    const { data: sub } = getSupabase().auth.onAuthStateChange((_event, s) => {
      applySession(s).catch((e) => console.warn('[cloud-auth] auth state change failed', e));
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabase().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) return { error: error.message };
    return {};
  }, []);

  const signUp = useCallback(
    async (email: string, password: string, username: string): Promise<SignUpResult> => {
      const clean = normalizeUsername(username);
      if (clean.length < 3) {
        return { error: 'Username needs at least 3 characters (letters, numbers, _).' };
      }
      if (password.length < 6) {
        return { error: 'Password needs at least 6 characters.' };
      }
      const sb = getSupabase();
      // Friendly "taken" check (anon can only read the username column — see migration 002).
      const { data: existing } = await sb
        .from('profiles')
        .select('id')
        .eq('username', clean)
        .maybeSingle();
      if (existing) return { error: 'That username is taken — try another.' };

      localStorage.setItem(PENDING_USERNAME_KEY, clean);
      const { data, error } = await sb.auth.signUp({ email: email.trim(), password });
      if (error) {
        localStorage.removeItem(PENDING_USERNAME_KEY);
        return { error: error.message };
      }
      if (data.session && data.user) {
        // Instant sign-in (email confirmation off) — create the profile now.
        const { error: pErr } = await sb.from('profiles').upsert({ id: data.user.id, username: clean });
        localStorage.removeItem(PENDING_USERNAME_KEY);
        if (pErr) {
          return {
            error:
              pErr.code === '23505'
                ? 'That username was just taken — try another.'
                : pErr.message,
          };
        }
        return {};
      }
      // Email confirmation is on: profile gets created on first sign-in.
      return { needsConfirmation: true };
    },
    []
  );

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
  }, []);

  const value = useMemo<CloudAuthContextValue>(
    () => ({ status, session, profile, signIn, signUp, signOut }),
    [status, session, profile, signIn, signUp, signOut]
  );

  return <CloudAuthContext.Provider value={value}>{children}</CloudAuthContext.Provider>;
}

export function useCloudAuth(): CloudAuthContextValue {
  const ctx = useContext(CloudAuthContext);
  if (!ctx) throw new Error('useCloudAuth must be used inside CloudAuthProvider');
  return ctx;
}
