'use client';

import Link from 'next/link';
import { useCloudAuth } from '@/lib/cloud/auth';
import { isCloudEnabled } from '@/lib/cloud/supabase';

/**
 * Header auth widget: "Sign in" when anonymous, the username + sign out
 * when signed in. Renders nothing when cloud isn't configured.
 */
export default function AuthButton() {
  const { status, profile, signOut } = useCloudAuth();

  if (!isCloudEnabled) return null;
  if (status === 'loading') return <span className="nav-btn opacity-40">…</span>;
  if (status === 'anon') {
    return (
      <Link className="nav-btn" href="/account" prefetch={false}>
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex h-full items-center gap-3">
      <Link className="nav-btn max-w-[120px] truncate" href="/favorites" prefetch={false}>
        {profile?.username ?? 'Account'}
      </Link>
      <button type="button" className="nav-btn cursor-pointer" onClick={() => void signOut()}>
        Sign out
      </button>
    </div>
  );
}
