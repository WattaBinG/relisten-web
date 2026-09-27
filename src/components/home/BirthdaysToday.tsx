import Link from 'next/link';
import Avatar from '@/components/community/Avatar';
import { getSupabase, isCloudEnabled, type ProfileRow } from '@/lib/cloud/supabase';
import type { CommunityProfile } from '@/lib/cloud/community';

/** Profiles with birthday_public=true whose birthday falls on today's month/day. */
async function getTodaysBirthdays(): Promise<CommunityProfile[]> {
  if (!isCloudEnabled) return [];
  // "Today" in the Lot's timezone (Eastern) — Vercel servers run UTC.
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date());
  const month = Number(parts.find((p) => p.type === 'month')?.value);
  const day = Number(parts.find((p) => p.type === 'day')?.value);
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('id, username, avatar_url, birthday')
    .eq('birthday_public', true)
    .not('birthday', 'is', null);
  if (error || !data) return [];
  return (data as Pick<ProfileRow, 'id' | 'username' | 'avatar_url' | 'birthday'>[])
    .filter((row) => {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(row.birthday ?? '');
      return m !== null && Number(m[2]) === month && Number(m[3]) === day;
    })
    .map((row) => ({ id: row.id, username: row.username, avatar_url: row.avatar_url }));
}

/**
 * Homepage section celebrating users whose public birthday is today.
 * Renders nothing unless at least one birthday_public user has a birthday today.
 * Server-rendered so raw birthdates never reach the browser — only today's
 * celebrants end up in the HTML.
 */
export default async function BirthdaysToday() {
  const celebrants = await getTodaysBirthdays();
  if (!celebrants.length) return null;

  return (
    <section aria-label="Birthdays today">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-xl font-bold tracking-tight">🎂 Birthdays today</h2>
        <span className="text-xs text-foreground-muted">wish them well</span>
      </div>
      <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
        {celebrants.map((c) => (
          <Link
            key={c.id}
            href={`/user/${encodeURIComponent(c.username)}`}
            prefetch={false}
            className="group flex w-40 shrink-0 flex-col items-center rounded-xl bg-white p-4 text-center transition hover:bg-gray-50 hover:shadow-md"
          >
            <Avatar profile={c} size={64} />
            <div className="mt-3 w-full truncate text-sm font-semibold group-hover:underline">
              @{c.username}
            </div>
            <div className="mt-0.5 text-xs text-foreground-muted">Happy birthday! 🎉</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
