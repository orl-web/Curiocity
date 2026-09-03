import { pgTable, serial, varchar, text, timestamp, boolean, integer, decimal, jsonb, index, uniqueIndex, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const guideCategoryEnum = pgEnum('guide_category', ['food', 'architecture', 'history', 'art', 'nature', 'characters', 'general']);
export const guidePriceEnum = pgEnum('guide_price', ['free', 'paid', 'ad']);
export const userRoleEnum = pgEnum('user_role', ['user', 'creator', 'admin']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'completed', 'failed', 'refunded']);
export const reportStatusEnum = pgEnum('report_status', ['pending', 'reviewed', 'resolved', 'dismissed']);

export const users = pgTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }),
  displayName: varchar('display_name', { length: 100 }).notNull(),
  initials: varchar('initials', { length: 3 }).notNull(),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  bio: text('bio'),
  location: varchar('location', { length: 100 }),
  role: userRoleEnum('role').default('user').notNull(),
  stripeAccountId: varchar('stripe_account_id', { length: 100 }),
  stripeCustomerId: varchar('stripe_customer_id', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ emailIdx: uniqueIndex('users_email_idx').on(table.email), roleIdx: index('users_role_idx').on(table.role) }));

export const guides = pgTable('guides', {
  id: varchar('id', { length: 36 }).primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  category: guideCategoryEnum('category').notNull(),
  creatorId: varchar('creator_id', { length: 36 }).references(() => users.id).notNull(),
  creatorInitials: varchar('creator_initials', { length: 3 }).notNull(),
  creatorColor: varchar('creator_color', { length: 7 }).notNull(),
  verified: boolean('verified').default(false).notNull(),
  duration: varchar('duration', { length: 20 }),
  distance: varchar('distance', { length: 20 }),
  priceModel: guidePriceEnum('price_model').default('free').notNull(),
  price: integer('price').default(99).notNull(),
  rating: decimal('rating', { precision: 2, scale: 1 }).default('5.0').notNull(),
  description: text('description'),
  coverImageUrl: varchar('cover_image_url', { length: 500 }),
  mapCenterLat: decimal('map_center_lat', { precision: 10, scale: 7 }),
  mapCenterLng: decimal('map_center_lng', { precision: 10, scale: 7 }),
  mapZoom: integer('map_zoom').default(13),
  isPublished: boolean('is_published').default(false).notNull(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ creatorIdx: index('guides_creator_idx').on(table.creatorId), cityIdx: index('guides_city_idx').on(table.city), categoryIdx: index('guides_category_idx').on(table.category), publishedIdx: index('guides_published_idx').on(table.isPublished) }));

export const guideStops = pgTable('guide_stops', {
  id: varchar('id', { length: 36 }).primaryKey(),
  guideId: varchar('guide_id', { length: 36 }).references(() => guides.id, { onDelete: 'cascade' }).notNull(),
  stopOrder: integer('stop_order').notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  description: text('description'),
  latitude: decimal('latitude', { precision: 10, scale: 7 }),
  longitude: decimal('longitude', { precision: 10, scale: 7 }),
  photoUrl: varchar('photo_url', { length: 500 }),
  videoUrl: varchar('video_url', { length: 500 }),
  customAudioUrl: varchar('custom_audio_url', { length: 500 }),
  links: jsonb('links').$type<Array<{ title: string; url: string }>>().default([]).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ guideOrderIdx: index('guide_stops_guide_order_idx').on(table.guideId, table.stopOrder) }));

