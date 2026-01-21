import app from './app';
import { env } from './config/env';
import prisma from './config/database';

async function main() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected');

    // Start server
    app.listen(env.PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 Nova Player API Server                                ║
║                                                            ║
║   Environment: ${env.NODE_ENV.padEnd(40)}║
║   Port: ${String(env.PORT).padEnd(47)}║
║   CORS: ${env.CORS_ORIGIN.substring(0, 45).padEnd(47)}║
║                                                            ║
║   Endpoints:                                               ║
║   - POST /api/device/register                              ║
║   - POST /api/device/status                                ║
║   - GET  /api/health                                       ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

main();
