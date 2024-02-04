import {Socket} from 'socket.io-client';
import {filter, Observable} from 'rxjs';
import {create$UserMessage} from '../user-message';

export interface SerializedHammerInput
  extends Pick<HammerInput, 'type' | 'eventType'> {
  clientId: string;
  timestamp: string;
}

export const remoteEventName = 'hammerInput';

export function createRemoteHammerInput$(
  s: Socket,
  ownClientId: string
): Observable<SerializedHammerInput> {
  const removeInput$ = create$UserMessage<SerializedHammerInput>(
    s,
    remoteEventName
  );
  return removeInput$.pipe(filter(ev => ev.clientId !== ownClientId));
}

export function buildRemoteHammerInput(
  orig: HammerInput,
  clientId: string
): SerializedHammerInput {
  return {
    eventType: orig.eventType,
    type: orig.type,
    clientId,
    timestamp: new Date().toISOString(),
  };
}
