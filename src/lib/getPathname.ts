import { headers } from 'next/headers';

/** Current request pathname, set by src/middleware.ts. Null if unavailable. */
export async function getPathname(): Promise<string | null> {
  const list = await headers();
  return list.get('x-pathname');
}
