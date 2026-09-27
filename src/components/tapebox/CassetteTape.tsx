'use client';

import { Caveat } from 'next/font/google';

const handwriting = Caveat({ subsets: ['latin'], weight: ['500', '700'] });

export interface CassetteTapeProps {
  artistName: string;
  showDate: string; // YYYY-MM-DD
  venueName?: string | null;
  /** Deterministic variation seed (e.g. show_uuid). */
  seed?: string;
  /** Width in px. Height follows the ~1.56:1 cassette ratio. */
  width?: number;
  className?: string;
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

// Maxell XL-II *inspired* stripe palettes — generic, not trademark copies.
const PALETTES = [
  { stripe1: '#1a1a1a', stripe2: '#c9a227', label: '#f2ecd9' }, // black + gold
  { stripe1: '#7a1f1f', stripe2: '#e8e2d0', label: '#f5f1e4' }, // oxblood + cream
  { stripe1: '#1f3a5f', stripe2: '#c0c6cc', label: '#eef0ea' }, // navy + silver
  { stripe1: '#2d4a22', stripe2: '#d8b93c', label: '#f2ecd9' }, // forest + gold
];

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${m}/${d}/${y.slice(2)}` : iso;
}

/** A vintage 90-minute chrome cassette, drawn in SVG. Pure CSS/SVG — no images. */
export default function CassetteTape({
  artistName,
  showDate,
  venueName,
  seed = artistName + showDate,
  width = 280,
  className = '',
}: CassetteTapeProps) {
  const h = hashStr(seed);
  const rotation = (h % 7) - 3; // -3..+3 degrees
  const palette = PALETTES[h % PALETTES.length];
  const height = Math.round(width / 1.5625);

  // Handwritten lines, Sharpie-on-label style
  const line1 = artistName.length > 22 ? artistName.slice(0, 21) + '…' : artistName;
  const line2 = venueName
    ? `${formatDate(showDate)} · ${venueName.length > 26 ? venueName.slice(0, 25) + '…' : venueName}`
    : formatDate(showDate);

  return (
    <div
      className={className}
      style={{
        width,
        transform: `rotate(${rotation}deg)`,
        filter: 'drop-shadow(0 10px 14px rgba(0,0,0,0.35))',
      }}
      aria-label={`${artistName} — ${showDate} cassette tape`}
    >
      <svg viewBox="0 0 400 256" width={width} height={height} role="img">
        <defs>
          <linearGradient id={`shell-${h % 997}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a3a40" />
            <stop offset="100%" stopColor="#232327" />
          </linearGradient>
          <linearGradient id={`win-${h % 997}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#141416" />
            <stop offset="100%" stopColor="#1e1e22" />
          </linearGradient>
        </defs>

        {/* shell */}
        <rect x="4" y="4" width="392" height="248" rx="14" fill={`url(#shell-${h % 997})`} />
        <rect x="4" y="4" width="392" height="248" rx="14" fill="none" stroke="#111" strokeWidth="2" />

        {/* corner screws */}
        {[
          [22, 22],
          [378, 22],
          [22, 234],
          [378, 234],
        ].map(([cx, cy]) => (
          <g key={`${cx}-${cy}`}>
            <circle cx={cx} cy={cy} r="7" fill="#151517" stroke="#55555c" strokeWidth="1.5" />
            <line x1={cx - 4} y1={cy} x2={cx + 4} y2={cy} stroke="#77777e" strokeWidth="1.6" />
          </g>
        ))}

        {/* label sticker */}
        <rect x="28" y="26" width="344" height="150" rx="6" fill={palette.label} />
        <rect x="28" y="26" width="344" height="150" rx="6" fill="none" stroke="#00000022" strokeWidth="1" />

        {/* label stripes (XL-II inspired) */}
        <rect x="28" y="26" width="344" height="14" rx="6" fill={palette.stripe1} />
        <rect x="28" y="40" width="344" height="6" fill={palette.stripe2} />
        <rect x="28" y="26" width="344" height="14" rx="6" fill="none" stroke="#00000033" strokeWidth="1" />

        {/* CHROME 90 badge */}
        <text
          x="360"
          y="58"
          textAnchor="end"
          fontFamily="Arial, sans-serif"
          fontSize="13"
          fontWeight="bold"
          letterSpacing="1"
          fill="#333"
        >
          CHROME 90
        </text>
        <text
          x="40"
          y="58"
          fontFamily="Arial, sans-serif"
          fontSize="11"
          letterSpacing="3"
          fill="#555"
        >
          Ⓐ
        </text>

        {/* handwritten label text — Sharpie style */}
        <text
          x="200"
          y="96"
          textAnchor="middle"
          className={handwriting.className}
          fontSize="30"
          fontWeight="700"
          fill="#1c2a6b"
          transform={`rotate(-1 200 96)`}
        >
          {line1}
        </text>
        <text
          x="200"
          y="128"
          textAnchor="middle"
          className={handwriting.className}
          fontSize="22"
          fontWeight="500"
          fill="#1c2a6b"
          transform={`rotate(0.6 200 128)`}
        >
          {line2}
        </text>

        {/* reel window */}
        <rect x="110" y="136" width="180" height="56" rx="10" fill={`url(#win-${h % 997})`} stroke="#0c0c0e" strokeWidth="2" />
        {/* tape band between reels */}
        <rect x="146" y="158" width="108" height="10" fill="#4a2c14" />

        {/* reels */}
        {[158, 242].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy={164} r="24" fill="#e8e4d8" stroke="#999" strokeWidth="1.5" />
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <line
                key={a}
                x1={cx}
                y1={164}
                x2={cx + 19 * Math.cos((a * Math.PI) / 180)}
                y2={164 + 19 * Math.sin((a * Math.PI) / 180)}
                stroke="#b8b2a0"
                strokeWidth="4"
              />
            ))}
            <circle cx={cx} cy={164} r="7" fill="#2a2a2e" stroke="#777" strokeWidth="1" />
          </g>
        ))}

        {/* bottom trapezoid cutouts (classic cassette shape) */}
        <path d="M 60 208 L 110 246 L 60 246 Z" fill="#17171a" />
        <path d="M 340 208 L 290 246 L 340 246 Z" fill="#17171a" />
        <rect x="118" y="214" width="164" height="26" rx="4" fill="#17171a" />
        {/* tape head holes */}
        <circle cx="170" cy="227" r="7" fill="#0c0c0e" stroke="#3c3c42" strokeWidth="1.5" />
        <circle cx="230" cy="227" r="7" fill="#0c0c0e" stroke="#3c3c42" strokeWidth="1.5" />
      </svg>
    </div>
  );
}
