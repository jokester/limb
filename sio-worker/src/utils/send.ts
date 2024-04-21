import type * as CF from '@cloudflare/workers-types';
import {WorkerBindings} from '../workerApp';

export interface ActorMethodMap {
  [m: string]: (...args: any[]) => unknown;
}

export function buildSend<Methods extends ActorMethodMap>() {
  return async function send<M extends keyof Methods>(
    dest: {
      kind: CF.DurableObjectNamespace;
      id: CF.DurableObjectId;
    },
    payload: {
      method: M;
      params: Parameters<Methods[M]>;
    },
    _sender?: CF.DurableObjectId
  ): Promise<unknown> {
    const res = await dest.kind
      .get(dest.id)
      .fetch('https://sio-worker.internal', {
        method: 'POST',
        // FIXME: content-type?
        body: JSON.stringify({...payload, _sender}),
      });
    return res.json();
  };
}
