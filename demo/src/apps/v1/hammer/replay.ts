import {RefObject, useEffect} from 'react';
import {Observable} from 'rxjs';
import {UnifiedHammerInput} from './unify';
import {animate} from 'framer-motion';

function addTap(parent: HTMLElement, ev: UnifiedHammerInput) {
  const f = document.createElement('div');
  f.className = 'w-4 h-4 bg-red-500 rounded-full absolute';
  parent.appendChild(f);

  setTimeout(() => {
    parent.removeChild(f);
  }, 1e3);
}

export function useInputReplay(
  ref: RefObject<HTMLElement>,
  src: Observable<UnifiedHammerInput>
): void {
  useEffect(() => {
    const elem = ref.current!;

    const timer = setInterval(() => {
      addTap(elem, {type: 'tap'});
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [src]);
}
