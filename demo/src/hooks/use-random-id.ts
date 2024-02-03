import {useSingleton} from 'foxact/use-singleton';

export function useRandomId(prefix?: string): string {
  return useSingleton(() =>
    [prefix ?? '', Math.random().toString(36).substring(2)].join('')
  ).current;
}
