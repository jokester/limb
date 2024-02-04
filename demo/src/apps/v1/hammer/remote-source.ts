import {Socket} from 'socket.io-client';
import {filter, fromEvent, Observable} from 'rxjs';
import {create$UserMessage} from '../user-message';

interface RemoteHammerInput extends Pick<HammerInput, 'type' | 'eventType'> {
  clientId: string;
}

export function createRemoteInput$(
  s: Socket,
  ownClientId: string
): Observable<RemoteHammerInput> {
  const removeInput$ = create$UserMessage<RemoteHammerInput>(s, 'hammerInput');
  return removeInput$.pipe(filter(ev => ev.clientId !== ownClientId));
}
