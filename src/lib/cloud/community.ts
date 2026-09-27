import { useCallback, useEffect, useState } from 'react';
import { useCloudAuth } from './auth';
import { getSupabase, isCloudEnabled, type ProfileRow } from './supabase';

/** A profile joined onto community rows (may be null if profile missing). */
export interface CommunityProfile {
  id: string;
  username: string;
  avatar_url: string | null;
}

export interface Checkin {
  id: string;
  user_id: string;
  show_uuid: string;
  created_at: string;
  profile: CommunityProfile | null;
}

export interface Review {
  id: string;
  user_id: string;
  show_uuid: string;
  body: string;
  created_at: string;
  profile: CommunityProfile | null;
}

export interface SourceRatingSummary {
  avg: number;
  count: number;
  userRating: number | null;
}

const toCommunityProfile = (p: ProfileRow | null | undefined): CommunityProfile | null =>
  p ? { id: p.id, username: p.username, avatar_url: p.avatar_url } : null;

/** Fetch profiles for a list of user ids (single query). */
async function fetchProfiles(userIds: string[]): Promise<Map<string, CommunityProfile>> {
  const map = new Map<string, CommunityProfile>();
  const unique = [...new Set(userIds)].filter(Boolean);
  if (unique.length === 0 || !isCloudEnabled) return map;
  const { data } = await getSupabase()
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', unique);
  for (const p of data ?? []) {
    map.set(p.id, { id: p.id, username: p.username, avatar_url: p.avatar_url });
  }
  return map;
}

// ---------------------------------------------------------------------------
// Check-ins ("I was there")
// ---------------------------------------------------------------------------

