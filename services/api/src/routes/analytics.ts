import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { analyticsEvents, guides, payments, adViews, users } from '../db/schema';
import { eq, and, desc, asc, sql, count, gte, lte, inArray } from 'drizzle-orm';
import { authenticate, requireRole } from '../middleware/auth';
import { validateQuery, validateParams, validateBody } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { config } from '../config';

const router = Router();

const eventSchema = z.object({
  eventName: z.string().min(1).max(50),
  properties: z.record(z.unknown()),
  sessionId: z.string().uuid().optional(),
});

router.post('/track', authenticate, validateBody(eventSchema), async (req: Request, res: Response) => {
  const { eventName, properties, sessionId } = req.body;
  const userId = req.user?.userId;

  await db.insert(analyticsEvents).values({ eventName, properties, sessionId, userId });
  res.json({ success: true });
});

const batchSchema = z.object({
  events: z.array(eventSchema)
});
router.post('/batch', authenticate, validateBody(batchSchema), async (req: Request, res: Response) => {
  const { events } = req.body;
  const userId = req.user!.userId;
  const values = events.map((e: any) => ({ eventName: e.eventName, properties: e.properties, sessionId: e.sessionId, userId }));
  await db.insert(analyticsEvents).values(values);
  res.json({ success: true, count: events.length });
});

const dateRangeSchema = z.object({ startDate: z.string().datetime().optional(), endDate: z.string().datetime().optional(), interval: z.enum(['hour', 'day', 'week', 'month']).default('day') });

router.get('/overview', authenticate, requireRole('creator', 'admin'), validateQuery(dateRangeSchema), async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query as any;
  const userId = req.user!.userId;

  const guideIds = await db.select({ id: guides.id }).from(guides).where(eq(guides.creatorId, userId));
  const guideIdList = guideIds.map((g: any) => g.id);

  if (guideIdList.length === 0) return res.json({ views: 0, saves: 0, purchases: 0, revenue: 0 });

  const dateFilter = startDate || endDate ? and(
    startDate ? gte(analyticsEvents.createdAt, new Date(startDate)) : undefined,
    endDate ? lte(analyticsEvents.createdAt, new Date(endDate)) : undefined
  ) : undefined;

  const views = await db.select({ count: count() }).from(analyticsEvents).where(and(eq(analyticsEvents.eventName, 'guide_view'), inArray(sql`properties->>'guideId'`, guideIdList), dateFilter));
  const saves = await db.select({ count: count() }).from(analyticsEvents).where(and(eq(analyticsEvents.eventName, 'guide_save'), inArray(sql`properties->>'guideId'`, guideIdList), dateFilter));
  const purchases = await db.select({ count: count() }).from(payments).where(and(inArray(payments.guideId, guideIdList), eq(payments.status, 'completed'), dateFilter));
  const revenueResult = await db.select({ total: sql<number>`COALESCE(SUM(creator_earnings), 0)` }).from(payments).where(and(inArray(payments.guideId, guideIdList), eq(payments.status, 'completed'), dateFilter));

  res.json({ views: views[0]?.count || 0, saves: saves[0]?.count || 0, purchases: purchases[0]?.count || 0, revenue: revenueResult[0]?.total || 0 });
});

router.get('/guides/:id/analytics', authenticate, requireRole('creator', 'admin'), validateParams(z.object({ id: z.string().uuid() })), validateQuery(dateRangeSchema), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { startDate, endDate } = req.query as any;
  const userId = req.user!.userId;

  const guide = await db.select().from(guides).where(eq(guides.id, id)).limit(1);
  if (!guide.length) throw AppError.notFound('Guide not found');
  if (guide[0].creatorId !== userId && req.user!.role !== 'admin') throw AppError.forbidden('Not authorized');

  const dateFilter = startDate || endDate ? and(
    startDate ? gte(analyticsEvents.createdAt, new Date(startDate)) : undefined,
    endDate ? lte(analyticsEvents.createdAt, new Date(endDate)) : undefined
  ) : undefined;

  const events = await db.select({ eventName: analyticsEvents.eventName, properties: analyticsEvents.properties, createdAt: analyticsEvents.createdAt }).from(analyticsEvents).where(and(eq(sql`properties->>'guideId'`, id), dateFilter)).orderBy(asc(analyticsEvents.createdAt));

  const views = events.filter((e: any) => e.eventName === 'guide_view').length;
  const saves = events.filter((e: any) => e.eventName === 'guide_save').length;
  const audioPlays = events.filter((e: any) => e.eventName === 'audio_play').length;
  const purchases = events.filter((e: any) => e.eventName === 'guide_purchase').length;

  const dailyStats: Record<string, { views: number; saves: number; audioPlays: number; purchases: number }> = {};
  for (const e of events) {
    const day = e.createdAt.toISOString().split('T')[0];
    if (!dailyStats[day]) dailyStats[day] = { views: 0, saves: 0, audioPlays: 0, purchases: 0 };
    if (e.eventName === 'guide_view') dailyStats[day].views++;
    if (e.eventName === 'guide_save') dailyStats[day].saves++;
    if (e.eventName === 'audio_play') dailyStats[day].audioPlays++;
    if (e.eventName === 'guide_purchase') dailyStats[day].purchases++;
  }

  res.json({ views, saves, audioPlays, purchases, daily: dailyStats });
});

router.get('/funnel', authenticate, requireRole('creator', 'admin'), validateQuery(dateRangeSchema), async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query as any;
  const userId = req.user!.userId;

  const guideIds = await db.select({ id: guides.id }).from(guides).where(eq(guides.creatorId, userId));
  const guideIdList = guideIds.map((g: any) => g.id);

  const dateFilter = startDate || endDate ? and(
    startDate ? gte(analyticsEvents.createdAt, new Date(startDate)) : undefined,
    endDate ? lte(analyticsEvents.createdAt, new Date(endDate)) : undefined
  ) : undefined;

  const impressions = await db.select({ count: count() }).from(analyticsEvents).where(and(eq(analyticsEvents.eventName, 'guide_impression'), inArray(sql`properties->>'guideId'`, guideIdList), dateFilter));
  const views = await db.select({ count: count() }).from(analyticsEvents).where(and(eq(analyticsEvents.eventName, 'guide_view'), inArray(sql`properties->>'guideId'`, guideIdList), dateFilter));
  const saves = await db.select({ count: count() }).from(analyticsEvents).where(and(eq(analyticsEvents.eventName, 'guide_save'), inArray(sql`properties->>'guideId'`, guideIdList), dateFilter));
  const purchases = await db.select({ count: count() }).from(analyticsEvents).where(and(eq(analyticsEvents.eventName, 'guide_purchase'), inArray(sql`properties->>'guideId'`, guideIdList), dateFilter));

  res.json({ impressions: impressions[0]?.count || 0, views: views[0]?.count || 0, saves: saves[0]?.count || 0, purchases: purchases[0]?.count || 0, ctr: impressions[0]?.count ? (views[0]?.count || 0) / impressions[0].count : 0, conversionRate: views[0]?.count ? (purchases[0]?.count || 0) / views[0].count : 0 });
});

export { router as analyticsRouter };