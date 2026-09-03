import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { users, guides, userSavedGuides, userFollows, reviews, comments, payments } from '../db/schema';
import { eq, and, desc, asc, count, sql, inArray, isNull } from 'drizzle-orm';
import { authenticate, optionalAuth, requireRole } from '../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { config } from '../config';

// SUM helper for earnings
const sumEarnings = sql<number>`COALESCE(SUM(${payments.creatorEarnings}), 0)`;

const router = Router();

const updateProfileSchema = z.object({ displayName: z.string().min(1).max(100).optional(), bio: z.string().max(300).optional(), location: z.string().max(100).optional(), avatarUrl: z.string().url().optional() });
const reviewSchema = z.object({ rating: z.number().int().min(1).max(5), text: z.string().max(2000).optional() });
const commentSchema = z.object({ text: z.string().min(1).max(2000), parentId: z.string().uuid().optional() });
const querySchema = z.object({ limit: z.coerce.number().min(1).max(50).default(20), offset: z.coerce.number().min(0).default(0) });
const idParamSchema = z.object({ id: z.string().uuid() });

function generateInitials(name: string): string { const parts = name.trim().split(/\s+/); if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase(); return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase(); }

router.get('/me', authenticate, async (req: Request, res: Response) => {
  const userRows = await db.select({ id: users.id, email: users.email, displayName: users.displayName, initials: users.initials, avatarUrl: users.avatarUrl, bio: users.bio, location: users.location, role: users.role, emailVerified: users.emailVerified, stripeAccountId: users.stripeAccountId, stripeCustomerId: users.stripeCustomerId, createdAt: users.createdAt }).from(users).where(eq(users.id, req.user!.userId)).limit(1);
  if (!userRows.length) throw AppError.notFound('User not found');

  const savedCount = await db.select({ count: count() }).from(userSavedGuides).where(eq(userSavedGuides.userId, req.user!.userId));
  const createdCount = await db.select({ count: count() }).from(guides).where(eq(guides.creatorId, req.user!.userId));
  const earningsResult = await db.select({ total: sumEarnings }).from(payments).innerJoin(guides, eq(payments.guideId, guides.id)).where(and(eq(guides.creatorId, req.user!.userId), eq(payments.status, 'completed')));

  res.json({ ...userRows[0], stats: { saved: savedCount[0]?.count || 0, created: createdCount[0]?.count || 0, earned: earningsResult[0]?.total || 0 } });
});

router.patch('/me', authenticate, validateBody(updateProfileSchema), async (req: Request, res: Response) => {
  const { displayName, bio, location, avatarUrl } = req.body;
  const userId = req.user!.userId;
  const initials = displayName ? generateInitials(displayName) : undefined;
  const updates: Record<string, any> = { updatedAt: new Date() };
  if (displayName !== undefined) { updates.displayName = displayName; updates.initials = initials; }
  if (bio !== undefined) updates.bio = bio;
  if (location !== undefined) updates.location = location;
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
  await db.update(users).set(updates).where(eq(users.id, userId));
  const updated = await db.select({ id: users.id, displayName: users.displayName, initials: users.initials, avatarUrl: users.avatarUrl, bio: users.bio, location: users.location }).from(users).where(eq(users.id, userId)).limit(1);
  res.json(updated[0]);
});

router.get('/me/guides', authenticate, validateQuery(querySchema), async (req: Request, res: Response) => {
  const { limit, offset } = req.query as any; const userId = req.user!.userId;
  const userGuides = await db.select({ id: guides.id, title: guides.title, city: guides.city, category: guides.category, duration: guides.duration, distance: guides.distance, priceModel: guides.priceModel, rating: guides.rating, isPublished: guides.isPublished, createdAt: guides.createdAt, coverImageUrl: guides.coverImageUrl }).from(guides).where(eq(guides.creatorId, userId)).orderBy(desc(guides.createdAt)).limit(limit).offset(offset);
  const totalResult = await db.select({ count: count() }).from(guides).where(eq(guides.creatorId, userId));
  res.json({ guides: userGuides, total: totalResult[0]?.count || 0 });
});

