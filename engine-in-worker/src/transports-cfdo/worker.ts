import {} from '@cloudflare/workers-types';
import {Hono, TypedResponse, HonoRequest} from 'hono';

const app = new Hono<{Bindings: {}}>().get('/*', ctx => {
  return ctx.text('It works!');
});

export default app;
