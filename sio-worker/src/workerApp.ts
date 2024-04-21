import {Hono} from 'hono';
import type {DurableObjectNamespace} from '@cloudflare/workers-types';

export interface WorkerBindings extends Record<string, unknown> {
  engineActor: DurableObjectNamespace;
  sioActor: DurableObjectNamespace;
}

export const workerApp = new Hono<{Bindings: WorkerBindings}>().all(
  '/socket.io/*',
  ctx => {
    const actorId = ctx.env.engineActor.idFromName('singleton');
    const actor = ctx.env.engineActor.get(actorId);
    return actor
      .fetch('https://engineActor.internal/singleton', ctx.req.raw)
      .then(res => new Response(res.body, res));
  }
);
