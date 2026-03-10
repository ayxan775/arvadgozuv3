import { env } from '@/config/env';

import { buildApp } from './app.js';

const start = async () => {
  const app = await buildApp();

  try {
    await app.listen({
      host: '0.0.0.0',
      port: env.API_PORT,
    });
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

void start();
