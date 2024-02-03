export function getSocketServerOrigin(): string {
  const isLocalOrigin = ['localhost', '127.0.0.1'].includes(location.hostname);
  const defaultOrigin = isLocalOrigin
    ? 'http://localhost:3000'
    : 'https://limb.jokester.io';
  return defaultOrigin;
}

export interface PageProps<M extends Record<string, string> = {}> {
  // e.g. /conn/:id
  path: string;

  // e.g. /conn/123
  url?: string;

  matches?: M;
}
