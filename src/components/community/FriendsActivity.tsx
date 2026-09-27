'use client';

import Link from 'next/link';
import { useCloudAuth } from '@/lib/cloud/auth';
import {
  useFriendsActivity,
  useRecentReviewers,
  type ActivityItem,
} from '@/lib/cloud/community';
import UserLink from './UserLink';
import Stars from './Stars';
import { ShowName, TapeName } from './ShowName';

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - +new Date(iso)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function ActivityRow({ item }: { item: ActivityItem }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-gray-100 p-3">
      <UserLink profile={item.profile} size={32} />
      <div className="min-w-0 flex-1 text-sm">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">@{item.profile?.username ?? 'a fan'}</span>
          <span className="shrink-0 text-xs text-gray-400">{timeAgo(item.created_at)}</span>
        </div>
        {item.kind === 'checkin' && (
          <p className="text-gray-600">
            was at <ShowName showUuid={item.show_uuid} showVenue className="font-medium hover:underline" />
          </p>
        )}
        {item.kind === 'review' && (
          <p className="truncate text-gray-600">
            reviewed <ShowName showUuid={item.show_uuid} className="font-medium hover:underline" />
            : “{item.body?.slice(0, 80)}
            {(item.body?.length ?? 0) > 80 ? '…' : ''}”
          </p>
        )}
        {item.kind === 'rating' && (
          <p className="flex items-center gap-2 text-gray-600">
            rated <TapeName showUuid={item.show_uuid} sourceUuid={item.source_uuid} className="font-medium hover:underline" />{' '}
            <Stars value={item.rating ?? 0} size={14} />
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Friends activity for signed-in users. Shows recent activity from followed
 * users, or a "find people" prompt when following no one.
 */
export default function FriendsActivity() {
  const { status } = useCloudAuth();
  const { items, loading, followingCount } = useFriendsActivity(10);
  const recentReviewers = useRecentReviewers(6);

  if (status !== 'authed') return null;

  return (
    <section>
      <h2 className="mb-4 text-xl font-bold">From people you follow</h2>
      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : followingCount === 0 ? (
        <div className="rounded-xl bg-gray-50 p-6">
          <p className="mb-3 text-sm text-gray-600">
            You're not following anyone yet. Find fellow fans writing reviews:
          </p>
          <div className="flex flex-wrap gap-3">
            {recentReviewers.map((p) => (
              <UserLink key={p.id} profile={p} size={30} />
            ))}
          </div>
          {recentReviewers.length === 0 && (
            <p className="text-sm text-gray-400">No reviewers yet — be the first.</p>
          )}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-gray-500">
          Nothing yet — the people you follow haven't shared anything recently.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item, i) => (
            <ActivityRow
              key={`${item.kind}-${item.user_id}-${item.created_at}-${i}`}
              item={item}
            />
          ))}
        </div>
      )}
      <p className="mt-3 text-xs text-gray-400">
        <Link href="/account" className="underline">
          Manage your profile
        </Link>{' '}
        to get followed back.
      </p>
    </section>
  );
}
