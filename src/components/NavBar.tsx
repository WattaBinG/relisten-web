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
      {/* Sticky header: logo left, search, player fills the middle, account menu top-right */}
      <div className="navigation text-foreground relative sticky top-0 z-40 flex h-[68px] items-center gap-2 border-b-[1px] border-b-[#aeaeae] bg-white px-2 lg:gap-3 lg:px-4">
        <div className="shrink-0">
          <MainNavHeader
            artistSlugsToName={artistSlugsToName}
            indexOverride={isInIframe ? '/wsp' : undefined}
          />
        </div>
        <div className="hidden w-56 shrink-0 lg:block xl:w-72">
          <BandSearch artists={searchArtists} />
        </div>
        <div className="player min-w-0 flex-1 overflow-hidden text-center xl:mx-auto xl:max-w-[38vw]">
          <Player artistSlugsToName={artistSlugsToName} />
        </div>

        <div className="flex shrink-0 items-center">
          <MobileSearch artists={searchArtists} />
          <div className="px-1">
            <UserMenu />
          </div>

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
