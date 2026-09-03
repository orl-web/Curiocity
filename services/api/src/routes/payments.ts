import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import Stripe from 'stripe';
import { db } from '../db';
import { payments, userSavedGuides, guides, users, adViews } from '../db/schema';
import { eq, and, desc, sql, inArray } from 'drizzle-orm';
import { authenticate, requireRole } from '../middleware/auth';
import { validateBody, validateParams } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';
import { config } from '../config';

const router = Router();
const stripe = new Stripe(config.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

const checkoutSchema = z.object({ guideId: z.string().uuid() });
const connectOnboardSchema = z.object({ returnUrl: z.string().url(), refreshUrl: z.string().url() });
const adRewardSchema = z.object({ guideId: z.string().uuid(), provider: z.enum(['admob', 'unity']) });

router.post('/checkout', authenticate, validateBody(checkoutSchema), async (req: Request, res: Response) => {
  const { guideId } = req.body; const userId = req.user!.userId;
  const guideRows = await db.select().from(guides).where(eq(guides.id, guideId)).limit(1);
  if (!guideRows.length) throw AppError.notFound('Guide not found');
  const guide = guideRows[0];
  if (guide.priceModel !== 'paid') throw AppError.badRequest('This guide is not available for purchase');
  if (guide.creatorId === userId) throw AppError.badRequest('Cannot purchase your own guide');

  const existing = await db.select().from(payments).where(and(eq(payments.userId, userId), eq(payments.guideId, guideId), eq(payments.status, 'completed'))).limit(1);
  if (existing.length > 0) throw AppError.conflict('Already purchased this guide');

  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!userRows.length) throw AppError.notFound('User not found');
  const user = userRows[0];

  let customerId = user.stripeCustomerId;
  if (!customerId) { const customer = await stripe.customers.create({ email: user.email, name: user.displayName, metadata: { userId } }); customerId = customer.id; await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, userId)); }

  const amount = guide.price || 99; const platformFee = Math.round(amount * config.PLATFORM_FEE_PERCENT / 100); const creatorEarnings = amount - platformFee;
  const session = await stripe.checkout.sessions.create({ customer: customerId, payment_method_types: ['card'], line_items: [{ price_data: { currency: 'eur', product_data: { name: guide.title, description: `Guide by ${guide.creatorInitials}` }, unit_amount: amount }, quantity: 1 }], mode: 'payment', success_url: `${config.CORS_ORIGIN.split(',')[0]}/guide/${guideId}?success=true`, cancel_url: `${config.CORS_ORIGIN.split(',')[0]}/guide/${guideId}?canceled=true`, metadata: { guideId, userId, creatorId: guide.creatorId, creatorEarnings: creatorEarnings.toString(), platformFee: platformFee.toString() } });

  const paymentId = uuidv4();
  await db.insert(payments).values({ id: paymentId, userId, guideId, stripeSessionId: session.id, amount: amount.toString(), currency: 'eur', status: 'pending', platformFee: platformFee.toString(), creatorEarnings: creatorEarnings.toString() });
  res.json({ checkoutUrl: session.url, sessionId: session.id });
});

router.post('/connect/onboard', authenticate, validateBody(connectOnboardSchema), async (req: Request, res: Response) => {
  const { returnUrl, refreshUrl } = req.body; const userId = req.user!.userId;
  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!userRows.length) throw AppError.notFound('User not found');
  const user = userRows[0];

  let accountId = user.stripeAccountId;
  if (!accountId) { const account = await stripe.accounts.create({ type: 'express', email: user.email, capabilities: { card_payments: { requested: true }, transfers: { requested: true } }, business_type: 'individual' }); accountId = account.id; await db.update(users).set({ stripeAccountId: accountId }).where(eq(users.id, userId)); }
  const accountLink = await stripe.accountLinks.create({ account: accountId, return_url: returnUrl, refresh_url: refreshUrl, type: 'account_onboarding' });
  res.json({ url: accountLink.url });
});

router.get('/connect/status', authenticate, async (req: Request, res: Response) => {
  const userRows = await db.select().from(users).where(eq(users.id, req.user!.userId)).limit(1);
  if (!userRows.length) throw AppError.notFound('User not found');
  const user = userRows[0];
  if (!user.stripeAccountId) return res.json({ onboarded: false });
  const account = await stripe.accounts.retrieve(user.stripeAccountId);
  res.json({ onboarded: account.details_submitted && account.charges_enabled && account.payouts_enabled, detailsSubmitted: account.details_submitted, chargesEnabled: account.charges_enabled, payoutsEnabled: account.payouts_enabled });
});

