import type * as CF from '@cloudflare/workers-types';
import * as sio from 'socket.io'
import {lazy} from "./utils/lazy";

/**
 * works like a socket.io server
 */
export class SocketActor implements CF.DurableObject {
  readonly honoApp = lazy(() => 0)

}
