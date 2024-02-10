import {PropsWithChildren, useEffect, useRef, useState} from 'react';
import {createHammerManager, createLocalHammerInput$} from './local-source';
import {EMPTY, Observable, share} from 'rxjs';
import {useObservable} from '../../../hooks/use-observable';
import {io} from 'socket.io-client';
import {createRemoteHammerInput$, remoteEventName} from './remote-source';
import {getSocketServerOrigin} from '../../../pages/_shared';
import debug from 'debug';
import {createUnifiedSource, UnifiedHammerInput} from './unify';
import {useInputReplayElements} from './replay';

const logger = debug('limb:v1:hammer:demo');

export function HammerTouchDemo({
  ownClientId,
  namespace,
}: PropsWithChildren<{namespace: string; ownClientId: string}>) {
  const touchableRef = useRef<SVGSVGElement>(null);
  const [unified$, setUnified$] =
    useState<Observable<UnifiedHammerInput>>(EMPTY);

  useEffect(() => {
    const defaultOrigin = getSocketServerOrigin();

    const socket = io(`${defaultOrigin}/v1/${namespace}`);
    const manager = createHammerManager(touchableRef.current!);

    const localInput$ = createLocalHammerInput$(
      manager,
      ownClientId,
      touchableRef.current!
    ).pipe(share());

    const remoteInput$ = createRemoteHammerInput$(socket, ownClientId);

    const forwardLocal = localInput$.subscribe(ev => {
      logger('forward local event', ev);
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

  const svgChildren = useInputReplayElements(unified$, ownClientId);

  return (
    <div className="text-center py-2">
      <svg className="inline-block w-64 h-64 bg-gray-200" ref={touchableRef}>
        {svgChildren}
      </svg>
    </div>
  );
}
