import type * as CF from '@cloudflare/workers-types';
import {ActorMethodMap, buildSend} from './utils/send';

interface Methods extends ActorMethodMap {
  onConnection(sid: string, connParent: CF.DurableObjectId): void;
}

/**
 * works like a hio server
 */
export class SioActor implements CF.DurableObject {
  static readonly send = buildSend<Methods>();
}
