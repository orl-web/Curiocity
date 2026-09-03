import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { users, guides, payments, reports, analyticsEvents } from '../db/schema';
import { eq, and, desc, sql, count, gte, lte } from 'drizzle-orm';
import { authenticate, requireRole } from '../middleware/auth';
import { validateQuery, validateParams, validateBody } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { config } from '../config';

const router = Router();

router.get('/stats', authenticate, requireRole('admin'), async (_req: Request, res: Response) => {
  const totalUsers = await db.select({ count: count() }).from(users);
  const totalGuides = await db.select({ count: count() }).from(guides);
  const publishedGuides = await db.select({ count: count() }).from(guides).where(eq(guides.isPublished, true));
  const pendingReports = await db.select({ count: count() }).from(reports).where(eq(reports.status, 'pending'));
  const totalRevenue = await db.select({ total: sql<number>`COALESCE(SUM(amount), 0)` }).from(payments).where(eq(payments.status, 'completed'));

  res.json({ users: totalUsers[0]?.count || 0, guides: totalGuides[0]?.count || 0, publishedGuides: publishedGuides[0]?.count || 0, pendingReports: pendingReports[0]?.count || 0, totalRevenue: totalRevenue[0]?.total || 0 });
});

router.get('/users', authenticate, requireRole('admin'), validateQuery(z.object({ limit: z.coerce.number().default(50), offset: z.coerce.number().default(0), role: z.enum(['user', 'creator', 'admin']).optional(), search: z.string().optional() })), async (req: Request, res: Response) => {
  const { limit, offset, role, search } = req.query as any;

  let query: any = db.select({ id: users.id, email: users.email, displayName: users.displayName, initials: users.initials, role: users.role, emailVerified: users.emailVerified, createdAt: users.createdAt }).from(users);

  if (role) query = query.where(eq(users.role, role));
  if (search) { const term = `%${search}%`; query = query.where(sql`${users.displayName} ILIKE ${term} OR ${users.email} ILIKE ${term}`); }

  query = query.orderBy(desc(users.createdAt)).limit(limit).offset(offset);
  const userList = await query;

  const totalResult = await db.select({ count: count() }).from(users);
  res.json({ users: userList, total: totalResult[0]?.count || 0 });
});

router.patch('/users/:id/role', authenticate, requireRole('admin'), validateParams(z.object({ id: z.string().uuid() })), validateBody(z.object({ role: z.enum(['user', 'creator', 'admin']) })), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { role } = req.body;

  if (id === req.user!.userId) throw AppError.badRequest('Cannot change your own role');

  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, id));
  res.json({ message: 'Role updated' });
});

router.get('/guides', authenticate, requireRole('admin'), validateQuery(z.object({ limit: z.coerce.number().default(50), offset: z.coerce.number().default(0), status: z.enum(['published', 'unpublished']).optional() })), async (req: Request, res: Response) => {
  const { limit, offset, status } = req.query as any;

  let query: any = db.select({ id: guides.id, title: guides.title, city: guides.city, creatorId: guides.creatorId, isPublished: guides.isPublished, createdAt: guides.createdAt }).from(guides);

  if (status === 'published') query = query.where(eq(guides.isPublished, true));
  if (status === 'unpublished') query = query.where(eq(guides.isPublished, false));

  query = query.orderBy(desc(guides.createdAt)).limit(limit).offset(offset);
  const guideList = await query;

  const totalResult = await db.select({ count: count() }).from(guides);
  res.json({ guides: guideList, total: totalResult[0]?.count || 0 });
});

router.delete('/guides/:id', authenticate, requireRole('admin'), validateParams(z.object({ id: z.string().uuid() })), async (req: Request, res: Response) => {
  await db.delete(guides).where(eq(guides.id, req.params.id));
  res.json({ message: 'Guide deleted' });
});

router.get('/revenue', authenticate, requireRole('admin'), validateQuery(z.object({ startDate: z.string().datetime().optional(), endDate: z.string().datetime().optional() })), async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query as any;

  let query: any = db.select({ date: sql<string>`DATE(created_at)`, revenue: sql<number>`COALESCE(SUM(amount), 0)`, platformFee: sql<number>`COALESCE(SUM(platform_fee), 0)`, creatorEarnings: sql<number>`COALESCE(SUM(creator_earnings), 0)` }).from(payments).where(eq(payments.status, 'completed')).groupBy(sql`DATE(created_at)`).orderBy(sql`DATE(created_at)`);

  if (startDate) query = query.where(gte(payments.createdAt, new Date(startDate)));
  if (endDate) query = query.where(lte(payments.createdAt, new Date(endDate)));

  const revenue = await query;
  res.json({ revenue });
});

router.get('/events', authenticate, requireRole('admin'), validateQuery(z.object({ eventName: z.string().optional(), limit: z.coerce.number().default(100), offset: z.coerce.number().default(0) })), async (req: Request, res: Response) => {
  const { eventName, limit, offset } = req.query as any;

  let query: any = db.select().from(analyticsEvents).orderBy(desc(analyticsEvents.createdAt)).limit(limit).offset(offset);
  if (eventName) query = query.where(eq(analyticsEvents.eventName, eventName));

  const events = await query;
  res.json({ events });
});

export { router as adminRouter };