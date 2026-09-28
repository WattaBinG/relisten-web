'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getSupabase, isCloudEnabled } from '@/lib/cloud/supabase';

/**
 * OAuth landing page: Apple/Google redirect here with a `code` query param.
 * Exchanges it for a session (the auth context picks it up automatically),
 * then sends the user to their account page — first-time OAuth sign-ins land
 * with an auto-generated username and get prompted to pick a real one there.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const oauthError =
        url.searchParams.get('error_description') ?? url.searchParams.get('error');
      if (oauthError) {
        setError(oauthError);
        return;
      }
      if (code && isCloudEnabled) {
        const { error: exchangeError } = await getSupabase().auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setError(exchangeError.message);
          return;
        }
      }
      router.replace('/account');
    })();
  }, [router]);

  return (
    <div className="content">
      <h1 className="mb-4">{error ? 'Sign-in failed' : 'Signing you in…'}</h1>
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <p className="text-sm text-gray-600">One moment while we finish signing you in.</p>
      )}
    </div>
  );
}
