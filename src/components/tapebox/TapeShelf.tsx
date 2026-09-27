'use client';

import Link from 'next/link';
import CassetteTape from './CassetteTape';
import { tapeShowPath, type Tape } from '@/lib/cloud/tapebox';

/**
 * A shelf of cassette tapes — the basement-archive vibe.
 * Slight deterministic rotation per tape so a full shelf doesn't look copy-pasted.
 */
export default function TapeShelf({
  tapes,
  tapeWidth = 240,
}: {
  tapes: Tape[];
  tapeWidth?: number;
}) {
  if (tapes.length === 0) return null;

  return (
    <div
      className="rounded-xl p-6"
      style={{
        background: 'linear-gradient(180deg, #4a3826 0%, #3a2c1e 60%, #2e2317 100%)',
        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)',
      }}
    >
      <div className="flex flex-wrap items-end justify-center gap-x-6 gap-y-8">
        {tapes.map((t) => (
          <Link
            key={t.id}
            href={tapeShowPath(t)}
            title={`${t.artist_name} — ${t.show_date}${t.venue_name ? ` @ ${t.venue_name}` : ''}`}
            className="transition-transform duration-150 hover:-translate-y-1 hover:scale-[1.03]"
          >
            <CassetteTape
              artistName={t.artist_name}
              showDate={t.show_date}
              venueName={t.venue_name}
              seed={t.show_uuid}
              width={tapeWidth}
            />
          </Link>
        ))}
      </div>
      {/* shelf edge */}
      <div
        className="mt-6 h-3 rounded-sm"
        style={{ background: 'linear-gradient(180deg, #6b5236 0%, #4a3826 100%)' }}
      />
    </div>
  );
}
