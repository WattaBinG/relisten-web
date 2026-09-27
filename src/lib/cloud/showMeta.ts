import { useEffect, useState } from 'react';

export interface ShowMeta {
  /** e.g. "Phish" */
  artistName?: string;
  /** e.g. "phish" */
  artistSlug?: string;
  /** e.g. "1995-09-27" */
  displayDate?: string;
  /** e.g. "Cal Expo Amphitheater" */
  venueName?: string;
  /** Link target like "/phish/1995/09/27" when we know enough to build one */
  showPath?: string;
}

export interface SourceMeta {
  /** Human label for a tape, e.g. taper info or description snippet */
  label?: string;
}

interface ShowMetaResponse extends ShowMeta {
  sources?: { uuid?: string; taper?: string; description?: string; is_soundboard?: boolean }[];
}

const cache = new Map<string, Promise<ShowMetaResponse | null>>();

function fetchMeta(showUuid: string): Promise<ShowMetaResponse | null> {
  let p = cache.get(showUuid);
  if (!p) {
    p = (async () => {
      try {
        const res = await fetch(`/api/show-meta/${showUuid}`);
        if (!res.ok) return null;
        return (await res.json()) as ShowMetaResponse;
      } catch {
        return null;
      }
    })();
    cache.set(showUuid, p);
  }
  return p;
}

/** Cached catalog lookup for a show UUID. Never throws; null when unknown. */
export function getShowMeta(showUuid: string): Promise<ShowMeta | null> {
  if (!showUuid) return Promise.resolve(null);
  return fetchMeta(showUuid).then((s) => {
    if (!s) return null;
    const { sources: _sources, ...meta } = s;
    return meta;
  });
}

/** Cached human label for a source (tape) UUID within its show. */
export function getSourceMeta(showUuid: string, sourceUuid: string): Promise<SourceMeta | null> {
  if (!showUuid || !sourceUuid) return Promise.resolve(null);
  return fetchMeta(showUuid).then((s) => {
    const src = s?.sources?.find((x) => x.uuid === sourceUuid);
    if (!src) return null;
    const label =
      src.taper ||
      src.description ||
      (src.is_soundboard ? 'Soundboard tape' : undefined);
    return label ? { label } : null;
  });
}

/** React hook: resolved show metadata, or null while loading/unknown. */
export function useShowMeta(showUuid: string | undefined | null): ShowMeta | null {
  const [meta, setMeta] = useState<ShowMeta | null>(null);
  useEffect(() => {
    if (!showUuid) {
      setMeta(null);
      return;
    }
    let live = true;
    getShowMeta(showUuid).then((m) => {
      if (live) setMeta(m);
    });
    return () => {
      live = false;
    };
  }, [showUuid]);
  return meta;
}

/** React hook: resolved source (tape) label, or null while loading/unknown. */
export function useSourceMeta(
  showUuid: string | undefined | null,
  sourceUuid: string | undefined | null
): SourceMeta | null {
  const [meta, setMeta] = useState<SourceMeta | null>(null);
  useEffect(() => {
    if (!showUuid || !sourceUuid) {
      setMeta(null);
      return;
    }
    let live = true;
    getSourceMeta(showUuid, sourceUuid).then((m) => {
      if (live) setMeta(m);
    });
    return () => {
      live = false;
    };
  }, [showUuid, sourceUuid]);
  return meta;
}

/** Pretty "Sep 27, 1995" from "1995-09-27". Falls back to the raw value. */
export function prettyDate(displayDate: string | undefined): string {
  if (!displayDate) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(displayDate);
  if (!m) return displayDate;
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${months[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}
