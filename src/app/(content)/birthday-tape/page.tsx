'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useCloudAuth } from '@/lib/cloud/auth';
import {
  formatBirthdayMonthDay,
  getMonthDay,
  useFavoriteArtistUuids,
} from '@/lib/cloud/birthday';
import { addTrackToPlaylist, createPlaylist, type NewTrackInput } from '@/lib/cloud/playlists';
import {
  getReviews,
  getSetlistByDate,
  getShowByDate,
  type PhishnetReview,
  type PhishnetSetlistRow,
} from '@/lib/cloud/phishnet';
import { API_DOMAIN } from '@/lib/constants';

interface CatalogArtist {
  uuid?: string;
  slug?: string;
  name?: string;
}

interface OnDateShow {
  uuid?: string;
  display_date?: string;
  date?: string;
  venue?: { name?: string; location?: string } | null;
  source_count?: number;
}

interface TapeEntry {
  artistSlug: string;
  artistName: string;
  show: OnDateShow;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** True for a real calendar month/day (Feb 29 allowed — leap birthdays exist). */
function isValidMonthDay(month: number, day: number): boolean {
  return (
    Number.isInteger(month) &&
    Number.isInteger(day) &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= DAYS_IN_MONTH[month - 1]
  );
}

/** {month: 7, day: 4} -> "July 4". */
function formatMonthDay(md: { month: number; day: number }): string {
  return `${MONTH_NAMES[md.month - 1]} ${md.day}`;
}

interface HistoryItem {
  year: number | null;
  text: string;
}

/** In-memory cache of the Wikipedia on-this-day feed, keyed by month/day. */
const historyCache = new Map<string, HistoryItem[]>();

/**
 * Wikipedia's free on-this-day feed (no key needed). Births and notable
 * events only — deaths are skipped on purpose (it's a birthday feature).
 */
async function fetchOnThisDay(month: number, day: number): Promise<HistoryItem[]> {
  const key = `${month}-${day}`;
  const cached = historyCache.get(key);
  if (cached) return cached;
  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const res = await fetch(
    `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/all/${mm}/${dd}`
  );
  if (!res.ok) throw new Error('history feed failed');
  const json = (await res.json()) as {
    births?: { text?: string; year?: number }[];
    selected?: { text?: string; year?: number }[];
    events?: { text?: string; year?: number }[];
  };
  const items: HistoryItem[] = [];
  const push = (arr?: { text?: string; year?: number }[]) => {
    for (const e of arr ?? []) {
      if (items.length >= 5) break;
      if (e.text) items.push({ year: e.year ?? null, text: e.text });
    }
  };
  push(json.births);
  push(json.selected);
  push(json.events);
  historyCache.set(key, items);
  return items;
}

function truncate(text: string, max: number): string {
  const t = text.trim();
  return t.length > max ? `${t.slice(0, max).trimEnd()}...` : t;
}

/** Strip HTML tags and collapse whitespace (review bodies contain markup). */
function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Expandable phish.net intel for a Phish show: setlist + fan reviews.
 * Fetched live only when the user expands; held in component memory only and
 * discarded on unmount (phish.net ToS: no persistence). Attribution shown
 * in the footer.
 */
function PhishIntel({ showDate }: { showDate: string }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [setlist, setSetlist] = useState<PhishnetSetlistRow[] | null>(null);
  const [reviews, setReviews] = useState<PhishnetReview[] | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const toggle = () => {
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (setlist || loading || failed) return;
    setLoading(true);
    (async () => {
      try {
        const [showRows, setlistRows] = await Promise.all([
          getShowByDate(showDate),
          getSetlistByDate(showDate),
        ]);
        const showid = showRows[0]?.showid ?? setlistRows[0]?.showid;
        const revs = showid ? await getReviews(String(showid)) : [];
        if (!cancelledRef.current) {
          setSetlist(setlistRows);
          setReviews(revs);
        }
      } catch (e) {
        console.warn('phish intel failed', e);
        if (!cancelledRef.current) setFailed(true);
      } finally {
        if (!cancelledRef.current) setLoading(false);
      }
    })();
  };

  // Silent on failure: hide the section rather than showing an error.
  if (failed) return null;

  // Group rows into sets and render each the way phish.net does:
  // "Mike's Song -> I Am Hydrogen > Weekapaug Groove, Harry Hood". Rows arrive
  // in position order; trans_mark is the separator that follows each song.
  const sets: { label: string; line: string }[] = [];
  for (const row of setlist ?? []) {
    if (!row.set || !row.song) continue;
    const label = row.set.toLowerCase() === 'e' ? 'Encore' : `Set ${row.set}`;
    let group = sets.find((g) => g.label === label);
    if (!group) {
      group = { label, line: '' };
      sets.push(group);
    }
    const mark = (row.trans_mark ?? '').trim();
    if (group.line.length > 0) group.line += ' ';
    group.line += row.song;
    if (mark) group.line += ` ${mark}`;
  }
  for (const s of sets) s.line = s.line.trim();

  return (
    <div className="mx-auto w-full max-w-xl">
      <button
        type="button"
        onClick={toggle}
        className="block w-full cursor-pointer rounded-b-2xl bg-neutral-900 px-4 py-2"
      >
        <span className="block text-center text-xs font-semibold text-orange-300">
          {expanded ? 'Hide show intel -' : 'Show intel +'}
        </span>
      </button>
      {expanded && (
        <div className="rounded-b-2xl bg-neutral-900 px-4 pb-3">
          {loading && (
            <div className="flex items-center justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-orange-300 border-t-transparent" />
            </div>
          )}
          {!loading && setlist && (
            <>
              {sets.length > 0 ? (
                sets.map((s) => (
                  <div key={s.label} className="pb-2">
                    <div className="text-xs font-bold tracking-widest text-gray-400 uppercase">
                      {s.label}
                    </div>
                    <div className="mt-0.5 text-sm text-gray-200">{s.line}</div>
                  </div>
                ))
              ) : (
                <p className="pb-2 text-sm text-gray-500">No setlist on file for this show.</p>
              )}
              {reviews && reviews.length > 0 && (
                <div className="pt-1">
                  <div className="mb-1 text-xs font-bold tracking-widest text-gray-400 uppercase">
                    Fans said
                  </div>
                  {reviews.slice(0, 3).map((r) => (
                    <div key={r.reviewid} className="pb-2">
                      <div className="text-xs font-semibold text-orange-200">{r.username}</div>
                      <p className="mt-0.5 text-sm text-gray-300">
                        {truncate(plainText(r.review_text ?? ''), 240)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <p className="pt-1 text-right text-[11px] text-gray-500">Data: phish.net</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** Bands to use when the user hasn't favorited anyone yet. */
const FALLBACK_BAND_NAMES = [
  'Phish',
  'Grateful Dead',
  'moe.',
  'Widespread Panic',
  'The Disco Biscuits',
  'Umphreys McGee',
  'The String Cheese Incident',
  'Goose',
];

function showUrl(artistSlug: string, displayDate: string | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(displayDate ?? '');
  if (!m) return null;
  return `/${artistSlug}/${m[1]}/${m[2]}/${m[3]}`;
}

function formatShowDate(displayDate: string | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(displayDate ?? '');
  if (!m) return displayDate ?? 'Unknown date';
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${months[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

export default function BirthdayTapePage() {
  const { status, profile, session } = useCloudAuth();
  const { uuids: favUuids, loading: favLoading } = useFavoriteArtistUuids();

  const [entries, setEntries] = useState<TapeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedPlaylistId, setSavedPlaylistId] = useState<string | null>(null);
  const [saveProgress, setSaveProgress] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[] | null>(null);

  const monthDay = useMemo(() => getMonthDay(profile?.birthday), [profile?.birthday]);
  const birthdayLabel = useMemo(() => formatBirthdayMonthDay(profile?.birthday), [profile?.birthday]);

  // Date explorer: null = following the user's birthday. The user can pick any
  // month/day to explore; tapes + history re-fetch for the picked date.
  const [picked, setPicked] = useState<{ month: number; day: number } | null>(null);
  const [monthText, setMonthText] = useState('');
  const [dayText, setDayText] = useState('');
  const [dateError, setDateError] = useState<string | null>(null);
  const inputsInitialized = useRef(false);

  const activeDate = useMemo(() => picked ?? monthDay, [picked, monthDay]);
  const exploring =
    picked != null &&
    monthDay != null &&
    (picked.month !== monthDay.month || picked.day !== monthDay.day);
  const activeLabel = exploring && picked ? formatMonthDay(picked) : birthdayLabel;

  // Seed the explorer inputs from the birthday once it loads.
  useEffect(() => {
    if (!inputsInitialized.current && monthDay) {
      inputsInitialized.current = true;
      setMonthText(String(monthDay.month));
      setDayText(String(monthDay.day));
    }
  }, [monthDay]);

  const exploreDate = () => {
    const m = Number(monthText);
    const d = Number(dayText);
    if (!isValidMonthDay(m, d)) {
      setDateError('Enter a valid month and day (MM / DD).');
      return;
    }
    setDateError(null);
    setPicked({ month: m, day: d });
  };

  const resetToBirthday = () => {
    setPicked(null);
    setDateError(null);
    if (monthDay) {
      setMonthText(String(monthDay.month));
      setDayText(String(monthDay.day));
    }
  };

  useEffect(() => {
    if (status !== 'authed' || favLoading || !activeDate) {
      if (status === 'authed' && !favLoading && !activeDate) setLoading(false);
      return;
    }
    const date = activeDate;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      setHistory(null);
      try {
        // 1. Catalog -> uuid/slug/name map
        const artistsRes = await fetch(`${API_DOMAIN}/api/v3/artists`);
        if (!artistsRes.ok) throw new Error('Could not reach the catalog.');
        const artists = (await artistsRes.json()) as CatalogArtist[];
        const byUuid = new Map<string, CatalogArtist>();
        const byName = new Map<string, CatalogArtist>();
        for (const a of artists) {
          if (a.uuid) byUuid.set(a.uuid, a);
          if (a.name) byName.set(a.name.toLowerCase(), a);
        }

        // 2. Which bands? Favorites first, fallback to the usual suspects.
        let targets: CatalogArtist[] = favUuids
          .map((u) => byUuid.get(u))
          .filter((a): a is CatalogArtist => !!a && !!a.slug);
        if (targets.length === 0) {
          targets = FALLBACK_BAND_NAMES.map((n) => byName.get(n.toLowerCase())).filter(
            (a): a is CatalogArtist => !!a && !!a.slug
          );
        }

        // 3. On-date shows for each band (in parallel, tolerate failures).
        const settled = await Promise.allSettled(
          targets.map(async (a): Promise<TapeEntry[]> => {
            const res = await fetch(
              `${API_DOMAIN}/api/v2/artists/${a.slug}/shows/on-date?month=${date.month}&day=${date.day}`
            );
            if (!res.ok) return [];
            const shows = (await res.json()) as OnDateShow[];
            return shows.map((show) => ({
              artistSlug: a.slug as string,
              artistName: a.name ?? (a.slug as string),
              show,
            }));
          })
        );
        const all: TapeEntry[] = [];
        for (const s of settled) {
          if (s.status === 'fulfilled') all.push(...s.value);
        }
        // Newest first.
        all.sort((x, y) => (y.show.display_date ?? '').localeCompare(x.show.display_date ?? ''));

        if (!cancelled) {
          setEntries(all);
          setSelected(new Set(all.map((e) => e.show.uuid).filter(Boolean) as string[]));
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Something went wrong.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    // "On this day in history" strip — silent on failure, hidden if it fails.
    fetchOnThisDay(date.month, date.day)
      .then((items) => {
        if (!cancelled && items.length > 0) setHistory(items);
      })
      .catch(() => {
        /* hide the section */
      });
    return () => {
      cancelled = true;
    };
  }, [status, favLoading, favUuids, activeDate]);

  const toggle = (uuid: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });
  };

  const saveAsPlaylist = async () => {
    setSaveError(null);
    setSavedPlaylistId(null);
    const userId = session?.user?.id;
    const tapeName =
      exploring && picked
        ? `Tape — ${formatMonthDay(picked)}`
        : birthdayLabel
          ? `My Birthday Tape — ${birthdayLabel}`
          : null;
    if (!userId || !tapeName) return;
    const chosen = entries.filter((e) => e.show.uuid && selected.has(e.show.uuid));
    if (chosen.length === 0) {
      setSaveError('Pick at least one show first.');
      return;
    }
    setSaving(true);
    try {
      const playlist = await createPlaylist(userId, tapeName);
      if (!playlist) throw new Error('Could not create the playlist.');
      let added = 0;
      for (const entry of chosen) {
        setSaveProgress(`Adding ${entry.artistName} ${entry.show.display_date}…`);
        try {
          const track = await firstTrackOfBestSource(entry);
          if (track && (await addTrackToPlaylist(playlist.id, track))) added++;
        } catch {
          // Skip shows whose sources fail to load — keep going.
        }
      }
      setSaveProgress(null);
      if (added === 0) throw new Error('No tracks could be added — try again later.');
      setSavedPlaylistId(playlist.id);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || (status === 'authed' && favLoading)) {
    return (
      <div className="content">
        <h1 className="mb-4">🎂 Birthday Tape</h1>
        <p>Loading…</p>
      </div>
    );
  }

  if (status !== 'authed') {
    return (
      <div className="content">
        <h1 className="mb-4">🎂 Birthday Tape</h1>
        <p className="text-sm text-gray-600">
          <Link href="/account" className="underline">
            Sign in
          </Link>{' '}
          to build your birthday tape.
        </p>
      </div>
    );
  }

  if (!monthDay) {
    return (
      <div className="content">
        <h1 className="mb-4">🎂 Birthday Tape</h1>
        <p className="text-sm text-gray-600">
          Tell us your birthday first and we will dig up every show your favorite bands played
          on that day.{' '}
          <Link href="/account" className="underline">
            Set it on your account page →
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="content">
      <h1 className="mb-2 text-center">
        {exploring ? `🎂 Tape — ${activeLabel}` : '🎂 Your Birthday Tape'}
      </h1>
      <p className="mb-4 text-center text-sm text-gray-600">
        Every show your favorite bands played on <strong>{activeLabel}</strong> — in any year.
        Pick the ones you want, then save them as a playlist.
      </p>

      <div className="mb-6 flex items-center justify-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          placeholder="MM"
          aria-label="Month"
          value={monthText}
          onChange={(e) => {
            setMonthText(e.target.value);
            setDateError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') exploreDate();
          }}
          className="w-14 rounded-lg border border-gray-300 px-3 py-2 text-center text-sm"
        />
        <span className="text-lg text-gray-400">/</span>
        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          placeholder="DD"
          aria-label="Day"
          value={dayText}
          onChange={(e) => {
            setDayText(e.target.value);
            setDateError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') exploreDate();
          }}
          className="w-14 rounded-lg border border-gray-300 px-3 py-2 text-center text-sm"
        />
        <button
          type="button"
          onClick={exploreDate}
          className="cursor-pointer rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
        >
          Explore
        </button>
        {exploring && (
          <button
            type="button"
            onClick={resetToBirthday}
            className="cursor-pointer px-2 py-2 text-sm text-gray-500 underline"
          >
            My birthday
          </button>
        )}
      </div>
      {dateError && <p className="mb-4 text-center text-sm text-red-600">{dateError}</p>}

      {loading && <p className="text-sm text-gray-500">Digging through the archives…</p>}
      {loadError && <p className="text-sm text-red-600">{loadError}</p>}

      {!loading && !loadError && entries.length === 0 && (
        <p className="text-sm text-gray-600">
          No shows found on {activeLabel} for your bands yet. Try favoriting more artists on
          their pages — your tape rebuilds from your favorites.
        </p>
      )}

      {!loading && entries.length > 0 && (
        <>
          <div className="mb-6 flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveAsPlaylist()}
              className="cursor-pointer rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {saving ? 'Building…' : `Save ${selected.size} as playlist`}
            </button>
            {saveProgress && <span className="text-xs text-gray-500">{saveProgress}</span>}
          </div>
          {saveError && <p className="mb-4 text-center text-sm text-red-600">{saveError}</p>}
          {savedPlaylistId && (
            <p className="mb-4 text-center text-sm text-green-700">
              Tape saved!{' '}
              <Link href={`/playlists/${savedPlaylistId}`} className="underline">
                Open your playlist →
              </Link>
            </p>
          )}

          <ul className="flex flex-col items-center gap-8">
            {entries.map((entry) => {
              const uuid = entry.show.uuid ?? '';
              const url = showUrl(entry.artistSlug, entry.show.display_date);
              const checked = selected.has(uuid);
              const showDate = entry.show.display_date ?? '';
              const isPhish =
                entry.artistSlug === 'phish' && /^\d{4}-\d{2}-\d{2}$/.test(showDate);
              const venueBits = [entry.show.venue?.name ?? 'Unknown venue', entry.show.venue?.location]
                .filter(Boolean)
                .join(' — ');
              return (
                <li key={`${entry.artistSlug}-${uuid}`} className="ml-0 w-full max-w-xl list-none">
                  <button
                    type="button"
                    onClick={() => toggle(uuid)}
                    aria-pressed={checked}
                    aria-label={`${checked ? 'Remove' : 'Include'} ${entry.artistName} ${entry.show.display_date}`}
                    className={`block w-full cursor-pointer rounded-2xl text-left transition ${
                      checked ? 'ring-4 ring-orange-500' : 'opacity-80 ring-1 ring-black/30 hover:opacity-100'
                    }`}
                  >
                    <div className="rounded-2xl bg-neutral-900 px-5 pt-4 pb-4 shadow-xl">
                      <div className="flex items-center justify-around">
                        {[0, 1].map((r) => (
                          <div key={r} className="rounded bg-black/60 px-6 py-1">
                            <div
                              className="h-10 w-10 rounded-full"
                              style={{
                                background:
                                  'repeating-conic-gradient(#ddd6c2 0deg 24deg, #1c1c1c 24deg 30deg)',
                              }}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="relative mt-3 overflow-hidden rounded bg-[#f3ecd9] px-4 pt-5 pb-3">
                        <div className="absolute inset-x-0 top-0 h-2.5 bg-red-500" />
                        <div className="absolute inset-x-0 top-2.5 h-1.5 bg-orange-400" />
                        <div
                          className="text-xl leading-snug font-bold text-neutral-800"
                          style={{ fontFamily: "'Segoe Print','Bradley Hand','Comic Sans MS',cursive" }}
                        >
                          {entry.artistName} — {formatShowDate(entry.show.display_date)}
                        </div>
                        <div
                          className="mt-1 text-sm text-neutral-600"
                          style={{ fontFamily: "'Segoe Print','Bradley Hand','Comic Sans MS',cursive" }}
                        >
                          {venueBits}
                          {entry.show.source_count ? ` · ${entry.show.source_count} tape${entry.show.source_count === 1 ? '' : 's'}` : ''}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between px-1 text-[11px] font-bold tracking-[0.2em] text-neutral-400">
                        <span>90</span>
                        <span>{checked ? '◉ DUBBED IN' : '○ DUB ME'}</span>
                        <span>A SIDE</span>
                      </div>
                    </div>
                  </button>
                  {url && (
                    <div className="mt-1 text-center">
                      <Link href={url} className="text-xs text-gray-500 hover:underline">
                        Open show page →
                      </Link>
                    </div>
                  )}
                  {isPhish && <PhishIntel showDate={showDate} />}
                </li>
              );
            })}
          </ul>

          {history && history.length > 0 && (
            <div className="mx-auto mt-8 w-full max-w-xl">
              <h2 className="mb-1 text-xs font-bold tracking-widest text-gray-500 uppercase">
                Also on this day…
              </h2>
              {history.map((h, i) => (
                <div key={i} className="flex flex-row py-1.5">
                  <span className="w-14 shrink-0 text-sm font-semibold text-orange-600">
                    {h.year ?? ''}
                  </span>
                  <span className="min-w-0 flex-1 text-sm text-gray-600">{h.text}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** First track of the highest-rated source for a show (for "Save as playlist"). */
async function firstTrackOfBestSource(entry: TapeEntry): Promise<NewTrackInput | null> {
  const showUuid = entry.show.uuid;
  if (!showUuid) return null;
  const res = await fetch(`${API_DOMAIN}/api/v3/shows/${showUuid}`);
  if (!res.ok) return null;
  const tape = (await res.json()) as {
    sources?: {
      uuid?: string;
      avg_rating?: number | null;
      sets?: { tracks?: { uuid?: string; title?: string; track_position?: number; duration?: number }[] }[];
    }[];
    venue?: { name?: string } | null;
    display_date?: string;
  };
  const sources = tape.sources ?? [];
  if (sources.length === 0) return null;
  const best = [...sources].sort(
    (a, b) => (b.avg_rating ?? 0) - (a.avg_rating ?? 0)
  )[0];
  const firstTrack = best.sets?.flatMap((s) => s.tracks ?? [])[0];
  if (!best.uuid || !firstTrack?.uuid) return null;
  return {
    artist_name: entry.artistName,
    artist_slug: entry.artistSlug,
    show_uuid: showUuid,
    show_date: entry.show.display_date ?? entry.show.date ?? '',
    venue_name: tape.venue?.name ?? entry.show.venue?.name ?? null,
    source_uuid: best.uuid,
    track_uuid: firstTrack.uuid,
    song_title: firstTrack.title ?? 'Unknown title',
    track_position: firstTrack.track_position ?? null,
    duration_seconds: firstTrack.duration ?? null,
  };
}
