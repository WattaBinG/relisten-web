import Flex from './Flex';
import Menu from './Menu';
import Player from './Player';
import ImageNavStrip from './ImageNavStrip';
import MobileSearch from './MobileSearch';
import * as Popover from '@/components/Popover';
import RelistenAPI from '@/lib/RelistenAPI';
import MainNavHeader from './MainNavHeader';
import UserMenu from './auth/UserMenu';
import BandSearch from './BandSearch';
import { MenuIcon } from 'lucide-react';
import { getIsInIframe } from '@/lib/isInIframe';

export default async function NavBar() {
  const [artists, isInIframe] = await Promise.all([RelistenAPI.fetchArtists(), getIsInIframe()]);

  const artistSlugsToName = artists.reduce(
    (memo, next) => {
      memo[String(next.slug)] = next.name;

      return memo;
    },
    {} as Record<string, string | undefined>
  );

  const searchArtists = artists.flatMap((a) =>
    a.name && a.slug ? [{ name: a.name, slug: a.slug }] : []
  );

  return (
    <>
      {/* Sticky so the account menu, logo, band search, and player stay reachable while scrolling */}
      <div className="navigation text-foreground relative sticky top-0 z-40 grid h-[68px] max-h-[68px] min-h-[68px] grid-cols-[auto_auto_1fr_auto] border-b-[1px] border-b-[#aeaeae] bg-white px-2 lg:grid-cols-[auto_auto_auto_minmax(0,1fr)_auto] lg:px-4">
        <div className="flex h-full items-center">
          <UserMenu />
        </div>
        <MainNavHeader
          artistSlugsToName={artistSlugsToName}
          indexOverride={isInIframe ? '/wsp' : undefined}
        />
        <div className="hidden h-full items-center pl-3 lg:flex">
          <BandSearch artists={searchArtists} />
        </div>
        <div className="player min-w-0 overflow-hidden text-center lg:justify-self-center xl:max-w-[38vw]">
          <Player artistSlugsToName={artistSlugsToName} />
        </div>

        <div className="flex h-full items-center">
          <MobileSearch artists={searchArtists} />

          <Popover.Root>
            <Popover.Trigger className="ml-2 h-full w-min cursor-pointer content-end items-center justify-self-end text-center font-medium xl:hidden">
              <Flex className="ml-2 h-full cursor-pointer content-end items-center text-center font-medium xl:hidden">
                <div className="active:text-foreground active:relative active:top-[1px] ml-auto flex h-full items-center px-1">
                  <MenuIcon />
                </div>
              </Flex>
            </Popover.Trigger>
            {/* <Popover.Anchor /> */}
            <Popover.Portal>
              <Popover.Content>
                <Menu />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>
      </div>
      <ImageNavStrip />
    </>
  );
}
