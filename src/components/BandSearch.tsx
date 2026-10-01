'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Search, X } from 'lucide-react';
import cn from '@/lib/cn';

export type BandSearchItem = { name: string; slug: string };

/**
 * Band search box with a dropdown of matching bands. `header` is the compact
 * nav-bar version; `hero` is the large prominent version for the homepage.
 */
export default function BandSearch({
  artists,
  variant = 'header',
}: {
  artists: BandSearchItem[];
  variant?: 'header' | 'hero';
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return artists.filter((a) => a.name.toLowerCase().includes(q)).slice(0, 8);
  }, [artists, query]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const isHero = variant === 'hero';

  return (
    <div ref={boxRef} className={cn('relative w-full', isHero && 'max-w-xl')}>
      <Search
        className={cn(
          'pointer-events-none absolute top-1/2 -translate-y-1/2 text-gray-400',
          isHero ? 'left-4 size-5' : 'left-3.5 size-4'
        )}
      />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setOpen(false);
        }}
        placeholder="Search bands…"
        aria-label="Search bands"
        className={cn(
          'w-full text-foreground placeholder:text-gray-400 focus:outline-none',
          isHero
            ? 'rounded-xl border border-gray-200 bg-white py-3 pr-4 pl-11 text-base shadow-sm focus:border-relisten-500 focus:ring-2 focus:ring-relisten-200'
            : 'rounded-full border border-transparent bg-gray-100 py-2 pr-9 pl-10 text-sm focus:border-relisten-400 focus:bg-white focus:ring-2 focus:ring-relisten-200'
        )}
      />
      {!isHero && query && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => setQuery('')}
          className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-0.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
        >
          <X size={14} />
        </button>
      )}
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-xl">
          {results.map((a) => (
            <Link
              key={a.slug}
              href={`/${a.slug}`}
              prefetch={false}
              onClick={() => setOpen(false)}
              className="block truncate px-4 py-2 text-sm text-foreground hover:bg-background-muted"
            >
              {a.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
