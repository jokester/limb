import {useSingleton} from 'foxact/use-singleton';

export function useRandomId(): string {
  return useSingleton(() => Math.random().toString(36).substring(2)).current;
}
