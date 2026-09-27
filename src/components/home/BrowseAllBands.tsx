import BandCard from './BandCard';
import type { Artist } from '@/types';

const displayName = (a: Artist) => a.sort_name || a.name || '';

export default function BrowseAllBands({ artists }: { artists: Artist[] }) {
  const sorted = [...artists].sort((a, b) => displayName(a).localeCompare(displayName(b)));

  const groups = new Map<string, Artist[]>();
  for (const artist of sorted) {
    const letter = (displayName(artist)[0] || '#').toUpperCase();
    const key = /[A-Z]/.test(letter) ? letter : '#';
    const group = groups.get(key);
    if (group) group.push(artist);
    else groups.set(key, [artist]);
  }

  return (
    <section>
      <h2 className="mb-4 text-xl font-bold tracking-tight">Browse all bands</h2>
      <div className="space-y-10">
        {[...groups.entries()].map(([letter, bands]) => (
          <div key={letter}>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-widest text-foreground-muted">
              {letter}
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {bands.map((artist) => (
                <BandCard key={artist.uuid ?? artist.slug} artist={artist} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
