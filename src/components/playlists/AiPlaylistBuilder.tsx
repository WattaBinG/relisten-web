'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, X, Check, Loader2 } from 'lucide-react';
import { useCloudAuth } from '@/lib/cloud/auth';
import { requestAiPlaylist, type AiPlaylistTrack } from '@/lib/cloud/ai';
import {
  createPlaylist,
  addTracksToPlaylist,
  type NewTrackInput,
} from '@/lib/cloud/playlists';

const RELISTEN_API = 'https://api.relisten.net';

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

async function getJSON<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    return (await r.json()) as T;
  } catch {
    return null;
  }
}

interface CatalogArtist {
  name: string;
  slug: string;
}

interface ResolvedTrack {
  input: NewTrackInput;
  showPath: string; // /{artistSlug}/{year}/{month}/{day}
  displayDate: string;
}

/**
 * Resolve one AI-suggested track to a playable playlist entry:
 * artist -> song -> show (AI date if given, else the song's top show) ->
 * best source -> matching track.
 */
async function resolveTrack(
  artists: CatalogArtist[],
  t: AiPlaylistTrack,
  songCache: Map<string, { name: string; slug: string }[]>
): Promise<ResolvedTrack | null> {
  const aNorm = norm(t.artist);
  const artist =
    artists.find((a) => norm(a.name) === aNorm) ??
    artists.find((a) => norm(a.name).includes(aNorm) || (aNorm && aNorm.includes(norm(a.name))));
  if (!artist) return null;

  let songs = songCache.get(artist.slug);
  if (!songs) {
    songs =
      (await getJSON<{ name: string; slug: string }[]>(
        `${RELISTEN_API}/api/v2/artists/${artist.slug}/songs`
      )) ?? [];
    songCache.set(artist.slug, songs);
  }
  const sNorm = norm(t.song);
  const song =
    songs.find((s) => norm(s.name) === sNorm) ??
    songs.find((s) => norm(s.name).includes(sNorm) || (sNorm && sNorm.includes(norm(s.name))));

  // Pick a show: the AI's date when valid, otherwise the song's top-rated show.
  let show: any = null;
  if (t.showDate && /^\d{4}-\d{2}-\d{2}$/.test(t.showDate)) {
    const [y] = t.showDate.split('-');
    show = await getJSON<any>(
      `${RELISTEN_API}/api/v2/artists/${artist.slug}/years/${y}/${t.showDate}`
    );
    if (!show?.sources?.length) show = null;
  }
  if (!show && song) {
    const sws = await getJSON<any>(
      `${RELISTEN_API}/api/v3/artists/${artist.slug}/songs/${song.slug}`
    );
    const shows = ((sws?.shows ?? []) as any[]).filter((s) => (s.source_count ?? 1) > 0);
    shows.sort(
      (a, b) => (b.avg_rating_weighted ?? b.avg_rating ?? 0) - (a.avg_rating_weighted ?? a.avg_rating ?? 0)
    );
    const pick = shows[0];
    if (pick?.display_date) {
      const [y] = String(pick.display_date).split('-');
      show = await getJSON<any>(
        `${RELISTEN_API}/api/v2/artists/${artist.slug}/years/${y}/${pick.display_date}`
      );
    }
  }
  if (!show?.sources?.length || !show?.uuid) return null;

  // Best source: soundboard first, then rating.
  const sources = [...(show.sources as any[])].sort(
    (a, b) =>
      Number(b.is_soundboard ?? false) - Number(a.is_soundboard ?? false) ||
      (b.avg_rating_weighted ?? 0) - (a.avg_rating_weighted ?? 0)
  );
  const source = sources[0];
  const allTracks: any[] = (source.sets ?? []).flatMap((s: any) => s.tracks ?? []);
  const track =
    (song && allTracks.find((tr) => tr.slug === song.slug)) ??
    allTracks.find((tr) => norm(tr.title ?? '') === sNorm);
  if (!track?.uuid || !source.uuid) return null;

  const displayDate: string = show.display_date ?? show.date ?? '';
  const [y, m, d] = displayDate.split('-');
  if (!y || !m || !d) return null;

  const input: NewTrackInput = {
    artist_name: artist.name,
    artist_slug: artist.slug,
    show_uuid: show.uuid,
    show_date: displayDate,
    venue_name: show.venue?.name ?? null,
    source_uuid: source.uuid,
    track_uuid: track.uuid,
    song_title: track.title ?? t.song,
    track_position: track.track_position ?? null,
    duration_seconds: track.duration ?? null,
  };
  return { input, showPath: `/${artist.slug}/${y}/${m}/${d}`, displayDate };
}

type Phase =
  | 'idle'
  | 'thinking'
  | 'resolving'
  | 'preview'
  | 'saving'
  | 'saved'
  | 'error';

/**
 * "Build with AI" panel for the playlists page: describe a vibe, get an
 * AI-curated track list resolved to real playable tracks, save as a playlist.
 */
