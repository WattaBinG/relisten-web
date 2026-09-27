'use client';

import { useState } from 'react';
import { Plus, Check, ListMusic } from 'lucide-react';
import * as Popover from '../Popover';
import { useCloudAuth } from '@/lib/cloud/auth';
import {
  useMyPlaylists,
  createPlaylist,
  addTrackToPlaylist,
  type NewTrackInput,
} from '@/lib/cloud/playlists';
import { toast } from 'sonner';

/**
 * "+" button shown on track rows. Opens a popover to add the track to one of
 * the user's playlists, or create a new one inline. stopPropagation keeps the
 * parent Row link from navigating.
 */
export default function AddToPlaylistButton({ track }: { track: NewTrackInput }) {
  const { status, session } = useCloudAuth();
  const userId = session?.user?.id ?? null;
  const { playlists, refresh } = useMyPlaylists();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [showNew, setShowNew] = useState(false);

  if (status !== 'authed' || !userId) return null;

  const addTo = async (playlistId: string, playlistName: string) => {
    setAdding(true);
    const ok = await addTrackToPlaylist(playlistId, track);
    setAdding(false);
    if (ok) {
      toast.success(`Added to ${playlistName}`);
      setOpen(false);
      setShowNew(false);
      setNewName('');
    } else {
      toast.error('Could not add track');
    }
  };

  const createAndAdd = async () => {
    const name = newName.trim();
    if (!name || !userId) return;
    setAdding(true);
    const pl = await createPlaylist(userId, name);
    if (pl) {
      await addTrackToPlaylist(pl.id, track);
      toast.success(`Created "${name}" and added track`);
      refresh();
      setOpen(false);
      setShowNew(false);
      setNewName('');
    } else {
      toast.error('Could not create playlist');
    }
    setAdding(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Add to playlist"
          title="Add to playlist"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setOpen((v) => !v);
          }}
          className="rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <Plus size={16} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="left"
          align="start"
          sideOffset={4}
          onClick={(e) => e.stopPropagation()}
          className="z-50 w-64 rounded-lg border border-gray-200 bg-white p-2 shadow-xl"
        >
          <div className="mb-1 flex items-center gap-2 px-2 py-1 text-xs font-semibold tracking-wide text-gray-500 uppercase">
            <ListMusic size={14} /> Add to playlist
          </div>
          <div className="max-h-56 overflow-y-auto">
            {playlists.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={adding}
                onClick={() => addTo(p.id, p.name)}
                className="flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-gray-100 disabled:opacity-50"
              >
                <span className="truncate">{p.name}</span>
                <span className="ml-2 shrink-0 text-xs text-gray-400">
                  {p.track_count ?? 0} tracks
                </span>
              </button>
            ))}
            {playlists.length === 0 && !showNew && (
              <p className="px-2 py-1 text-xs text-gray-400">No playlists yet — make one below.</p>
            )}
          </div>
          {showNew ? (
            <div className="mt-1 flex gap-1 border-t border-gray-100 pt-2">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') createAndAdd();
                  if (e.key === 'Escape') setShowNew(false);
                }}
                placeholder="New playlist name"
                maxLength={100}
                className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
              />
              <button
                type="button"
                disabled={adding || !newName.trim()}
                onClick={createAndAdd}
                className="rounded bg-black px-2 py-1 text-sm text-white disabled:opacity-50"
              >
                <Check size={14} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowNew(true)}
              className="mt-1 flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm font-medium hover:bg-gray-100"
            >
              <Plus size={14} /> New playlist
            </button>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
