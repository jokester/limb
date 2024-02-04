import {PropsWithChildren, useEffect, useRef, useState} from 'react';
import {createHammerManager, createLocalHammerInput$} from './local-source';
import {EMPTY, Observable} from 'rxjs';
import {useObservable} from '../../../hooks/use-observable';

export function HammerTouchDemo(props: PropsWithChildren<{onEvent?: unknown}>) {
  const touchableRef = useRef<HTMLDivElement>(null);
  const [localEvent$, setLocalEvent$] =
    useState<Observable<HammerInput>>(EMPTY);

  useEffect(() => {
    const manager = createHammerManager(touchableRef.current!);

    setLocalEvent$(createLocalHammerInput$(manager));

    return () => {
      manager.destroy();
    };
  }, []);

  const wtf = useObservable(localEvent$, null);

  return (
    <div className="text-center py-2">
      <div
        className="inline-block w-64 h-64 bg-gray-200"
        ref={touchableRef}
      ></div>
    </div>
  );
}
