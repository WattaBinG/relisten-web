'use client';

import { useState } from 'react';

/** Star rating display. Interactive when onRate is provided. */
export default function Stars({
  value,
  onRate,
  size = 18,
}: {
  value: number; // 0-5, may be fractional for averages
  onRate?: (n: number) => void;
  size?: number;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="inline-flex items-center gap-0.5" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = shown >= n - 0.25;
        const half = !filled && shown >= n - 0.75;
        return (
          <button
            key={n}
            type="button"
            disabled={!onRate}
            onClick={() => onRate?.(n)}
            onMouseEnter={() => onRate && setHover(n)}
            className={onRate ? 'cursor-pointer' : 'cursor-default'}
            aria-label={onRate ? `Rate ${n} stars` : `${value.toFixed(1)} stars`}
          >
            <svg
              width={size}
              height={size}
              viewBox="0 0 24 24"
              fill={filled ? '#f59e0b' : half ? 'url(#half)' : 'none'}
              stroke="#f59e0b"
              strokeWidth="1.5"
            >
              {half && (
                <defs>
                  <linearGradient id="half">
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="50%" stopColor="transparent" />
                  </linearGradient>
                </defs>
              )}
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          </button>
        );
      })}
    </div>
  );
}
