import type * as CF from '@cloudflare/workers-types';

export type ActorMethodMap = Record<string, (...args: any[]) => unknown>;

const dummyUrlPrefix = 'https://dummy-origin.internal/';

export async function send<
  Methods extends ActorMethodMap,
  M extends keyof Methods,
>(
  dest: {
    kind: CF.DurableObjectNamespace;
    id: CF.DurableObjectId;
  },
  method: M,
  params: Parameters<Methods[M]>
): Promise<unknown> {
  const res = await dest.kind
    .get(dest.id)
    .fetch(`${dummyUrlPrefix}${String(method)}`, {
      method: 'POST',
      // FIXME: content-type?
      body: JSON.stringify(params),
    });
  return res.json();
}

export function buildSend<Methods extends ActorMethodMap>() {
  return send as <M extends keyof Methods>(
    dest: {
      kind: CF.DurableObjectNamespace;
      id: CF.DurableObjectId;
    },
    method: M,
    params: Parameters<Methods[M]>
  ) => Promise<Awaited<ReturnType<Methods[M]>>>;
}
