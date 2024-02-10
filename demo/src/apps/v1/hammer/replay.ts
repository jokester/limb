import {RefObject, useEffect} from 'react';
import {Observable} from 'rxjs';
import {UnifiedHammerInput} from './unify';
import {animate} from 'framer-motion/dom';

function addTap(parent: HTMLElement | SVGElement, ev: UnifiedHammerInput) {
  const f = document.createElement('div');
  f.className = 'w-4 h-4 bg-red-500 rounded-full absolute';
  parent.appendChild(f);

  setTimeout(() => {
    parent.removeChild(f);
  }, 1e3);
}

export function useInputReplay(
  ref: RefObject<HTMLElement | SVGElement>,
  src: Observable<UnifiedHammerInput>
): void {
  useEffect(() => {
    const elem = ref.current!;

    const timer = setInterval(() => {
      addTap(elem, {
        type: 'tap',
        eventType: 'end',
        clientId: '',
        timestamp: new Date().toISOString(),
        elementSize: {
          width: 100,
          height: 100,
        },
        center: {
          x: 50,
          y: 50,
        },
        latency: 0,
      });
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [src]);
}
