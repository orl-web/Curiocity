import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { authenticate, optionalAuth } from './middleware/auth';
import { guidesRouter } from './routes/guides';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { paymentsRouter } from './routes/payments';
import { aiRouter } from './routes/ai';
import { uploadRouter } from './routes/upload';
import { geocodeRouter } from './routes/geocode';
import { reportsRouter } from './routes/reports';
import { analyticsRouter } from './routes/analytics';
import { adminRouter } from './routes/admin';
import { webhooksRouter } from './routes/webhooks';
import { referralsRouter } from './routes/referrals';
import { newsletterRouter } from './routes/newsletter';

const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(morgan('combined'));
app.use(cors({
  origin: config.CORS_ORIGIN.split(','),
  credentials: true,
}));

// Stripe webhooks need the raw body — register BEFORE express.json()
app.use('/api/webhooks', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many authentication attempts' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', authLimiter);

const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Too many guide creation attempts. Try again later.' },
});
app.use('/api/guides', (req, res, next) => req.method === 'POST' ? createLimiter(req, res, next) : next());

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many payment attempts. Try again later.' },
});
app.use('/api/payments', paymentLimiter);

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/docs', (req: Request, res: Response) => {
  res.json({
    openapi: '3.0.0',
    info: { title: 'CurioCity API', version: '1.0.0' },
    servers: [{ url: `${req.protocol}://${req.get('host')}/api` }],
    paths: {},
  });
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/guides', guidesRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/geocode', geocodeRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/webhooks', webhooksRouter);
app.use('/api/referrals', referralsRouter);
app.use('/api/newsletter', newsletterRouter);

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(errorHandler);

export { app };