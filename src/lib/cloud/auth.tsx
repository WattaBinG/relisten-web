'use client';

import type { Session, SupabaseClient } from '@supabase/supabase-js';
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

/**
 * Reserved usernames (migration 004): obvious names the founder locked down.
 * Counts as taken unless the reservation is claimed by this user.
 * `userId` is null during pre-signup checks (no user yet) — then any
 * reservation blocks the name.
 */
async function isUsernameReserved(
  sb: SupabaseClient,
  username: string,
  userId: string | null
): Promise<boolean> {
  const { data } = await sb
    .from('reserved_usernames')
    .select('claimed_by')
    .eq('username', username)
    .maybeSingle();
  if (!data) return false;
  return userId == null || data.claimed_by !== userId;
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
  if (taken || (await isUsernameReserved(sb, username, userId))) {
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
  /** Re-fetch the profile row from Supabase. */
  refreshProfile: () => Promise<void>;
  /** Change the username (availability-checked). */
  updateUsername: (username: string) => Promise<{ error?: string }>;
  /**
   * Upload an image file as the user's avatar. Stored at
   * `avatars/{user_id}/avatar.jpg` (requires migration 003); the public URL
   * is saved on the profile. Returns the public URL on success.
   */
  uploadAvatar: (file: File) => Promise<{ error?: string; url?: string }>;
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

    // If Supabase dropped a recovery token on the wrong page (e.g. /),
    // bounce to /reset-password so the user actually gets the form.
    if (
      typeof window !== 'undefined' &&
      window.location.hash.includes('type=recovery') &&
      !window.location.pathname.startsWith('/reset-password')
    ) {
      window.location.replace('/reset-password' + window.location.hash);
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
      if (await isUsernameReserved(sb, clean, null)) {
        return { error: 'That username is taken — try another.' };
      }

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

  const refreshProfile = useCallback(async () => {
    const sb = getSupabase();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return;
    const p = await ensureProfile(user.id);
    if (p) setProfile(p);
  }, []);

  const updateUsername = useCallback(
    async (username: string): Promise<{ error?: string }> => {
      const clean = normalizeUsername(username);
      if (clean.length < 3) {
        return { error: 'Username needs at least 3 characters (letters, numbers, _).' };
      }
      const sb = getSupabase();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) return { error: 'You are not signed in.' };
      if (profile && clean === profile.username) return {};
      // Availability check (migration 003 lets signed-in users read usernames).
      const { data: existing } = await sb
        .from('profiles')
        .select('id')
        .eq('username', clean)
        .maybeSingle();
      if (existing && existing.id !== user.id) {
        return { error: 'That username is taken — try another.' };
      }
      if (await isUsernameReserved(sb, clean, user.id)) {
        return { error: 'That username is taken — try another.' };
      }
      const { error } = await sb.from('profiles').update({ username: clean }).eq('id', user.id);
      if (error) {
        return {
          error:
            error.code === '23505' ? 'That username was just taken — try another.' : error.message,
        };
      }
      await refreshProfile();
      return {};
    },
    [profile, refreshProfile]
  );

  const uploadAvatar = useCallback(
    async (file: File): Promise<{ error?: string; url?: string }> => {
      const sb = getSupabase();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) return { error: 'You are not signed in.' };
      const path = `${user.id}/avatar.jpg`;
      const { error: uploadError } = await sb.storage
        .from('avatars')
        .upload(path, file, { contentType: file.type || 'image/jpeg', upsert: true });
      if (uploadError) {
        console.warn('[cloud-auth] avatar upload failed', uploadError.message);
        return {
          error:
            uploadError.message.includes('Bucket not found') ||
            uploadError.message.includes('not found')
              ? 'Avatar storage is not set up yet (run migration 003 in Supabase).'
              : uploadError.message,
        };
      }
      const {
        data: { publicUrl },
      } = sb.storage.from('avatars').getPublicUrl(path);
      const cacheBusted = `${publicUrl}?t=${Date.now()}`;
      const { error: profileError } = await sb
        .from('profiles')
        .update({ avatar_url: cacheBusted })
        .eq('id', user.id);
      if (profileError) {
        console.warn('[cloud-auth] avatar profile update failed', profileError.message);
        return { error: profileError.message };
      }
      await refreshProfile();
      return { url: cacheBusted };
    },
    [refreshProfile]
  );

  const value = useMemo<CloudAuthContextValue>(
    () => ({
      status,
      session,
      profile,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      updateUsername,
      uploadAvatar,
    }),
    [status, session, profile, signIn, signUp, signOut, refreshProfile, updateUsername, uploadAvatar]
  );

  return <CloudAuthContext.Provider value={value}>{children}</CloudAuthContext.Provider>;
}

export function useCloudAuth(): CloudAuthContextValue {
  const ctx = useContext(CloudAuthContext);
  if (!ctx) throw new Error('useCloudAuth must be used inside CloudAuthProvider');
  return ctx;
}
