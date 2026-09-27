'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, ListMusic, Clock } from 'lucide-react';
import { useCloudAuth } from '@/lib/cloud/auth';
import {
  useMyPlaylists,
  usePublicPlaylists,
  createPlaylist,
  type Playlist,
} from '@/lib/cloud/playlists';
import { durationToHHMMSS } from '@/lib/utils';
import UserLink from '@/components/community/UserLink';

function PlaylistCard({ playlist }: { playlist: Playlist }) {
  return (
    <Link
      href={`/playlists/${playlist.id}`}
      className="block rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-black text-white">
          <ListMusic size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{playlist.name}</div>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
            <span>{playlist.track_count ?? 0} tracks</span>
            {(playlist.total_seconds ?? 0) > 0 && (
              <span className="flex items-center gap-1">
                <Clock size={12} /> {durationToHHMMSS(playlist.total_seconds ?? 0)}
              </span>
            )}
            {!playlist.is_public && (
              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase">
                Private
              </span>
            )}
          </div>
        </div>
      </div>
      {playlist.description && (
        <p className="mt-2 line-clamp-2 text-sm text-gray-600">{playlist.description}</p>
      )}
    </Link>
  );
}

export default function PlaylistsPage() {
  const { status, session } = useCloudAuth();
  const userId = session?.user?.id ?? null;
  const { playlists, loading, refresh } = useMyPlaylists();
  const { playlists: publicPlaylists, loading: publicLoading } = usePublicPlaylists(12);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const create = async () => {
    const n = name.trim();
    if (!n || !userId || creating) return;
    setCreating(true);
    const pl = await createPlaylist(userId, n);
    setCreating(false);
    if (pl) {
      setName('');
      refresh();
    }
  };

  return (
    <div className="content">
      <h1 className="text-2xl font-bold">🎶 Playlists</h1>
      <p className="mt-1 mb-6 text-sm text-gray-600">
        Mixtapes across every show. Tap <Plus size={12} className="inline" /> on any track to add it.
      </p>

      {status === 'loading' ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : status !== 'authed' ? (
        <p className="text-sm text-gray-600">
          <Link href="/account" className="underline">
            Sign in
          </Link>{' '}
          to build playlists. You can still browse public ones below.
        </p>
      ) : (
        <>
          <div className="mb-6 flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && create()}
              placeholder="New playlist name…"
              maxLength={100}
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              onClick={create}
              disabled={creating || !name.trim()}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              <Plus size={16} /> Create
            </button>
          </div>

          {loading ? (
            <p className="text-sm text-gray-500">Loading your playlists…</p>
          ) : playlists.length === 0 ? (
            <p className="mb-8 text-sm text-gray-500">
              No playlists yet. Name one above, then add tracks from any show.
            </p>
          ) : (
            <div className="mb-10 grid gap-3 sm:grid-cols-2">
              {playlists.map((p) => (
                <PlaylistCard key={p.id} playlist={p} />
              ))}
            </div>
          )}
        </>
      )}

      <h2 className="mb-3 text-lg font-semibold">Fresh public playlists</h2>
      {publicLoading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : publicPlaylists.length === 0 ? (
        <p className="text-sm text-gray-500">None yet — yours could be the first.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {publicPlaylists
            .filter((p) => p.user_id !== userId)
            .map((p) => (
              <div key={p.id} className="relative">
                <PlaylistCard playlist={p} />
                {p.owner && (
                  <div className="mt-1 px-1 text-xs text-gray-500">
                    <UserLink profile={p.owner} size={16} />
                  </div>
                )}
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
