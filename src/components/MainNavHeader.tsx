'use client';

import Image from 'next/image';
import Link from 'next/link';
import Flex from './Flex';
import SecondaryNavBar from './SecondaryNavHeader';
import { usePathname, useRouter } from 'next/navigation';

export default function MainNavHeader({
  artistSlugsToName,
  indexOverride,
}: {
  artistSlugsToName: Record<string, string | undefined>;
  indexOverride?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const onClickNav = () => {
    // trigger RSC refresh if clicking nav again
    if (pathname === '/') {
      router.refresh();
    }
  };

  return (
    <>
      <Flex className="left h-full flex-1 items-center font-medium whitespace-nowrap max-lg:hidden lg:gap-1">
        <Link
          href={indexOverride ?? '/'}
          className="text-center"
          prefetch={false}
          onClick={onClickNav}
          aria-label="The Lot home"
        >
          <Image
            src="/brand/logo-on-light.png"
            alt="The Lot"
            width={96}
            height={32}
            className="h-8 w-auto"
            priority
          />
        </Link>
        <SecondaryNavBar artistSlugsToName={artistSlugsToName} />
      </Flex>
      <Flex className="h-full pr-2 font-medium lg:hidden" center>
        <Link href={indexOverride ?? '/'} prefetch={false} aria-label="The Lot home">
          <Image
            src="/brand/logo-on-light.png"
            alt="The Lot"
            width={84}
            height={28}
            className="h-7 w-auto"
            priority
          />
        </Link>
      </Flex>
    </>
  );
}
