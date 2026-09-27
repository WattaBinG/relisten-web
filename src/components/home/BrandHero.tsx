import Image from 'next/image';

/**
 * Brand banner for the homepage: the locked sunset-van hero art with a
 * short tagline scrimmed over the lower-left. Pure brand, no data.
 */
export default function BrandHero() {
  return (
    <section className="relative overflow-hidden rounded-2xl shadow-lg">
      <Image
        src="/brand/web-hero-wide.png"
        alt="The Lot — live jamband music"
        width={2400}
        height={1200}
        className="h-auto w-full"
        priority
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/55 to-transparent"
      />
      <p className="absolute bottom-4 left-5 text-sm font-semibold tracking-wide text-white/95 sm:bottom-6 sm:left-8 sm:text-base">
        Every show. Every tape. Welcome to the lot.
      </p>
    </section>
  );
}
