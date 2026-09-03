import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import { newsletterSubscribers } from '../db/schema';
import { eq } from 'drizzle-orm';
import { validateBody } from '../middleware/validate';
import { AppError } from '../middleware/errorHandler';

const router = Router();

const subscribeSchema = z.object({
  email: z.string().email(),
  source: z.string().max(50).optional(),
});

router.post('/subscribe', validateBody(subscribeSchema), async (req: Request, res: Response) => {
  const { email, source } = req.body;

  const existing = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.email, email)).limit(1);
  if (existing.length > 0) {
    if (!existing[0].subscribed) {
      await db.update(newsletterSubscribers).set({ subscribed: true }).where(eq(newsletterSubscribers.email, email));
    }
    return res.json({ message: 'Already subscribed' });
  }

  await db.insert(newsletterSubscribers).values({
    id: uuidv4(),
    email,
    source: source || 'landing',
    subscribed: true,
  });

  res.status(201).json({ message: 'Subscribed successfully' });
});

router.post('/unsubscribe', validateBody(z.object({ email: z.string().email() })), async (req: Request, res: Response) => {
  const { email } = req.body;
  const existing = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.email, email)).limit(1);
  if (!existing.length) throw AppError.notFound('Email not found');
  await db.update(newsletterSubscribers).set({ subscribed: false }).where(eq(newsletterSubscribers.email, email));
  res.json({ message: 'Unsubscribed' });
});

export { router as newsletterRouter };
