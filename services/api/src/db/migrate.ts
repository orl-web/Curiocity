import { config } from '../config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

async function migrate() {
  if (!config.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const client = postgres(config.DATABASE_URL, { max: 1 });
  const db = drizzle(client, { schema });

  console.log('Running migrations...');

  await client`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
  await client`CREATE EXTENSION IF NOT EXISTS "pg_trgm"`;

  await client`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      email VARCHAR(255) NOT NULL UNIQUE,
      email_verified BOOLEAN DEFAULT FALSE NOT NULL,
      password_hash VARCHAR(255),
      display_name VARCHAR(100) NOT NULL,
      initials VARCHAR(3) NOT NULL,
      avatar_url VARCHAR(500),
      bio TEXT,
      location VARCHAR(100),
      role VARCHAR(20) DEFAULT 'user' NOT NULL,
      stripe_account_id VARCHAR(100),
      stripe_customer_id VARCHAR(100),
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
  `;

  await client`
    CREATE TABLE IF NOT EXISTS guides (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      title VARCHAR(200) NOT NULL,
      city VARCHAR(100) NOT NULL,
      category VARCHAR(50) NOT NULL,
      creator_id UUID REFERENCES users(id) NOT NULL,
      creator_initials VARCHAR(3) NOT NULL,
      creator_color VARCHAR(7) NOT NULL,
      verified BOOLEAN DEFAULT FALSE NOT NULL,
      duration VARCHAR(20),
      distance VARCHAR(20),
      price_model VARCHAR(20) DEFAULT 'free' NOT NULL,
      rating DECIMAL(2,1) DEFAULT '5.0' NOT NULL,
      description TEXT,
      cover_image_url VARCHAR(500),
      map_center_lat DECIMAL(10,7),
      map_center_lng DECIMAL(10,7),
      map_zoom INTEGER DEFAULT 13,
      is_published BOOLEAN DEFAULT FALSE NOT NULL,
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
  `;

  await client`
    CREATE TABLE IF NOT EXISTS guide_stops (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      guide_id UUID REFERENCES guides(id) ON DELETE CASCADE NOT NULL,
      stop_order INTEGER NOT NULL,
      name VARCHAR(200) NOT NULL,
      description TEXT,
      latitude DECIMAL(10,7),
      longitude DECIMAL(10,7),
      photo_url VARCHAR(500),
      video_url VARCHAR(500),
      custom_audio_url VARCHAR(500),
      links JSONB DEFAULT '[]' NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
  `;

  await client`
    CREATE TABLE IF NOT EXISTS guide_costs (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      guide_id UUID REFERENCES guides(id) ON DELETE CASCADE NOT NULL,
      type VARCHAR(20) NOT NULL,
      name VARCHAR(100) NOT NULL,
      price DECIMAL(8,2) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
  `;

  await client`
    CREATE TABLE IF NOT EXISTS guide_nearby (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      guide_id UUID REFERENCES guides(id) ON DELETE CASCADE NOT NULL,
      direction VARCHAR(10) NOT NULL,
      name VARCHAR(100) NOT NULL,
      distance VARCHAR(20) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
  `;

  await client`
    CREATE TABLE IF NOT EXISTS guide_resources (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      guide_id UUID REFERENCES guides(id) ON DELETE CASCADE NOT NULL,
      icon VARCHAR(10) NOT NULL,
      title VARCHAR(200) NOT NULL,
      url VARCHAR(500) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
  `;

  await client`
    CREATE TABLE IF NOT EXISTS guide_drafts (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      title VARCHAR(200),
      city VARCHAR(100),
      category VARCHAR(50),
      description TEXT,
      duration VARCHAR(20),
      distance VARCHAR(20),
      price_model VARCHAR(20) DEFAULT 'free',
      costs JSONB DEFAULT '{}' NOT NULL,
      stops JSONB DEFAULT '[]' NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      UNIQUE(user_id)
    );
  `;

  await client`
    CREATE TABLE IF NOT EXISTS user_saved_guides (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      guide_id UUID REFERENCES guides(id) ON DELETE CASCADE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      UNIQUE(user_id, guide_id)
    );
  `;

  await client`
    CREATE TABLE IF NOT EXISTS user_follows (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      follower_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      following_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      UNIQUE(follower_id, following_id)
    );
  `;

  await client`
    CREATE TABLE IF NOT EXISTS reviews (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      guide_id UUID REFERENCES guides(id) ON DELETE CASCADE NOT NULL,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      text TEXT,
      photo_url VARCHAR(500),
      creator_response TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      UNIQUE(user_id, guide_id)
    );
  `;

  await client`
    CREATE TABLE IF NOT EXISTS comments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      guide_id UUID REFERENCES guides(id) ON DELETE CASCADE NOT NULL,
      user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
  `;

  await client`
    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      guide_id UUID REFERENCES guides(id) ON DELETE CASCADE NOT NULL,
      stripe_session_id VARCHAR(100) UNIQUE,
      stripe_payment_intent_id VARCHAR(100),
      amount DECIMAL(8,2) NOT NULL,
      currency VARCHAR(3) DEFAULT 'eur' NOT NULL,
      status VARCHAR(20) DEFAULT 'pending' NOT NULL,
      platform_fee DECIMAL(8,2) NOT NULL,
      creator_earnings DECIMAL(8,2) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      completed_at TIMESTAMPTZ
    );
  `;

  await client`
    CREATE TABLE IF NOT EXISTS ad_views (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      guide_id UUID REFERENCES guides(id) ON DELETE CASCADE NOT NULL,
      ad_provider VARCHAR(50) NOT NULL,
      revenue DECIMAL(8,4) DEFAULT 0 NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
  `;

  await client`
    CREATE TABLE IF NOT EXISTS reports (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      reporter_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      target_type VARCHAR(20) NOT NULL,
      target_id UUID NOT NULL,
      reason VARCHAR(50) NOT NULL,
      details TEXT,
      status VARCHAR(20) DEFAULT 'pending' NOT NULL,
      reviewed_by UUID REFERENCES users(id),
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
  `;

  await client`
    CREATE TABLE IF NOT EXISTS geocode_cache (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      query VARCHAR(200) NOT NULL UNIQUE,
      latitude DECIMAL(10,7) NOT NULL,
      longitude DECIMAL(10,7) NOT NULL,
      provider VARCHAR(50) NOT NULL,
      raw_response JSONB,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL
    );
  `;

  await client`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      endpoint TEXT NOT NULL,
      p256dh VARCHAR(100) NOT NULL,
      auth VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
  `;

  await client`
    CREATE TABLE IF NOT EXISTS referral_codes (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      code VARCHAR(20) NOT NULL UNIQUE,
      uses_count INTEGER DEFAULT 0 NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
  `;

  await client`
    CREATE TABLE IF NOT EXISTS referral_uses (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      code_id UUID REFERENCES referral_codes(id) ON DELETE CASCADE NOT NULL,
      referred_user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
      referrer_credited BOOLEAN DEFAULT FALSE NOT NULL,
      referred_credited BOOLEAN DEFAULT FALSE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      UNIQUE(referred_user_id)
    );
  `;

  await client`
    CREATE TABLE IF NOT EXISTS guide_versions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      guide_id UUID REFERENCES guides(id) ON DELETE CASCADE NOT NULL,
      version INTEGER NOT NULL,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      category VARCHAR(50) NOT NULL,
      city VARCHAR(100) NOT NULL,
      duration VARCHAR(20),
      price_model VARCHAR(20) DEFAULT 'free' NOT NULL,
      price INTEGER DEFAULT 99 NOT NULL,
      cover_image_url VARCHAR(500),
      stops_snapshot JSONB NOT NULL,
      change_note TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );
  `;

  await client`CREATE INDEX IF NOT EXISTS guides_creator_idx ON guides(creator_id)`;
  await client`CREATE INDEX IF NOT EXISTS guides_city_idx ON guides(city)`;
  await client`CREATE INDEX IF NOT EXISTS guides_category_idx ON guides(category)`;
  await client`CREATE INDEX IF NOT EXISTS guides_published_idx ON guides(is_published)`;
  await client`CREATE INDEX IF NOT EXISTS guide_stops_guide_order_idx ON guide_stops(guide_id, stop_order)`;
  await client`CREATE INDEX IF NOT EXISTS user_saved_guides_user_guide_idx ON user_saved_guides(user_id, guide_id)`;
  await client`CREATE INDEX IF NOT EXISTS reviews_guide_idx ON reviews(guide_id)`;
  await client`CREATE INDEX IF NOT EXISTS comments_guide_idx ON comments(guide_id)`;
  await client`CREATE INDEX IF NOT EXISTS payments_user_idx ON payments(user_id)`;
  await client`CREATE INDEX IF NOT EXISTS payments_guide_idx ON payments(guide_id)`;
  await client`CREATE INDEX IF NOT EXISTS reports_target_idx ON reports(target_type, target_id)`;
  await client`CREATE INDEX IF NOT EXISTS geocode_cache_query_idx ON geocode_cache(query)`;
  await client`CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON push_subscriptions(user_id)`;
  await client`CREATE INDEX IF NOT EXISTS referral_codes_user_idx ON referral_codes(user_id)`;
  await client`CREATE INDEX IF NOT EXISTS referral_codes_code_idx ON referral_codes(code)`;
  await client`CREATE INDEX IF NOT EXISTS guide_versions_guide_idx ON guide_versions(guide_id)`;

  await client`ALTER TABLE guides ADD COLUMN IF NOT EXISTS price INTEGER DEFAULT 99 NOT NULL`;
  await client`ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_out BOOLEAN DEFAULT false NOT NULL`;

  await client`
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id VARCHAR(36) PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      source VARCHAR(50) DEFAULT 'landing',
      subscribed BOOLEAN DEFAULT true NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    )
  `;
  await client`CREATE INDEX IF NOT EXISTS newsletter_email_idx ON newsletter_subscribers(email)`;

  await client.end();
  console.log('Migrations completed successfully');
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});