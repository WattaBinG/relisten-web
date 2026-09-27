'use client';

import { useEffect, useState } from 'react';
import { getSupabase, isCloudEnabled } from '@/lib/cloud/supabase';

const inputClass =
  'rounded border border-gray-300 px-3 py-2 text-sm text-black focus:border-black focus:outline-none';

/**
 * Handles Supabase recovery links. The email link lands here with a ?code=
 * (PKCE) which we exchange for a session, then the user sets a new password.
 */
export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isCloudEnabled) {
      setError('Password reset is not available right now.');
      return;
    }
    const run = async () => {
      const supabase = getSupabase();
      // PKCE flow: ?code= in the query string
      const code = new URLSearchParams(window.location.search).get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setError('This reset link is invalid or expired — request a new one from the sign-in page.');
          return;
        }
      }
      // Implicit flow: #access_token= in the hash — the client auto-detects it
      // on creation, but wait a tick for it to land in storage.
      for (let i = 0; i < 10; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setReady(true);
          // Clean the token out of the URL so a refresh doesn't confuse anyone.
          window.history.replaceState(null, '', window.location.pathname);
          return;
        }
        await new Promise((r) => setTimeout(r, 200));
      }
      // With a valid recovery session (or an existing session), allow the change.
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setError('This reset link is invalid or expired — request a new one from the sign-in page.');
        return;
      }
      setReady(true);
    };
    run();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setBusy(true);
    const { error } = await getSupabase().auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  };

  return (
    <div className="content">
      <h1 className="mb-4">Set a new password</h1>
      {error && <p className="max-w-sm text-sm text-red-600">{error}</p>}
      {done ? (
        <p className="max-w-sm text-sm text-green-700">
          Password updated — you can now sign in with your new password, in the app and here.
        </p>
      ) : (
        ready && (
          <form onSubmit={submit} className="mt-4 flex max-w-sm flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm">
              New password
              <input
                className={inputClass}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Confirm new password
              <input
                className={inputClass}
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              className="cursor-pointer rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy ? 'Working…' : 'Save new password'}
            </button>
          </form>
        )
      )}
    </div>
  );
}
