import {PropsWithChildren, useRef} from 'react';

export function HammerTouchDemo(props: PropsWithChildren<{onEvent?: unknown}>) {
  const touchableRef = useRef<HTMLDivElement>(null);

  return <div className={''}></div>;
}
