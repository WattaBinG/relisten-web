'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCloudAuth } from '@/lib/cloud/auth';
import { visibleBirthday } from '@/lib/cloud/birthday';
import { getSupabase, isCloudEnabled } from '@/lib/cloud/supabase';
import {
  useProfileByUsername,
  useUserCheckins,
  useUserCheckinCount,
  useUserTopRatings,
  useFollow,
} from '@/lib/cloud/community';
import { useUserTapes, useUserTapeCount } from '@/lib/cloud/tapebox';
import Avatar from '@/components/community/Avatar';
import FollowButton, { FollowCounts } from '@/components/community/FollowButton';
import Stars from '@/components/community/Stars';
import { ShowName, TapeName } from '@/components/community/ShowName';
import TapeShelf from '@/components/tapebox/TapeShelf';

export default function UserProfilePage() {
  const params = useParams();
  const username = typeof params.username === 'string' ? decodeURIComponent(params.username) : null;
  const { profile, notFound } = useProfileByUsername(username);
  const checkinCount = useUserCheckinCount(profile?.id);
  const checkins = useUserCheckins(profile?.id, 10);
  const topRatings = useUserTopRatings(profile?.id, 5);
  const tapeCount = useUserTapeCount(profile?.id);
  const { tapes } = useUserTapes(profile?.id, 24);
  const { counts } = useFollow(profile?.id);

  // Birthday (month/day) — only shown to the owner or when public.
  const { session } = useCloudAuth();
  const [birthdayLabel, setBirthdayLabel] = useState<string | null>(null);
  useEffect(() => {
    if (!profile?.id || !isCloudEnabled) {
      setBirthdayLabel(null);
      return;
    }
    let cancelled = false;
    getSupabase()
      .from('profiles')
      .select('id, birthday, birthday_public')
      .eq('id', profile.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setBirthdayLabel(
          visibleBirthday(session?.user?.id ?? null, {
            id: data.id as string,
            birthday: data.birthday as string | null,
            birthday_public: data.birthday_public as boolean,
          })
        );
      });
    return () => {
      cancelled = true;
    };
  }, [profile?.id, session?.user?.id]);

  if (notFound) {
    return (
      <div className="content">
        <h1 className="mb-4">User not found</h1>
        <p className="text-sm text-gray-600">
          No one goes by @{username} yet.{' '}
          <Link href="/" className="underline">
            Back home
          </Link>
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="content">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="content">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar profile={profile} size={72} />
          <div>
            <h1 className="text-2xl font-bold">@{profile.username}</h1>
            {birthdayLabel && <p className="mt-1 text-sm text-gray-600">🎂 {birthdayLabel}</p>}
            <div className="mt-1">
              <FollowCounts userId={profile.id} />
            </div>
          </div>
        </div>
        <FollowButton userId={profile.id} />
      </div>

      <div className="mt-6 flex gap-6 text-sm">
        <span>
          <strong>{checkinCount}</strong> <span className="text-gray-600">shows attended</span>
        </span>
        <span>
          <strong>{topRatings.length}</strong>{' '}
          <span className="text-gray-600">tapes loved</span>
        </span>
        <span>
          <strong>{tapeCount}</strong> <span className="text-gray-600">tapes dubbed</span>
        </span>
      </div>

      {tapes.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-base font-semibold">
            📼 Tape Box{' '}
            <span className="font-normal text-gray-500">({tapeCount})</span>
          </h2>
          <TapeShelf tapes={tapes} />
        </section>
      )}

      {checkins.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-base font-semibold">Was there</h2>
          <div className="flex flex-col gap-2">
            {checkins.map((c) => (
              <div key={c.show_uuid} className="text-sm">
                <span className="text-gray-500">
                  {new Date(c.created_at).toLocaleDateString()} — checked in at{' '}
                </span>
                <ShowName showUuid={c.show_uuid} showVenue className="font-medium hover:underline" />
              </div>
            ))}
          </div>
        </section>
      )}

      {topRatings.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-base font-semibold">Top-rated tapes</h2>
          <div className="flex flex-col gap-2">
            {topRatings.map((r) => (
              <div key={r.source_uuid} className="flex items-center gap-3 text-sm">
                <Stars value={r.rating} size={16} />
                <TapeName showUuid={r.show_uuid} sourceUuid={r.source_uuid} className="font-medium hover:underline" />
              </div>
            ))}
          </div>
        </section>
      )}

      {checkins.length === 0 && topRatings.length === 0 && (
        <p className="mt-8 text-sm text-gray-500">@{profile.username} hasn't shared anything yet.</p>
      )}
    </div>
  );
}
