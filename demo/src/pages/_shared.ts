export function getSocketServerOrigin(): string {
  const isUnsafeOrigin = location.protocol !== 'https:';
  console.error(
    'isUnsafeOrigin',
    isUnsafeOrigin,
    location.protocol,
    location.host
  );
  return isUnsafeOrigin ? 'http://localhost:3000' : 'https://limb.jokester.io';
}

export interface PageProps<M extends Record<string, string> = {}> {
  // e.g. /conn/:id
  path: string;

  // e.g. /conn/123
  url?: string;

  matches?: M;
}
