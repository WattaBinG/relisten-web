import Flex from './Flex';
import Menu from './Menu';
import Player from './Player';
import ImageNavStrip from './ImageNavStrip';
import MobileSearch from './MobileSearch';
import * as Popover from '@/components/Popover';
import RelistenAPI from '@/lib/RelistenAPI';
import MainNavHeader from './MainNavHeader';
import AuthButton from './auth/AuthButton';
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
      {/* Sticky so the logo (home), band search, and player stay reachable while scrolling */}
      <div className="navigation text-foreground relative sticky top-0 z-40 grid h-[50px] max-h-[50px] min-h-[50px] grid-cols-[auto_1fr_auto] border-b-[1px] border-b-[#aeaeae] bg-white px-2 lg:grid-cols-[auto_auto_minmax(0,1fr)_auto] lg:px-4">
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

        <div className="nav hidden h-full min-w-0 cursor-pointer items-center justify-self-end text-center font-medium whitespace-nowrap xl:flex">
          <div className="flex h-full items-center">
            <AuthButton />
          </div>
        </div>
      </div>
      <ImageNavStrip />
    </>
  );
}