router.get('/me/saved', authenticate, validateQuery(querySchema), async (req: Request, res: Response) => {
  const { limit, offset } = req.query as any; const userId = req.user!.userId;
  const saved = await db.select({ guide: { id: guides.id, title: guides.title, city: guides.city, category: guides.category, duration: guides.duration, distance: guides.distance, priceModel: guides.priceModel, rating: guides.rating, coverImageUrl: guides.coverImageUrl }, savedAt: userSavedGuides.createdAt }).from(userSavedGuides).innerJoin(guides, eq(userSavedGuides.guideId, guides.id)).where(eq(userSavedGuides.userId, userId)).orderBy(desc(userSavedGuides.createdAt)).limit(limit).offset(offset);
  const totalResult = await db.select({ count: count() }).from(userSavedGuides).where(eq(userSavedGuides.userId, userId));
  res.json({ guides: saved.map(s => ({ ...s.guide, savedAt: s.savedAt })), total: totalResult[0]?.count || 0 });
});

router.get('/me/earnings', authenticate, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const allPayments = await db.select({ id: payments.id, amount: payments.amount, creatorEarnings: payments.creatorEarnings, platformFee: payments.platformFee, status: payments.status, createdAt: payments.createdAt, completedAt: payments.completedAt, guide: { id: guides.id, title: guides.title } }).from(payments).innerJoin(guides, eq(payments.guideId, guides.id)).where(eq(guides.creatorId, userId)).orderBy(desc(payments.createdAt));
  const totalEarnings = allPayments.filter(p => p.status === 'completed').reduce((sum, p) => sum + parseFloat(p.creatorEarnings), 0);
  const pendingEarnings = allPayments.filter(p => p.status === 'pending').reduce((sum, p) => sum + parseFloat(p.creatorEarnings), 0);
  res.json({ totalEarnings, pendingEarnings, payments: allPayments });
});

router.get('/me/feed', authenticate, validateQuery(querySchema), async (req: Request, res: Response) => {
  const { limit, offset } = req.query as any; const userId = req.user!.userId;
  const followingRows = await db.select({ followingId: userFollows.followingId }).from(userFollows).where(eq(userFollows.followerId, userId));
  const followingIds = followingRows.map(f => f.followingId);
  if (followingIds.length === 0) return res.json({ guides: [], total: 0 });
  const feedGuides = await db.select({ id: guides.id, title: guides.title, city: guides.city, category: guides.category, duration: guides.duration, distance: guides.distance, priceModel: guides.priceModel, rating: guides.rating, coverImageUrl: guides.coverImageUrl, createdAt: guides.createdAt, user: { id: users.id, displayName: users.displayName, initials: users.initials, avatarUrl: users.avatarUrl } }).from(guides).innerJoin(users, eq(guides.creatorId, users.id)).where(inArray(guides.creatorId, followingIds)).orderBy(desc(guides.createdAt)).limit(limit).offset(offset);
  const totalResult = await db.select({ count: count() }).from(guides).where(inArray(guides.creatorId, followingIds));
  res.json({ guides: feedGuides, total: totalResult[0]?.count || 0 });
});

