import NavBar from '@/components/NavBar';
import Flex from '@/components/Flex';
import { Toaster } from 'sonner';
import { PropsWithChildren } from 'react';

export default function PagesLayout({ children }: PropsWithChildren) {
  return (
    <Flex column className="h-screen">
      <Toaster position="top-center" offset="54px" richColors closeButton />
      <NavBar />
      <div className="flex-1 overflow-y-auto px-4 pb-24">
        <div className="mx-auto max-w-2xl py-8">{children}</div>
      </div>
    </Flex>
  );
}
