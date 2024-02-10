import type {Socket} from 'socket.io-client';
import {filter, fromEvent, map, Observable, tap} from 'rxjs';
import debug from 'debug';

const logger = debug('limb:v1:user-message');

export function create$UserMessage<T extends object>(
  socket: Socket,
  name: string
) {
  const messages: Observable<[messageType: string, payload: T]> = fromEvent(
    socket,
    'message'
  );

  return messages.pipe(
    filter(msg => msg[0] === name),
    map(msg => msg[1] as T),
    tap(ev => logger(name, ev))
  );
}
