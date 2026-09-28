'use client';

import { useEffect, useState } from 'react';
import { Search, X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import BandSearch, { type BandSearchItem } from './BandSearch';

/**
 * Mobile (< lg) search toggle for the top nav bar. The header search input
 * only fits at lg+, so on smaller screens this icon button expands a
 * full-width search row pinned just under the sticky bar.
 */
export default function MobileSearch({ artists }: { artists: BandSearchItem[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Collapse the panel whenever the user navigates somewhere.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      <button
        type="button"
        aria-label={open ? 'Close band search' : 'Search bands'}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-full items-center px-2 text-foreground lg:hidden"
      >
        {open ? <X className="size-5" /> : <Search className="size-5" />}
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-40 border-b border-gray-200 bg-white px-3 py-2 shadow-md lg:hidden">
          <BandSearch artists={artists} variant="hero" />
        </div>
      )}
    </>
  );
}