router.get('/:id', validateParams(idParamSchema), optionalAuth, async (req: Request, res: Response) => {
  const { id } = req.params; const userId = req.user?.userId;
  const userRows = await db.select({ id: users.id, displayName: users.displayName, initials: users.initials, avatarUrl: users.avatarUrl, bio: users.bio, location: users.location, role: users.role, verified: sql<boolean>`${users.role} IN ('creator', 'admin')`, createdAt: users.createdAt }).from(users).where(eq(users.id, id)).limit(1);
  if (!userRows.length) throw AppError.notFound('User not found');
  const user = userRows[0];

  const isFollowing = userId ? (await db.select().from(userFollows).where(and(eq(userFollows.followerId, userId), eq(userFollows.followingId, id))).limit(1)).length > 0 : false;
  const followerCount = await db.select({ count: count() }).from(userFollows).where(eq(userFollows.followingId, id));
  const followingCount = await db.select({ count: count() }).from(userFollows).where(eq(userFollows.followerId, id));
  const createdCount = await db.select({ count: count() }).from(guides).where(and(eq(guides.creatorId, id), eq(guides.isPublished, true)));

  const guidesCreated = await db.select({ id: guides.id, title: guides.title, city: guides.city, category: guides.category, duration: guides.duration, distance: guides.distance, priceModel: guides.priceModel, rating: guides.rating, coverImageUrl: guides.coverImageUrl }).from(guides).where(and(eq(guides.creatorId, id), eq(guides.isPublished, true))).orderBy(desc(guides.createdAt)).limit(10);

  res.json({ ...user, stats: { followers: followerCount[0]?.count || 0, following: followingCount[0]?.count || 0, created: createdCount[0]?.count || 0 }, isFollowing, isOwn: userId === id, recentGuides: guidesCreated });
});

router.post('/:id/follow', authenticate, validateParams(idParamSchema), async (req: Request, res: Response) => {
  const { id } = req.params; const userId = req.user!.userId;
  if (id === userId) throw AppError.badRequest('Cannot follow yourself');
  const targetUser = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!targetUser.length) throw AppError.notFound('User not found');

  const existing = await db.select().from(userFollows).where(and(eq(userFollows.followerId, userId), eq(userFollows.followingId, id))).limit(1);
  if (existing.length > 0) { await db.delete(userFollows).where(and(eq(userFollows.followerId, userId), eq(userFollows.followingId, id))); return res.json({ following: false }); }
  await db.insert(userFollows).values({ id: uuidv4(), followerId: userId, followingId: id });
  res.json({ following: true });
});

router.get('/:id/followers', validateParams(idParamSchema), validateQuery(querySchema), async (req: Request, res: Response) => {
  const { id } = req.params; const { limit, offset } = req.query as any;
  const followers = await db.select({ user: { id: users.id, displayName: users.displayName, initials: users.initials, avatarUrl: users.avatarUrl } }).from(userFollows).innerJoin(users, eq(userFollows.followerId, users.id)).where(eq(userFollows.followingId, id)).limit(limit).offset(offset);
  const totalResult = await db.select({ count: count() }).from(userFollows).where(eq(userFollows.followingId, id));
  res.json({ users: followers.map(f => f.user), total: totalResult[0]?.count || 0 });
});

router.get('/:id/following', validateParams(idParamSchema), validateQuery(querySchema), async (req: Request, res: Response) => {
  const { id } = req.params; const { limit, offset } = req.query as any;
  const following = await db.select({ user: { id: users.id, displayName: users.displayName, initials: users.initials, avatarUrl: users.avatarUrl } }).from(userFollows).innerJoin(users, eq(userFollows.followingId, users.id)).where(eq(userFollows.followerId, id)).limit(limit).offset(offset);
  const totalResult = await db.select({ count: count() }).from(userFollows).where(eq(userFollows.followerId, id));
  res.json({ users: following.map(f => f.user), total: totalResult[0]?.count || 0 });
});

