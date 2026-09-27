'use client';

import Link from 'next/link';
import { useCloudAuth } from '@/lib/cloud/auth';
import { formatBirthdayMonthDay } from '@/lib/cloud/birthday';

/** Homepage banner: signed-in users with a birthday get a link to their tape. */
export default function BirthdayTapePromo() {
  const { status, profile } = useCloudAuth();
  if (status !== 'authed' || !profile?.birthday) return null;
  const label = formatBirthdayMonthDay(profile.birthday);

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
      <Link href="/birthday-tape" className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">🎂 Your Birthday Tape</h2>
          <p className="mt-1 text-sm text-gray-600">
            Every show your favorite bands played on {label ?? 'your birthday'} — pick your
            favorites and save them as a playlist.
          </p>
        </div>
        <span className="shrink-0 rounded bg-black px-4 py-2 text-sm font-medium text-white">
          Open it
        </span>
      </Link>
    </section>
  );
}
