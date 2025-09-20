import { createApp } from './app.js';

const PORT = parseInt(process.env.PORT || '8081');
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
  try {
    const app = await createApp();

    await app.listen({ port: PORT, host: HOST });
    console.log(`🎉 API Gateway listening on http://${HOST}:${PORT}`);
  } catch (error) {
    console.error('❌ Failed to start API Gateway:', error);
    process.exit(1);
  }
}

main();




