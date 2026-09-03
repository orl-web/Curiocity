import dotenv from 'dotenv';
dotenv.config();

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  HOST: process.env.HOST || '0.0.0.0',

  DATABASE_URL: process.env.DATABASE_URL || '',

  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '30d',

  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000',

  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
  AI_RATE_LIMIT_PER_HOUR: parseInt(process.env.AI_RATE_LIMIT_PER_HOUR || '10', 10),

  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
  STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY || '',
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
  STRIPE_CONNECT_CLIENT_ID: process.env.STRIPE_CONNECT_CLIENT_ID || '',
  PLATFORM_FEE_PERCENT: parseFloat(process.env.PLATFORM_FEE_PERCENT || '30'),

  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID || '',
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY || '',
  S3_REGION: process.env.S3_REGION || 'us-east-1',
  S3_BUCKET: process.env.S3_BUCKET || 'curiocity-uploads',
  S3_CDN_URL: process.env.S3_CDN_URL || '',

  GEOCODING_PROVIDER: process.env.GEOCODING_PROVIDER || 'nominatim',
  NOMINATIM_EMAIL: process.env.NOMINATIM_EMAIL || '',
  GOOGLE_GEOCODING_API_KEY: process.env.GOOGLE_GEOCODING_API_KEY || '',
  GEOCODING_CACHE_TTL_DAYS: parseInt(process.env.GEOCODING_CACHE_TTL_DAYS || '30', 10),

  REDIS_URL: process.env.REDIS_URL || '',

  SENTRY_DSN: process.env.SENTRY_DSN || '',

  FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
  FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
  FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || '',

  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  APPLE_CLIENT_ID: process.env.APPLE_CLIENT_ID || '',
  APPLE_TEAM_ID: process.env.APPLE_TEAM_ID || '',
  APPLE_KEY_ID: process.env.APPLE_KEY_ID || '',
  APPLE_PRIVATE_KEY: process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',

  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',
  SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL || 'noreply@curiocity.app',

  MIXPANEL_TOKEN: process.env.MIXPANEL_TOKEN || '',
  AMPLITUDE_API_KEY: process.env.AMPLITUDE_API_KEY || '',

  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || '',
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || '',
  VAPID_SUBJECT: process.env.VAPID_SUBJECT || 'mailto:push@curiocity.app',

  REFERRAL_CREDIT_AMOUNT: parseFloat(process.env.REFERRAL_CREDIT_AMOUNT || '0.50'),
  CREATOR_PAYOUT_THRESHOLD: parseFloat(process.env.CREATOR_PAYOUT_THRESHOLD || '50'),
  ADMOB_AD_UNIT_ID: process.env.ADMOB_AD_UNIT_ID || '',
  ADMOB_APP_ID: process.env.ADMOB_APP_ID || '',
  UNITY_AD_GAME_ID: process.env.UNITY_AD_GAME_ID || '',
};

if (config.NODE_ENV === 'production') {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'ANTHROPIC_API_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'S3_ACCESS_KEY_ID',
    'S3_SECRET_ACCESS_KEY',
    'S3_BUCKET',
  ];
  for (const key of required) {
    if (!config[key as keyof typeof config]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
  if (config.JWT_SECRET === 'dev-secret-change-in-production' || config.JWT_REFRESH_SECRET === 'dev-refresh-secret') {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be changed from defaults in production');
  }
}