export function useCheckins(showUuid: string | null | undefined) {
  const { session } = useCloudAuth();
  const userId = session?.user?.id ?? null;
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!showUuid || !isCloudEnabled) {
      setCheckins([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await getSupabase()
      .from('show_checkins')
      .select('id, user_id, show_uuid, created_at')
      .eq('show_uuid', showUuid)
      .order('created_at', { ascending: true });
    const rows = data ?? [];
    const profiles = await fetchProfiles(rows.map((r) => r.user_id));
    setCheckins(
      rows.map((r) => ({ ...r, profile: profiles.get(r.user_id) ?? null }))
    );
    setLoading(false);
  }, [showUuid]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const checkedIn = userId ? checkins.some((c) => c.user_id === userId) : false;

  const toggle = useCallback(async () => {
    if (!showUuid || !userId || !isCloudEnabled) return;
    if (checkedIn) {
      await getSupabase()
        .from('show_checkins')
        .delete()
        .eq('show_uuid', showUuid)
        .eq('user_id', userId);
    } else {
      await getSupabase()
        .from('show_checkins')
        .insert({ show_uuid: showUuid, user_id: userId });
    }
    refresh();
  }, [showUuid, userId, checkedIn, refresh]);

  return { checkins, count: checkins.length, checkedIn, toggle, loading, refresh };
}

// ---------------------------------------------------------------------------
// Reviews (phish.net-style fan reviews)
// ---------------------------------------------------------------------------

export function useReviews(showUuid: string | null | undefined) {
  const { session } = useCloudAuth();
  const userId = session?.user?.id ?? null;
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!showUuid || !isCloudEnabled) {
      setReviews([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await getSupabase()
      .from('show_comments')
      .select('id, user_id, show_uuid, body, created_at')
      .eq('show_uuid', showUuid)
      .order('created_at', { ascending: false });
    const rows = data ?? [];
    const profiles = await fetchProfiles(rows.map((r) => r.user_id));
    setReviews(rows.map((r) => ({ ...r, profile: profiles.get(r.user_id) ?? null })));
    setLoading(false);
  }, [showUuid]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const post = useCallback(
    async (body: string): Promise<{ error?: string }> => {
      if (!showUuid || !userId || !isCloudEnabled) return { error: 'Sign in to write a review.' };
      const trimmed = body.trim();
      if (!trimmed) return { error: 'Write something first.' };
      if (trimmed.length > 2000) return { error: 'Keep it under 2000 characters.' };
      const { error } = await getSupabase()
        .from('show_comments')
        .insert({ show_uuid: showUuid, user_id: userId, body: trimmed });
      if (error) return { error: error.message };
      refresh();
      return {};
    },
    [showUuid, userId, refresh]
  );

  const remove = useCallback(
    async (id: string) => {
      if (!userId || !isCloudEnabled) return;
      await getSupabase().from('show_comments').delete().eq('id', id).eq('user_id', userId);
      refresh();
    },
    [userId, refresh]
  );

  return { reviews, count: reviews.length, post, remove, loading, refresh };
}

// ---------------------------------------------------------------------------
// Tape/source ratings
// ---------------------------------------------------------------------------

export function useSourceRatings(sourceUuids: string[]) {
  const { session } = useCloudAuth();
  const userId = session?.user?.id ?? null;
  const [summaries, setSummaries] = useState<Record<string, SourceRatingSummary>>({});
  const key = sourceUuids.slice().sort().join(',');

  const refresh = useCallback(async () => {
    if (sourceUuids.length === 0 || !isCloudEnabled) {
      setSummaries({});
      return;
    }
    const { data } = await getSupabase()
      .from('source_ratings')
      .select('source_uuid, rating, user_id')
      .in('source_uuid', sourceUuids);
    const by: Record<string, { total: number; count: number; userRating: number | null }> = {};
    for (const r of data ?? []) {
      const s = (by[r.source_uuid] ??= { total: 0, count: 0, userRating: null });
      s.total += r.rating;
      s.count += 1;
      if (r.user_id === userId) s.userRating = r.rating;
    }
    const out: Record<string, SourceRatingSummary> = {};
    for (const [uuid, s] of Object.entries(by)) {
      out[uuid] = { avg: s.count ? s.total / s.count : 0, count: s.count, userRating: s.userRating };
    }
    setSummaries(out);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    refresh();
  }, [refresh]);

  const rate = useCallback(
    async (sourceUuid: string, rating: number) => {
      if (!userId || !isCloudEnabled) return;
      await getSupabase()
        .from('source_ratings')
        .upsert(
          { source_uuid: sourceUuid, user_id: userId, rating, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,source_uuid' }
        );
      refresh();
    },
    [userId, refresh]
  );

  return { summaries, rate, refresh };
}

// ---------------------------------------------------------------------------
// Follows
// ---------------------------------------------------------------------------

export function useFollow(targetUserId: string | null | undefined) {
  const { session } = useCloudAuth();
  const userId = session?.user?.id ?? null;
  const [following, setFollowing] = useState(false);
  const [counts, setCounts] = useState({ followers: 0, following: 0 });

  const refresh = useCallback(async () => {
    if (!targetUserId || !isCloudEnabled) return;
    const [{ count: followers }, { count: followingCount }, mine] = await Promise.all([
      getSupabase()
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', targetUserId),
      getSupabase()
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', targetUserId),
      userId
        ? getSupabase()
            .from('follows')
            .select('follower_id')
            .eq('follower_id', userId)
            .eq('following_id', targetUserId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    setCounts({ followers: followers ?? 0, following: followingCount ?? 0 });
    setFollowing(!!mine.data);
  }, [targetUserId, userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggle = useCallback(async () => {
    if (!targetUserId || !userId || !isCloudEnabled || targetUserId === userId) return;
    if (following) {
      await getSupabase()
        .from('follows')
        .delete()
        .eq('follower_id', userId)
        .eq('following_id', targetUserId);
    } else {
      await getSupabase()
        .from('follows')
        .insert({ follower_id: userId, following_id: targetUserId });
    }
    refresh();
  }, [targetUserId, userId, following, refresh]);

  return { following, counts, toggle, isSelf: !!userId && userId === targetUserId };
}

/** User ids the current user follows. */
export function useFollowingIds() {
  const { session } = useCloudAuth();
  const userId = session?.user?.id ?? null;
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    if (!userId || !isCloudEnabled) {
      setIds([]);
      return;
    }
    getSupabase()
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)
      .then(({ data }) => setIds((data ?? []).map((r) => r.following_id)));
  }, [userId]);

  return ids;
}

// ---------------------------------------------------------------------------
// Profiles
// ---------------------------------------------------------------------------

export function useProfileByUsername(username: string | null | undefined) {
  const [profile, setProfile] = useState<CommunityProfile | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!username || !isCloudEnabled) {
      setProfile(null);
      return;
    }
    setNotFound(false);
    getSupabase()
      .from('profiles')
      .select('id, username, avatar_url')
      .ilike('username', username)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setProfile({ id: data.id, username: data.username, avatar_url: data.avatar_url });
        else setNotFound(true);
      });
  }, [username]);

  return { profile, notFound };
}

