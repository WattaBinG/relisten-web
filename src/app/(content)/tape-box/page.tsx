'use client';

import Link from 'next/link';
import { useCloudAuth } from '@/lib/cloud/auth';
import { useUserTapes } from '@/lib/cloud/tapebox';
import TapeShelf from '@/components/tapebox/TapeShelf';

export default function TapeBoxPage() {
  const { status, session, profile } = useCloudAuth();
  const userId = session?.user?.id ?? null;
  const { tapes, loading } = useUserTapes(userId, 200);

  if (status === 'loading') {
    return (
      <div className="content">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  if (status !== 'authed') {
    return (
      <div className="content">
        <h1 className="mb-4 text-2xl font-bold">📼 Tape Box</h1>
        <p className="text-sm text-gray-600">
          <Link href="/account" className="underline">
            Sign in
          </Link>{' '}
          to start dubbing tapes into your box.
        </p>
      </div>
    );
  }

  const username = profile?.username ?? 'your';

  return (
    <div className="content">
      <h1 className="text-2xl font-bold">📼 {username}&rsquo;s Tape Box</h1>
      <p className="mt-1 mb-6 text-sm text-gray-600">
        {tapes.length === 0
          ? 'Empty shelf. Hit "Add to tape box" on any show page to dub your first tape.'
          : `${tapes.length} ${tapes.length === 1 ? 'tape' : 'tapes'} dubbed and counting.`}
      </p>
      {loading ? (
        <p className="text-sm text-gray-500">Digging through the crates…</p>
      ) : (
        <TapeShelf tapes={tapes} />
      )}
    </div>
  );
}