router.post('/ad-unlock', authenticate, validateBody(adRewardSchema), async (req: Request, res: Response) => {
  const { guideId, provider } = req.body; const userId = req.user!.userId;
  const guideRows = await db.select().from(guides).where(eq(guides.id, guideId)).limit(1);
  if (!guideRows.length) throw AppError.notFound('Guide not found');
  const guide = guideRows[0];
  if (guide.priceModel !== 'ad') throw AppError.badRequest('This guide does not support ad unlock');

  const existing = await db.select().from(adViews).where(and(eq(adViews.userId, userId), eq(adViews.guideId, guideId))).limit(1);
  if (existing.length > 0 && existing[0].rewardClaimed) throw AppError.conflict('Ad already viewed for this guide');
  res.json({ adUnitId: config.ADMOB_AD_UNIT_ID || '', message: 'Show rewarded ad to unlock' });
});

router.post('/ad-complete', authenticate, validateBody(adRewardSchema), async (req: Request, res: Response) => {
  const { guideId, provider } = req.body; const userId = req.user!.userId;
  const guideRows = await db.select().from(guides).where(eq(guides.id, guideId)).limit(1);
  if (!guideRows.length) throw AppError.notFound('Guide not found');

  const existing = await db.select().from(adViews).where(and(eq(adViews.userId, userId), eq(adViews.guideId, guideId))).limit(1);
  if (existing.length > 0) await db.update(adViews).set({ rewardClaimed: true, revenue: '0.01' }).where(eq(adViews.id, existing[0].id));
  else await db.insert(adViews).values({ id: uuidv4(), userId, guideId, adProvider: provider, rewardClaimed: true, revenue: '0.01' });

  await db.insert(userSavedGuides).values({ id: uuidv4(), userId, guideId }).onConflictDoNothing();
  res.json({ unlocked: true });
});

router.get('/history', authenticate, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const userPayments = await db.select({ id: payments.id, amount: payments.amount, currency: payments.currency, status: payments.status, createdAt: payments.createdAt, completedAt: payments.completedAt, guide: { id: guides.id, title: guides.title, city: guides.city, coverImageUrl: guides.coverImageUrl } }).from(payments).innerJoin(guides, eq(payments.guideId, guides.id)).where(eq(payments.userId, userId)).orderBy(desc(payments.createdAt));
  res.json({ payments: userPayments });
});

router.get('/creator/earnings', authenticate, requireRole('creator', 'admin'), async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const creatorPayments = await db.select({ id: payments.id, amount: payments.amount, creatorEarnings: payments.creatorEarnings, platformFee: payments.platformFee, status: payments.status, createdAt: payments.createdAt, completedAt: payments.completedAt, guide: { id: guides.id, title: guides.title } }).from(payments).innerJoin(guides, eq(payments.guideId, guides.id)).where(eq(guides.creatorId, userId)).orderBy(desc(payments.createdAt));
  const totalEarnings = creatorPayments.filter(p => p.status === 'completed').reduce((sum, p) => sum + parseFloat(p.creatorEarnings), 0);
  const pendingEarnings = creatorPayments.filter(p => p.status === 'pending').reduce((sum, p) => sum + parseFloat(p.creatorEarnings), 0);
  res.json({ totalEarnings, pendingEarnings, payments: creatorPayments });
});

router.post('/payout', authenticate, requireRole('creator', 'admin'), async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const userRows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!userRows.length || !userRows[0].stripeAccountId) throw AppError.badRequest('Stripe Connect not onboarded');

  // Get pending earnings using proper JOIN — consistent with how we find payments
  const pendingPayments = await db.select({ total: sql<number>`COALESCE(SUM(${payments.creatorEarnings}), 0)` }).from(payments).innerJoin(guides, eq(payments.guideId, guides.id)).where(and(eq(guides.creatorId, userId), eq(payments.status, 'completed'), eq(payments.paidOut, false)));
  const amount = pendingPayments[0]?.total || 0;
  if (amount < 50) throw AppError.badRequest('Minimum payout threshold is €50');

  await stripe.transfers.create({ amount: Math.round(amount * 100), currency: 'eur', destination: userRows[0].stripeAccountId!, metadata: { creatorId: userId } });

  // Mark as paid out — match by guide creator, not by userId
  const creatorGuideIds = await db.select({ id: guides.id }).from(guides).where(eq(guides.creatorId, userId));
  const guideIdList = creatorGuideIds.map((g) => g.id);
  if (guideIdList.length > 0) {
    await db.update(payments).set({ paidOut: true }).where(and(inArray(payments.guideId, guideIdList), eq(payments.status, 'completed'), eq(payments.paidOut, false)));
  }

  res.json({ message: 'Payout initiated', amount });
});

export { router as paymentsRouter };