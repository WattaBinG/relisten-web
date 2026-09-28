import Image from 'next/image';
import Row from './Row';

// TODO: replace this with shadcn/radix

const ITEMS: { href: string; label: string; img: string | null }[] = [
  { href: '/', label: 'Home', img: null },
  { href: '/today', label: 'Today', img: '/nav/today.webp' },
  { href: '/recently-played', label: 'Recent tapes', img: '/nav/tapes.webp' },
  { href: '/tape-box', label: 'Tape Box', img: '/nav/tapebox.webp' },
  { href: '/playlists', label: 'Playlists', img: '/nav/playlists.webp' },
  { href: '/favorites', label: 'Favorites', img: '/nav/favorites.webp' },
  { href: '/app', label: 'App', img: '/nav/app.webp' },
  { href: '/about', label: 'About', img: '/nav/about.webp' },
  { href: '/account', label: 'Account', img: null },
];

const Menu = () => (
  <div className="mt-2 mr-2 w-[190px] rounded-sm border bg-white shadow-lg">
    {ITEMS.map((item) => (
      <Row key={item.href} href={item.href}>
        <span className="flex items-center gap-3">
          {item.img ? (
            <Image
              src={item.img}
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 rounded-lg ring-1 ring-black/10"
            />
          ) : (
            <span className="w-9" aria-hidden="true" />
          )}
          <span>{item.label}</span>
        </span>
      </Row>
    ))}
  </div>
);

export default Menu;
