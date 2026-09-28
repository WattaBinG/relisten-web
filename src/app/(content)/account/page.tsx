'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { normalizeUsername, useCloudAuth } from '@/lib/cloud/auth';
import { formatBirthdayMonthDay, getMonthDay, updateBirthdaySettings } from '@/lib/cloud/birthday';
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

const sectionClass = 'rounded-xl border border-gray-200 bg-white p-5';
const sectionTitleClass = 'mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500';

function AvatarSection() {
  const { profile, uploadAvatar } = useCloudAuth();
  const [pending, setPending] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Build/clean up the local preview URL.
  useEffect(() => {
    if (!pending) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pending);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pending]);

  const pick = (file: File | undefined) => {
    setError(null);
    setNotice(null);
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please pick an image file.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('That image is over 5 MB — pick a smaller one.');
      return;
    }
    setPending(file);
  };

  const cancel = () => {
    setPending(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const save = async () => {
    if (!pending) return;
    setError(null);
    setNotice(null);
    setUploading(true);
    try {
      const { error: uploadError } = await uploadAvatar(pending);
      if (uploadError) {
        setError(friendlyError(uploadError));
      } else {
        setNotice('Profile photo updated.');
        setPending(null);
        if (fileRef.current) fileRef.current.value = '';
      }
    } finally {
      setUploading(false);
    }
  };

  const current = previewUrl ?? profile?.avatar_url ?? null;

  return (
    <section className={sectionClass}>
      <h2 className={sectionTitleClass}>Profile photo</h2>
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200">
          {current ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current} alt="Profile photo" className="h-full w-full object-cover" />
          ) : (
            <span className="text-2xl font-bold text-gray-500">
              {(profile?.username ?? '?').slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          {pending ? (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => void save()}
                className="cursor-pointer rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {uploading ? 'Uploading…' : 'Save photo'}
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={cancel}
                className="cursor-pointer rounded border border-gray-300 px-4 py-2 text-sm disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="cursor-pointer self-start rounded border border-gray-300 px-4 py-2 text-sm"
            >
              {profile?.avatar_url ? 'Change photo' : 'Upload a photo'}
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0])}
          />
          {pending && <p className="text-xs text-gray-500">Preview — hit Save to keep it.</p>}
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {notice && <p className="mt-3 text-sm text-green-700">{notice}</p>}
    </section>
  );
}

