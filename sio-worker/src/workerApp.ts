import {Hono, TypedResponse, HonoRequest} from 'hono';
import type {EngineActor} from './EngineActor';
import type {DurableObjectNamespace} from '@cloudflare/workers-types';

export interface WorkerBindings extends Record<string, unknown> {
  engineActor: DurableObjectNamespace;
}

export const workerApp = new Hono<{Bindings: WorkerBindings}>().all(
  '/engine.io/',
  ctx => {
    const actorId = ctx.env.engineActor.idFromName('temp-actor');
    const actor = ctx.env.engineActor.get(actorId);
    return actor
      .fetch(`https://fake-url.com`, ctx.req.raw)
      .then(res => new Response(res.body, res));
  }
);
