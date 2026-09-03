import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { reports, guides, reviews, comments, users } from '../db/schema';
import { eq, and, desc, sql, count } from 'drizzle-orm';
import { authenticate, requireRole } from '../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const AUTO_FLAG_THRESHOLD = 3;

const createReportSchema = z.object({ targetType: z.enum(['guide', 'user', 'review', 'comment']), targetId: z.string().uuid(), reason: z.enum(['spam', 'inaccurate', 'inappropriate', 'copyright']), details: z.string().max(1000).optional() });
const reviewReportSchema = z.object({ status: z.enum(['reviewed', 'resolved', 'dismissed']), actionTaken: z.string().optional() });

async function checkAutoFlag(targetType: string, targetId: string) {
  const result = await db.select({ cnt: count() }).from(reports).where(and(eq(reports.targetType, targetType as any), eq(reports.targetId, targetId), eq(reports.status, 'pending')));
  const reportCount = result[0]?.cnt ?? 0;
  if (reportCount >= AUTO_FLAG_THRESHOLD) {
    if (targetType === 'guide') await db.update(guides).set({ isPublished: false }).where(eq(guides.id, targetId));
    else if (targetType === 'review') { const r = await db.select({ text: reviews.text }).from(reviews).where(eq(reviews.id, targetId)).limit(1); if (r.length > 0 && r[0].text) await db.update(reviews).set({ text: '[Auto-flagged] ' + r[0].text }).where(eq(reviews.id, targetId)); }
    else if (targetType === 'comment') await db.update(comments).set({ text: '[Auto-flagged]' }).where(eq(comments.id, targetId));
  }
}

router.post('/', authenticate, validateBody(createReportSchema), async (req: Request, res: Response) => {
  const { targetType, targetId, reason, details } = req.body;
  const reporterId = req.user!.userId;

  let targetExists = false;
  if (targetType === 'guide') { const g = await db.select().from(guides).where(eq(guides.id, targetId)).limit(1); targetExists = g.length > 0; }
  else if (targetType === 'user') { const u = await db.select().from(users).where(eq(users.id, targetId)).limit(1); targetExists = u.length > 0; }
  else if (targetType === 'review') { const r = await db.select().from(reviews).where(eq(reviews.id, targetId)).limit(1); targetExists = r.length > 0; }
  else if (targetType === 'comment') { const c = await db.select().from(comments).where(eq(comments.id, targetId)).limit(1); targetExists = c.length > 0; }

  if (!targetExists) throw AppError.notFound('Reported content not found');

  const existing = await db.select().from(reports).where(and(eq(reports.reporterId, reporterId), eq(reports.targetType, targetType), eq(reports.targetId, targetId))).limit(1);
  if (existing.length > 0) throw AppError.conflict('Already reported this content');

  const reportId = uuidv4();
  await db.insert(reports).values({ id: reportId, reporterId, targetType, targetId, reason, details });

  await checkAutoFlag(targetType, targetId);

  res.status(201).json({ id: reportId, message: 'Report submitted' });
});

router.get('/my', authenticate, validateQuery(z.object({ limit: z.coerce.number().default(20), offset: z.coerce.number().default(0) })), async (req: Request, res: Response) => {
  const { limit, offset } = req.query as any;
  const reporterId = req.user!.userId;

  const myReports = await db.select({ id: reports.id, targetType: reports.targetType, targetId: reports.targetId, reason: reports.reason, status: reports.status, createdAt: reports.createdAt }).from(reports).where(eq(reports.reporterId, reporterId)).orderBy(desc(reports.createdAt)).limit(limit).offset(offset);
  res.json({ reports: myReports });
});

router.get('/admin', authenticate, requireRole('admin'), validateQuery(z.object({ status: z.enum(['pending', 'reviewed', 'resolved', 'dismissed']).optional(), limit: z.coerce.number().default(50), offset: z.coerce.number().default(0) })), async (req: Request, res: Response) => {
  const { status, limit, offset } = req.query as any;

  const allReports = await db.select({
    id: reports.id,
    targetType: reports.targetType,
    targetId: reports.targetId,
    reason: reports.reason,
    details: reports.details,
    status: reports.status,
    reporterId: reports.reporterId,
    reviewedBy: reports.reviewedBy,
    reviewedAt: reports.reviewedAt,
    actionTaken: reports.actionTaken,
    createdAt: reports.createdAt,
    reporter: { id: users.id, displayName: users.displayName, email: users.email },
    reportCount: sql<number>`(SELECT count(*) FROM ${reports} r WHERE r.target_type = ${reports.targetType} AND r.target_id = ${reports.targetId})`,
  }).from(reports).leftJoin(users, eq(reports.reporterId, users.id)).orderBy(desc(reports.createdAt));

  let filtered = allReports;
  if (status) filtered = allReports.filter((r) => r.status === status);
  res.json({ reports: filtered.slice(offset, offset + limit) });
});

router.patch('/admin/:id', authenticate, requireRole('admin'), validateParams(z.object({ id: z.string().uuid() })), validateBody(reviewReportSchema), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, actionTaken } = req.body;
  const reviewerId = req.user!.userId;

  const report = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
  if (!report.length) throw AppError.notFound('Report not found');

  await db.update(reports).set({ status, reviewedBy: reviewerId, reviewedAt: new Date(), actionTaken }).where(eq(reports.id, id));

  if (status === 'resolved') {
    const r = report[0];
    if (r.targetType === 'guide') await db.update(guides).set({ isPublished: false }).where(eq(guides.id, r.targetId));
    else if (r.targetType === 'review') { const rev = await db.select({ text: reviews.text }).from(reviews).where(eq(reviews.id, r.targetId)).limit(1); if (rev.length > 0 && rev[0].text) await db.update(reviews).set({ text: '[Flagged] ' + rev[0].text }).where(eq(reviews.id, r.targetId)); }
    else if (r.targetType === 'comment') { const com = await db.select({ text: comments.text }).from(comments).where(eq(comments.id, r.targetId)).limit(1); if (com.length > 0) await db.update(comments).set({ text: '[Deleted]' }).where(eq(comments.id, r.targetId)); }
    else if (r.targetType === 'user') {
      const reportedUser = await db.select({ role: users.role }).from(users).where(eq(users.id, r.targetId)).limit(1);
      const callerUser = await db.select({ role: users.role }).from(users).where(eq(users.id, reviewerId)).limit(1);
      const roleHierarchy = { user: 0, creator: 1, admin: 2 };
      const reportedLevel = roleHierarchy[reportedUser[0]?.role as keyof typeof roleHierarchy] ?? 0;
      const callerLevel = roleHierarchy[callerUser[0]?.role as keyof typeof roleHierarchy] ?? 0;
      if (reportedLevel < callerLevel) {
        await db.update(users).set({ role: 'user' }).where(eq(users.id, r.targetId));
      }
    }
  }

  res.json({ message: 'Report updated' });
});

export { router as reportsRouter };