function UsernameSection() {
  const { profile, updateUsername } = useCloudAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const startEdit = () => {
    setDraft(profile?.username ?? '');
    setError(null);
    setNotice(null);
    setEditing(true);
  };

  const save = async () => {
    setError(null);
    setNotice(null);
    const clean = normalizeUsername(draft);
    if (clean.length < 3) {
      setError('Username needs at least 3 characters (letters, numbers, _).');
      return;
    }
    setBusy(true);
    try {
      const { error: updateError } = await updateUsername(draft);
      if (updateError) {
        setError(friendlyError(updateError));
      } else {
        setNotice('Username updated.');
        setEditing(false);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={sectionClass}>
      <h2 className={sectionTitleClass}>Username</h2>
      {editing ? (
        <div>
          <input
            className={inputClass}
            value={draft}
            maxLength={20}
            autoComplete="off"
            spellCheck={false}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
              setNotice(null);
            }}
          />
          <p className="mt-1 text-xs text-gray-500">
            3–20 characters: lowercase letters, numbers, _ only.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="cursor-pointer rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
              className="cursor-pointer rounded border border-gray-300 px-4 py-2 text-sm disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-lg font-medium">@{profile?.username ?? '…'}</span>
          <button
            type="button"
            onClick={startEdit}
            className="cursor-pointer rounded border border-gray-300 px-4 py-2 text-sm"
          >
            Edit
          </button>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {notice && <p className="mt-3 text-sm text-green-700">{notice}</p>}
    </section>
  );
}

function EmailSection() {
  const { session } = useCloudAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const currentEmail = session?.user?.email ?? '';

  const save = async () => {
    setError(null);
    setNotice(null);
    const clean = draft.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setError('Enter a valid email address.');
      return;
    }
    if (clean.toLowerCase() === currentEmail.toLowerCase()) {
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      const { error: updateError } = await getSupabase().auth.updateUser({ email: clean });
      if (updateError) {
        setError(friendlyError(updateError.message));
      } else {
        setNotice(
          `Confirmation sent to ${clean} — click the link there to finish changing your email.`
        );
        setEditing(false);
        setDraft('');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={sectionClass}>
      <h2 className={sectionTitleClass}>Email</h2>
      {editing ? (
        <div>
          <input
            className={inputClass}
            type="email"
            value={draft}
            placeholder={currentEmail}
            autoComplete="email"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            onChange={(e) => {
              setDraft(e.target.value);
              setError(null);
              setNotice(null);
            }}
          />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="cursor-pointer rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {busy ? 'Sending…' : 'Save'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setEditing(false);
                setError(null);
                setDraft('');
              }}
              className="cursor-pointer rounded border border-gray-300 px-4 py-2 text-sm disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4">
          <span className="truncate text-sm">{currentEmail || '…'}</span>
          <button
            type="button"
            onClick={() => {
              setDraft('');
              setError(null);
              setNotice(null);
              setEditing(true);
            }}
            className="cursor-pointer shrink-0 rounded border border-gray-300 px-4 py-2 text-sm"
          >
            Change
          </button>
        </div>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {notice && <p className="mt-3 text-sm text-green-700">{notice}</p>}
    </section>
  );
}

function BirthdaySection() {
  const { profile, refreshProfile, session } = useCloudAuth();
  // Uncontrolled input: a controlled type="date" reports "" for incomplete
  // input, so writing e.target.value back into state wipes what the user is
  // typing (only the picker/picker arrows ever worked). Read via ref on save.
  const dateRef = useRef<HTMLInputElement>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Seed the form from the profile once it's loaded.
  useEffect(() => {
    if (initialized || !profile) return;
    setIsPublic(profile.birthday_public ?? false);
    setEmailOptIn(profile.birthday_email_opt_in ?? true);
    setInitialized(true);
  }, [profile, initialized]);

  const save = async () => {
    setError(null);
    setNotice(null);
    const clean = (dateRef.current?.value ?? '').trim();
    if (clean && !getMonthDay(clean)) {
      setError('Pick a valid date.');
      return;
    }
    setBusy(true);
    try {
      const err = await updateBirthdaySettings({
        birthday: clean || null,
        birthday_public: isPublic,
        birthday_email_opt_in: emailOptIn,
      });
      if (err) {
        setError(err);
      } else {
        setNotice('Birthday saved.');
        await refreshProfile();
      }
    } finally {
      setBusy(false);
    }
  };

  const toggleClass =
    'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors';

  return (
    <section className={sectionClass}>
      <h2 className={sectionTitleClass}>Birthday</h2>
      <p className="mb-3 text-sm text-gray-600">
        We will build you a birthday tape — every show your favorite bands played on your
        birthday. 🎂
      </p>
      <label className="flex flex-col gap-1 text-sm">
        Your birthday
        {initialized ? (
          <input
            type="date"
            ref={dateRef}
            className={inputClass}
            defaultValue={profile?.birthday ?? ''}
            max="2026-12-31"
            onChange={() => {
              setError(null);
              setNotice(null);
            }}
          />
        ) : (
          <input type="date" className={inputClass} value="" disabled aria-label="Your birthday" />
        )}
      </label>
      <div className="mt-4 flex flex-col gap-3">
        <label className="flex cursor-pointer items-center justify-between gap-4 text-sm">
          <span>
            Show on my profile
            <span className="block text-xs text-gray-500">
              Others see &ldquo;🎂 {formatBirthdayMonthDay(profile?.birthday) ?? 'January 26'}&rdquo;
              on your page. Off by default.
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={isPublic}
            onClick={() => setIsPublic((v) => !v)}
            className={`${toggleClass} ${isPublic ? 'bg-black' : 'bg-gray-300'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isPublic ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </label>
        <label className="flex cursor-pointer items-center justify-between gap-4 text-sm">
          <span>
            Email me on my birthday
            <span className="block text-xs text-gray-500">
              A birthday note from The Lot on the day.
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={emailOptIn}
            onClick={() => setEmailOptIn((v) => !v)}
            className={`${toggleClass} ${emailOptIn ? 'bg-black' : 'bg-gray-300'}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                emailOptIn ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </label>
      </div>
      <div className="mt-4">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="cursor-pointer rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save birthday'}
        </button>
      </div>
      {profile?.birthday && session?.user && (
        <p className="mt-3 text-sm">
          <Link href="/birthday-tape" className="underline">
            View your birthday tape →
          </Link>
        </p>
      )}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {notice && <p className="mt-3 text-sm text-green-700">{notice}</p>}
    </section>
  );
}


/** Auto-generated placeholder usernames look like user_3e64439e. */
function isAutoUsername(username: string | null | undefined): boolean {
  return !!username && /^user_[0-9a-f]{8}$/.test(username);
}

/**
 * Shown at the top of account settings when the user still has an
 * auto-generated username (e.g. after Apple/Google sign-in, which has no
 * username step). Prompts them to claim a real one.
 */
function PickUsernameBanner() {
  const { profile, updateUsername } = useCloudAuth();
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const auto = isAutoUsername(profile?.username);
  if (!auto) return null;

  const save = async () => {
    setError(null);
    const clean = normalizeUsername(draft);
    if (clean.length < 3) {
      setError('Username needs at least 3 characters (letters, numbers, _).');
      return;
    }
    setBusy(true);
    try {
      const { error: updateError } = await updateUsername(draft);
      if (updateError) setError(friendlyError(updateError));
      else setSaved(true);
    } finally {
      setBusy(false);
    }
  };

  if (saved) return null;

  return (
    <div className="mb-4 rounded-xl border-2 border-orange-400 bg-orange-50 p-5">
      <h2 className="text-base font-bold">Pick your username</h2>
      <p className="mt-1 text-sm text-gray-600">
        You&apos;re currently <span className="font-mono">@{profile?.username}</span> — claim
        a real one before someone else grabs it.
      </p>
      <div className="mt-3 flex max-w-sm gap-2">
        <input
          className={inputClass}
          value={draft}
          maxLength={20}
          autoComplete="off"
          spellCheck={false}
          placeholder="yourname"
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="shrink-0 cursor-pointer rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Claim'}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <p className="mt-2 text-xs text-gray-500">3–20 characters: lowercase letters, numbers, _ only.</p>
    </div>
  );
}


interface IdentityRow {
  id: string;
  provider: string;
  identity_data?: { email?: string } | null;
}

/**
 * Login methods: connect/disconnect Google + Apple, and add an email
 * password to an OAuth-created account. Any connected method opens the
 * same account. The last remaining method can't be removed.
 */
function LoginMethodsSection() {
  const { session } = useCloudAuth();
  const [identities, setIdentities] = useState<IdentityRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = async () => {
    setLoadError(null);
    try {
      const { data, error } = await getSupabase().auth.getUserIdentities();
      if (error) setLoadError(friendlyError(error.message));
      else if (data) setIdentities(data.identities as IdentityRow[]);
      else setLoadError('Could not load your login methods.');
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load your login methods.');
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const user = session?.user ?? null;
  const providers = (user?.app_metadata?.providers as string[] | undefined) ?? [];
  const hasPassword = providers.includes('email');
  const google = identities?.find((i) => i.provider === 'google');
  const apple = identities?.find((i) => i.provider === 'apple');
  const isLastMethod = (identities?.length ?? 0) <= 1;

  const linkProvider = async (provider: 'google' | 'apple') => {
    setError(null);
    setNotice(null);
    setBusy(`link:${provider}`);
    try {
      // On success the browser leaves for the provider; /auth/callback
      // exchanges the code and lands back on this page.
      const { error } = await getSupabase().auth.linkIdentity({
        provider,
        options: { redirectTo: 'https://relisten-web.vercel.app/auth/callback' },
      });
      if (error) {
        setError(friendlyError(error.message));
        setBusy(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start connecting.');
      setBusy(null);
    }
  };

  const unlinkProvider = async (identity: IdentityRow) => {
    if (isLastMethod) return;
    setError(null);
    setNotice(null);
    setBusy(`unlink:${identity.id}`);
    try {
      const { error } = await getSupabase().auth.unlinkIdentity(identity as never);
      if (error) {
        setError(friendlyError(error.message));
      } else {
        setNotice('Disconnected.');
        await refresh();
      }
    } finally {
      setBusy(null);
    }
  };

  const sendPasswordSetup = async () => {
    const email = user?.email;
    if (!email) return;
    setError(null);
    setNotice(null);
    setBusy('password');
    try {
      const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
        redirectTo: 'https://relisten-web.vercel.app/reset-password',
      });
      if (error) setError(friendlyError(error.message));
      else setNotice(`We sent a setup link to ${email}.`);
    } finally {
      setBusy(null);
    }
  };

  const row = (
    label: string,
    status: string,
    action: ReactNode
  ) => (
    <div className="flex items-center justify-between gap-4 border-b border-gray-100 py-3 last:border-0">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        <div className="truncate text-xs text-gray-500">{status}</div>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );

  const connectBtn = (provider: 'google' | 'apple') => (
    <button
      type="button"
      disabled={busy !== null}
      onClick={() => void linkProvider(provider)}
      className="cursor-pointer rounded border border-gray-300 px-4 py-2 text-sm disabled:opacity-50"
    >
      {busy === `link:${provider}` ? 'Connecting…' : 'Connect'}
    </button>
  );

  const disconnectBtn = (identity: IdentityRow) => (
    <button
      type="button"
      disabled={busy !== null || isLastMethod}
      title={isLastMethod ? "Can't remove your last sign-in method" : 'Disconnect'}
      onClick={() => void unlinkProvider(identity)}
      className="cursor-pointer rounded border border-gray-300 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
    >
      {busy === `unlink:${identity.id}` ? 'Working…' : 'Disconnect'}
    </button>
  );

  return (
    <section className={sectionClass}>
      <h2 className={sectionTitleClass}>Login methods</h2>
      <p className="mb-2 text-sm text-gray-600">
        Connect more ways to sign in — every method opens this same account.
      </p>
      {loadError ? (
        <div className="py-2">
          <p className="text-sm text-red-600">{loadError}</p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-2 cursor-pointer rounded border border-gray-300 px-4 py-2 text-sm"
          >
            Try again
          </button>
        </div>
      ) : identities === null ? (
        <p className="py-2 text-sm text-gray-500">Loading…</p>
      ) : (
        <div>
          {row(
            'Google',
            google ? `Connected as ${google.identity_data?.email ?? 'your Google account'}` : 'Not connected',
            google ? disconnectBtn(google) : connectBtn('google')
          )}
          {row(
            'Apple',
            apple ? `Connected as ${apple.identity_data?.email ?? 'your Apple account'}` : 'Not connected',
            apple ? disconnectBtn(apple) : connectBtn('apple')
          )}
          {row(
            'Email + password',
            hasPassword ? `Password set for ${user?.email ?? 'your email'}` : 'No password set',
            hasPassword ? (
              <span className="text-xs text-gray-400">Change it below ↓</span>
            ) : (
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => void sendPasswordSetup()}
                className="cursor-pointer rounded border border-gray-300 px-4 py-2 text-sm disabled:opacity-50"
              >
                {busy === 'password' ? 'Sending…' : 'Email me a setup link'}
              </button>
            )
          )}
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {notice && <p className="mt-2 text-sm text-green-700">{notice}</p>}
    </section>
  );
}

function SettingsMenu() {
  const { signOut } = useCloudAuth();

  return (
    <div className="flex max-w-xl flex-col gap-4">
      <AvatarSection />
      <UsernameSection />
      <EmailSection />
      <LoginMethodsSection />
      <BirthdaySection />

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>Password</h2>
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm text-gray-600">Change your password via a secure email link.</span>
          <Link
            href="/reset-password"
            className="shrink-0 rounded border border-gray-300 px-4 py-2 text-sm"
          >
            Change
          </Link>
        </div>
      </section>

      <section className={sectionClass}>
        <h2 className={sectionTitleClass}>Favorites</h2>
        <Link href="/favorites" className="text-sm underline">
          View your favorites →
        </Link>
      </section>

      <div>
        <button
          type="button"
          className="cursor-pointer rounded border border-gray-300 bg-white px-4 py-2 text-sm"
          onClick={() => void signOut()}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

export default function AccountPage() {
  const { status, signIn, signUp } = useCloudAuth();
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
        <h1 className="mb-6">Account settings</h1>
        <PickUsernameBanner />
        <SettingsMenu />
      </div>
    );
  }

  const oauth = async (provider: 'google' | 'apple') => {
    setError(null);
    setBusy(true);
    try {
      // On success the browser leaves for the provider; on error we stay here.
      const { error: oauthError } = await getSupabase().auth.signInWithOAuth({
        provider,
        options: { redirectTo: 'https://relisten-web.vercel.app/auth/callback' },
      });
      if (oauthError) setError(friendlyError(oauthError.message));
    } finally {
      setBusy(false);
    }
  };

  const sendReset = async () => {    setError(null);
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

  const submit = async (e: FormEvent) => {
    e.preventDefault();
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
      <h1 className="mb-4">{mode === 'signup' ? 'First time in the lot?' : 'Welcome back to the lot'}</h1>
      <p className="text-sm text-gray-600">
        One account for The Lot everywhere — your username and favorites follow you between the
        app and this site.
      </p>

      <div className="mt-4 flex max-w-sm flex-col gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void oauth('google')}
          className="flex cursor-pointer items-center justify-center gap-2 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium disabled:opacity-50"
        >
          <span className="text-base font-bold text-[#4285f4]">G</span>
          Continue with Google
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void oauth('apple')}
          className="flex cursor-pointer items-center justify-center gap-2 rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          <span className="text-base"></span>
          Continue with Apple
        </button>
        <div className="my-1 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-500">or continue with email</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>
      </div>

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