/** Recent check-ins for a user, newest first. */
export function useUserCheckins(userId: string | null | undefined, limit = 10) {
  const [rows, setRows] = useState<{ show_uuid: string; created_at: string }[]>([]);
  useEffect(() => {
    if (!userId || !isCloudEnabled) {
      setRows([]);
      return;
    }
    getSupabase()
      .from('show_checkins')
      .select('show_uuid, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
      .then(({ data }) => setRows(data ?? []));
  }, [userId, limit]);
  return rows;
}

/** Count of check-ins for a user. */
export function useUserCheckinCount(userId: string | null | undefined) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!userId || !isCloudEnabled) return;
    getSupabase()
      .from('show_checkins')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .then(({ count }) => setCount(count ?? 0));
  }, [userId]);
  return count;
}

/** Top-rated sources for a user (rating 4-5, newest first). */
export function useUserTopRatings(userId: string | null | undefined, limit = 5) {
  const [rows, setRows] = useState<{ source_uuid: string; rating: number }[]>([]);
  useEffect(() => {
    if (!userId || !isCloudEnabled) {
      setRows([]);
      return;
    }
    getSupabase()
      .from('source_ratings')
      .select('source_uuid, rating')
      .eq('user_id', userId)
      .gte('rating', 4)
      .order('updated_at', { ascending: false })
      .limit(limit)
      .then(({ data }) => setRows(data ?? []));
  }, [userId, limit]);
  return rows;
}

// ---------------------------------------------------------------------------
// Friends activity feed
// ---------------------------------------------------------------------------

export interface ActivityItem {
  kind: 'checkin' | 'review' | 'rating';
  created_at: string;
  user_id: string;
  show_uuid?: string;
  source_uuid?: string;
  rating?: number;
  body?: string;
  profile: CommunityProfile | null;
}

export function useFriendsActivity(limit = 20) {
  const followingIds = useFollowingIds();
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (followingIds.length === 0 || !isCloudEnabled) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const [checkins, reviews, ratings] = await Promise.all([
        getSupabase()
          .from('show_checkins')
          .select('user_id, show_uuid, created_at')
          .in('user_id', followingIds)
          .order('created_at', { ascending: false })
          .limit(limit),
        getSupabase()
          .from('show_comments')
          .select('user_id, show_uuid, body, created_at')
          .in('user_id', followingIds)
          .order('created_at', { ascending: false })
          .limit(limit),
        getSupabase()
          .from('source_ratings')
          .select('user_id, source_uuid, rating, updated_at')
          .in('user_id', followingIds)
          .order('updated_at', { ascending: false })
          .limit(limit),
      ]);
      const all: ActivityItem[] = [
        ...(checkins.data ?? []).map((r) => ({
          kind: 'checkin' as const,
          created_at: r.created_at,
          user_id: r.user_id,
          show_uuid: r.show_uuid,
          profile: null,
        })),
        ...(reviews.data ?? []).map((r) => ({
          kind: 'review' as const,
          created_at: r.created_at,
          user_id: r.user_id,
          show_uuid: r.show_uuid,
          body: r.body,
          profile: null,
        })),
        ...(ratings.data ?? []).map((r) => ({
          kind: 'rating' as const,
          created_at: r.updated_at,
          user_id: r.user_id,
          source_uuid: r.source_uuid,
          rating: r.rating,
          profile: null,
        })),
      ];
      const profiles = await fetchProfiles(all.map((a) => a.user_id));
      for (const a of all) a.profile = profiles.get(a.user_id) ?? null;
      all.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
      setItems(all.slice(0, limit));
      setLoading(false);
    })();
  }, [followingIds.join(','), limit]); // eslint-disable-line react-hooks/exhaustive-deps

  return { items, loading, followingCount: followingIds.length };
}

/** Recent reviewers across the site — for the "find people" prompt. */
export function useRecentReviewers(limit = 8) {
  const [people, setPeople] = useState<CommunityProfile[]>([]);
  useEffect(() => {
    if (!isCloudEnabled) return;
    (async () => {
      const { data } = await getSupabase()
        .from('show_comments')
        .select('user_id')
        .order('created_at', { ascending: false })
        .limit(50);
      const ids = [...new Set((data ?? []).map((r) => r.user_id))].slice(0, limit);
      const profiles = await fetchProfiles(ids);
      setPeople(ids.map((id) => profiles.get(id)).filter(Boolean) as CommunityProfile[]);
    })();
  }, [limit]);
  return people;
}

export { toCommunityProfile };
