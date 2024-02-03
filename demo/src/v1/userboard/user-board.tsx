import {Observable, fromEvent, of, filter, map, tap} from 'rxjs';
import {useEffect, useMemo} from 'react';
import type {Socket} from 'socket.io-client';
import debug from 'debug'

const logger = debug('limb:apps:v1:userBoard');

interface UserBoardEntry {
  clientId: string;
  firstSeen: Date;
  lastSeen: Date;
  latency: number;
}

function createUserBoard(conn?: Socket): Observable<UserBoardEntry[]> {
  if (!conn) {
    return of([]);
  }

  const messages: Observable<[messageType: string, payload: unknown]> = fromEvent(conn, 'message');

  const pings= messages.pipe(
    filter(msg => msg[0] === 'ping'),
    map(msg => msg[1] as {clientId: string, timestamp: string}),
    tap()
  );

  return of([])

}

export function useUserBoardState(conn?: Socket) {
  const $userBoard = useMemo(() => createUserBoard(conn), [conn])
  return useObservable($userBoard, [])

}
