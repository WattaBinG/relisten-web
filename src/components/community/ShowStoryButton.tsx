'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Sparkles, X } from 'lucide-react';
import { useCloudAuth } from '@/lib/cloud/auth';
import { useReviews } from '@/lib/cloud/community';
import { requestShowStory } from '@/lib/cloud/ai';

function StoryModal({
  artistName,
  date,
  venueName,
  setlist,
  showUuid,
  onClose,
}: {
  artistName: string;
  date: string;
  venueName?: string | null;
  setlist: string[];
  showUuid: string;
  onClose: () => void;
}) {
  const { status } = useCloudAuth();
  const { reviews, loading: reviewsLoading } = useReviews(showUuid);
  const [state, setState] = useState<'waiting' | 'loading' | 'done' | 'error'>('waiting');
  const [story, setStory] = useState('');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  // Generate once the user is confirmed signed-in and reviews have loaded.
  // `attempt` re-fires the effect for manual retries.
  useEffect(() => {
    if (status !== 'authed' || reviewsLoading) return;
    setState('loading');
    setError('');
    let cancelled = false;
    const reviewBodies = reviews.slice(0, 3).map((r) => r.body);
    void requestShowStory({
      artistName,
      date,
      venue: venueName,
      setlist,
      reviews: reviewBodies,
    }).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setStory(res.result);
        setState('done');
      } else {
        setError(res.error.message);
        setState('error');
      }
    });
    return () => {
      cancelled = true;
    };
    // Props are fixed for the modal's lifetime; attempt drives retries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, reviewsLoading, attempt]);

  const retry = () => setAttempt((a) => a + 1);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`About this show: ${artistName} on ${date}`}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold">
              <Sparkles size={18} className="text-purple-700" />
              About this show
            </h3>
            <p className="mt-0.5 text-sm text-gray-500">
              {artistName} — {date}
              {venueName ? ` · ${venueName}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100"
          >
            <X size={18} />
          </button>
        </div>

        {status === 'loading' ? (
          <p className="py-8 text-center text-sm text-gray-500">Checking sign-in…</p>
        ) : status !== 'authed' ? (
          <div className="py-8 text-center">
            <p className="mb-4 text-sm text-gray-600">Sign in to hear the story of this night.</p>
            <Link
              href="/account"
              className="rounded-full bg-[#5b2f8f] px-5 py-2 text-sm font-semibold text-white hover:bg-[#4a2575]"
            >
              Sign in
            </Link>
          </div>
        ) : state === 'loading' || state === 'waiting' ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-purple-700" />
            <p className="text-sm text-gray-500">Digging through the archives…</p>
          </div>
        ) : state === 'error' ? (
          <div className="py-6 text-center">
            <p className="mb-4 text-sm text-gray-700">{error}</p>
            <button
              onClick={retry}
              className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {story.split(/\n\n+/).map((para, i) => (
              <p key={i} className="text-[15px] leading-relaxed text-gray-800">
                {para}
              </p>
            ))}
            <p className="pt-2 text-xs text-gray-400">
              Written by The Lot&apos;s AI from the setlist and fan reviews.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * "Tell me about this show" button for show pages. Opens a modal with an
 * AI-written story of the night, grounded in the setlist and fan reviews.
 */
export default function ShowStoryButton({
  artistName,
  date,
  venueName,
  setlist,
  showUuid,
}: {
  artistName: string;
  date: string; // YYYY-MM-DD
  venueName?: string | null;
  setlist: string[];
  showUuid: string;
}) {
  const [open, setOpen] = useState(false);
  if (setlist.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-semibold text-purple-900 hover:bg-purple-100"
      >
        <Sparkles size={16} />
        Tell me about this show
      </button>
      {open && (
        <StoryModal
          artistName={artistName}
          date={date}
          venueName={venueName}
          setlist={setlist}
          showUuid={showUuid}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