router.post('/guides/:id/reviews', authenticate, validateParams(idParamSchema), validateBody(reviewSchema), async (req: Request, res: Response) => {
  const { id } = req.params; const { rating, text } = req.body; const userId = req.user!.userId;
  const guide = await db.select().from(guides).where(eq(guides.id, id)).limit(1);
  if (!guide.length) throw AppError.notFound('Guide not found');

  const existing = await db.select().from(reviews).where(and(eq(reviews.guideId, id), eq(reviews.userId, userId))).limit(1);
  if (existing.length > 0) throw AppError.conflict('Already reviewed this guide');

  const reviewId = uuidv4();
  await db.insert(reviews).values({ id: reviewId, guideId: id, userId, rating, text });
  const allReviews = await db.select({ rating: reviews.rating }).from(reviews).where(eq(reviews.guideId, id));
  const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
  await db.update(guides).set({ rating: avgRating.toFixed(1) as any }).where(eq(guides.id, id));
  const fullReview = await db.select({ id: reviews.id, rating: reviews.rating, text: reviews.text, createdAt: reviews.createdAt, user: { id: users.id, displayName: users.displayName, initials: users.initials, avatarUrl: users.avatarUrl } }).from(reviews).innerJoin(users, eq(reviews.userId, users.id)).where(eq(reviews.id, reviewId)).limit(1);
  res.status(201).json(fullReview[0] || { id: reviewId, rating, text, createdAt: new Date() });
});

router.get('/guides/:id/reviews', validateParams(idParamSchema), validateQuery(querySchema), async (req: Request, res: Response) => {
  const { id } = req.params; const { limit, offset } = req.query as any;
  const guideReviews = await db.select({ id: reviews.id, rating: reviews.rating, text: reviews.text, createdAt: reviews.createdAt, user: { id: users.id, displayName: users.displayName, initials: users.initials, avatarUrl: users.avatarUrl } }).from(reviews).innerJoin(users, eq(reviews.userId, users.id)).where(eq(reviews.guideId, id)).orderBy(desc(reviews.createdAt)).limit(limit).offset(offset);
  const totalResult = await db.select({ count: count() }).from(reviews).where(eq(reviews.guideId, id));
  res.json({ reviews: guideReviews, total: totalResult[0]?.count || 0 });
});

router.post('/guides/:id/comments', authenticate, validateParams(idParamSchema), validateBody(commentSchema), async (req: Request, res: Response) => {
  const { id } = req.params; const { text, parentId } = req.body; const userId = req.user!.userId;
  const guide = await db.select().from(guides).where(eq(guides.id, id)).limit(1);
  if (!guide.length) throw AppError.notFound('Guide not found');
  const commentId = uuidv4();
  await db.insert(comments).values({ id: commentId, guideId: id, userId, text, parentId });
  const fullComment = await db.select({ id: comments.id, content: comments.text, createdAt: comments.createdAt, user: { id: users.id, displayName: users.displayName, initials: users.initials, avatarUrl: users.avatarUrl }, parentId: comments.parentId }).from(comments).innerJoin(users, eq(comments.userId, users.id)).where(eq(comments.id, commentId)).limit(1);
  res.status(201).json(fullComment[0] || { id: commentId, content: text, createdAt: new Date() });
});

router.get('/guides/:id/comments', validateParams(idParamSchema), validateQuery(querySchema), async (req: Request, res: Response) => {
  const { id } = req.params; const { limit, offset } = req.query as any;
  const guideComments = await db.select({ id: comments.id, text: comments.text, createdAt: comments.createdAt, user: { id: users.id, displayName: users.displayName, initials: users.initials, avatarUrl: users.avatarUrl }, parentId: comments.parentId }).from(comments).innerJoin(users, eq(comments.userId, users.id)).where(and(eq(comments.guideId, id), isNull(comments.parentId))).orderBy(desc(comments.createdAt)).limit(limit).offset(offset);
  const commentIds = guideComments.map(c => c.id);
  let replies: typeof guideComments = [];
  if (commentIds.length > 0) { replies = await db.select({ id: comments.id, text: comments.text, createdAt: comments.createdAt, user: { id: users.id, displayName: users.displayName, initials: users.initials, avatarUrl: users.avatarUrl }, parentId: comments.parentId }).from(comments).innerJoin(users, eq(comments.userId, users.id)).where(inArray(comments.parentId, commentIds)).orderBy(asc(comments.createdAt)); }
  const totalResult = await db.select({ count: count() }).from(comments).where(and(eq(comments.guideId, id), isNull(comments.parentId)));
  res.json({ comments: guideComments, replies, total: totalResult[0]?.count || 0 });
});

export { router as usersRouter };