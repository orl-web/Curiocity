import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { referralCodes, referralUses, users } from '../db/schema';
import { eq, and, desc, count } from 'drizzle-orm';
import { authenticate } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';

const router = Router();

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

router.get('/my-code', authenticate, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  let existing = await db.select().from(referralCodes).where(eq(referralCodes.userId, userId)).limit(1);
  if (existing.length === 0) {
    const code = generateCode();
    await db.insert(referralCodes).values({ id: uuidv4(), userId, code });
    existing = await db.select().from(referralCodes).where(eq(referralCodes.userId, userId)).limit(1);
  }
  const uses = await db.select({ cnt: count() }).from(referralUses).where(eq(referralUses.codeId, existing[0].id));
  res.json({ code: existing[0].code, usesCount: uses[0]?.cnt ?? 0 });
});

router.post('/apply', authenticate, validateBody(z.object({ code: z.string().min(4).max(20) })), async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { code } = req.body;
  const referralCode = await db.select().from(referralCodes).where(eq(referralCodes.code, code.toUpperCase())).limit(1);
  if (!referralCode.length) throw AppError.notFound('Invalid referral code');
  if (referralCode[0].userId === userId) throw AppError.badRequest('Cannot use your own referral code');
  const alreadyUsed = await db.select().from(referralUses).where(eq(referralUses.referredUserId, userId)).limit(1);
  if (alreadyUsed.length > 0) throw AppError.conflict('You already used a referral code');
  await db.insert(referralUses).values({ id: uuidv4(), codeId: referralCode[0].id, referredUserId: userId, referrerCredited: false, referredCredited: true });
  await db.update(referralCodes).set({ usesCount: referralCode[0].usesCount + 1 }).where(eq(referralCodes.id, referralCode[0].id));
  res.json({ message: 'Referral code applied! You earned a free guide unlock.' });
});

router.get('/stats', authenticate, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const code = await db.select().from(referralCodes).where(eq(referralCodes.userId, userId)).limit(1);
  if (!code.length) return res.json({ totalReferrals: 0, pendingPayouts: 0 });
  const uses = await db.select({ cnt: count() }).from(referralUses).where(eq(referralUses.codeId, code[0].id));
  res.json({ totalReferrals: uses[0]?.cnt ?? 0, pendingPayouts: 0 });
});

export { router as referralsRouter };
