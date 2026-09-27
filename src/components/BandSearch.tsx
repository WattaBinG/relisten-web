'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
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
    <div ref={boxRef} className={cn('relative', isHero ? 'w-full max-w-xl' : 'w-52')}>
      <Search
        className={cn(
          'pointer-events-none absolute top-1/2 -translate-y-1/2 text-foreground-muted',
          isHero ? 'left-4 size-5' : 'left-3 size-4'
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
          'w-full border border-gray-200 bg-white text-foreground placeholder:text-foreground-muted focus:border-relisten-500 focus:ring-2 focus:ring-relisten-200 focus:outline-none',
          isHero ? 'rounded-xl py-3 pr-4 pl-11 text-base shadow-sm' : 'rounded-full py-1.5 pr-3 pl-9 text-sm'
        )}
      />
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
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
