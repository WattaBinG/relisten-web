'use client';

import { useFollow } from '@/lib/cloud/community';
import { useCloudAuth } from '@/lib/cloud/auth';

/** Follow/Unfollow button for a user's profile. Hidden on own profile / when logged out. */
export default function FollowButton({ userId }: { userId: string }) {
  const { status } = useCloudAuth();
  const { following, toggle, isSelf, counts } = useFollow(userId);

  if (status !== 'authed' || isSelf) return null;

  return (
    <button
      onClick={toggle}
      className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium ${
        following
          ? 'border border-gray-300 text-gray-700 hover:border-gray-400'
          : 'bg-black text-white hover:bg-gray-800'
      }`}
    >
      {following ? 'Following' : 'Follow'}
    </button>
  );
}

/** Follower/following counts. */
export function FollowCounts({ userId }: { userId: string }) {
  const { counts } = useFollow(userId);
  return (
    <div className="flex gap-4 text-sm text-gray-600">
      <span>
        <strong className="text-black">{counts.followers}</strong> followers
      </span>
      <span>
        <strong className="text-black">{counts.following}</strong> following
      </span>
    </div>
  );
}