export default function AiPlaylistBuilder({ onSaved }: { onSaved: () => void }) {
  const { status, session } = useCloudAuth();
  const userId = session?.user?.id ?? null;
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [playlistName, setPlaylistName] = useState('');
  const [resolved, setResolved] = useState<ResolvedTrack[]>([]);
  const [unresolved, setUnresolved] = useState(0);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [savedId, setSavedId] = useState<string | null>(null);

  if (status !== 'authed') return null;

  const generate = async () => {
    const p = prompt.trim();
    if (!p || phase === 'thinking' || phase === 'resolving') return;
    setPhase('thinking');
    setError('');
    setResolved([]);
    setUnresolved(0);
    setSavedId(null);

    const ai = await requestAiPlaylist(p);
    if (!ai.ok) {
      setError(ai.error.message);
      setPhase('error');
      return;
    }
    const tracks = ai.result.tracks ?? [];
    setPlaylistName(ai.result.name || 'AI Mixtape');
    if (tracks.length === 0) {
      setError('The AI came back empty — try describing it differently.');
      setPhase('error');
      return;
    }

    setPhase('resolving');
    const artists =
      (await getJSON<CatalogArtist[]>(`${RELISTEN_API}/api/v3/artists`)) ?? [];
    const songCache = new Map<string, { name: string; slug: string }[]>();
    const done: ResolvedTrack[] = [];
    let failed = 0;

    // Resolve with bounded concurrency so we don't hammer the API.
    const CONCURRENCY = 5;
    let i = 0;
    const workers = Array.from({ length: CONCURRENCY }, async () => {
      while (i < tracks.length) {
        const idx = i++;
        setProgress(`Finding tracks… ${idx + 1}/${tracks.length}`);
        const r = await resolveTrack(artists, tracks[idx], songCache);
        if (r) done.push(r);
        else failed++;
      }
    });
    await Promise.all(workers);

    done.sort(
      (a, b) => tracks.findIndex((t) => norm(t.song) === norm(a.input.song_title)) -
        tracks.findIndex((t) => norm(t.song) === norm(b.input.song_title))
    );
    setResolved(done);
    setUnresolved(failed);
    setProgress('');
    if (done.length === 0) {
      setError("Couldn't match any of those songs to real recordings — try different artists or songs.");
      setPhase('error');
      return;
    }
    setPhase('preview');
  };

  const save = async () => {
    if (!userId || phase === 'saving' || resolved.length === 0) return;
    setPhase('saving');
    const pl = await createPlaylist(userId, playlistName.trim() || 'AI Mixtape', 'Built with The Lot AI ✨');
    if (!pl) {
      setError('Could not create the playlist — try again.');
      setPhase('error');
      return;
    }
    const added = await addTracksToPlaylist(
      pl.id,
      resolved.map((r) => r.input)
    );
    if (added === 0) {
      setError('Playlist created, but no tracks could be added.');
      setPhase('error');
      return;
    }
    setSavedId(pl.id);
    setPhase('saved');
    onSaved();
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-6 flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-900 hover:bg-purple-100"
      >
        <Sparkles size={16} />
        Build with AI
      </button>
    );
  }

  return (
    <div className="mb-8 rounded-2xl border border-purple-200 bg-purple-50/50 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <Sparkles size={16} className="text-purple-700" />
          Build with AI
        </h2>
        <button
          onClick={() => {
            setOpen(false);
            setPhase('idle');
          }}
          aria-label="Close AI builder"
          className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100"
        >
          <X size={16} />
        </button>
      </div>

      {phase !== 'saved' && (
        <>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. the funkiest Phish second sets of '97, or mellow Sunday-morning Dead"
            rows={2}
            maxLength={500}
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-purple-400 focus:outline-none"
          />
          <button
            onClick={() => void generate()}
            disabled={!prompt.trim() || phase === 'thinking' || phase === 'resolving'}
            className="mt-2 flex items-center gap-2 rounded-full bg-[#5b2f8f] px-5 py-2 text-sm font-semibold text-white hover:bg-[#4a2575] disabled:opacity-50"
          >
            {(phase === 'thinking' || phase === 'resolving') && (
              <Loader2 size={14} className="animate-spin" />
            )}
            {phase === 'thinking'
              ? 'Dreaming up your mixtape…'
              : phase === 'resolving'
                ? progress || 'Finding tracks…'
                : 'Generate'}
          </button>
        </>
      )}

      {phase === 'error' && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {(phase === 'preview' || phase === 'saving') && (
        <div className="mt-4">
          <input
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            maxLength={100}
            aria-label="Playlist name"
            className="mb-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold"
          />
          <ul className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2">
            {resolved.map((r, idx) => (
              <li key={idx} className="flex items-center gap-2 px-2 py-1.5 text-sm">
                <Check size={14} className="shrink-0 text-green-600" />
                <span className="min-w-0 flex-1 truncate">
                  <span className="font-medium">{r.input.song_title}</span>
                  <span className="text-gray-500"> — {r.input.artist_name}</span>
                </span>
                <Link
                  href={r.showPath}
                  prefetch={false}
                  className="shrink-0 text-xs text-purple-700 underline"
                >
                  {r.displayDate}
                </Link>
              </li>
            ))}
          </ul>
          {unresolved > 0 && (
            <p className="mt-2 text-xs text-gray-500">
              {unresolved} suggestion{unresolved === 1 ? '' : 's'} couldn&apos;t be matched to a
              recording and {unresolved === 1 ? 'was' : 'were'} skipped.
            </p>
          )}
          <button
            onClick={() => void save()}
            disabled={phase === 'saving'}
            className="mt-3 flex items-center gap-2 rounded-full bg-black px-5 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {phase === 'saving' && <Loader2 size={14} className="animate-spin" />}
            {phase === 'saving' ? 'Saving…' : `Save as playlist (${resolved.length} tracks)`}
          </button>
        </div>
      )}

      {phase === 'saved' && savedId && (
        <div className="mt-4 rounded-xl bg-green-50 p-4 text-center">
          <p className="mb-3 text-sm font-medium text-green-900">
            Your AI mixtape is saved — happy listening.
          </p>
          <Link
            href={`/playlists/${savedId}`}
            prefetch={false}
            className="rounded-full bg-black px-5 py-2 text-sm font-semibold text-white"
          >
            Open playlist
          </Link>
        </div>
      )}
    </div>
  );
}
