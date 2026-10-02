import Link from 'next/link';
import type { ReactNode } from 'react';

/** Horizontal scrolling shelf with a title row, for the Home page. */
export default function ShowShelf({
  title,
  actionHref,
  actionLabel,
  children,
}: {
  title: string;
  actionHref?: string;
  actionLabel?: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-xl font-bold tracking-tight">{title}</h2>
        {actionHref && (
          <Link
            href={actionHref}
            prefetch={false}
            className="text-sm font-medium text-relisten-700 hover:underline"
          >
            {actionLabel ?? 'See all'}
          </Link>
        )}
      </div>
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2">{children}</div>
    </section>
  );
}
