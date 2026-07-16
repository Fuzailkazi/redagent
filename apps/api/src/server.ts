/**
 * @armoriq/api entrypoint. Builds the Fastify server (real prisma + BullMQ queue)
 * and binds a port. Tests use buildServer() + .inject() instead and never run this.
 *
 * Env: DATABASE_URL (prisma), REDIS_URL (queue), PORT (default 3001). Load a repo
 * .env with `node --env-file=.env dist/server.js` if not injected by the shell.
 */

import { buildServer } from './app.js';

const app = buildServer();
const port = Number(process.env.PORT) || 3001;

app
  .listen({ port, host: '0.0.0.0' })
  .then((address) => {
    app.log.info(`ArmorIQ API listening on ${address}`);
  })
  .catch((err) => {
    app.log.error(err, 'failed to start ArmorIQ API');
    process.exit(1);
  });
