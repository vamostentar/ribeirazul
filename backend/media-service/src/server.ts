import { buildApp } from './app';

const port = Number(process.env.PORT || 8083);
const host = process.env.HOST || '0.0.0.0';

async function start() {
  const app = await buildApp();
  try {
    await app.listen({ port, host });
    app.log.info({ port, host }, 'Media service started');
  } catch (err) {
    app.log.error(err, 'Failed to start media service');
    process.exit(1);
  }
}

start();

