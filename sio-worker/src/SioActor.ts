import type * as CF from '@cloudflare/workers-types';
import {WorkerBindings} from './workerApp';

interface Methods {
  onConnection(w): void;
}

export class SioActor implements CF.DurableObject {
  static async send<T>(
    dest: CF.DurableObjectId,
    payload: unknown,
    bnd: WorkerBindings,
    sender?: CF.DurableObjectId
  ): Promise<unknown> {
    const res = await bnd.sioActor
      .get(dest)
      .fetch('https://sio-worker.internal', {
        method: 'POST',
        body: payload as any,
      });
    return res.json();
  }
}
