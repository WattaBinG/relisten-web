import { useCallback, useEffect, useState } from 'react';
import { useCloudAuth } from './auth';
import { getSupabase, isCloudEnabled } from './supabase';

export interface Tape {
  id: string;
  user_id: string;
  show_uuid: string;
  artist_slug: string;
  artist_name: string;
  show_date: string; // YYYY-MM-DD
  venue_name: string | null;
  added_at: string;
}

export function tapeShowPath(t: Pick<Tape, 'artist_slug' | 'show_date'>): string {
  const [y, m, d] = t.show_date.split('-');
  return `/${t.artist_slug}/${y}/${m}/${d}`;
}

// ---------------------------------------------------------------------------
// Toggle state for one show (used on show pages)
// ---------------------------------------------------------------------------

export function useTapeBox(showUuid: string | null | undefined) {
  const { session } = useCloudAuth();
  const userId = session?.user?.id ?? null;
  const [count, setCount] = useState(0);
  const [inBox, setInBox] = useState(false);

  const refresh = useCallback(async () => {
    if (!showUuid || !isCloudEnabled) {
      setCount(0);
      setInBox(false);
      return;
    }
    const [{ count }, mine] = await Promise.all([
      getSupabase()
        .from('tape_box')
        .select('*', { count: 'exact', head: true })
        .eq('show_uuid', showUuid),
      userId
        ? getSupabase()
            .from('tape_box')
            .select('id')
            .eq('show_uuid', showUuid)
            .eq('user_id', userId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    setCount(count ?? 0);
    setInBox(!!mine.data);
  }, [showUuid, userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const toggle = useCallback(
    async (meta: {
      artist_slug: string;
      artist_name: string;
      show_date: string;
      venue_name?: string | null;
    }) => {
      if (!showUuid || !userId || !isCloudEnabled) return;
      if (inBox) {
        await getSupabase()
          .from('tape_box')
          .delete()
          .eq('show_uuid', showUuid)
          .eq('user_id', userId);
      } else {
        await getSupabase().from('tape_box').insert({
          show_uuid: showUuid,
          user_id: userId,
          artist_slug: meta.artist_slug,
          artist_name: meta.artist_name,
          show_date: meta.show_date,
          venue_name: meta.venue_name ?? null,
        });
      }
      refresh();
    },
    [showUuid, userId, inBox, refresh]
  );

  return { count, inBox, toggle, refresh };
}

// ---------------------------------------------------------------------------
// A user's full tape collection (profiles + /tape-box)
// ---------------------------------------------------------------------------

export function useUserTapes(userId: string | null | undefined, limit = 100) {
  const [tapes, setTapes] = useState<Tape[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !isCloudEnabled) {
      setTapes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getSupabase()
      .from('tape_box')
      .select('id, user_id, show_uuid, artist_slug, artist_name, show_date, venue_name, added_at')
      .eq('user_id', userId)
      .order('added_at', { ascending: false })
      .limit(limit)
      .then(({ data }) => {
        setTapes((data ?? []) as Tape[]);
        setLoading(false);
      });
  }, [userId, limit]);

  return { tapes, loading };
}

/** Tape count for a user (profile header). */
export function useUserTapeCount(userId: string | null | undefined) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!userId || !isCloudEnabled) return;
    getSupabase()
      .from('tape_box')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .then(({ count }) => setCount(count ?? 0));
  }, [userId]);
  return count;
}
