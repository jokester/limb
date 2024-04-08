import {Hono, TypedResponse, HonoRequest} from 'hono';
import type {EngineActor} from './EngineActor';

export const workerApp = new Hono<{Bindings: {engine: EngineActor}}>().all(
  '/*',
  ctx => {
    return ctx.text('It works!');
  }
);
