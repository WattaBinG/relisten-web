'use client';

import player, { resetPlayer, isPlayerMounted, initGaplessPlayer } from './player';
import { API_DOMAIN } from './constants';
import { store } from '@/redux';
import { updatePlayback } from '@/redux/modules/playback';
import type { PlaylistTrack } from './cloud/playlists';
import type { Tape, Track, Source } from '@/types';
import { splitShowDate } from './utils';

/** Per-track show context attached to queued tracks so the player UI/URL
 *  can follow each track to its own show (playlists span many shows). */
export interface PlaylistContextTrack extends Track {
  _plCtx?: {
    artistSlug: string;
    showDate: string; // YYYY-MM-DD
    source: string; // source id as string (matches playback.source shape)
    songSlug?: string;
  };
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export interface ResolvedPlaylistTrack {
  track: PlaylistContextTrack;
  url: string;
}

/** Resolve a playlist's tracks to playable URLs via the public catalog API. */
export async function resolvePlaylistTracks(
  tracks: PlaylistTrack[],
  onProgress?: (done: number, total: number) => void
): Promise<ResolvedPlaylistTrack[]> {
  const out: ResolvedPlaylistTrack[] = [];
  // Cache show fetches — many tracks may share a show
  const showCache = new Map<string, Tape | null>();
  let done = 0;

  for (const pt of tracks) {
    let show = showCache.get(pt.show_uuid);
    if (show === undefined) {
      show = await fetchJson<Tape>(`${API_DOMAIN}/api/v3/shows/${pt.show_uuid}`);
      showCache.set(pt.show_uuid, show);
    }
    done++;
    onProgress?.(done, tracks.length);
    if (!show) continue;
    const source: Source | undefined = show.sources?.find((s) => s.uuid === pt.source_uuid);
    if (!source) continue;
    const apiTrack: Track | undefined = (source.sets ?? [])
      .flatMap((set) => set.tracks ?? [])
      .find((t) => t?.uuid === pt.track_uuid);
    if (!apiTrack) continue;
    const url =
      typeof window !== 'undefined' && (window as { FLAC?: string }).FLAC
        ? apiTrack.flac_url || apiTrack.mp3_url
        : apiTrack.mp3_url;
    if (!url) continue;

    const [y, m, d] = pt.show_date.split('-');
    const showDate = `${y}-${m}-${d}`;
    out.push({
      track: {
        ...apiTrack,
        title: pt.song_title || apiTrack.title,
        _plCtx: {
          artistSlug: pt.artist_slug,
          showDate,
          source: String(source.id),
          songSlug: apiTrack.slug,
        },
      },
      url,
    });
  }
  return out;
}

/** Queue a playlist in the gapless player and start from the first track. */
export async function playPlaylist(
  tracks: PlaylistTrack[],
  opts?: {
    startIndex?: number;
    onProgress?: (done: number, total: number) => void;
    onDone?: (played: number, total: number) => void;
  }
): Promise<void> {
  if (tracks.length === 0) return;
  if (!isPlayerMounted()) {
    initGaplessPlayer(store);
  } else {
    resetPlayer();
  }

  const resolved = await resolvePlaylistTracks(tracks, opts?.onProgress);
  if (resolved.length === 0) {
    opts?.onDone?.(0, tracks.length);
    return;
  }

  for (const r of resolved) {
    player.addTrack(r.url, {
      skipHEAD: /phish\.in/.test(String(r.url)),
      metadata: { trackId: r.track.id },
    });
  }

  const first = resolved[0].track;
  const ctx = first._plCtx;
  const { year, month, day } = splitShowDate(ctx?.showDate ?? '');

  store.dispatch(
    updatePlayback({
      artistSlug: ctx?.artistSlug,
      year,
      month,
      day,
      showDate: ctx?.showDate,
      songSlug: ctx?.songSlug,
      source: ctx?.source,
      paused: false,
      tracks: resolved.map((r) => r.track),
    })
  );

  const startIndex = Math.min(opts?.startIndex ?? 0, resolved.length - 1);
  player.gotoTrack(startIndex, true);
  opts?.onDone?.(resolved.length, tracks.length);
}

/** Play a single playlist track (queues the whole playlist, starts at index). */
export function playPlaylistFrom(
  tracks: PlaylistTrack[],
  index: number,
  opts?: { onProgress?: (done: number, total: number) => void; onDone?: (played: number, total: number) => void }
) {
  return playPlaylist(tracks, { ...opts, startIndex: index });
}
