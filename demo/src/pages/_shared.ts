export function getSocketServerOrigin(): string {
  const isUnsafeOrigin = location.protocol !== 'https:';
  return isUnsafeOrigin ? 'http://localhost:3000' : 'https://limb.jokester.io';
}

export interface PageProps<M extends Record<string, string> = {}> {
  // e.g. /conn/:id
  path: string;

  // e.g. /conn/123
  url?: string;

  matches?: M;
}
