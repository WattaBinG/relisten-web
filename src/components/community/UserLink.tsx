'use client';

import Link from 'next/link';
import type { CommunityProfile } from '@/lib/cloud/community';
import Avatar from './Avatar';

/** Username (with avatar) linking to their public profile. */
export default function UserLink({
  profile,
  size = 28,
}: {
  profile: CommunityProfile | null;
  size?: number;
}) {
  if (!profile) return <span className="text-gray-500">a fan</span>;
  return (
    <Link
      href={`/user/${encodeURIComponent(profile.username)}`}
      className="inline-flex items-center gap-2 hover:underline"
    >
      <Avatar profile={profile} size={size} />
      <span className="font-medium">@{profile.username}</span>
    </Link>
  );
}
