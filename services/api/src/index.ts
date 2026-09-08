import { config } from './config';
import { app } from './app';

const PORT = config.PORT;
const HOST = config.HOST;

const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 CurioCity API running on http://${HOST}:${PORT}`);
  console.log(`📚 Environment: ${config.NODE_ENV}`);
  console.log(`🔗 CORS Origins: ${config.CORS_ORIGIN}`);
});

// Graceful shutdown
const shutdown = (signal: string) => {
  console.log(`${signal} received, shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
  // Force exit after 10s if connections don't drain
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});