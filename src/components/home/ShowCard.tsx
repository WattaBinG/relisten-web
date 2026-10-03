import Link from 'next/link';

/**
 * Compact show card for home shelves: date, venue, city, artist,
 * with an SBD badge when a soundboard source exists.
 */
export default function ShowCard({
  href,
  dateLabel,
  venueName,
  location,
  artistName,
  soundboard,
}: {
  href: string;
  dateLabel: string;
  venueName?: string | null;
  location?: string | null;
  artistName?: string | null;
  soundboard?: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="group block w-60 shrink-0 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md"
    >
      {artistName && (
        <div className="truncate text-xs font-semibold tracking-wide text-relisten-700 uppercase">
          {artistName}
        </div>
      )}
      <div className="mt-1 flex items-center gap-2">
        <span className="text-lg font-bold text-gray-900">{dateLabel}</span>
        {soundboard && (
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
            SBD
          </span>
        )}
      </div>
      {venueName && <div className="mt-1 truncate text-sm text-gray-600">{venueName}</div>}
      {location && <div className="truncate text-xs text-gray-400">{location}</div>}
    </Link>
  );
}
