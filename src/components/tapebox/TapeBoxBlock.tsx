'use client';

import Link from 'next/link';
import { useCloudAuth } from '@/lib/cloud/auth';
import { useTapeBox } from '@/lib/cloud/tapebox';

export default function TapeBoxBlock({
  showUuid,
  artistSlug,
  artistName,
  showDate,
  venueName,
}: {
  showUuid: string;
  artistSlug: string;
  artistName: string;
  showDate: string; // YYYY-MM-DD
  venueName?: string | null;
}) {
  const { status } = useCloudAuth();
  const { count, inBox, toggle } = useTapeBox(showUuid);

  const meta = { artist_slug: artistSlug, artist_name: artistName, show_date: showDate, venue_name: venueName ?? null };

  return (
    <div>
      <div className="flex items-center gap-3">
        {status === 'authed' ? (
          <button
            onClick={() => toggle(meta)}
            className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium ${
              inBox
                ? 'bg-amber-700 text-white hover:bg-amber-800'
                : 'bg-black text-white hover:bg-gray-800'
            }`}
          >
            {inBox ? '✓ In your tape box' : '📼 Add to tape box'}
          </button>
        ) : (
          <Link
            href="/account"
            className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Sign in to dub this tape
          </Link>
        )}
        <span className="text-sm text-gray-600">
          {count === 0
            ? 'No dubs yet'
            : `In ${count} ${count === 1 ? 'tape box' : 'tape boxes'}`}
        </span>
      </div>
    </div>
  );
}
