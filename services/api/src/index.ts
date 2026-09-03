import { config } from './config';
import { app } from './app';

const PORT = config.PORT;
const HOST = config.HOST;

app.listen(PORT, HOST, () => {
  console.log(`🚀 CurioCity API running on http://${HOST}:${PORT}`);
  console.log(`📚 Environment: ${config.NODE_ENV}`);
  console.log(`🔗 CORS Origins: ${config.CORS_ORIGIN}`);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});