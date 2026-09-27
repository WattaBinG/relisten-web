'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import RelistenAPI from '@/lib/RelistenAPI';
import { useCloudAuth } from '@/lib/cloud/auth';
import {
  useCheckins,
  useReviews,
  useSourceRatings,
  type Review,
} from '@/lib/cloud/community';
import Avatar from './Avatar';
import FollowButton from './FollowButton';
import Stars from './Stars';
import UserLink from './UserLink';
import TapeBoxBlock from '../tapebox/TapeBoxBlock';

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - +new Date(iso)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}

// ---------------------------------------------------------------------------
// "I was there" check-ins
// ---------------------------------------------------------------------------

function CheckinBlock({ showUuid }: { showUuid: string }) {
  const { status } = useCloudAuth();
  const { checkins, count, checkedIn, toggle } = useCheckins(showUuid);

  return (
    <div>
      <div className="flex items-center gap-3">
        {status === 'authed' ? (
          <button
            onClick={toggle}
            className={`cursor-pointer rounded-full px-4 py-2 text-sm font-medium ${
              checkedIn
                ? 'bg-green-700 text-white hover:bg-green-800'
                : 'bg-black text-white hover:bg-gray-800'
            }`}
          >
            {checkedIn ? '✓ I was there' : 'I was there'}
          </button>
        ) : (
          <Link
            href="/account"
            className="rounded-full bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            Sign in to say you were there
          </Link>
        )}
        <span className="text-sm text-gray-600">
          {count === 0 ? 'No one checked in yet' : `${count} ${count === 1 ? 'was' : 'were'} there`}
        </span>
      </div>
      {count > 0 && (
        <div className="mt-3 flex flex-wrap gap-3">
          {checkins.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              <UserLink profile={c.profile} size={26} />
              {status === 'authed' && c.profile && (
                <FollowButton userId={c.profile.id} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reviews (phish.net-style)
// ---------------------------------------------------------------------------

function ReviewCard({
  review,
  onDelete,
  onUpdate,
}: {
  review: Review;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, body: string) => Promise<boolean>;
}) {
  const { session } = useCloudAuth();
  const isOwn = session?.user?.id === review.user_id;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(review.body);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveEdit = async () => {
    const body = draft.trim();
    if (!body || saving) return;
    setError(null);
    setSaving(true);
    const ok = await onUpdate(review.id, body);
    setSaving(false);
    if (ok) setEditing(false);
    else setError('Could not save your edit. Please try again.');
  };

  const confirmDelete = async () => {
    if (deleting) return;
    setError(null);
    setDeleting(true);
    await onDelete(review.id);
    setDeleting(false);
    setConfirmingDelete(false);
  };

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserLink profile={review.profile} />
          <span className="text-xs text-gray-500">{timeAgo(review.created_at)}</span>
        </div>
        <div className="flex items-center gap-2">
          {review.profile && <FollowButton userId={review.profile.id} />}
          {isOwn && !editing && (
            <>
              <button
                onClick={() => {
                  setDraft(review.body);
                  setError(null);
                  setEditing(true);
                }}
                className="cursor-pointer text-xs text-gray-400 hover:text-black"
              >
                Edit
              </button>
              {confirmingDelete ? (
                <span className="flex items-center gap-1">
                  <button
                    onClick={confirmDelete}
                    disabled={deleting}
                    className="cursor-pointer rounded bg-red-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {deleting ? 'Deleting…' : 'Confirm delete'}
                  </button>
                  <button
                    onClick={() => setConfirmingDelete(false)}
                    disabled={deleting}
                    className="cursor-pointer text-xs text-gray-400 hover:text-black disabled:opacity-50"
                  >
                    Keep
                  </button>
                </span>
              ) : (
                <button
                  onClick={() => setConfirmingDelete(true)}
                  className="cursor-pointer text-xs text-gray-400 hover:text-red-600"
                >
                  Delete
                </button>
              )}
            </>
          )}
        </div>
      </div>
      {editing ? (
        <div className="mt-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            maxLength={2000}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={saveEdit}
              disabled={saving || !draft.trim()}
              className="cursor-pointer rounded-full bg-black px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => setEditing(false)}
              disabled={saving}
              className="cursor-pointer rounded-full border border-gray-300 px-4 py-1.5 text-sm disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-2 text-sm whitespace-pre-wrap">{review.body}</p>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function ReviewBlock({ showUuid }: { showUuid: string }) {
  const { status } = useCloudAuth();
  const { reviews, count, post, remove, update } = useReviews(showUuid);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await post(body);
    setBusy(false);
    if (res.error) setError(res.error);
    else setBody('');
  };

  return (
    <div>
      <h3 className="mb-3 text-base font-semibold">
        Reviews {count > 0 && <span className="font-normal text-gray-500">({count})</span>}
      </h3>
      {status === 'authed' ? (
        <form onSubmit={submit} className="mb-4">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write a review — how was the show? Standout moments?"
            rows={3}
            maxLength={2000}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-gray-400">{body.length}/2000</span>
            <button
              type="submit"
              disabled={busy || !body.trim()}
              className="cursor-pointer rounded-full bg-black px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40"
            >
              {busy ? 'Posting…' : 'Post review'}
            </button>
          </div>
          {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </form>
      ) : (
        <p className="mb-4 text-sm text-gray-600">
          <Link href="/account" className="underline">
            Sign in
          </Link>{' '}
          to write a review.
        </p>
      )}
      {reviews.length === 0 ? (
        <p className="text-sm text-gray-500">No reviews yet — be the first.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} onDelete={remove} onUpdate={update} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tape ratings (per-source, shown for this show's sources)
// ---------------------------------------------------------------------------

function TapeRatingBlock({
  artistSlug,
  year,
  date,
}: {
  artistSlug: string;
  year: string;
  date: string;
}) {
  const { status } = useCloudAuth();
  const [sourceUuids, setSourceUuids] = useState<string[]>([]);
  const [showUuid, setShowUuid] = useState<string | null>(null);
  const { summaries, rate } = useSourceRatings(sourceUuids);

  useEffect(() => {
    RelistenAPI.fetchShow(artistSlug, year, date)
      .then((show) => {
        const uuids = (show?.sources ?? []).map((s: { uuid?: string }) => s.uuid).filter(Boolean) as string[];
        setSourceUuids(uuids);
        setShowUuid(show?.uuid ?? null);
      })
      .catch(() => {});
  }, [artistSlug, year, date]);

  const rated = sourceUuids.filter((u) => summaries[u]?.count);
  if (rated.length === 0 && status !== 'authed') return null;

  const overall =
    rated.length > 0
      ? rated.reduce((sum, u) => sum + summaries[u].avg, 0) / rated.length
      : 0;

  return (
    <div>
      <h3 className="mb-3 text-base font-semibold">Tape ratings</h3>
      {rated.length === 0 ? (
        <p className="text-sm text-gray-500">
          No ratings yet{status === 'authed' ? ' — tap the stars on a tape to rate it.' : '.'}
        </p>
      ) : (
        <div className="mb-2 flex items-center gap-2">
          <Stars value={overall} size={20} />
          <span className="text-sm text-gray-600">
            {overall.toFixed(1)} across {rated.length} {rated.length === 1 ? 'tape' : 'tapes'}
          </span>
        </div>
      )}
      {status === 'authed' && sourceUuids.length > 0 && (
        <div className="flex flex-col gap-2">
          {sourceUuids.slice(0, 5).map((uuid, i) => {
            const s = summaries[uuid];
            return (
              <div key={uuid} className="flex items-center gap-3 text-sm">
                <span className="w-16 shrink-0 text-gray-500">Tape {i + 1}</span>
                <Stars value={s?.userRating ?? 0} onRate={(n) => rate(uuid, n, showUuid)} size={18} />
                {s && s.count > 0 && (
                  <span className="text-xs text-gray-500">
                    {s.avg.toFixed(1)} ({s.count})
                  </span>
                )}
              </div>
            );
          })}
          {sourceUuids.length > 5 && (
            <p className="text-xs text-gray-400">+{sourceUuids.length - 5} more tapes</p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main section
// ---------------------------------------------------------------------------

export default function CommunitySection({
  showUuid,
  artistSlug,
  year,
  date,
  showTitle,
  artistName,
  venueName,
}: {
  showUuid: string;
  artistSlug: string;
  year: string;
  date: string; // YYYY-MM-DD
  showTitle: string;
  artistName: string;
  venueName?: string | null;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h2 className="mb-6 text-xl font-bold">Community</h2>
      <p className="mb-6 -mt-4 text-sm text-gray-500">{showTitle}</p>
      <div className="flex flex-col gap-8">
        <CheckinBlock showUuid={showUuid} />
        <div className="border-t border-gray-200" />
        <TapeBoxBlock
          showUuid={showUuid}
          artistSlug={artistSlug}
          artistName={artistName}
          showDate={date}
          venueName={venueName}
        />
        <div className="border-t border-gray-200" />
        <TapeRatingBlock artistSlug={artistSlug} year={year} date={date} />
        <div className="border-t border-gray-200" />
        <ReviewBlock showUuid={showUuid} />
      </div>
    </div>
  );
}
