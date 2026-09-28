import { createClient } from '@supabase/supabase-js';
import ImageResponse from '@takumi-rs/image-response';

/**
 * Dynamic link-preview image for public playlists: 1200x630 card with the
 * playlist name, track count, and owner. Private/missing playlists 404 so
 * nothing leaks to crawlers.
 */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('id') ?? '';
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return new Response('bad id', { status: 400 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return new Response('unconfigured', { status: 500 });

  const sb = createClient(url, key);
  const { data: pl } = await sb
    .from('playlists')
    .select('name,user_id,is_public')
    .eq('id', id)
    .maybeSingle();
  if (!pl || !pl.is_public) return new Response('not found', { status: 404 });

  const [{ count }, { data: owner }] = await Promise.all([
    sb.from('playlist_tracks').select('id', { count: 'exact', head: true }).eq('playlist_id', id),
    sb.from('profiles').select('username').eq('id', pl.user_id).maybeSingle(),
  ]);

  const name = pl.name as string;
  const trackCount = count ?? 0;
  const byline = owner?.username ? `@${owner.username}` : 'The Lot';

  return new ImageResponse(
    <div
      tw="flex flex-col w-full h-full justify-between"
      style={{ backgroundColor: '#171310', padding: '64px 72px' }}
    >
      {/* wordmark */}
      <div tw="flex items-center">
        <div
          tw="flex rounded-full"
          style={{ width: 18, height: 18, backgroundColor: '#f97316', marginRight: 14 }}
        />
        <div tw="text-white font-bold" style={{ fontSize: 30, letterSpacing: '0.28em' }}>
          THE LOT
        </div>
      </div>

      {/* playlist name */}
      <div tw="flex flex-col">
        <div
          tw="text-white font-bold"
          style={{
            fontSize: name.length > 32 ? 56 : 76,
            lineHeight: 1.08,
            letterSpacing: '-0.02em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '1056px',
          }}
        >
          {name}
        </div>
        <div tw="flex" style={{ marginTop: 20 }}>
          <div
            tw="text-white font-bold"
            style={{
              fontSize: 30,
              backgroundColor: '#f97316',
              borderRadius: 999,
              padding: '8px 26px',
            }}
          >
            {trackCount} {trackCount === 1 ? 'track' : 'tracks'}
          </div>
        </div>
      </div>

      {/* footer */}
      <div tw="flex items-center justify-between">
        <div tw="text-white" style={{ fontSize: 28, opacity: 0.65 }}>
          Playlist by {byline}
        </div>
        <div tw="text-white font-bold" style={{ fontSize: 24, opacity: 0.45 }}>
          Live jamband music
        </div>
      </div>
    </div>,
    { width: 1200, height: 630 }
  );
}
