import { useCallback, useEffect, useState } from 'react';
import { useCloudAuth } from './auth';
import { getSupabase, isCloudEnabled, type ProfileRow } from './supabase';

export interface Playlist {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  track_count?: number;
  total_seconds?: number;
}

export interface PlaylistTrack {
  id: string;
  playlist_id: string;
  position: number;
  artist_name: string;
  artist_slug: string;
  show_uuid: string;
  show_date: string; // YYYY-MM-DD
  venue_name: string | null;
  source_uuid: string;
  track_uuid: string;
  song_title: string;
  track_position: number | null;
  duration_seconds: number | null;
  added_at: string;
}

export interface NewTrackInput {
  artist_name: string;
  artist_slug: string;
  show_uuid: string;
  show_date: string;
  venue_name?: string | null;
  source_uuid: string;
  track_uuid: string;
  song_title: string;
  track_position?: number | null;
  duration_seconds?: number | null;
}

export interface PlaylistOwner {
  id: string;
  username: string;
  avatar_url: string | null;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function createPlaylist(
  userId: string,
  name: string,
  description?: string
): Promise<Playlist | null> {
  if (!isCloudEnabled) return null;
  const { data, error } = await getSupabase()
    .from('playlists')
    .insert({ user_id: userId, name: name.trim(), description: description?.trim() || null })
    .select()
    .single();
  if (error) {
    console.error('createPlaylist failed', error);
    return null;
  }
  return data as Playlist;
}

export async function updatePlaylist(
  playlistId: string,
  fields: { name?: string; description?: string | null; is_public?: boolean }
): Promise<boolean> {
  if (!isCloudEnabled) return false;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (fields.name !== undefined) patch.name = fields.name.trim();
  if (fields.description !== undefined) patch.description = fields.description?.trim() || null;
  if (fields.is_public !== undefined) patch.is_public = fields.is_public;
  const { error } = await getSupabase().from('playlists').update(patch).eq('id', playlistId);
  if (error) console.error('updatePlaylist failed', error);
  return !error;
}

export async function deletePlaylist(playlistId: string): Promise<boolean> {
  if (!isCloudEnabled) return false;
  const { error } = await getSupabase().from('playlists').delete().eq('id', playlistId);
  if (error) console.error('deletePlaylist failed', error);
  return !error;
}

export async function addTrackToPlaylist(
  playlistId: string,
  track: NewTrackInput
): Promise<boolean> {
  if (!isCloudEnabled) return false;
  // next position = max(position) + 1
  const { data: existing } = await getSupabase()
    .from('playlist_tracks')
    .select('position')
    .eq('playlist_id', playlistId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (existing?.position ?? -1) + 1;
  const { error } = await getSupabase().from('playlist_tracks').insert({
    playlist_id: playlistId,
    position,
    artist_name: track.artist_name,
    artist_slug: track.artist_slug,
    show_uuid: track.show_uuid,
    show_date: track.show_date,
    venue_name: track.venue_name ?? null,
    source_uuid: track.source_uuid,
    track_uuid: track.track_uuid,
    song_title: track.song_title,
    track_position: track.track_position ?? null,
    duration_seconds: track.duration_seconds ?? null,
  });
  if (error) console.error('addTrackToPlaylist failed', error);
  return !error;
}

export async function removeTrackFromPlaylist(trackId: string): Promise<boolean> {
  if (!isCloudEnabled) return false;
  const { error } = await getSupabase().from('playlist_tracks').delete().eq('id', trackId);
  if (error) console.error('removeTrackFromPlaylist failed', error);
  return !error;
}

/** Reorder tracks: pass the full ordered list of track ids. */
export async function reorderPlaylistTracks(
  playlistId: string,
  orderedTrackIds: string[]
): Promise<boolean> {
  if (!isCloudEnabled) return false;
  // Update positions one at a time (playlists are small)
  for (let i = 0; i < orderedTrackIds.length; i++) {
    const { error } = await getSupabase()
      .from('playlist_tracks')
      .update({ position: i })
      .eq('id', orderedTrackIds[i])
      .eq('playlist_id', playlistId);
    if (error) {
      console.error('reorderPlaylistTracks failed', error);
      return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** The signed-in user's own playlists, with track counts + runtimes. */
export function useMyPlaylists() {
  const { session } = useCloudAuth();
  const userId = session?.user?.id ?? null;
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId || !isCloudEnabled) {
      setPlaylists([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await getSupabase()
      .from('playlists')
      .select('id, user_id, name, description, is_public, created_at, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    const rows = (data ?? []) as Playlist[];
    // enrich with counts (small N, fine)
    const enriched = await Promise.all(
      rows.map(async (p) => {
        const { data: tracks } = await getSupabase()
          .from('playlist_tracks')
          .select('duration_seconds')
          .eq('playlist_id', p.id);
        const ts = (tracks ?? []) as { duration_seconds: number | null }[];
        return {
          ...p,
          track_count: ts.length,
          total_seconds: ts.reduce((s, t) => s + (Number(t.duration_seconds) || 0), 0),
        };
      })
    );
    setPlaylists(enriched);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { playlists, loading, refresh, userId };
}

/** One playlist by id (respects RLS: public or owned). */
export function usePlaylist(playlistId: string | null | undefined) {
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [owner, setOwner] = useState<PlaylistOwner | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!playlistId || !isCloudEnabled) {
      setPlaylist(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await getSupabase()
      .from('playlists')
      .select('id, user_id, name, description, is_public, created_at, updated_at')
      .eq('id', playlistId)
      .maybeSingle();
    if (error || !data) {
      setNotFound(true);
      setPlaylist(null);
      setLoading(false);
      return;
    }
    setPlaylist(data as Playlist);
    const { data: profile } = await getSupabase()
      .from('profiles')
      .select('id, username, avatar_url')
      .eq('id', (data as Playlist).user_id)
      .maybeSingle();
    setOwner((profile as ProfileRow | null)
      ? {
          id: (profile as ProfileRow).id,
          username: (profile as ProfileRow).username,
          avatar_url: (profile as ProfileRow).avatar_url,
        }
      : null);
    setLoading(false);
  }, [playlistId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { playlist, owner, notFound, loading, refresh };
}

/** Tracks of a playlist, ordered by position. */
export function usePlaylistTracks(playlistId: string | null | undefined) {
  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!playlistId || !isCloudEnabled) {
      setTracks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await getSupabase()
      .from('playlist_tracks')
      .select(
        'id, playlist_id, position, artist_name, artist_slug, show_uuid, show_date, venue_name, source_uuid, track_uuid, song_title, track_position, duration_seconds, added_at'
      )
      .eq('playlist_id', playlistId)
      .order('position', { ascending: true });
    setTracks((data ?? []) as PlaylistTrack[]);
    setLoading(false);
  }, [playlistId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { tracks, loading, refresh };
}

/** Recent public playlists (for discovery). */export function usePublicPlaylists(limit = 20) {
  const [playlists, setPlaylists] = useState<(Playlist & { owner: PlaylistOwner | null })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isCloudEnabled) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await getSupabase()
        .from('playlists')
        .select('id, user_id, name, description, is_public, created_at, updated_at')
        .eq('is_public', true)
        .order('updated_at', { ascending: false })
        .limit(limit);
      const rows = (data ?? []) as Playlist[];
      const { data: profiles } = await getSupabase()
        .from('profiles')
        .select('id, username, avatar_url')
        .in(
          'id',
          [...new Set(rows.map((r) => r.user_id))]
        );
      const pmap = new Map(((profiles ?? []) as ProfileRow[]).map((p) => [p.id, p]));
      const enriched = await Promise.all(
        rows.map(async (p) => {
          const prof = pmap.get(p.user_id);
          const { count } = await getSupabase()
            .from('playlist_tracks')
            .select('*', { count: 'exact', head: true })
            .eq('playlist_id', p.id);
          return {
            ...p,
            track_count: count ?? 0,
            owner: prof
              ? { id: prof.id, username: prof.username, avatar_url: prof.avatar_url }
              : null,
          };
        })
      );
      setPlaylists(enriched);
      setLoading(false);
    })();
  }, [limit]);

  return { playlists, loading };
}

// ---------------------------------------------------------------------------
// Artist slug -> name cache (for building NewTrackInput from track rows)
// ---------------------------------------------------------------------------

let artistNameCache: Map<string, string> | null = null;
let artistNamePromise: Promise<Map<string, string>> | null = null;

async function getArtistNameMap(): Promise<Map<string, string>> {
  if (artistNameCache) return artistNameCache;
  if (!artistNamePromise) {
    artistNamePromise = (async () => {
      const map = new Map<string, string>();
      try {
        const res = await fetch('https://api.relisten.net/api/v3/artists');
        if (res.ok) {
          const artists = (await res.json()) as { slug?: string; name?: string }[];
          for (const a of artists) {
            if (a.slug && a.name) map.set(a.slug, a.name);
          }
        }
      } catch {
        // ignore — fall back to slug
      }
      artistNameCache = map;
      return map;
    })();
  }
  return artistNamePromise;
}

/** Resolve a display name for an artist slug (cached, falls back to slug). */
export function useArtistName(slug: string | undefined): string {
  const [name, setName] = useState(slug ?? '');
  useEffect(() => {
    if (!slug) {
      setName('');
      return;
    }
    let cancelled = false;
    getArtistNameMap().then((map) => {
      if (!cancelled) setName(map.get(slug) ?? slug);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);
  return name;
}
