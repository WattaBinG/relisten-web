'use client';

import Link from 'next/link';
import { Caveat } from 'next/font/google';
import { tapeShowPath, type Tape } from '@/lib/cloud/tapebox';

const handwriting = Caveat({ subsets: ['latin'], weight: ['500', '700'] });

/** Deterministic pick from a seed string so a tape always looks the same. */
function pick<T>(arr: readonly T[], seed: string): T {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return arr[h % arr.length];
}

const STRIPE_COLORS = [
  '#e8590c',
  '#d6336c',
  '#2f9e44',
  '#1971c2',
  '#9c36b5',
  '#e67700',
  '#0c8599',
] as const;

const SPINE_TINTS = ['#f7f2e3', '#f5efe0', '#faf6ea', '#f3ecdc'] as const;

const EMPTY_SLOTS = 12;

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${Number(m)}/${Number(d)}/${String(y).slice(2)}`;
}

/**
 * One tape as its spine — Sharpie handwriting running down the spine,
 * the way a dubbed tape looks lined up in a wall rack.
 */
function TapeSpine({ tape, index }: { tape: Tape; index: number }) {
  const stripe = pick(STRIPE_COLORS, tape.show_uuid);
  const tint = pick(SPINE_TINTS, tape.id);

  return (
    <Link
      href={tapeShowPath(tape)}
      title={`${tape.artist_name} — ${tape.show_date}${tape.venue_name ? ` @ ${tape.venue_name}` : ''}`}
      className="tape-spine block w-11 shrink-0 transition-transform duration-150 hover:-translate-y-2"
      style={{ animationDelay: `${Math.min(index, 24) * 35}ms` }}
    >
      <div
        className="relative flex h-52 w-11 flex-col overflow-hidden rounded-[3px]"
        style={{
          background: tint,
          boxShadow: '2px 3px 5px rgba(0,0,0,0.45)',
        }}
      >
        {/* top label stripe */}
        <div className="h-2.5 w-full shrink-0" style={{ background: stripe }} />
        {/* handwritten spine text, rotated like a real tape spine */}
        <div className="relative flex-1">
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={`${handwriting.className} -rotate-90 text-center leading-tight text-[#262626]`}
              style={{ width: 168 }}
            >
              <div className="truncate text-[17px] font-bold">{tape.artist_name}</div>
              <div className="truncate text-[13px]">
                {formatDate(tape.show_date)}
                {tape.venue_name ? ` · ${tape.venue_name}` : ''}
              </div>
            </div>
          </div>
        </div>
        {/* bottom stripe */}
        <div className="h-1.5 w-full shrink-0 opacity-70" style={{ background: stripe }} />
        {/* spine edge shading */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-[3px] bg-white/60" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[2px] bg-black/15" />
      </div>
    </Link>
  );
}

function EmptySlot() {
  return (
    <div
      aria-hidden="true"
      className="h-52 w-11 shrink-0 rounded-[3px]"
      style={{
        background: 'rgba(0,0,0,0.32)',
        boxShadow: 'inset 2px 2px 5px rgba(0,0,0,0.55)',
      }}
    />
  );
}

/**
 * The tape box as a wall rack: tapes stand spine-out in slots, Sharpie
 * labels down the spine, empty grooves waiting for the collection to grow.
 * Oldest dubs first, left to right, like a real shelf filling up.
 */
export default function TapeShelf({ tapes }: { tapes: Tape[] }) {
  if (tapes.length === 0) return null;

  const ordered = [...tapes].reverse();

  return (
    <div
      className="overflow-hidden rounded-xl"
      style={{
        background: 'linear-gradient(180deg, #4a3826 0%, #3a2c1e 60%, #2e2317 100%)',
        boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.4)',
      }}
    >
      <style>{`@keyframes tape-slide-in { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } } .tape-spine { animation: tape-slide-in 0.35s ease-out both; } .tape-spine:hover { animation: none; }`}</style>
      {/* top rail */}
      <div
        className="h-2.5"
        style={{ background: 'linear-gradient(180deg, #6b5236 0%, #4a3826 100%)' }}
      />
      <div className="flex flex-wrap items-end gap-x-[5px] gap-y-4 px-5 pt-5">
        {ordered.map((t, i) => (
          <TapeSpine key={t.id} tape={t} index={i} />
        ))}
        {Array.from({ length: EMPTY_SLOTS }).map((_, i) => (
          <EmptySlot key={`empty-${i}`} />
        ))}
      </div>
      {/* shelf board */}
      <div
        className="mx-3 mt-4 mb-3 h-3.5 rounded-sm"
        style={{
          background: 'linear-gradient(180deg, #7a5f3d 0%, #4a3826 100%)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
        }}
      />
    </div>
  );
}