export const guideCosts = pgTable('guide_costs', {
  id: varchar('id', { length: 36 }).primaryKey(),
  guideId: varchar('guide_id', { length: 36 }).references(() => guides.id, { onDelete: 'cascade' }).notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  price: decimal('price', { precision: 8, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const guideNearby = pgTable('guide_nearby', {
  id: varchar('id', { length: 36 }).primaryKey(),
  guideId: varchar('guide_id', { length: 36 }).references(() => guides.id, { onDelete: 'cascade' }).notNull(),
  direction: varchar('direction', { length: 10 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  distance: varchar('distance', { length: 20 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const guideResources = pgTable('guide_resources', {
  id: varchar('id', { length: 36 }).primaryKey(),
  guideId: varchar('guide_id', { length: 36 }).references(() => guides.id, { onDelete: 'cascade' }).notNull(),
  icon: varchar('icon', { length: 10 }).notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  url: varchar('url', { length: 500 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const guideDrafts = pgTable('guide_drafts', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 200 }),
  city: varchar('city', { length: 100 }),
  category: guideCategoryEnum('category'),
  description: text('description'),
  duration: varchar('duration', { length: 20 }),
  distance: varchar('distance', { length: 20 }),
  priceModel: guidePriceEnum('price_model').default('free'),
  costs: jsonb('costs').$type<{ tickets?: number; meals?: number; transport?: number }>().default({}).notNull(),
  stops: jsonb('stops').$type<Array<{ name: string; description?: string; photoUrl?: string; videoUrl?: string; links?: Array<{ title: string; url: string }> }>>().default([]).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ userIdx: uniqueIndex('guide_drafts_user_idx').on(table.userId) }));

export const userSavedGuides = pgTable('user_saved_guides', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
  guideId: varchar('guide_id', { length: 36 }).references(() => guides.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ userGuideIdx: uniqueIndex('user_saved_guides_user_guide_idx').on(table.userId, table.guideId) }));

export const userFollows = pgTable('user_follows', {
  id: varchar('id', { length: 36 }).primaryKey(),
  followerId: varchar('follower_id', { length: 36 }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
  followingId: varchar('following_id', { length: 36 }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ followerFollowingIdx: uniqueIndex('user_follows_follower_following_idx').on(table.followerId, table.followingId) }));

export const reviews = pgTable('reviews', {
  id: varchar('id', { length: 36 }).primaryKey(),
  guideId: varchar('guide_id', { length: 36 }).references(() => guides.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar('user_id', { length: 36 }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
  rating: integer('rating').notNull(),
  text: text('text'),
  photoUrl: varchar('photo_url', { length: 500 }),
  creatorResponse: text('creator_response'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ guideIdx: index('reviews_guide_idx').on(table.guideId), userGuideIdx: uniqueIndex('reviews_user_guide_idx').on(table.userId, table.guideId) }));

export const comments = pgTable('comments', {
  id: varchar('id', { length: 36 }).primaryKey(),
  guideId: varchar('guide_id', { length: 36 }).references(() => guides.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar('user_id', { length: 36 }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
  parentId: varchar('parent_id', { length: 36 }).references((): any => comments.id, { onDelete: 'cascade' }),
  text: text('text').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ guideIdx: index('comments_guide_idx').on(table.guideId), parentIdx: index('comments_parent_idx').on(table.parentId) }));

export const payments = pgTable('payments', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
  guideId: varchar('guide_id', { length: 36 }).references(() => guides.id, { onDelete: 'cascade' }).notNull(),
  stripeSessionId: varchar('stripe_session_id', { length: 100 }),
  stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 100 }),
  amount: decimal('amount', { precision: 8, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('eur').notNull(),
  status: paymentStatusEnum('status').default('pending').notNull(),
  paidOut: boolean('paid_out').default(false).notNull(),
  platformFee: decimal('platform_fee', { precision: 8, scale: 2 }).notNull(),
  creatorEarnings: decimal('creator_earnings', { precision: 8, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => ({ userIdx: index('payments_user_idx').on(table.userId), guideIdx: index('payments_guide_idx').on(table.guideId), sessionIdx: uniqueIndex('payments_session_idx').on(table.stripeSessionId) }));

export const adViews = pgTable('ad_views', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
  guideId: varchar('guide_id', { length: 36 }).references(() => guides.id, { onDelete: 'cascade' }).notNull(),
  adProvider: varchar('ad_provider', { length: 50 }).notNull(),
  rewardClaimed: boolean('reward_claimed').default(false).notNull(),
  revenue: decimal('revenue', { precision: 8, scale: 4 }).default('0').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ userGuideIdx: index('ad_views_user_guide_idx').on(table.userId, table.guideId) }));

export const reports = pgTable('reports', {
  id: varchar('id', { length: 36 }).primaryKey(),
  reporterId: varchar('reporter_id', { length: 36 }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
  targetType: varchar('target_type', { length: 20 }).notNull(),
  targetId: varchar('target_id', { length: 36 }).notNull(),
  reason: varchar('reason', { length: 50 }).notNull(),
  details: text('details'),
  status: reportStatusEnum('status').default('pending').notNull(),
  reviewedBy: varchar('reviewed_by', { length: 36 }).references(() => users.id),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  actionTaken: text('action_taken'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ targetIdx: index('reports_target_idx').on(table.targetType, table.targetId), statusIdx: index('reports_status_idx').on(table.status) }));

export const geocodeCache = pgTable('geocode_cache', {
  id: varchar('id', { length: 36 }).primaryKey(),
  query: varchar('query', { length: 200 }).notNull().unique(),
  latitude: decimal('latitude', { precision: 10, scale: 7 }).notNull(),
  longitude: decimal('longitude', { precision: 10, scale: 7 }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(),
  rawResponse: jsonb('raw_response'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
  endpoint: text('endpoint').notNull(),
  p256dh: varchar('p256dh', { length: 100 }).notNull(),
  auth: varchar('auth', { length: 100 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ userIdx: index('push_subscriptions_user_idx').on(table.userId) }));

export const analyticsEvents = pgTable('analytics_events', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 36 }).references(() => users.id, { onDelete: 'set null' }),
  eventName: varchar('event_name', { length: 50 }).notNull(),
  properties: jsonb('properties').notNull(),
  sessionId: varchar('session_id', { length: 36 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ userIdx: index('analytics_user_idx').on(table.userId), eventIdx: index('analytics_event_idx').on(table.eventName), createdIdx: index('analytics_created_idx').on(table.createdAt) }));

export const usersRelations = relations(users, ({ many }) => ({
  guides: many(guides), savedGuides: many(userSavedGuides),
  following: many(userFollows, { relationName: 'follower' }), followers: many(userFollows, { relationName: 'following' }),
  reviews: many(reviews), comments: many(comments), payments: many(payments), adViews: many(adViews),
  reports: many(reports), drafts: many(guideDrafts), pushSubscriptions: many(pushSubscriptions),
}));

export const guidesRelations = relations(guides, ({ one, many }) => ({
  creator: one(users, { fields: [guides.creatorId], references: [users.id] }),
  stops: many(guideStops), costs: many(guideCosts), nearby: many(guideNearby), resources: many(guideResources),
  savedBy: many(userSavedGuides), reviews: many(reviews), comments: many(comments),
  payments: many(payments), adViews: many(adViews),
}));

export const guideStopsRelations = relations(guideStops, ({ one }) => ({ guide: one(guides, { fields: [guideStops.guideId], references: [guides.id] }) }));
export const userSavedGuidesRelations = relations(userSavedGuides, ({ one }) => ({ user: one(users, { fields: [userSavedGuides.userId], references: [users.id] }), guide: one(guides, { fields: [userSavedGuides.guideId], references: [guides.id] }) }));
export const userFollowsRelations = relations(userFollows, ({ one }) => ({ follower: one(users, { fields: [userFollows.followerId], references: [users.id], relationName: 'follower' }), following: one(users, { fields: [userFollows.followingId], references: [users.id], relationName: 'following' }) }));
export const reviewsRelations = relations(reviews, ({ one }) => ({ guide: one(guides, { fields: [reviews.guideId], references: [guides.id] }), user: one(users, { fields: [reviews.userId], references: [users.id] }) }));
export const commentsRelations = relations(comments, ({ one, many }) => ({ guide: one(guides, { fields: [comments.guideId], references: [guides.id] }), user: one(users, { fields: [comments.userId], references: [users.id] }), parent: one(comments, { fields: [comments.parentId], references: [comments.id], relationName: 'replies' }), replies: many(comments, { relationName: 'replies' }) }));
export const paymentsRelations = relations(payments, ({ one }) => ({ user: one(users, { fields: [payments.userId], references: [users.id] }), guide: one(guides, { fields: [payments.guideId], references: [guides.id] }) }));
export const adViewsRelations = relations(adViews, ({ one }) => ({ user: one(users, { fields: [adViews.userId], references: [users.id] }), guide: one(guides, { fields: [adViews.guideId], references: [guides.id] }) }));
export const reportsRelations = relations(reports, ({ one }) => ({ reporter: one(users, { fields: [reports.reporterId], references: [users.id] }), reviewer: one(users, { fields: [reports.reviewedBy], references: [users.id] }) }));
export const geocodeCacheRelations = relations(geocodeCache, ({}) => ({}));
export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({ user: one(users, { fields: [pushSubscriptions.userId], references: [users.id] }) }));
export const analyticsEventsRelations = relations(analyticsEvents, ({ one }) => ({ user: one(users, { fields: [analyticsEvents.userId], references: [users.id] }) }));

export const guideVersions = pgTable('guide_versions', {
  id: varchar('id', { length: 36 }).primaryKey(),
  guideId: varchar('guide_id', { length: 36 }).references(() => guides.id, { onDelete: 'cascade' }).notNull(),
  version: integer('version').notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  category: guideCategoryEnum('category').notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  duration: varchar('duration', { length: 20 }),
  priceModel: guidePriceEnum('price_model').default('free').notNull(),
  price: integer('price').default(99).notNull(),
  coverImageUrl: varchar('cover_image_url', { length: 500 }),
  stopsSnapshot: jsonb('stops_snapshot').notNull(),
  changeNote: text('change_note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ guideIdx: index('guide_versions_guide_idx').on(table.guideId) }));

export const referralCodes = pgTable('referral_codes', {
  id: varchar('id', { length: 36 }).primaryKey(),
  userId: varchar('user_id', { length: 36 }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
  code: varchar('code', { length: 20 }).notNull().unique(),
  usesCount: integer('uses_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ userIdx: index('referral_codes_user_idx').on(table.userId), codeIdx: index('referral_codes_code_idx').on(table.code) }));

export const referralUses = pgTable('referral_uses', {
  id: varchar('id', { length: 36 }).primaryKey(),
  codeId: varchar('code_id', { length: 36 }).references(() => referralCodes.id, { onDelete: 'cascade' }).notNull(),
  referredUserId: varchar('referred_user_id', { length: 36 }).references(() => users.id, { onDelete: 'cascade' }).notNull(),
  referrerCredited: boolean('referrer_credited').default(false).notNull(),
  referredCredited: boolean('referred_credited').default(false).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ referredUserIdx: index('referral_uses_referred_idx').on(table.referredUserId) }));

export const newsletterSubscribers = pgTable('newsletter_subscribers', {
  id: varchar('id', { length: 36 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  source: varchar('source', { length: 50 }).default('landing'),
  subscribed: boolean('subscribed').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({ emailIdx: uniqueIndex('newsletter_email_idx').on(table.email) }));

export type User = typeof users.$inferSelect; export type NewUser = typeof users.$inferInsert;
export type Guide = typeof guides.$inferSelect; export type NewGuide = typeof guides.$inferInsert;
export type GuideStop = typeof guideStops.$inferSelect; export type NewGuideStop = typeof guideStops.$inferInsert;
export type GuideVersion = typeof guideVersions.$inferSelect; export type NewGuideVersion = typeof guideVersions.$inferInsert;
export type ReferralCode = typeof referralCodes.$inferSelect; export type ReferralUse = typeof referralUses.$inferSelect;
export type Review = typeof reviews.$inferSelect; export type Payment = typeof payments.$inferSelect;
export type Report = typeof reports.$inferSelect;