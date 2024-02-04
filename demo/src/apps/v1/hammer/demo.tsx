import {PropsWithChildren, useEffect, useRef, useState} from 'react';
import {createHammerManager, createLocalHammerInput$} from './local-source';
import {EMPTY, Observable, Subject} from 'rxjs';
import {useObservable} from '../../../hooks/use-observable';
import {io, Socket} from 'socket.io-client';
import {
  createRemoteHammerInput$,
  remoteEventName,
  SerializedHammerInput,
} from './remote-source';
import {getSocketServerOrigin} from '../../../pages/_shared';
import debug from 'debug';
import {createUnifiedSource, UnifiedHammerInput} from './unify';

const logger = debug('limb:v1:hammer:demo');

export function HammerTouchDemo({
  ownClientId,
  namespace,
}: PropsWithChildren<{namespace: string; ownClientId: string}>) {
  const touchableRef = useRef<HTMLDivElement>(null);
  const [unified$, setUnified$] =
    useState<Observable<UnifiedHammerInput>>(EMPTY);

  useEffect(() => {
    const defaultOrigin = getSocketServerOrigin();

    const socket = io(`${defaultOrigin}/v1/${namespace}`);
    const manager = createHammerManager(touchableRef.current!);

    const localInput$ = createLocalHammerInput$(manager, ownClientId);
    const remoteInput$ = createRemoteHammerInput$(socket, ownClientId);

    const forwardLocal = localInput$.subscribe(ev => {
      socket.volatile.send(remoteEventName, ev);
    });

    const unifiedInput$ = createUnifiedSource(localInput$, remoteInput$);
    setUnified$(unifiedInput$);

    return () => {
      forwardLocal.unsubscribe();
      manager.destroy();
      socket.close();
    };
  }, [namespace, ownClientId]);

  useObservable(unified$, null);

  return (
    <div className="text-center py-2">
      <div
        className="inline-block w-64 h-64 bg-gray-200"
        ref={touchableRef}
      ></div>
    </div>
  );
}
