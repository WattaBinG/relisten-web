'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Play,
  Trash2,
  Share2,
  Pencil,
  Check,
  X,
  ListMusic,
  Clock,
  Loader2,
} from 'lucide-react';
import { useCloudAuth } from '@/lib/cloud/auth';
import {
  usePlaylist,
  usePlaylistTracks,
  updatePlaylist,
  deletePlaylist,
  removeTrackFromPlaylist,
  playlistGone,
  playlistTrackGone,
  type PlaylistTrack,
} from '@/lib/cloud/playlists';
import { playPlaylist, playPlaylistFrom } from '@/lib/playlistPlayback';
import { durationToHHMMSS } from '@/lib/utils';
import UserLink from '@/components/community/UserLink';
import ConfirmDialog from '@/components/ConfirmDialog';
import { toast } from 'sonner';

function trackShowPath(t: PlaylistTrack): string {
  const [y, m, d] = t.show_date.split('-');
  return `/${t.artist_slug}/${y}/${m}/${d}`;
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function PlaylistDetail({ id }: { id: string }) {
  const router = useRouter();
  const { session } = useCloudAuth();
  const userId = session?.user?.id ?? null;
  const { playlist, owner, notFound, loading, refresh } = usePlaylist(id);
  const { tracks, loading: tracksLoading, refresh: refreshTracks } = usePlaylistTracks(id);

  const [playing, setPlaying] = useState(false);
  const [playProgress, setPlayProgress] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const isOwner = !!userId && playlist?.user_id === userId;
  const totalSeconds = tracks.reduce((s, t) => s + (Number(t.duration_seconds) || 0), 0);

  const doPlayAll = async () => {
    if (tracks.length === 0 || playing) return;
    setPlaying(true);
    setPlayProgress('Loading tapes…');
    try {
      await playPlaylist(tracks, {
        onProgress: (done, total) => setPlayProgress(`Loading ${done}/${total}…`),
        onDone: (played, total) => {
          if (played === 0) toast.error('No playable tracks found');
          else if (played < total) toast.warning(`Playing ${played} of ${total} tracks`);
        },
      });
    } catch {
      toast.error('Playback failed');
    }
    setPlaying(false);
    setPlayProgress(null);
  };

  const doPlayFrom = async (index: number) => {
    if (playing) return;
    setPlaying(true);
    try {
      await playPlaylistFrom(tracks, index, {
        onDone: (played) => {
          if (played === 0) toast.error('No playable tracks found');
        },
      });
    } catch {
      toast.error('Playback failed');
    }
    setPlaying(false);
  };

  const doRemove = async (trackId: string) => {
    if (removingId) return;
    setActionError(null);
    setRemovingId(trackId);
    try {
      const ok = await removeTrackFromPlaylist(trackId);
      const gone = ok && (await playlistTrackGone(trackId));
      if (gone) {
        setConfirmingRemoveId(null);
        await refreshTracks();
        toast.success('Track removed');
      } else {
        setActionError('Could not remove that track. Please try again.');
        toast.error('Could not remove track');
      }
    } catch {
      setActionError('Could not remove that track. Please try again.');
      toast.error('Could not remove track');
    } finally {
      setRemovingId(null);
    }
  };

  const startEdit = () => {
    setEditName(playlist?.name ?? '');
    setEditDesc(playlist?.description ?? '');
    setEditing(true);
  };

  const saveEdit = async () => {
    const name = editName.trim();
    if (!name || !playlist) return;
    setSaving(true);
    const ok = await updatePlaylist(playlist.id, { name, description: editDesc });
    setSaving(false);
    if (ok) {
      setEditing(false);
      document.title = `${name} — playlist | The Lot`;
      refresh();
    } else toast.error('Could not save');
  };

  const doDelete = async () => {
    if (!playlist || deleting) return;
    setActionError(null);
    setDeleting(true);
    try {
      const ok = await deletePlaylist(playlist.id);
      const gone = ok && (await playlistGone(playlist.id));
      if (gone) {
        toast.success('Playlist deleted');
        router.push('/playlists');
      } else {
        setConfirmingDelete(false);
        setActionError('Could not delete that playlist. Please try again.');
        toast.error('Could not delete playlist');
      }
    } catch {
      setConfirmingDelete(false);
      setActionError('Could not delete that playlist. Please try again.');
      toast.error('Could not delete playlist');
    } finally {
      setDeleting(false);
    }
  };

  const toggleVisibility = async () => {
    if (!playlist) return;
    const ok = await updatePlaylist(playlist.id, { is_public: !playlist.is_public });
    if (ok) refresh();
    else toast.error('Could not update');
  };

  const share = async () => {
    const url = `${window.location.origin}/playlists/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  if (loading) {
    return (
      <div className="content">
        <p className="text-sm text-gray-500">Loading…</p>
      </div>
    );
  }

  if (notFound || !playlist) {
    return (
      <div className="content">
        <h1 className="mb-4 text-2xl font-bold">Playlist not found</h1>
        <p className="text-sm text-gray-600">
          It may be private or deleted.{' '}
          <Link href="/playlists" className="underline">
            Browse playlists
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="content">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-black text-white">
          <ListMusic size={32} />
        </div>
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="space-y-2">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={100}
                className="w-full rounded border border-gray-300 px-2 py-1 text-xl font-bold"
              />
              <input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                maxLength={500}
                placeholder="Description (optional)"
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
              />
              <div className="flex gap-2">
                <button
                  onClick={saveEdit}
                  disabled={saving || !editName.trim()}
                  className="flex items-center gap-1 rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50"
                >
                  <Check size={14} /> Save
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-1 rounded border border-gray-300 px-3 py-1 text-sm"
                >
                  <X size={14} /> Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold">{playlist.name}</h1>
              {playlist.description && (
                <p className="mt-1 text-sm text-gray-600">{playlist.description}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                {owner && <UserLink profile={owner} size={18} />}
                <span>{tracks.length} tracks</span>
                {totalSeconds > 0 && (
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {durationToHHMMSS(totalSeconds)}
                  </span>
                )}
                {!playlist.is_public && (
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase">
                    Private
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={doPlayAll}
          disabled={playing || tracks.length === 0}
          className="flex items-center gap-2 rounded-full bg-black px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {playing ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
          {playProgress ?? 'Play'}
        </button>
        {playlist.is_public && (
          <button
            onClick={share}
            className="flex items-center gap-1 rounded-full border border-gray-300 px-4 py-2 text-sm"
          >
            <Share2 size={14} /> Share
          </button>
        )}
        {isOwner && !editing && (
          <>
            <button
              onClick={startEdit}
              className="flex items-center gap-1 rounded-full border border-gray-300 px-4 py-2 text-sm"
            >
              <Pencil size={14} /> Edit
            </button>
            <button
              onClick={toggleVisibility}
              className="rounded-full border border-gray-300 px-4 py-2 text-sm"
            >
              Make {playlist.is_public ? 'private' : 'public'}
            </button>
            <button
              onClick={() => setConfirmingDelete(true)}
              className="flex items-center gap-1 rounded-full border border-red-200 px-4 py-2 text-sm text-red-600"
            >
              <Trash2 size={14} /> Delete
            </button>
          </>
        )}
      </div>
      <ConfirmDialog
        open={confirmingDelete}
        title={`Delete "${playlist.name}"?`}
        message="This can't be undone. The playlist and its track list will be permanently removed."
        confirmLabel="Delete playlist"
        danger
        busy={deleting}
        onConfirm={doDelete}
        onCancel={() => {
          if (!deleting) setConfirmingDelete(false);
        }}
      />
      {actionError && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</p>
      )}

      {/* Tracks */}
      <div className="mt-6">
        {tracksLoading ? (
          <p className="text-sm text-gray-500">Loading tracks…</p>
        ) : tracks.length === 0 ? (
          <p className="text-sm text-gray-500">
            No tracks yet. Tap <span className="font-semibold">+</span> on any track to add it here.
          </p>
        ) : (
          <ol className="divide-y divide-gray-100">
            {tracks.map((t, idx) => (
              <li key={t.id} className="group flex items-center gap-3 py-2">
                <span className="w-6 shrink-0 text-right text-xs text-gray-400">{idx + 1}</span>
                <button
                  onClick={() => doPlayFrom(idx)}
                  disabled={playing}
                  aria-label={`Play ${t.song_title}`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-600 hover:bg-black hover:text-white disabled:opacity-50"
                >
                  <Play size={14} />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{t.song_title}</div>
                  <div className="truncate text-xs text-gray-500">
                    <Link
                      href={trackShowPath(t)}
                      className="hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t.artist_name} — {formatDate(t.show_date)}
                    </Link>
                    {t.venue_name && <span> · {t.venue_name}</span>}
                  </div>
                </div>
                {t.duration_seconds ? (
                  <span className="shrink-0 text-xs text-gray-400 tabular-nums">
                    {durationToHHMMSS(Number(t.duration_seconds))}
                  </span>
                ) : null}
                {isOwner &&
                  (confirmingRemoveId === t.id ? (
                    <span className="flex shrink-0 items-center gap-1">
                      <button
                        onClick={() => doRemove(t.id)}
                        disabled={removingId === t.id}
                        className="shrink-0 rounded bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {removingId === t.id ? 'Removing…' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setConfirmingRemoveId(null)}
                        disabled={removingId === t.id}
                        aria-label="Keep track"
                        className="shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-50"
                      >
                        <X size={14} />
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        setActionError(null);
                        setConfirmingRemoveId(t.id);
                      }}
                      aria-label="Remove track"
                      title="Remove track"
                      className="shrink-0 rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-600"
                    >
                      <X size={16} />
                    </button>
                  ))}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
