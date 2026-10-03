'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { useCloudAuth } from '@/lib/cloud/auth';
import { getReviews, getShowByDate, type PhishnetReview } from '@/lib/cloud/phishnet';

/**
 * Live phish.net fan reviews for a Phish show.
 *
 * COMPLIANCE (phish.net API Terms of Service):
 * - Official API only, through the server-side phishnet-proxy Edge Function.
 *   The API key never leaves the server.
 * - NEVER stored: fetched live on first expand, held in component memory
 *   only, discarded on unmount. No DB writes, no localStorage, no caches.
 * - "Data: phish.net" attribution always shown alongside the reviews.
 * - Phish only: the parent gates rendering on artistSlug === 'phish'.
 */

const MAX_SNIPPET = 240;

function truncate(text: string, max: number): string {
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max).trimEnd()}...` : t;
}

/** Review bodies contain HTML markup — strip tags and collapse whitespace. */
function plainText(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/** "2024-01-15 14:32:10" -> "Jan 15, 2024"; falls back to the raw string. */
function shortDate(raw?: string | null): string | null {
  if (!raw) return null;
  const d = new Date(raw.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function PhishReviews({ showDate }: { showDate: string }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reviews, setReviews] = useState<PhishnetReview[] | null>(null);
  const { status } = useCloudAuth();
  const cancelledRef = useRef(false);

  useEffect(() => () => {
    cancelledRef.current = true;
  }, []);

  // Fetch once: when the section is opened and the user is confirmed signed in.
  useEffect(() => {
    if (!expanded || status !== 'authed' || reviews || loading || failed) return;
    setLoading(true);
    (async () => {
      try {
        const showRows = await getShowByDate(showDate);
        const showid = showRows[0]?.showid;
        const revs = showid ? await getReviews(String(showid)) : [];
        if (!cancelledRef.current) setReviews(revs);
      } catch (e) {
        console.warn('phish reviews failed', e);
        if (!cancelledRef.current) setFailed(true);
      } finally {
        if (!cancelledRef.current) setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, status]);

  // Silent on failure: the show page must never break because reviews failed.
  if (failed) return null;

  return (
    <section className="mt-6 border-t border-neutral-200 pt-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full cursor-pointer items-center justify-between py-1 text-left"
        aria-expanded={expanded}
      >
        <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">
          Fan reviews
          {reviews && reviews.length > 0 ? ` (${Math.min(reviews.length, 3)})` : ''}
        </span>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>
      {expanded && (
        <div className="pt-2">
          {status === 'loading' ? (
            <p className="py-4 text-center text-sm text-gray-500">Checking sign-in…</p>
          ) : status !== 'authed' ? (
            <div className="py-4 text-center">
              <p className="mb-3 text-sm text-gray-600">Sign in to read fan reviews of this show.</p>
              <Link
                href="/account"
                className="rounded-full bg-[#5b2f8f] px-5 py-2 text-sm font-semibold text-white hover:bg-[#4a2575]"
              >
                Sign in
              </Link>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-300 border-t-transparent" />
            </div>
          ) : reviews && reviews.length > 0 ? (
            <>
              {reviews.slice(0, 3).map((r) => (
                <div key={r.reviewid} className="pb-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold text-purple-900">{r.username}</span>
                    {shortDate(r.posted_at) && (
                      <span className="shrink-0 text-[11px] text-gray-400">
                        {shortDate(r.posted_at)}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm leading-relaxed text-gray-700">
                    {truncate(plainText(r.review_text ?? ''), MAX_SNIPPET)}
                  </p>
                </div>
              ))}
              <p className="pt-1 text-right text-[11px] text-gray-400">Data: phish.net</p>
            </>
          ) : (
            <p className="pb-2 text-sm text-gray-500">No fan reviews on file for this show yet.</p>
          )}
        </div>
      )}
    </section>
  );
}
