'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { normalizeUsername, useCloudAuth } from '@/lib/cloud/auth';
import { isCloudEnabled, getSupabase } from '@/lib/cloud/supabase';

function friendlyError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Wrong email or password — try again.';
  if (/email not confirmed/i.test(message))
    return 'That email isn’t confirmed yet — check your inbox for the confirmation link.';
  if (/user already registered/i.test(message))
    return 'That email already has an account — try signing in instead.';
  return message;
}

const inputClass =
  'w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm focus:border-black focus:outline-none';

function ProfileEditor() {
  const { profile, session, signOut, updateUsername, uploadAvatar } = useCloudAuth();
  const [draft, setDraft] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const usernameValue = draft ?? profile?.username ?? '';
  const dirty =
    draft !== null && draft.trim().toLowerCase() !== (profile?.username ?? '').toLowerCase();

  const saveUsername = async () => {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const { error: updateError } = await updateUsername(usernameValue);
      if (updateError) {
        setError(friendlyError(updateError));
      } else {
        setDraft(null);
        setNotice('Username updated.');
      }
    } finally {
      setBusy(false);
    }
  };

  const onAvatarFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setNotice(null);
    setUploading(true);
    try {
      const { error: uploadError } = await uploadAvatar(file);
      if (uploadError) {
        setError(friendlyError(uploadError));
      } else {
        setNotice('Profile photo updated.');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="Profile photo" className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-gray-500">
              {(profile?.username ?? '?').slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <label className="cursor-pointer text-sm underline">
          {uploading ? 'Uploading…' : profile?.avatar_url ? 'Change photo' : 'Add a profile photo'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => void onAvatarFile(e.target.files?.[0])}
          />
        </label>
      </div>

      <label className="mt-6 block">
        <span className="mb-1 block text-xs font-semibold uppercase text-gray-500">Username</span>
        <input
          className={inputClass}
          value={usernameValue}
          maxLength={20}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
            setNotice(null);
          }}
        />
      </label>
      {dirty && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void saveUsername()}
          className="mt-3 cursor-pointer rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save username'}
        </button>
      )}

      <p className="mt-4 text-sm text-gray-600">
        Email: <span className="text-gray-900">{session?.user?.email ?? '…'}</span>
      </p>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {notice && <p className="mt-3 text-sm text-green-700">{notice}</p>}

      <p className="mt-6">
        <button
          type="button"
          className="cursor-pointer rounded border border-gray-300 px-3 py-2 text-sm"
          onClick={() => void signOut()}
        >
          Sign out
        </button>
      </p>
    </div>
  );
}

export default function AccountPage() {
  const { status, profile, signIn, signUp, signOut } = useCloudAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  if (!isCloudEnabled) {
    return (
      <div className="content">
        <h1 className="mb-4">Account</h1>
        <p>User accounts aren’t configured on this deployment yet.</p>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <div className="content">
        <h1 className="mb-4">Account</h1>
        <p>Loading…</p>
      </div>
    );
  }

  if (status === 'authed') {
    return (
      <div className="content">
        <h1 className="mb-4">Account</h1>
        <ProfileEditor />
        <p className="mt-6">
          <Link href="/favorites" className="underline">
            View your favorites →
          </Link>
        </p>
      </div>
    );
  }

  const sendReset = async () => {
    setError(null);
    if (!email) {
      setError('Enter your email above first, then hit "Forgot password?"');
      return;
    }
    setResetBusy(true);
    try {
      const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
        redirectTo: 'https://relisten-web.vercel.app/reset-password',
      });
      if (error) setError(friendlyError(error.message));
      else setResetSent(true);
    } finally {
      setResetBusy(false);
    }
  };

  const submit = async (e: FormEvent) => {    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signup') {
        const res = await signUp(email, password, username);
        if (res.error) {
          setError(friendlyError(res.error));
        } else if (res.needsConfirmation) {
          setNeedsConfirmation(true);
        } else {
          router.push('/favorites');
        }
      } else {
        const res = await signIn(email, password);
        if (res.error) {
          setError(friendlyError(res.error));
        } else {
          router.push('/favorites');
        }
      }
    } finally {
      setBusy(false);
    }
  };

  if (needsConfirmation) {
    return (
      <div className="content">
        <h1 className="mb-4">Check your email</h1>
        <p>
          We sent a confirmation link to <strong>{email}</strong>. Click it, then come back and
          sign in — your username <strong>{normalizeUsername(username)}</strong> will be waiting.
        </p>
        <p>
          <button
            type="button"
            className="cursor-pointer rounded border border-gray-300 px-3 py-2 text-sm"
            onClick={() => {
              setNeedsConfirmation(false);
              setMode('signin');
            }}
          >
            Back to sign in
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="content">
      <h1 className="mb-4">{mode === 'signup' ? 'Create your account' : 'Sign in'}</h1>
      <p className="text-sm text-gray-600">
        One account for The Lot everywhere — your username and favorites follow you between the
        app and this site.
      </p>

      <form onSubmit={submit} className="mt-4 flex max-w-sm flex-col gap-3">
        {mode === 'signup' && (
          <label className="flex flex-col gap-1 text-sm">
            Username
            <input
              className={inputClass}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="jerry_fan_95"
              autoComplete="username"
              required
            />
            <span className="text-xs text-gray-500">
              3–20 characters: lowercase letters, numbers, _ only.
            </span>
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            className={inputClass}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Password
          <input
            className={inputClass}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {resetSent && (
          <p className="text-sm text-green-700">
            Reset link sent — check your email for the link to set a new password.
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="cursor-pointer rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? 'Working…' : mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>
        {mode === 'signin' && (
          <button
            type="button"
            disabled={resetBusy}
            onClick={sendReset}
            className="cursor-pointer self-start text-sm text-gray-600 underline disabled:opacity-50"
          >
            {resetBusy ? 'Sending…' : 'Forgot password?'}
          </button>
        )}
      </form>

      <p className="mt-4 text-sm">
        {mode === 'signup' ? (
          <>
            Already have an account?{' '}
            <button
              type="button"
              className="cursor-pointer underline"
              onClick={() => {
                setMode('signin');
                setError(null);
              }}
            >
              Sign in
            </button>
          </>
        ) : (
          <>
            New to The Lot?{' '}
            <button
              type="button"
              className="cursor-pointer underline"
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
            >
              Create an account
            </button>
          </>
        )}
      </p>
    </div>
  );
}
