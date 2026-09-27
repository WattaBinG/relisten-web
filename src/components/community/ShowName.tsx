'use client';

import Link from 'next/link';
import { useShowMeta, useSourceMeta, prettyDate, type ShowMeta } from '@/lib/cloud/showMeta';

function showLabel(meta: ShowMeta | null): string {
  if (meta?.artistName && meta?.displayDate) {
    return `${meta.artistName} — ${prettyDate(meta.displayDate)}`;
  }
  return meta?.artistName ?? 'a show';
}

/**
 * Human-readable show name with a link to the show page when resolvable.
 * Never renders a raw UUID — falls back to "a show" while loading/unknown.
 */
export function ShowName({
  showUuid,
  showVenue = false,
  className,
}: {
  showUuid: string | undefined | null;
  showVenue?: boolean;
  className?: string;
}) {
  const meta = useShowMeta(showUuid);
  if (!showUuid) return null;
  const label = showLabel(meta);
  const full = showVenue && meta?.venueName ? `${label} · ${meta.venueName}` : label;
  if (meta?.showPath) {
    return (
      <Link href={meta.showPath} prefetch={false} className={className ?? 'hover:underline'}>
        {full}
      </Link>
    );
  }
  return <span className={className}>{full}</span>;
}

/**
 * Human-readable tape name: "Phish — Sep 27, 1995 · <taper/description>".
 * Falls back to just the show name, then "a tape" — never a raw UUID.
 */
export function TapeName({
  showUuid,
  sourceUuid,
  className,
}: {
  showUuid: string | undefined | null;
  sourceUuid: string | undefined | null;
  className?: string;
}) {
  const meta = useShowMeta(showUuid);
  const source = useSourceMeta(showUuid, sourceUuid);
  const label = showLabel(showUuid ? meta : null);
  const full = source?.label ? `${label} · ${source.label}` : label;
  if (showUuid && meta?.showPath) {
    return (
      <Link href={meta.showPath} prefetch={false} className={className ?? 'hover:underline'}>
        {full}
      </Link>
    );
  }
  return <span className={className}>{full}</span>;
}
