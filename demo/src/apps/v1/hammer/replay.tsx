import {useEffect, useRef, useState, ReactElement} from 'react';
import {Observable} from 'rxjs';
import {UnifiedHammerInput} from './unify';
import {motion} from 'framer-motion';

const motionCircleProps = {
  fill: 'transparent',
  strokeWidth: 2,
  initial: {r: 0},
  animate: {r: 100},
  transition: {r: {delay: 0, duration: 3}},
} as const;

export function useInputReplayElements(
  src: Observable<UnifiedHammerInput>,
  ownClientId?: string
): ReactElement[] {
  const elementCount = useRef(0);

  const [elements, setElements] = useState<ReactElement[]>(() => []);

  useEffect(() => {
    function removeElement(e: unknown) {
      setElements(prev => prev.filter(i => i !== e));
    }
    const s1 = src.subscribe(ev => {
      const stroke = ev.clientId === ownClientId ? '#00ff00' : '#ff0000';
      if (ev.type === 'tap') {
        const e = (
          <motion.circle
            {...motionCircleProps}
            stroke={stroke}
            cx={ev.center.x}
            cy={ev.center.y}
            key={++elementCount.current}
            onAnimationComplete={() => removeElement(e)}
          ></motion.circle>
        );

        setElements(prev => [...prev, e]);
      } else if (ev.type === 'doubletap') {
        const e = (
          <motion.circle
            {...motionCircleProps}
            stroke={stroke}
            cx={ev.center.x}
            cy={ev.center.y}
            strokeWidth={5}
            key={++elementCount.current}
            onAnimationComplete={() => removeElement(e)}
          ></motion.circle>
        );

        setElements(prev => [...prev, e]);
      }
    });

    return () => {
      s1.unsubscribe();
    };
  }, [src]);
  return elements;
}
