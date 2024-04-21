import type * as CF from '@cloudflare/workers-types';

export interface ActorMethodMap {
  [m: string]: (...args: any[]) => unknown;
}

export function receive<Methods extends ActorMethodMap>(
  payload: any
): [keyof Methods, Methods[keyof Methods]] {
  const {method, params} = payload;
  return [method, params];
}

export async function send<
  Methods extends ActorMethodMap,
  M extends keyof Methods,
>(
  dest: {
    kind: CF.DurableObjectNamespace;
    id: CF.DurableObjectId;
  },
  payload: {
    method: M;
    params: Parameters<Methods[M]>;
  }
): Promise<unknown> {
  const res = await dest.kind
    .get(dest.id)
    .fetch('https://sio-worker.internal', {
      method: 'POST',
      // FIXME: content-type?
      body: JSON.stringify(payload),
    });
  return res.json();
}

export function buildSend<Methods extends ActorMethodMap>() {
  return send as <M extends keyof Methods>(
    dest: {
      kind: CF.DurableObjectNamespace;
      id: CF.DurableObjectId;
    },
    payload: {
      method: M;
      params: Parameters<Methods[M]>;
    }
  ) => Promise<unknown>;
}
