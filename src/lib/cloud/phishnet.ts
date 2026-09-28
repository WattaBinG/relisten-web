import { getSupabase, isCloudEnabled } from './supabase';

const FUNCTION_NAME = 'phishnet-proxy';

/**
 * Client for the phishnet-proxy Supabase Edge Function.
 *
 * COMPLIANCE (phish.net API Terms of Service):
 * - All data comes through the official API via our server-side proxy.
 *   The API key never leaves the Edge Function's secrets.
 * - NEVER persist phish.net data: results are returned to the caller and
 *   held in component memory only. No Supabase writes, no localStorage,
 *   no files, no caches.
 * - Any UI that renders this data must show "Data: phish.net" attribution.
 */

export interface PhishnetShow {
  showid: number;
  showdate: string;
  venue?: string;
  city?: string;
  state?: string;
  country?: string;
  setlist_notes?: string;
}

export interface PhishnetSetlistRow {
  showid: number;
  showdate: string;
  position: number;
  set: string;
  song: string;
  /** Display separator after the song, e.g. "->", ">", "," (already trimmed upstream). */
  trans_mark?: string | null;
  footnote?: string | null;
}

export interface PhishnetReview {
  reviewid: number;
  username: string;
  review_text: string;
  score?: string | number | null;
  posted_at?: string;
}

interface PhishnetEnvelope<T> {
  error: boolean | number;
  error_message?: string;
  data: T[];
}

async function invoke<T>(op: string, params: Record<string, string>): Promise<T[]> {
  if (!isCloudEnabled) throw new Error('Sign in to view show intel.');
  const sb = getSupabase();
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session) throw new Error('Sign in to view show intel.');
  // functions.invoke attaches the user's access token; the Edge Function
  // runs with verify_jwt enabled, so this is login-gated server-side too.
  const { data, error } = await sb.functions.invoke(FUNCTION_NAME, {
    body: { op, ...params },
  });
  if (error) {
    console.warn('phishnet-proxy invoke failed', error.message);
    throw new Error('Show intel is unavailable right now.');
  }
  const envelope = data as PhishnetEnvelope<T> | null;
  if (!envelope || envelope.error) {
    const message =
      (envelope && envelope.error_message) || 'Show intel is unavailable right now.';
    throw new Error(message);
  }
  return envelope.data ?? [];
}

/** Show metadata for a Phish date (YYYY-MM-DD). Used to resolve the showid. */
export async function getShowByDate(date: string): Promise<PhishnetShow[]> {
  return invoke<PhishnetShow>('show-by-date', { date });
}

/** Full setlist rows (one row per song) for a Phish date (YYYY-MM-DD). */
export async function getSetlistByDate(date: string): Promise<PhishnetSetlistRow[]> {
  return invoke<PhishnetSetlistRow>('setlist', { date });
}

/** Fan reviews for a phish.net showid. */
export async function getReviews(showid: string): Promise<PhishnetReview[]> {
  return invoke<PhishnetReview>('reviews', { showid });
}
